// Fetches card definitions on behalf of the content script (avoids Google's page CSP/CORS).
// Each language's dictionary lives in lang/<id>/lookup.js and registers itself in LOOKUPS. Only the
// languages in this download are loaded: the ones whose lang/<id>/lang.js is a content script.
// (The "is this a real word?" check lives in the content script: see lang/en/lang.js.)
"use strict";

const LOOKUPS = {};

for (const file of chrome.runtime.getManifest().content_scripts[0].js) {
  const m = file.match(/^lang\/([\w-]+)\/lang\.js$/);
  if (!m) continue;
  try {
    importScripts(`lang/${m[1]}/lookup.js`);
  } catch {
    // A language without a lookup.js has no fallback card definitions.
  }
}

const cache = new Map();

async function lookup(word, lang) {
  const key = `${lang}:${word.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  if (!LOOKUPS[lang]) return { error: `no dictionary for “${lang}”` };
  const result = await LOOKUPS[lang](word);
  if (cache.size > 200) cache.clear();
  cache.set(key, result);
  return result;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "gdb-lookup" && typeof msg.word === "string" && typeof msg.lang === "string") {
    lookup(msg.word, msg.lang)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: String((err && err.message) || err) }));
    return true; // keep channel open for async response
  }
});
