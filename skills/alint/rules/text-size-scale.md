---
id: text-size-scale
engine: grep
files: ["**/*.{tsx,jsx}"]
exclude: ["components/ui/**", "**/components/ui/**"]
requires: src/components/task-shell.tsx
pattern: "\btext-(xs|sm|base|lg|xl|[2-9]xl)\b"
source: memory ui-design-system-everywhere (2026-10-03)
---

Pages on the ui.zyx.tw shell use four sizes only, by token: `text-display`
(80 px), `text-title` (24 px), `text-body` (16 px) and `text-caption`
(14 px). The theme clears Tailwind's own text sizes, so a class such as
`text-lg` sets nothing. Only applies to repos that carry
`src/components/task-shell.tsx`.

## Bad

`<h2 className="text-lg">`

## Good

`<h2 className="text-title">` or `<p className="text-caption">`
