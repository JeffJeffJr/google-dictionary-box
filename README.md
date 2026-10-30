# Dictionary Box for Google

Brings the old pre-AI Google dictionary card back.

## Install (Chromium)
1. Download the zip for the languages you want from the GitHub release.
2. Unzip it.
3. Go to `chrome://extensions` (Edge: `edge://extensions`).
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and pick the unzipped `dictionary-box-…` folder.

## How it works
Adds `&tbs=1` to the URL, which brings back Google's Oxford dictionary box. This happens when you search
with a trigger word like "meaning" or "definition", or search a single word on its own (English words
from the built-in word list only). Chinese works with searches like `分离的意思`.

If Google has no box for the word, the search reloads normally so the AI Overview explains it.
