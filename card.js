// Dictionary Box for Google — the fallback dictionary card (shadow DOM), shown when Google's own
// box doesn't appear. Definitions come from background.js (each language's lang/<id>/lookup.js).
"use strict";

// The card's wording comes from the search's language (lang/<id>/lang.js `card`); buildShell() sets it.
let cardText = null;

function mergeEntries(entries, fallbackWord) {
  const out = {
    word: (entries[0] && entries[0].word) || fallbackWord,
    phonetic: "",
    audio: "",
    meanings: [],
    origin: "",
    sourceUrl: "",
  };
  const phonetics = entries.flatMap((e) => e.phonetics || []);
  out.phonetic =
    (entries.find((e) => e.phonetic) || {}).phonetic ||
    (phonetics.find((p) => p.text) || {}).text ||
    "";
  const audios = phonetics.map((p) => p.audio).filter(Boolean);
  out.audio = audios.find((a) => /-us\.mp3$/i.test(a)) || audios.find((a) => /-uk\.mp3$/i.test(a)) || audios[0] || "";
  if (out.audio.startsWith("//")) out.audio = "https:" + out.audio;

  // Group meanings by part of speech, keeping first-seen order.
  const byPos = new Map();
  for (const e of entries) {
    for (const m of e.meanings || []) {
      const pos = m.partOfSpeech || "";
      if (!byPos.has(pos)) byPos.set(pos, { pos, defs: [], synonyms: new Set(), antonyms: new Set() });
      const g = byPos.get(pos);
      for (const d of m.definitions || []) {
        g.defs.push({
          text: d.definition,
          example: d.example || "",
          synonyms: d.synonyms || [],
          antonyms: d.antonyms || [],
        });
      }
      (m.synonyms || []).forEach((s) => g.synonyms.add(s));
      (m.antonyms || []).forEach((s) => g.antonyms.add(s));
    }
    if (!out.origin && e.origin) out.origin = e.origin;
    if (!out.sourceUrl && e.sourceUrls && e.sourceUrls[0]) out.sourceUrl = e.sourceUrls[0];
  }
  out.meanings = [...byPos.values()].map((g) => ({
    ...g,
    synonyms: [...g.synonyms],
    antonyms: [...g.antonyms],
  }));
  return out;
}

// ---------- DOM helpers ----------

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

function searchUrl(term) {
  return `${location.origin}/search?q=${encodeURIComponent(cardText.searchAs(term))}`;
}

function isDarkPage() {
  const pick = (el) => el && getComputedStyle(el).backgroundColor;
  const bg = [pick(document.body), pick(document.documentElement)].find(
    (c) => c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)
  );
  if (bg) {
    const n = bg.match(/\d+(\.\d+)?/g);
    if (n && n.length >= 3) {
      const [r, g, b] = n.map(Number);
      return 0.299 * r + 0.587 * g + 0.114 * b < 128;
    }
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function speak(word, audioUrl) {
  const tts = () => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = cardText.speech;
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch {}
  };
  if (audioUrl) {
    try {
      new Audio(audioUrl).play().catch(tts);
    } catch {
      tts();
    }
  } else tts();
}

// ---------- Styles (inside shadow root, so Google's CSS can't touch it) ----------

