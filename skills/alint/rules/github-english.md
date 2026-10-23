---
id: github-english
engine: model
files: ["**/*.{md,mdx,ts,tsx,js,mjs,jsx,go,py,rs,sh,yml,yaml,sql,swift}"]
exclude: ["**/*.zh-TW.md", "**/*.zh-CN.md", "**/locales/**", "**/i18n/**"]
source: CLAUDE.md Style (GitHub output is English)
---

Everything that lands on GitHub is English: README and docs, code comments,
commit-facing text. Flag added Chinese in code comments, docs and config
comments. Chinese is correct in user-facing UI strings of a zh-Hant app, in
translated README files, in test fixtures that check Chinese input, and in
skill trigger phrases.

## Bad

`// 這裡先檢查 session 再寫入`

## Good

`// Check the session before writing.` and `<button>登入</button>`
