---
name: dev-workflow
description: "Loki 的開發流程標準: 從需求到發版一條鏈(Issues 當 backlog、Milestone 當 sprint、Conventional Commits PR、Release Please 發版),加上共用 clone、sandbox、疊 PR 與新服務的工作規則. Use when committing or opening a PR, starting a new service, planning issues or sprints, or cutting a release. Triggers on 'backlog', 'sprint', 'github issue', 'milestone', '開 issue', 'release', '發版', '版本號', 'changelog', 'conventional commits', 'semver', 'worktree', 'commit', '疊 PR', 'stacked PR', 'claim', 'reset --hard', '新服務', 'OTel'. NOT 專案文件 / runbook 寫法，那是 project-docs."
---

# dev-workflow: one path from idea to release

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

## Working rules

Each rule came from a real correction.

### Shared clones

- An iCloud clone is shared by every session. Before editing, run
  `git worktree add <scratchpad>/wt-<name> <branch>` and work there. Open the
  PR with `--head <branch>`.
- Stage only the paths you changed. Never `git add -A` or a whole directory.
  Before committing, run `git diff --cached --name-only` and drop any file you
  did not change.
- Read a SHA to pin from GitHub: `gh api repos/<owner>/<repo>/commits/main --jq .sha`.
  Never read it from the local HEAD.
- When a `git checkout` fails in a chain of commands, stop the chain.
- On the sandbox, run `claim <org>/<repo> <session>` before touching
  `~/p/<org>/<repo>/main/`, and use the directory it prints.
- Never put a destructive command (`reset --hard`, `checkout -- .`,
  `clean -fd`) on the same line as the check before it. Read the output first.
  With uncommitted changes, commit them to a WIP branch or switch directory.

### Pull requests and releases

- Stacked PRs: squash-merge the lower PR without `--delete-branch`, run
  `gh pr edit <next> --base main`, then delete the lower branch. Deleting it
  first closes the next PR, and a closed PR cannot change its base. Rebase the
  next PR with `git rebase --onto origin/main <old lower head>`.
- A release PR merges like any other PR once its checks pass. Do not ask.
  Then confirm the tag, the GitHub release and the image tags.
- A PR opened by `GITHUB_TOKEN` leaves `pull_request` runs in
  `action_required`. Approve the run with
  `gh api -X POST repos/<owner>/<repo>/actions/runs/<run_id>/approve`.
  Never merge with `--admin`.
- In Loki's own `zyx1121` repos, rename and change interfaces freely, even in
  public repos. Mark the break with SemVer (0.x bumps minor) and write the
  migration in the PR. Shared lab, course and client repos keep compatibility.

### New services

- Wire observability in the first PR, not after an incident. Read the standard
  `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS` and
  `OTEL_SERVICE_NAME`, and stay off when they are unset. Log external calls,
  each workflow step, decisions and failure causes. Send counts and ids, never
  secrets or user content.
- Personal projects send to sensorium-zyx, lab services to sensorium-winlab.
  Run `list_projects` before you register, because the same name rotates the key.
- Verification includes finding the data in sensorium.
- Default a new backend to TypeScript (Bun) or Go. When Python is the only
  option, name the ecosystem need and its cost first, and let Loki decide.

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
