# ADR-0023: Move task-web into this plugin

- Status: accepted
- Date: 2026-11-26

## Context

`task-web` was its own plugin repository with a bundled Vite starter, a
create script, a theme snapshot and an audit. The starter, its components
and the audit moved into the ui.zyx.tw registry as `@zyx1121/task`
(zyx1121/www.zyx.tw#217), and the starter became a Next.js project to match
every zyx.tw app (#219). What was left in the repository was one skill.

## Decision

- The `task-web` skill lives in `skills/task-web/`, with its eval scenarios
  in `evals.md`. The name stays, so `nextjs-dev` and `simple-first` keep
  pointing at it.
- The skill creates a task with `bunx shadcn@latest create -t next` from
  the ui.zyx.tw base and task items. It bundles no starter.
- The `zyx1121/task-web` repository and its marketplace entry are removed.

## Consequences

- A change to the starter, the theme or the audit is a ui.zyx.tw PR. A
  change to the judgment is a PR here.
- Codex users get the skill through this plugin instead of a separate one.
