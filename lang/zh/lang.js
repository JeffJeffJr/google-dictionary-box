// Chinese: "分离的意思", "分离是什么意思", "分离 意思", "分离的定义". Fields are described in
// lang/en/lang.js.
"use strict";

LANGS.push(
  (() => {
    // Written without spaces. Checked live 2026-10-30: "偶然的意思", "偶然是什么意思" and "偶然 意思"
    // get Google's Chinese box (Oxford Languages) with tbs=1; "什么是偶然" and a bare "偶然" don't, so
    // they aren't matched. The "what" form is tried first, since the second pattern would otherwise
    // read "分离是什么" as the word.
    const PATTERNS = [
      /^(\p{Script=Han}{1,8}?)\s*(?:是)?\s*(?:什么|什麼|啥)\s*意思$/u,
      /^(\p{Script=Han}{1,8}?)\s*(?:的)?\s*(?:意思|含义|含義|定义|定義|解释|解釋|释义|釋義)$/u,
    ];

    const isHan = (w) => /^\p{Script=Han}+$/u.test(w);

    function match(q, settings) {
      if (!q) return null;
      const t = q.trim().replace(/[？?！!。.]+$/, "");
      for (const re of PATTERNS) {
        const m = t.match(re);
        if (m) return m[1];
      }
      // A user trigger word with a space, e.g. "分离 词义" after adding "词义" in settings.
      const w = parseQuery(q, settings.triggers);
      return w && isHan(w) ? w : null;
    }

    return {
      id: "zh",
      name: "中文 (Chinese)",
      hint: "“分离的意思”, “分离是什么意思”, “分离 意思”, “分离的定义”. If Google has no box for the word, the AI Overview shows instead.",
      match,
      // No word list: the phrasing (1–8 Han characters + 意思 etc.) is enough.
      isReal: () => true,
    };
  })()
);
