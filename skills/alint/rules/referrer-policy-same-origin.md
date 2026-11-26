---
id: referrer-policy-same-origin
engine: grep
files: ["**/*.{ts,tsx,js,mjs,json,conf,toml,yml,yaml}", "**/Caddyfile", "**/nginx*"]
exclude: ["**/node_modules/**", "**/*.lock", "**/*.test.*"]
pattern: "[Rr]eferrer-[Pp]olicy.{0,20}[\"'\s:=]no-referrer\b(?!-)"
source: memory model-markdown-image-exfil
---

The `Referrer-Policy` header is `same-origin`, never `no-referrer`. With
`no-referrer` a same-origin form POST sends `Origin: null`, so the app's own
Origin or CSRF check blocks its sign-out and forms. The `referrerPolicy`
attribute on a single `<img>` is fine.

## Bad

`{ key: "Referrer-Policy", value: "no-referrer" }`

## Good

`{ key: "Referrer-Policy", value: "same-origin" }`
