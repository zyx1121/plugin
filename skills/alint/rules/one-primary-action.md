---
id: one-primary-action
engine: model
files: ["**/*.{tsx,jsx,vue,svelte,html}"]
exclude: ["**/*.test.*", "components/ui/**"]
source: skill simple-first (2026-11-13)
---

A page, dialog or panel has at most 1 primary action: 1 control with the
filled, primary style. Other actions use a quiet style or sit inside a menu,
a tab or a row that expands. Flag a changed view that renders 2 or more
primary-styled controls at the same time. A list where each row repeats the
same single action is fine. Two views that never show together are fine.

## Bad

A header with `<Button>新增</Button>`, `<Button>匯出</Button>` and
`<Button>分享</Button>`, all in the default filled style

## Good

`<Button>新增</Button>` and a `更多` menu that holds 匯出 and 分享
