// Chinese card definitions (background worker): 萌典 (https://www.moedict.tw), Taiwan Ministry of
// Education dictionary data. It only knows Traditional characters, so Simplified words are converted
// with OpenCC's tables (zhconv.js) and the definitions converted back. Returned in the Free
// Dictionary API's shape for card.js.
"use strict";

importScripts("lang/zh/zhconv.js");

{
  const toSimplified = (s) => Array.from(s, (c) => (ZH_T2S[c] || c).split(" ")[0]).join("");

  // Traditional spellings to try: the usual one first, then alternatives for characters that have
  // several (发 → 發 / 髮), at most 4.
  function traditionalCandidates(word) {
    let out = [""];
    for (const c of Array.from(word)) {
      const options = (ZH_S2T[c] || c).split(" ");
      out = out.flatMap((prefix) => options.map((o) => prefix + o)).slice(0, 4);
    }
    return out;
  }

  // moedict marks links as `word~; strip that, and the "如：" lead-in on examples.
  const clean = (s) => (s || "").replace(/[`~]/g, "").replace(/^如：/, "").trim();

  // Examples look like 如：「弹无虚发」、「百发百中」。 — keep the quoted parts, at most two.
  function quoted(s) {
    const parts = (s.match(/「([^「」]+)」/g) || []).map((p) => p.slice(1, -1));
    return parts.length ? parts.slice(0, 2).join("、") : s;
  }

  const ZH_POS = {
    名: "名词", 動: "动词", 形: "形容词", 副: "副词", 代: "代词", 介: "介词", 連: "连词",
    助: "助词", 歎: "叹词", 量: "量词", 數: "数词", 狀: "拟声词", 綴: "词缀", 語: "短语",
  };

  // One moedict entry -> one Free Dictionary API-style entry. Senses are grouped by reading and part
  // of speech ("ǒu rán · 副词"). Text is shown in Simplified unless the user typed Traditional.
  function moedictEntry(word, data, simplified) {
    const show = (s) => (simplified ? toSimplified(clean(s)) : clean(s));
    const split = (s) => (s ? show(s).split(/[,，、]/).map((x) => x.trim()).filter(Boolean) : []);
    const multi = (data.h || []).length > 1;
    const meanings = [];
    for (const h of data.h || []) {
      const groups = new Map();
      for (const d of h.d || []) {
        const pos = ZH_POS[clean(d.type)] || clean(d.type) || "释义";
        const label = multi && h.p ? `${h.p} · ${pos}` : pos;
        if (!groups.has(label)) groups.set(label, { partOfSpeech: label, definitions: [], synonyms: [], antonyms: [] });
        groups.get(label).definitions.push({
          definition: show(d.f),
          example: d.e && d.e[0] ? quoted(show(d.e[0])) : "",
          synonyms: split(d.s),
          antonyms: split(d.a),
        });
      }
      meanings.push(...groups.values());
    }
    const first = (data.h || [])[0] || {};
    return {
      word,
      phonetic: first.p || "",
      phonetics: [],
      meanings,
      sourceUrls: [`https://www.moedict.tw/${encodeURIComponent(clean(data.t))}`],
      source: "moedict",
      lang: "zh",
    };
  }

  LOOKUPS.zh = async (word) => {
    const simplified = toSimplified(word) === word;
    for (const t of traditionalCandidates(word)) {
      const res = await fetch(`https://www.moedict.tw/a/${encodeURIComponent(t)}.json`);
      if (res.status === 404) continue;
      if (!res.ok) throw new Error(`萌典 returned ${res.status}`);
      return { entries: [moedictEntry(word, await res.json(), simplified)] };
    }
    return { notFound: true };
  };
}
