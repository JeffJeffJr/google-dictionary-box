// Shows how searches would be matched, using query.js and every language's content scripts (languages.js).
//   node tools/try.js "serendipity meaning" "偶然的意思" "pizza"
// Exports load() for tests: a vm context with LANGS, matchQuery, isRealMatch, DEFAULTS, ...
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function load() {
  const ctx = vm.createContext({ URL, URLSearchParams });
  vm.runInContext(fs.readFileSync(path.join(root, "languages.js"), "utf8"), ctx);
  const packs = vm.runInContext("LANGUAGE_PACKS", ctx);
  for (const f of ["query.js", ...Object.values(packs).flatMap((p) => p.content)]) {
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  }
  return vm.runInContext("({ DEFAULTS, LANGS, matchQuery, isRealMatch, googleBoxUrl, parseQuery })", ctx);
}

if (require.main === module) {
  const { DEFAULTS, matchQuery, isRealMatch } = load();
  for (const q of process.argv.slice(2)) {
    const m = matchQuery(new URLSearchParams({ q }), DEFAULTS);
    console.log(
      JSON.stringify(q),
      m ? `-> ${m.lang.id} "${m.word}"${m.bare ? " (plain word)" : ""}, ${isRealMatch(m) ? "acts" : "not a listed word, ignored"}` : "-> not a definition search"
    );
  }
}

module.exports = { load };
