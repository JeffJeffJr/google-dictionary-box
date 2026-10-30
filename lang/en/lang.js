// English: "serendipity meaning", "define serendipity", plain "serendipity", checked against the
// bundled word list (wordfilter.js, built from words.txt). Card definitions: lookup.js.
//
// A language entry has:
//   id, name, hint   for settings ("English", and a line describing what it matches)
//   match(q, settings) -> word or null    a definition search in this language
//   bare(q) -> word or null               optional: a plain one-word search (setting bareWords)
//   isReal(word) -> bool                  the word gate; nothing happens for words that fail it
//   card                                  the fallback card's wording (see card.js)
// Wrapped in a function so helper names don't clash with other content scripts.
"use strict";

LANGS.push(
  (() => {
    let digits = null; // char code -> 6-bit value

    function fnv1a(s, seed) {
      let h = seed >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h;
    }

    // WORD_FILTER is a Bloom filter, so the check is synchronous and needs no background worker.
    // About 1 in 1000 made-up words pass. Hashing must match tools/build-wordfilter.js.
    function wordFilterHas(w) {
      const f = WORD_FILTER;
      if (!digits) {
        digits = new Uint8Array(128);
        for (let v = 0; v < 64; v++) digits[f.alphabet.charCodeAt(v)] = v;
      }
      const h1 = fnv1a(w, 2166136261);
      const h2 = fnv1a(w, 3735928559) | 1;
      for (let i = 0; i < f.k; i++) {
        const idx = ((h1 + Math.imul(i, h2)) >>> 0) % f.m;
        if (!((digits[f.bits.charCodeAt((idx / 6) | 0)] >> idx % 6) & 1)) return false;
      }
      return true;
    }

    // Every word of the phrase must be in the list ("ice cream" yes, "carpe diem" no).
    // Hyphenated words pass if the whole word or each of its parts is listed ("well-being").
    function isRealPhrase(phrase) {
      const tokens = phrase.toLowerCase().replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean);
      if (!tokens.length) return false;
      return tokens.every(
        (t) => wordFilterHas(t) || (t.includes("-") && t.split("-").every((p) => p && wordFilterHas(p)))
      );
    }

    // Latin letters only, so a user trigger like "意思" leaves "偶然 意思" to Chinese.
    const latin = (w) => (w && !/[^\P{L}\p{Script=Latin}]/u.test(w) ? w : null);

    return {
      id: "en",
      name: "English",
      hint: "“serendipity meaning”, “define serendipity”, “what does serendipity mean”. Only for words in the built-in English word list.",
      match: (q, settings) => latin(parseQuery(q, settings.triggers)),
      bare: (q) => latin(bareWord(q)),
      isReal: isRealPhrase,
      card: {
        label: "Dictionary", search: "Search for a word", lookingUp: (w) => `Looking up “${w}”…`,
        listen: "Listen", similar: "Similar:", opposite: "Opposite:", origin: "Origin ",
        more: "More definitions", fewer: "Fewer definitions", searchAs: (w) => `${w} meaning`, speech: "en-US",
        notFound: (w) => `No dictionary entry found for “${w}”.`,
        failed: (why) => `Couldn't load the definition (${why}).`,
        elsewhere: (w) => ({ href: `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}`, text: "Try Wiktionary ↗" }),
        credit: (data, link) => [
          h("span", null, "Definitions from ", link(data.sourceUrl || "https://en.wiktionary.org/", "Wiktionary"), " via Free Dictionary API"),
          link(`https://books.google.com/ngrams/graph?content=${encodeURIComponent(data.word)}&year_start=1800&corpus=en`, "Use over time ↗"),
        ],
      },
    };
  })()
);
