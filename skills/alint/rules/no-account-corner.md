---
id: no-account-corner
engine: model
files: ["**/*.{tsx,jsx}"]
exclude: ["components/ui/**", "**/components/ui/**", "**/*.test.*"]
requires: src/components/task-shell.tsx
source: memory no-account-corner (2026-11-27)
---

The bottom-left corner holds Privacy and Terms only. Flag a changed view
that puts an account block there: an avatar, a user name or email, a
sign-out button or an account menu. Account controls belong in the
centered content, or as a text link in the top-right corner.

## Bad

`<BottomLeft><Link href="/privacy">Privacy</Link><UserMenu user={user} /></BottomLeft>`

## Good

`<BottomLeft><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></BottomLeft>`
