---
id: text-size-scale
engine: grep
files: ["**/*.{tsx,jsx}"]
exclude: ["components/ui/**"]
requires: components/task-shell.tsx
pattern: "\btext-(base|lg|xl|[3-9]xl)\b"
source: memory ui-design-system-everywhere (2026-10-03)
---

Pages on the ui.zyx.tw shell use three sizes only: 24, 16 and 14 px
(`text-2xl`, `text-sm`, `text-xs`). Any other Tailwind text size breaks the
scale. Only applies to repos that carry `components/task-shell.tsx`.

## Bad

`<h2 className="text-lg">`

## Good

`<h2 className="text-2xl">` or `<p className="text-sm">`
