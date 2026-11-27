---
id: corner-text-not-icons
engine: model
files: ["**/*.{tsx,jsx}"]
exclude: ["components/ui/**", "**/components/ui/**", "**/*.test.*"]
requires: src/components/task-shell.tsx
source: memory corner-text-not-icons (2026-11-27)
---

Links in the 4 fixed corners of the page are text, never icons. The top
right holds task actions as text links (Light, Dark), the bottom left holds
Privacy and Terms, the bottom right holds the copyright. Flag a changed
corner link that renders an icon (an `svg`, an icon component such as
`Sun`, `Moon` or `Github`, or an icon-only button) instead of, or beside,
its text. Icons in the centered content are fine.

## Bad

`<a href="/privacy"><ShieldIcon /></a>` in the bottom-left corner

## Good

`<a href="/privacy">Privacy</a>` in the bottom-left corner
