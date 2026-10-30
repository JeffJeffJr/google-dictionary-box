// Dictionary Box for Google — changes to Google's page: holding it blank during the redirect check,
// finding where the card goes, hiding AI Overview / AI Mode, and the redirect loop guard.
"use strict";

// Keeps the page blank while we decide whether to reload it with &tbs=1, so the
// un-redirected page never flashes. Always released within 1.5s as a failsafe.
function holdPage() {
  const style = document.createElement("style");
  style.textContent = "html { visibility: hidden !important; }";
  document.documentElement.appendChild(style);
  const timer = setTimeout(() => style.remove(), 1500);
  return () => {
    clearTimeout(timer);
    style.remove();
  };
}

// ---------- Placement & AI Overview hiding ----------

function waitFor(fn, timeout = 8000) {
  return new Promise((resolve) => {
    const found = fn();
    if (found) return resolve(found);
    const obs = new MutationObserver(() => {
      const el = fn();
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      resolve(fn());
    }, timeout);
  });
}

function findAnchor() {
  const res = document.querySelector("#res");
  if (res && res.parentElement) return { parent: res.parentElement, before: res };
  const center = document.querySelector("#center_col") || document.querySelector("#rcnt") || document.querySelector("#search") || document.querySelector("main");
  if (center) return { parent: center, before: center.firstChild };
  return null;
}

// Google's own dictionary box, which still renders when the URL has &tbs=1.
const hasGoogleBox = () =>
  !!document.querySelector('[data-attrid="DictionaryHeader"], [data-attrid="SenseDefinition"]');

const STOP_IDS = new Set(["rso", "center_col", "search", "res", "rcnt", "main"]);

function hideAiOverviews(ownHost) {
  const scope = document.querySelector("#rcnt") || document.querySelector("#center_col") || document.querySelector("main") || document.body;
  const candidates = scope.querySelectorAll('h1, h2, h3, [role="heading"], div, span');
  for (const el of candidates) {
    if (el.childElementCount > 3) continue;
    const t = (el.textContent || "").trim();
    if (!/^AI overview$/i.test(t)) continue;

    let node = el;
    for (let i = 0; i < 25 && node && node.parentElement; i++) {
      const p = node.parentElement;
      if (STOP_IDS.has(p.id) || p.tagName === "MAIN") {
        // Safety: never hide our card, or a block that contains several organic results.
        if (node.contains(ownHost) || node === ownHost) break;
        if (node.querySelectorAll("a h3").length > 2) break;
        if (node.dataset.gdbHidden) break;
        node.dataset.gdbHidden = "1";
        node.style.setProperty("display", "none", "important");
        break;
      }
      node = p;
    }
  }
}

// Google's AI Overview block (#Odp5De wraps #m-x-content; checked live 2026-10-30) and the "AI Mode"
// tab link. A stylesheet hides them as soon as they render; hideAiOverviews() is the text fallback.
const AI_CSS = "#Odp5De, #m-x-content, a[data-gdb-ai-mode] { display: none !important; }";
let aiStyle = null;

const hasAiOverview = () => document.querySelector("#Odp5De");

function hideAiParts() {
  if (aiStyle) return;
  aiStyle = document.createElement("style");
  aiStyle.textContent = AI_CSS;
  document.documentElement.appendChild(aiStyle);
}

function showAiParts() {
  if (aiStyle) aiStyle.remove();
  aiStyle = null;
}

function markAiModeLinks() {
  for (const a of document.querySelectorAll('a[href*="udm=50"]')) {
    if (a.textContent.trim() === "AI Mode") a.dataset.gdbAiMode = "1";
  }
}

// At most one redirect per query every few seconds, so if Google ever strips tbs from the
// URL we don't reload forever.
function mayRedirect(q) {
  try {
    const prev = JSON.parse(sessionStorage.getItem("gdb-redirect") || "null");
    if (prev && prev.q === q && Date.now() - prev.t < 5000) return false;
    sessionStorage.setItem("gdb-redirect", JSON.stringify({ q, t: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
