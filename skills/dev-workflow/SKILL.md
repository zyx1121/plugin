---
name: dev-workflow
description: "Loki 的開發流程標準 — 從需求到發版一條鏈:GitHub Issues 當 backlog、Milestone 當 sprint、Projects 看板,接 Conventional Commits PR 與 Release Please 發版,一套做法套到任何 repo(node / rust / python uv / tauri / generic). Use when planning work into issues or sprints, setting up a repo's backlog or releases, cutting a release, or auditing how a repo plans, versions and tags. Triggers on 'backlog', 'scrum', 'sprint', 'github issue', 'milestone', '看板', '開 issue', 'release', '發版', '版本號', 'tag', 'CI/CD', 'changelog', 'conventional commits', 'release please', 'bump', 'semver', '怎麼發版'. NOT 專案文件 / runbook 寫法 — 那是 project-docs."
---

# dev-workflow — one path from idea to release

Every repo runs the same chain. Each link has one home, and the next link
reads from it:

```
issue (backlog) → milestone (sprint) → branch → PR "Closes #n" → squash merge → release PR → tag
```

| Link | Standard | Read |
|---|---|---|
| Backlog, sprints, board, definition of done | GitHub Issues + Milestones + Projects | `references/backlog.md` |
| Branch, PR, merge | ship loop in `CLAUDE.md`; PR title and `Closes #n` in `backlog.md` | `references/backlog.md` |
| Versions, changelog, tags, release artifacts | SemVer + Conventional Commits + Release Please | `references/release.md` |

Read only the reference the task needs. Both use templates from
`${CLAUDE_SKILL_DIR}/assets/`.

## Which reference

| Task | Read |
|---|---|
| Turn a goal or a `zyx:planner` work-list into issues | `backlog.md` |
| Plan, run, or close a sprint; a report needs Scrum evidence | `backlog.md` |
| Set up a new repo | `backlog.md` §set up, then `release.md` §apply |
| Wire releases into a repo, or audit its versioning | `release.md` |
| Cut a release, hotfix, or go to 1.0.0 | `release.md` §cut a release |

## Rules that span both references

- The issue label type, the branch prefix, and the PR title type are the same
  word (`feat` issue → `feat/<slug>` → `feat: ...`). The PR title decides the
  version bump, and the label is where that word is chosen, so a mislabeled
  issue tends to ship as the wrong release. `ci`, `build` and `revert` have no
  issue label; they are PR-only types for work that needs no issue.
- An unplanned change still gets an issue before its PR, except a typo-level
  `docs:` or `chore:` fix.
- Stack house styles (`nextjs-dev`, and others later) sit on top of this chain.
  They decide how the code looks, not how the work flows.

## Assets

| File | Use | Reference |
|---|---|---|
| `labels.sh` | house labels: type, priority, size, blocked | `backlog.md` |
| `ISSUE_TEMPLATE/` | story and bug forms; blank issues off | `backlog.md` |
| `pull_request_template.md` | `Closes #` line and verification section | `backlog.md` |
| `release-please-config.<stack>.json` | node, rust, rust-workspace, python, tauri, generic | `release.md` |
| `release-please.yml` | the release workflow, one commented build hook per stack | `release.md` |
| `pr-title.yml` | conventional PR title check | `release.md` |
| `CHANGELOG.seed.md` | Keep a Changelog header | `release.md` |
| `check-versions.ts` | multi-manifest agreement guard, tauri only | `release.md` |
