// English card definitions (background worker): Free Dictionary API (https://dictionaryapi.dev),
// built on Wiktionary data. No key needed. Already in the shape card.js expects.
"use strict";

LOOKUPS.en = async (word) => {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`Dictionary service returned ${res.status}`);
  return { entries: await res.json() };
};
