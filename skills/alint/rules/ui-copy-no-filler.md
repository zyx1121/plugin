---
id: ui-copy-no-filler
engine: model
files: ["**/*.{tsx,jsx,vue,svelte,html}"]
exclude: ["**/*.test.*", "components/ui/**"]
source: memory ui-copy-no-filler (2026-10-07)
---

Interface text carries no explanatory sentences. Buttons are 1 or 2 word
verbs; a pending state adds 中…. A heading says what the thing is or asks
what to choose, with no subtitle that explains it. Flag added user-visible
strings that explain, reassure or repeat what the control already says.
Error messages, empty states that tell the next action in one short line,
and accessibility labels are fine.

## Bad

`<p>用實驗室帳號登入，就是 auth.winlab.tw 那一組。</p>` with a button
`以實驗室帳號登入`

## Good

A heading `登入` and a button `登入`
