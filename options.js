// Settings popup. DEFAULTS and LANGS come from query.js; each language in this download
// (lang/<id>/lang.js in the manifest's content scripts) is loaded here too, for its name and hint.

const $ = (id) => document.getElementById(id);

const langFiles = chrome.runtime.getManifest().content_scripts[0].js.filter((f) => /^lang\/[\w-]+\/lang\.js$/.test(f));

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = s.onerror = resolve;
    document.body.appendChild(s);
  });
}

// One checkbox per language, each with its own hint.
function renderLangs() {
  for (const lang of LANGS) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.lang = lang.id;
    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = lang.hint;
    const text = document.createElement("span");
    text.append(lang.name, document.createElement("br"), hint);
    const row = document.createElement("label");
    row.className = "row";
    row.append(input, text);
    $("langs").appendChild(row);
  }
  // Plain one-word searches only exist for languages with a word list (English).
  $("bareRow").hidden = !LANGS.some((l) => l.bare);
}

const langBoxes = () => [...document.querySelectorAll("#langs input")];

function fill(s) {
  $("enabled").checked = !!s.enabled;
  $("hideAiOverview").checked = !!s.hideAiOverview;
  $("useGoogleBox").checked = !!s.useGoogleBox;
  $("bareWords").checked = !!s.bareWords;
  for (const box of langBoxes()) box.checked = !(s.disabledLangs || []).includes(box.dataset.lang);
  $("triggers").value = (s.triggers || []).join(", ");
}

function flash(msg) {
  $("status").textContent = msg;
  setTimeout(() => ($("status").textContent = ""), 1800);
}

Promise.all(langFiles.map(loadScript)).then(() => {
  renderLangs();
  chrome.storage.sync.get(DEFAULTS, fill);
});

$("save").addEventListener("click", () => {
  const triggers = $("triggers").value
    .split(/[,\n]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  chrome.storage.sync.set(
    {
      enabled: $("enabled").checked,
      hideAiOverview: $("hideAiOverview").checked,
      useGoogleBox: $("useGoogleBox").checked,
      bareWords: $("bareWords").checked,
      disabledLangs: langBoxes().filter((b) => !b.checked).map((b) => b.dataset.lang),
      triggers: triggers.length ? triggers : DEFAULTS.triggers,
    },
    () => flash("Saved")
  );
});

$("reset").addEventListener("click", () => {
  chrome.storage.sync.set(DEFAULTS, () => {
    fill(DEFAULTS);
    flash("Reset");
  });
});