const CARD_CSS = `
:host { all: initial; display: block; }
.card {
  --bg: #fff; --fg: #202124; --muted: #4d5156; --soft: #70757a; --line: #dadce0;
  --link: #1a0dab; --chip: #f1f3f4; --chip-fg: #202124; --chip-hover: #e8eaed; --accent: #1a73e8;
  --input-bg: #fff;
  font-family: arial, sans-serif; color: var(--fg); background: var(--bg);
  border: 1px solid var(--line); border-radius: 8px;
  max-width: 652px; box-sizing: border-box; margin: 0 0 28px 0; overflow: hidden;
  font-size: 14px; line-height: 22px;
}
.card.dark {
  --bg: #202124; --fg: #e8eaed; --muted: #bdc1c6; --soft: #9aa0a6; --line: #3c4043;
  --link: #8ab4f8; --chip: #303134; --chip-fg: #e8eaed; --chip-hover: #3c4043; --accent: #8ab4f8;
  --input-bg: #303134;
}
.top { display: flex; align-items: center; gap: 12px; padding: 12px 16px 0; }
.label { font-size: 14px; color: var(--soft); white-space: nowrap; }
.search {
  flex: 1; display: flex; align-items: center; border: 1px solid var(--line);
  border-radius: 18px; padding: 0 12px; height: 34px; background: var(--input-bg);
}
.search:focus-within { border-color: var(--accent); }
.search input {
  all: unset; flex: 1; font: 14px arial, sans-serif; color: var(--fg); min-width: 0;
}
.search svg { width: 18px; height: 18px; fill: var(--soft); flex: none; }
.body { padding: 8px 16px 4px; }
.word {
  font-family: "Google Sans", arial, sans-serif; font-size: 30px; line-height: 40px;
  margin: 6px 0 2px; font-weight: 400; color: var(--fg); word-break: break-word;
}
.phon { display: flex; align-items: center; gap: 8px; color: var(--soft); font-size: 14px; }
.speak {
  all: unset; cursor: pointer; width: 28px; height: 28px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
}
.speak:hover { background: var(--chip); }
.speak:focus-visible { outline: 2px solid var(--accent); }
.speak svg { width: 18px; height: 18px; fill: var(--muted); }
.pos { font-style: italic; color: var(--fg); margin: 16px 0 4px; font-size: 14px; }
ol { margin: 0; padding: 0 0 0 22px; }
li { margin: 0 0 12px; padding-left: 4px; color: var(--fg); }
li::marker { color: var(--soft); }
.ex { color: var(--soft); margin-top: 2px; }
.rel { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; }
.rel-label { color: var(--soft); font-size: 13px; margin-right: 2px; }
.chip {
  all: unset; cursor: pointer; font: 13px/24px arial, sans-serif; color: var(--chip-fg);
  background: var(--chip); border: 1px solid var(--line); border-radius: 14px; padding: 0 10px;
}
.chip:hover { background: var(--chip-hover); }
.chip:focus-visible { outline: 2px solid var(--accent); }
.chip.opp { background: transparent; }
.origin { margin: 12px 0 4px; color: var(--muted); }
.origin b { color: var(--fg); font-weight: 400; font-style: italic; }
.extra[hidden] { display: none; }
.more {
  all: unset; cursor: pointer; display: flex; align-items: center; justify-content: center;
  gap: 6px; width: 100%; box-sizing: border-box; padding: 10px; color: var(--accent);
  border-top: 1px solid var(--line); font-size: 14px;
}
.more:hover { background: var(--chip); }
.more svg { width: 18px; height: 18px; fill: currentColor; transition: transform .15s; }
.more[aria-expanded="true"] svg { transform: rotate(180deg); }
.foot {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px;
  padding: 8px 16px 10px; font-size: 12px; color: var(--soft); border-top: 1px solid var(--line);
}
.foot a { color: var(--soft); text-decoration: none; }
.foot a:hover { text-decoration: underline; }
.msg { padding: 14px 16px; color: var(--muted); }
.msg a { color: var(--link); }
.loading { padding: 18px 16px; color: var(--soft); }
`;

const ICON_SEARCH =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
const ICON_SPEAK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
const ICON_CHEVRON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';

function svg(markup) {
  const t = document.createElement("template");
  t.innerHTML = markup;
  return t.content.firstChild;
}

// ---------- Rendering ----------

function buildShell(word, lang) {
  cardText = lang.card;
  const host = h("div", { id: "gdb-dictionary-box" });
  const root = host.attachShadow({ mode: "open" });
  root.appendChild(h("style", null, CARD_CSS));

  const input = h("input", {
    type: "text",
    value: word,
    "aria-label": cardText.search,
    spellcheck: "false",
    autocomplete: "off",
  });
  input.value = word;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) location.href = searchUrl(input.value.trim());
  });
  const icon = svg(ICON_SEARCH);

  const card = h(
    "div",
    { class: "card" + (isDarkPage() ? " dark" : ""), role: "region", "aria-label": cardText.label },
    h("div", { class: "top" }, h("span", { class: "label" }, cardText.label), h("label", { class: "search" }, icon, input)),
    h("div", { class: "content" }, h("div", { class: "loading" }, cardText.lookingUp(word)))
  );
  root.appendChild(card);
  return { host, card, content: card.querySelector(".content") };
}

