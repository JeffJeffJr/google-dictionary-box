// Dictionary Box for Google — content script entry point (loaded last; registered by background.js).
// Decides what to do with each search: switch to Google's box version (&tbs=1), back to the normal
// search when Google has no box (so the AI Overview explains the word), or nothing.
"use strict";

// ---------- State ----------
// Settings and the words Google has no box for, kept in memory and updated when they change,
// so clicks and key presses can be decided synchronously.

let settings = { ...DEFAULTS };
let noBoxWords = new Set();

const ready = new Promise((resolve) => {
  let pending = 2;
  const done = () => --pending || resolve();
  try {
    chrome.storage.sync.get(DEFAULTS, (s) => {
      settings = { ...DEFAULTS, ...(s || {}) };
      done();
    });
    chrome.storage.local.get({ noBox: [] }, (s) => {
      noBoxWords = new Set((s && s.noBox) || []);
      done();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync") for (const k in changes) settings[k] = changes[k].newValue ?? DEFAULTS[k];
      if (area === "local" && changes.noBox) noBoxWords = new Set(changes.noBox.newValue || []);
    });
  } catch {
    resolve();
  }
});

// Words Google had no dictionary box for, kept across sessions (newest 2000), as "<lang>:<word>".
// They're searched without tbs=1 so the AI Overview explains them, and we don't redirect back to tbs=1.
const noBoxKey = (match) => `${match.lang.id}:${match.word.toLowerCase()}`;
const hadNoBox = (match) => noBoxWords.has(noBoxKey(match));

function rememberNoBox(match) {
  noBoxWords.add(noBoxKey(match));
  try {
    chrome.storage.local.set({ noBox: [...noBoxWords].slice(-2000) });
  } catch {}
}

// The tbs=1 URL for a Google search URL we act on (a real word, not known to lack a box), else null.
function boxUrlFor(href) {
  if (!settings.enabled) return null;
  let url;
  try {
    url = new URL(href, location.href);
  } catch {
    return null;
  }
  if (url.origin !== location.origin || url.pathname !== "/search") return null;
  const target = googleBoxUrl(url.href);
  const match = target && matchQuery(url.searchParams, settings);
  return match && !hadNoBox(match) && isRealMatch(match) ? target : null;
}

// ---------- Link rewriting ----------
// Puts tbs=1 on definition-search links (related searches, chips, etc.) as they're followed,
// so the page loads right the first time instead of redirecting.

function rewriteLink(e) {
  const a = e.target.closest && e.target.closest("a[href]");
  const target = a && boxUrlFor(a.href);
  if (target) a.href = target;
}

for (const type of ["pointerdown", "click", "auxclick"]) {
  document.addEventListener(type, rewriteLink, true);
}

// ---------- Google's search box ----------
// Searches typed into Google's own search box (Enter, the Search button, or a clicked suggestion)
// get a hidden tbs=1 field in the form when they match, so no redirect is needed.
// Checked live 2026-10-30: Google submits the form's fields for both Enter and suggestion clicks,
// and its form carries no tbs of its own.

function setFormTbs(form, q) {
  if (!form || !q) return;
  const action = new URL(form.getAttribute("action") || "/search", location.href);
  if (action.pathname !== "/search") return;
  let input = form.querySelector("input[data-gdb-tbs]");
  if (!boxUrlFor(`/search?q=${encodeURIComponent(q.trim())}`)) {
    if (input) input.remove();
    return;
  }
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = "tbs";
    input.dataset.gdbTbs = "1";
    form.appendChild(input);
  }
  input.value = "1";
}

const searchBox = () => document.querySelector('form [name="q"]');

document.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Enter") return;
    rewriteLink(e);
    if (e.target.name === "q") setFormTbs(e.target.form, e.target.value);
  },
  true
);

document.addEventListener(
  "submit",
  (e) => {
    const q = e.target.querySelector && e.target.querySelector('[name="q"]');
    if (q) setFormTbs(e.target, q.value);
  },
  true
);

// A clicked suggestion's text replaces the query, so check that text instead.
document.addEventListener(
  "pointerdown",
  (e) => {
    const option = e.target.closest && e.target.closest('[role="option"]');
    const box = option && searchBox();
    if (box) setFormTbs(box.form, option.getAttribute("aria-label") || option.innerText.split("\n")[0]);
  },
  true
);

// ---------- Main ----------

let lastQuery = null;

async function run() {
  const q = new URLSearchParams(location.search).get("q");
  if (q === lastQuery) return;
  lastQuery = q;

  // Only on the main "All" results tab, or AI Mode (udm=50), which gets switched to normal results.
  const params = new URLSearchParams(location.search);
  const udm = params.get("udm");
  if (params.get("tbm") || (udm && udm !== "14" && udm !== "50")) return;

  await ready;
  if (!settings.enabled) return;

  // Only real words (English: the bundled word list). The check is instant, so a redirect happens
  // at document_start before Google's page draws.
  const match = matchQuery(params, settings);
  if (!match || !isRealMatch(match)) return;

  // Switch to Google's box version, unless Google had no box for this word before.
  const target = hadNoBox(match) ? null : googleBoxUrl(location.href);
  if (target && mayRedirect(q)) {
    location.replace(target);
    return;
  }
  if (params.get("tbs") !== "1") return;

  // On the box version: keep the page hidden until we know whether Google's box is there. If it
  // isn't, switch to the same search without tbs=1 so the AI Overview explains the word, and
  // remember the word so later searches for it go straight there.
  const release = holdPage();
  if (document.readyState === "loading") {
    await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
  }
  if (!hasGoogleBox()) {
    rememberNoBox(match);
    location.replace(withoutTbs(location.href));
    return;
  }
  release();
}

run();
// Google sometimes swaps results without a full page load.
let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    run();
  }
}, 800);
window.addEventListener("popstate", run);
