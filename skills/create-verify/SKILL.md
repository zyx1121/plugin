---
name: create-verify
description: "Generate or maintain a repo's own verify skill: a project-local recipe that launches the real app on the sandbox, checks it is healthy, drives each user-facing feature the way a user does, captures evidence and cleans up, plus a feature map with one file per feature. Use when a repo has no scripted way to prove its behavior, when the done report needs a real run, or when an existing verify skill has drifted from the app. Triggers on 'create verify', 'verify skill', '驗證 skill', '怎麼驗這個 repo', '做 verify', 'maintain verify', '更新 verify'. NOT reviewing a diff; that's dual-review."
---

# create-verify

Every repo Loki ships needs a scripted way to prove it works: launch the real
app, use a feature as a user would, and keep the evidence. This skill writes
that recipe into the repo itself, so the next agent reads it cold, mid-task,
and does not rediscover how to start the app.

Two modes: **generate** (the repo has no verify skill) and **maintain** (it
has one and the app changed).

## Where the verify skill lives

- Path: `.claude/skills/verify/SKILL.md` in the repo, with `features/` next to
  it.
- Sessions start in `~`, so Claude Code does not load repo skills on its own.
  Add one line to the repo's `AGENTS.md` under `## Verify`:
  `Drive the real app with [the verify skill](.claude/skills/verify/SKILL.md).`
  The lead reads `AGENTS.md` before touching a repo, and Codex reads it too.
- Frontmatter: `name: verify` and a `description` that names the app, its
  surface and when to use it. Without frontmatter the skill never registers
  for sessions that do start in the repo.

## Generate

### 1. Interview the repo, not Loki

Answer from the code, the README, `AGENTS.md`, CI files and the project memory.
Ask Loki only what none of them show.

- **Surface**: what a user touches. Web UI, CLI, TUI, API, MCP server, desktop
  app, library. Pick the primary one and list the rest.
- **Run**: the repo's own dev command, ports, env vars, seed data, sign-in.
- **Where**: the sandbox by default (`ssh sandbox`, code synced with
  `rsync -a --delete --exclude .git --exclude node_modules --exclude .env.local`
  into the project space `~/p/<org>/<repo>/main/`). State that is not in git
  (env file, test DB, login helper, mocks) lives in `~/p/<org>/<repo>/kit/`,
  described by `kit/README.md`; the layout is in `~/p/README.md`. GPU work runs on furnace. A macOS-only app runs on the
  MacBook; say so in the skill.
- **Drive**: existing harnesses first (Playwright specs, test clients, curl
  calls, an MCP client). Then a generic recipe: Playwright headless on the
  sandbox for web, a tmux session for CLI and TUI, plain HTTP for services.
  Peck is for Loki-facing visual checks, not for the scripted drive.
- **Observe**: screenshots, terminal transcripts, response bodies, logs, exit
  codes, database rows, and spans in sensorium when the app sends OTel.
- **Isolate**: can two instances run side by side (ports, data dirs)? If not,
  the skill must refuse to drive an instance it did not start.

If the checkout does not build or start, fix that first or report exactly what
fails. A recipe written against a broken base teaches wrong steps.

### 2. Write the skill

Sections, each filled from the interview with real commands, not placeholders:

- **Launch**: the exact command and the signal that it is ready. Ready means
  usable from an empty data dir, migrations and seed included, not just a port
  that answers. Include teardown.
- **Doctor**: one read-only check: process up, right commit, port owned by
  this run, sign-in valid. Run it first, and again after anything surprising.
- **Drive**: the harness with this repo's real selectors, routes, commands or
  tool names. Prefer stable handles: ARIA roles and names, data attributes,
  route paths, prompt strings.
- **Evidence**: what to capture and where. Default location on the sandbox:
  `~/p/<org>/<repo>/kit/evidence/<run-id>/`. The proof standard:
  - Use the real user path, not internal setters or test-only endpoints.
  - Capture the action and the resulting state, not only the final screen.
  - Check side effects (rows, files, mail, writes to other systems) with a
    second read-only view.
  - A dry-run or test mode counts only after you watched what it skips.
- **Cleanup**: stop what this run started, by PID or container name, never by
  process name. Cleanup keeps the evidence.
- **Helpers**: any script the skill ships is executable and its call is shown
  in the skill body.

### 3. Seed the feature map

Write `features/README.md` (baseline state, driving conventions, proof rules)
and one file per user-facing feature. Start with the 3 to 5 features users
touch most. Each file has four sections:

- `Sub-features`
- `How to get to it (user POV)`
- `Driving it`
- `Gotchas`

See [references/feature-map-example.md](references/feature-map-example.md).
If seed data lacks a precondition, the journey fails and the reason goes in
`Gotchas`. Never weaken a journey to make it pass.

### 4. Prove it before handing it over

Run the new skill end to end once: launch, doctor, drive one mapped feature,
capture evidence, clean up. Then confirm the evidence still exists. A verify
skill that was never run is a draft. Fix what fails and rerun cleanup after
every failed attempt so no process or port is left behind.

Ship it as one PR in the repo. The PR body names the feature you drove and
where the evidence is.

## Maintain

Run after a change that adds, removes or reshapes a user-facing feature, or
when a drive fails for a reason that is not a product bug.

1. Edit only the verify skill's own folder. Never change product code here.
2. Fix the index: missing, extra or dead feature files.
3. Read the source for each feature and note drift with `file:line`.
4. Drive every feature live at least once. Doctor before the first drive and
   after any failed drive.
5. Sort each failure:
   - **Doc drift**: the map is wrong. Fix the map.
   - **Harness gap**: the app works but the recipe cannot drive it. Fix the
     recipe and drive it again.
   - **Product bug**: the app is broken. Report it or open an issue. Keep it
     out of this PR.
6. Outcome is one of `clean` (no PR), `changed` (one PR of proven fixes) or
   `blocked` (say exactly what blocked it).

## Using it in the done report

When a repo has a verify skill, the done report runs the feature map entry
for what changed and cites the evidence path. `dual-review` hands the same
recipe to `zyx:reviewer` so it can reproduce findings.
