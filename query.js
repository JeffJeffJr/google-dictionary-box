// Dictionary Box for Google — query matching and URL rules (no DOM, no chrome.* APIs).
// Loaded first, then each language's lang/<id>/lang.js registers itself in LANGS.
// Also require()-able from Node for tests (with no languages registered).
"use strict";

const DEFAULTS = {
  enabled: true,
  bareWords: true,
  disabledLangs: [], // language ids switched off in settings, e.g. ["zh"]
  triggers: ["define", "definition", "definitions", "meaning", "meanings", "dictionary", "def"],
};

// ---------- Query parsing ----------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function cleanWord(w) {
  if (!w) return null;
  w = w
    .replace(/[“”"«»]/g, "")
    .replace(/^[\s'‘’.,:;!?]+|[\s'‘’.,:;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!w || w.length > 50) return null;
  if (!/\p{L}/u.test(w)) return null;
  if (w.split(" ").length > 4) return null;
  if (/^(in|to|for|of|and|the)\s/i.test(w)) return null; // e.g. "meaning in malay"
  return w;
}

function parseQuery(q, triggers = DEFAULTS.triggers) {
  if (!q) return null;
  q = q.trim().replace(/\s+/g, " ");
  const lower = q.toLowerCase().replace(/[?!.]+$/, "");

  let m = lower.match(/^define:\s*(.+)$/);
  if (m) return cleanWord(m[1]);

  m = lower.match(/^what(?:'s| is| does)? (?:the )?(?:meaning|definition) of (.+)$/);
  if (m) return cleanWord(m[1]);

  m = lower.match(/^what does (.+?) mean$/);
  if (m) return cleanWord(m[1]);

  const list = (triggers && triggers.length ? triggers : DEFAULTS.triggers)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
  if (!list) return null;

  // "define X", "meaning of X", "definition of X"
  m = lower.match(new RegExp(`^(?:${list})(?: of)?:?\\s+(.+)$`));
  if (m) return cleanWord(m[1]);

  // "X meaning", "X definition", "X define"
  m = lower.match(new RegExp(`^(.+?)\\s+(?:${list})$`));
  if (m) return cleanWord(m[1]);

  return null;
}

// A plain one-word search like "serendipity" (setting bareWords; languages opt in with `bare`).
// Google decides whether its box shows for it ("pizza" gets none, and its normal page comes back).
function bareWord(q) {
  const w = cleanWord(q);
  return w && /^\p{L}[\p{L}'’-]*$/u.test(w) ? w : null;
}

// ---------- Languages ----------
// Each lang/<id>/lang.js pushes one entry (see lang/en/lang.js for the fields). Only the languages
// in this download are loaded (tools/build.js), and the user can switch any of them off.

const LANGS = [];

const activeLangs = (settings) => LANGS.filter((l) => !(settings.disabledLangs || []).includes(l.id));

// Which search to act on: a definition search in any active language ("serendipity meaning",
// "偶然的意思"), or with bareWords on, a plain one-word search outside AI Mode.
// Returns { word, bare, lang } or null.
function matchQuery(params, settings) {
  const q = params.get("q");
  const langs = activeLangs(settings);
  for (const lang of langs) {
    const word = lang.match(q, settings);
    if (word) return { word, bare: false, lang };
  }
  if (!settings.bareWords || params.get("udm") === "50") return null;
  for (const lang of langs) {
    const word = lang.bare && lang.bare(q);
    if (word) return { word, bare: true, lang };
  }
  return null;
}

// The word gate: each language decides what counts as a real word (English: the bundled word list).
const isRealMatch = (match) => match.lang.isReal(match.word);

// ---------- Google's box URL ----------

// The URL to load instead so Google shows its own box: adds tbs=1, and turns AI Mode (udm=50)
// searches back into normal results. Null when the URL is already fine or is another tab.
function googleBoxUrl(href) {
  const url = new URL(href);
  const p = url.searchParams;
  const aiMode = p.get("udm") === "50";
  if (!aiMode && (p.has("tbs") || p.has("udm") || p.has("tbm"))) return null;
  if (aiMode) {
    p.delete("udm");
    p.delete("aep");
  }
  if (!p.has("tbs")) p.set("tbs", "1");
  return url.href;
}

// The same search without tbs, so Google's AI Overview comes back (used when Google has no box).
function withoutTbs(href) {
  const url = new URL(href);
  url.searchParams.delete("tbs");
  return url.href;
}

// Allow unit testing in Node without a browser.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULTS, LANGS, parseQuery, cleanWord, bareWord, matchQuery, googleBoxUrl, withoutTbs, isRealMatch,
  };
}
