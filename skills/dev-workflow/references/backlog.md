# Backlog — issues, sprints, and the board

Every piece of planned work is a GitHub issue. A sprint is a milestone. The
board is a GitHub Project. Nothing lives in a local `BACKLOG.md`, a chat, or a
planner reply that never became an issue.

| Scrum term | Where it lives |
|---|---|
| Product backlog | open issues with no milestone |
| Sprint backlog | open issues on the current `Sprint N` milestone |
| Sprint goal, review, retro | the milestone description |
| Board | one GitHub Project (Board layout) per repo |
| Increment | PRs merged into `main` during the sprint |

---

## Procedure: set up a repo

### 1. Labels

```bash
bash ${CLAUDE_SKILL_DIR}/assets/labels.sh              # create or update the house labels
bash ${CLAUDE_SKILL_DIR}/assets/labels.sh --prune      # also delete GitHub's 9 default labels
```

Run it inside the repo. `--prune` is for a new repo; on an old repo, check
`gh label list` first, because deleting a label strips it from every issue.

| Group | Labels | Rule |
|---|---|---|
| Type | `feat`, `fix`, `perf`, `docs`, `refactor`, `test`, `chore` | exactly one; the same word starts the PR title |
| Priority | `P0`, `P1`, `P2` | exactly one; P0 = the sprint fails without it |
| Size | `size:S`, `size:M`, `size:L` | exactly one, set at planning |
| Other | `blocked` | waiting on something outside the repo; say what in a comment |

Size is the only estimate. S fits in half a day, M in a day, L in two to three
days. Anything bigger is split before it enters a sprint.

### 2. Issue and PR templates

```bash
mkdir -p .github/ISSUE_TEMPLATE
cp ${CLAUDE_SKILL_DIR}/assets/ISSUE_TEMPLATE/*.yml  .github/ISSUE_TEMPLATE/
cp ${CLAUDE_SKILL_DIR}/assets/pull_request_template.md  .github/
```

`story.yml` is for new work, `bug.yml` for defects, and `config.yml` turns off
blank issues so every issue carries acceptance criteria.

### 3. Board

`gh project` needs the `project` token scope. If `gh auth status` does not
list it, ask Loki to run `gh auth refresh -s project`. It opens a browser, so
an agent cannot do it.

```bash
gh project create --owner <owner> --title "<repo>"
gh project link <number> --owner <owner>    # run inside the repo
```

Use the repo owner's login (`zyx1121`, or the org) instead of `@me`:
`gh project link --repo` rejects an owner written as `@me`, and an org repo
needs an org board.

Keep the default Status field (Todo, In Progress, Done) and switch the view to
Board layout in the web UI. The Project's built-in workflows move an item to
Done when its issue closes or its PR merges; both are on by default, so check
they are enabled instead of rebuilding them.

---

## Procedure: write an issue

1. One issue is one change that a single PR can close.
2. Title: short, imperative, no type prefix (the label carries the type).
3. Body: the story form's three parts. The user story says who benefits and
   why, acceptance criteria are checkboxes a reviewer can test, notes hold
   links and constraints.
4. Labels: one type and one priority now; size waits for planning.
5. A `zyx:planner` work-list becomes issues item by item. Each item's done
   condition becomes the acceptance criteria.

```bash
gh issue create --web                    # a person picks the form in the browser
gh issue create --title "..." --body-file body.md --label feat,P1 \
  --project "<repo>"                     # an agent writes the body itself
```

`gh issue create --template` cannot select the YAML forms: gh lists only
Markdown templates. An agent writes the body with the same three headings
instead.

Too big for one PR: keep it as the parent issue and split the work into
sub-issues from the web UI. GitHub does not close the parent by itself;
close it when the last sub-issue closes.

---

## Procedure: run a sprint

Default length is one week. Change it only when the repo's `AGENTS.md` says so.

### Planning (start of sprint)

```bash
gh api repos/{owner}/{repo}/milestones \
  -f title="Sprint 3" -f due_on="2026-10-04T23:59:59Z" \
  -f description="Goal: <one sentence>"
gh issue edit <n> --milestone "Sprint 3" --add-label size:M
```

Pull issues from the product backlog in priority order until the sizes fill
the week. Every P0 of the sprint gets in first.

### During the sprint

1. Take an issue: `gh issue edit <n> --add-assignee @me`, then move it to In
   Progress on the board.
2. Branch `<type>/<slug>`, the same type as the issue label
   (`feat/boomerang-cooldown`).
3. PR title is a Conventional Commit (`feat: add boomerang cooldown`), and the
   body carries `Closes #<n>`. The squash merge closes the issue, and the
   board moves it to Done.
4. From merge to release, follow `release.md`.
5. Work found mid-sprint goes to the product backlog as a new issue. It enters
   the current sprint only when it blocks the sprint goal.

### Review and retro (end of sprint)

```bash
gh issue list --milestone "Sprint 3" --state all \
  --json number,title,state -q '.[] | "#\(.number) \(.state) \(.title)"'
```

1. Review: list what closed and demo it. Open issues go back to the product
   backlog (`gh issue edit <n> --remove-milestone`) or to the next sprint.
2. Retro: three short lists, kept / problem / try next. One "try next" item
   becomes an issue, or the retro changes nothing.
3. Write both into the milestone description and close it. The PATCH
   replaces the whole description, so the file starts with the Goal line:

```bash
gh api repos/{owner}/{repo}/milestones/<number> -X PATCH \
  -f state=closed -F description=@sprint-3.md
```

---

## Definition of done

An issue is done when all of these hold:

- Every acceptance criterion is ticked.
- The PR that closes it is merged with CI green.
- The change was verified by running it, not by reading it (the `CLAUDE.md`
  verify rule).

---

## Evidence for reports

Course and project reports that must show Scrum can take it straight from
GitHub, with no extra bookkeeping:

- Board screenshot per sprint (Project, Board layout).
- Burn-up chart from the Project's Insights tab.
- Milestone descriptions, which hold each sprint's goal, review and retro.
- `gh issue list --state closed --milestone "Sprint N"` as the task list.
