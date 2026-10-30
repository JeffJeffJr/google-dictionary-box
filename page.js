// Dictionary Box for Google — changes to Google's page: holding it blank while checking for Google's
// box, and the redirect loop guard.
"use strict";

// Keeps the page blank while we decide whether to switch to the AI Overview version, so the
// page without a box never flashes. Always released within 1.5s as a failsafe.
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

// Google's own dictionary box, which still renders when the URL has &tbs=1.
const hasGoogleBox = () =>
  !!document.querySelector('[data-attrid="DictionaryHeader"], [data-attrid="SenseDefinition"]');

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
