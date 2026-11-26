---
name: task-web
description: "Build personal web tools, temporary interactive pages and research demos using Loki's zyx template: fixed corners, a focused center and ui.zyx.tw. Use when starting one from scratch. Triggers on '做個 web', '做個 demo', '個人工具', '小任務', '臨時網頁', '研究 demo', 'zyx template', 'task page'. Preserve an existing product or client design unless the user asks to adopt this template. NOT the general Next.js house style，那是 nextjs-dev. NOT what a page shows or cuts，那是 simple-first."
---

# Task Web

Use the shared zyx shell for personal tasks. Make the requested task the center
of the page. The starter has no business pages, login, database or AI setup.
Those are optional features, never prerequisites for a useful demo.

The starter and its components live in the ui.zyx.tw registry. This skill picks
the integration and holds the judgment the registry cannot.

## Choose the integration

- **New standalone task:** make a Next.js project from the registry. Run, in the
  parent of an absent directory:

  ```sh
  bunx shadcn@latest create -t next -n <name> https://ui.zyx.tw/r/base.json https://ui.zyx.tw/r/task.json
  ```

  It writes the base theme, `app/layout.tsx` (dark first, Maple Mono, the
  page motion), `app/page.tsx` with `TaskShell`, and `scripts/audit.mjs`. Put
  the task in `app/page.tsx`. Set the title in `TaskShell` and in the layout's
  `metadata`, and set `<html lang>` to the page's language (`zh-Hant` for
  繁體中文).
- **Existing React or Next.js project:** keep its providers and shell. If the
  user asks for the zyx look there, add `@zyx1121/corners` and
  `@zyx1121/page-decode` (`@zyx1121/page-decode-next` in Next.js), and link
  `https://ui.zyx.tw/fonts/maple-mono-nf-cn.css` in the head. Do not create a
  project over an existing one or nest four corners inside another shell.
- **Configured FDE workspace:** use FDE, when available, to resolve the workspace
  and handle sync, lifecycle and snapshots. This skill supplies the layout only.
  Keep the workspace's live-edit workflow and preserve existing routes and data.

Honor repository and user execution-location rules. In Loki's stack, local work
is editing and git; installs, builds and servers run on the sandbox or the FDE
project's own VM.

## Design contract

Before styling, read https://ui.zyx.tw/agent-instructions.md and
https://ui.zyx.tw/index.md. Each item's install prints when to use it and when
not to. Add only what the task needs with `bunx shadcn@latest add
@zyx1121/<name>`; do not edit `components/ui` or install stock shadcn
primitives. Base UI uses `render`, not `asChild`.

- Four fixed corners, 12px in from the viewport (`--gutter`): the zyx mark to
  www.zyx.tw, task actions at the top right as text links (the starter puts a
  Light or Dark link there; the D key switches too), Privacy and Terms at the
  bottom left, the copyright at the bottom right. Put no transforms on
  ancestors of the corners. Extra task controls belong in the center.
- One centered column (`column` and `page` from `lib/layout`). A comparison or
  an editor may pass `wide` to `TaskShell`. Avoid a dashboard, a sidebar or a
  marketing hero unless the task needs one.
- Dark first, light available. Maple Mono NF CN sets all text. Only 80, 24, 16
  and 14px are legal (display, titles, body and controls, captions), at weight
  400, or 500 for titles and headings.
- Keep the chrome grayscale. Colors may encode actual data.
- Write copy for the person using the page, not for the developer. Keep the
  title and the labels the task needs. Leave out instructions on how to use the
  page, explanations of a state, "results will appear here" and notes about the
  build. An empty state is a short label or nothing at all. Buttons are a verb
  or two (登入, not 以實驗室帳號登入). Inputs carry a label; a placeholder never
  suggests a value. Show what the person reads, never internal codes, ids or
  field keys.
- When the page cannot handle a real input, fix the tool or system behind it,
  not the page around it.

## Verify

Build, serve it on the development host, then run:

```sh
npx playwright install webkit
node scripts/audit.mjs <url>
```

It opens the page at 1280, 390 and 320px, in dark and light, and fails on an
illegal font size or weight, a missing corner, sideways scroll, a light first
paint, copy that reads like a note to the developer, a placeholder that suggests
a value or a button longer than a short verb. A failed audit is not done. Report
what the audit printed.
[evals.md](evals.md) holds the fixed scenarios used to judge changes to this
skill.

The skill is not an always-on instruction or permission to redesign unrelated
sites. It works without FDE. A request to build a demo does not by itself
authorize new infrastructure or paid services. Report the resulting URL or
artifact and what was actually verified.
