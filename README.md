# Dictionary Box for Google

Brings back Google's own dictionary box, instead of the AI Overview, whenever you search for a definition.

Triggers (case-insensitive):
- `serendipity meaning` · `serendipity definition` · `serendipity define`
- `define serendipity` · `define: serendipity` · `meaning of serendipity` · `definition of serendipity`
- `what does serendipity mean` · `what is the meaning of serendipity`

If Google has no dictionary box for the word, you get Google's normal page with its AI Overview.

## Install (Chrome, Edge, Brave, Arc)
1. Download the zip for the languages you want from the GitHub release:
   - `dictionary-box-en.zip`: English
   - `dictionary-box-zh.zip`: Chinese (中文)
   - `dictionary-box-all.zip`: every language
2. Unzip it.
3. Go to `chrome://extensions` (Edge: `edge://extensions`).
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and pick the unzipped `dictionary-box-…` folder.
6. Search Google for `serendipity meaning` or `偶然的意思`.

A clone of this repository also loads unpacked as-is, with every language.

Settings: click the extension's toolbar icon (pin it from the puzzle-piece menu) to switch languages on
or off, or edit the trigger words. Only the languages in your download are listed.
A language you switch off isn't loaded at all, so the "all" download is just as fast as a single-language
one. You can also delete a language's `lang/<id>/` folder and reload the extension.

## Google's own box (tbs=1)
Definition searches for real English words get `&tbs=1` added to the URL. Google doesn't recognise that
value, so it turns off the AI Overview, and its own Oxford Languages dictionary box comes back. If Google
has no box for a word, the search reloads without `tbs=1` so Google's AI Overview explains it, and the
extension remembers the word so later searches for it go straight there.

## Plain one-word searches
Searching just `serendipity` also brings up Google's dictionary box, with no "meaning" needed. Google decides
whether a word gets a box, so everyday searches like `pizza` or `weather` look the same as before. Turn it
off in settings ("Also on plain one-word searches").

## Chinese (中文)
Searches like `偶然的意思`, `偶然是什么意思`, `偶然 意思` or `偶然的定义` bring up Google's Chinese dictionary
box. If Google has none, the search reloads with Google's AI Overview, just like English. Turn it off in
settings ("中文 (Chinese)").

## Word list
English searches only get acted on when every word is in `lang/en/words.txt`, a local list of about 150,000
English words (SCOWL size 70, see `lang/en/WORDLIST-LICENSE.txt`). Searches like "asdfgh meaning" or
"carpe diem meaning" are left alone.

## Notes
- English works on google.com, .com.my, .com.sg, .co.uk, .ca, .com.au, .co.in, .co.nz, .ie, .com.ph,
  .co.id and .com.hk; Chinese on google.com, .com.hk, .com.tw, .com.sg and .com.my. To add a Google
  domain, add it to `google` in `lang/<id>/pack.json` and run `node tools/build.js`.

## Building the downloads / adding a language
Each language is a folder `lang/<id>/`:
- `pack.json`: its content-script files and its Google domains
- `lang.js`: what searches it matches, and the word check

`node tools/build.js` rewrites `manifest.json` and `languages.js` (every language) and writes `dist/dictionary-box-all.zip`
plus one `dist/dictionary-box-<id>.zip` per language, ready to attach to a GitHub release.
`node tools/build.js en,zh` builds just that combination. `node tools/try.js "<search>"` shows how a
search would be matched.