function chipRow(label, words, opp) {
  if (!words || !words.length) return null;
  return h(
    "div",
    { class: "rel" },
    h("span", { class: "rel-label" }, label),
    words.slice(0, 6).map((w) =>
      h("button", { class: "chip" + (opp ? " opp" : ""), title: cardText.searchAs(w), onclick: () => (location.href = searchUrl(w)) }, w)
    )
  );
}

function renderDefinition(content, data) {
  content.textContent = "";
  const body = h("div", { class: "body" });

  body.appendChild(h("div", { class: "word", role: "heading", "aria-level": "2" }, data.word));
  body.appendChild(
    h(
      "div",
      { class: "phon" },
      h("button", { class: "speak", title: cardText.listen, "aria-label": `${cardText.listen} ${data.word}`, onclick: () => speak(data.word, data.audio) }, svg(ICON_SPEAK)),
      data.phonetic ? h("span", null, data.phonetic) : null
    )
  );

  // First part of speech shows up to 3 senses up front; everything else goes behind "More".
  const PRIMARY_DEFS = 3;
  const extra = h("div", { class: "extra", hidden: true });
  const extras = [extra];
  let hasExtra = false;

  data.meanings.forEach((m, mi) => {
    const target = mi === 0 ? body : extra;
    if (mi > 0) hasExtra = true;

    const makeBlock = (defs, start) =>
      h(
        "ol",
        { start: String(start) },
        defs.map((d) =>
          h(
            "li",
            null,
            h("div", null, d.text),
            d.example ? h("div", { class: "ex" }, `“${d.example}”`) : null,
            chipRow(cardText.similar, d.synonyms),
            chipRow(cardText.opposite, d.antonyms, true)
          )
        )
      );

    target.appendChild(h("div", { class: "pos" }, m.pos));
    const first = mi === 0 ? m.defs.slice(0, PRIMARY_DEFS) : m.defs;
    target.appendChild(makeBlock(first, 1));

    if (mi === 0 && m.defs.length > PRIMARY_DEFS) {
      hasExtra = true;
      const more = h("div", { class: "extra", hidden: true }, makeBlock(m.defs.slice(PRIMARY_DEFS), PRIMARY_DEFS + 1));
      extras.push(more);
      body.appendChild(more);
    }

    const syn = chipRow(cardText.similar, m.synonyms.filter((s) => !m.defs.some((d) => d.synonyms.includes(s))));
    const ant = chipRow(cardText.opposite, m.antonyms.filter((s) => !m.defs.some((d) => d.antonyms.includes(s))), true);
    if (syn) target.appendChild(syn);
    if (ant) target.appendChild(ant);
  });

  if (data.origin) {
    hasExtra = true;
    extra.appendChild(h("div", { class: "origin" }, h("b", null, cardText.origin), data.origin));
  }

  body.appendChild(extra);
  content.appendChild(body);

  if (hasExtra) {
    const btn = h("button", { class: "more", "aria-expanded": "false" }, h("span", null, cardText.more), svg(ICON_CHEVRON));
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      btn.firstChild.textContent = open ? cardText.more : cardText.fewer;
      extras.forEach((x) => (x.hidden = open));
    });
    content.appendChild(btn);
  }

  const link = (href, text) => h("a", { href, target: "_blank", rel: "noopener" }, text);
  content.appendChild(h("div", { class: "foot" }, cardText.credit(data, link)));
}

function renderMessage(content, word, text) {
  content.textContent = "";
  const { href, text: linkText } = cardText.elsewhere(word);
  content.appendChild(h("div", { class: "msg" }, text + " ", h("a", { href, target: "_blank", rel: "noopener" }, linkText)));
}
