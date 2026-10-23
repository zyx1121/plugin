---
id: no-dash-separators
engine: grep
files: ["**/*.{md,mdx,tsx,jsx,vue,svelte,html}"]
exclude: ["**/CHANGELOG.md", "**/node_modules/**"]
pattern: "[\u2014\u2013\u00b7]"
source: CLAUDE.md Style; memory align-pages-across-apps (2026-10-09)
---

Loki's copy (docs, UI text, slides, subtitles) uses no em dash (U+2014),
en dash (U+2013) or middle dot (U+00B7). Use a comma, a colon, a full stop or parentheses instead.

## Bad

`Agents`, an em dash, then `fast and cheap`; `3 頁`, a middle dot, then
`10/23`

## Good

`Agents: fast and cheap` / `3 頁，10/23`
