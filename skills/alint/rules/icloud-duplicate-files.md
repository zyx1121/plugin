---
id: icloud-duplicate-files
engine: path
files: ["**"]
exclude: ["**/node_modules/**"]
pattern: "(^|/)[^/]* [2-9](\.[^/]+)?$"
source: memory icloud-duplicate-files
---

iCloud leaves a copy named `<name> 2.ext` when a file is overwritten fast,
and `git add -A` sweeps it into the commit. The copy holds old code that
still type-checks, so nothing else catches it. Delete the copy with
`git rm`; the real file has no number.

## Bad

`app/page 2.tsx`

## Good

`app/page.tsx` only
