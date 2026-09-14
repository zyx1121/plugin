---
name: release-engineering
description: "Loki 的發版與版本標準 — SemVer + Conventional Commits + Release Please 的 release PR 流程,一套做法套到任何 repo(node / rust / python uv / tauri / generic). Use when wiring releases into a repo, cutting a release, or auditing how a repo versions and tags. Triggers on 'release', '發版', '版本號', 'tag', 'CI/CD', 'changelog', 'conventional commits', 'release please', 'bump', 'semver', '怎麼發版'. NOT 專案文件 / runbook 寫法 — 那是 project-docs."
---

# release-engineering — how every repo here versions and ships

One standard for every repo, so a release looks the same whether it is a Next.js
app, a Rust crate, or a Tauri installer. **Publishing is a merge, not a command:**
conventional commits land on `main`, Release Please keeps one open release PR
carrying the next version and the changelog, and merging that PR is what tags,
cuts the GitHub release, and attaches the artifact. Nothing is tagged by hand.

The pieces are all off-the-shelf standards, listed with their canonical links in
the reference half. The procedures come first because that is what gets used.

## What the global rules already say (do not restate, reference)

- **Ship loop**: commit, push, PR, CI green, squash merge, delete branch. From
  `CLAUDE.md`, not from this skill. This skill only adds what happens *after*
  the squash merge.
- **Which scheme where**: SemVer for release / package / image, `vN` for API and
  protocol schemas, immutable git SHA for container tags. This skill explains
  how to mechanize the SemVer half, and where the other two show up.
- **Skill and plugin repo bumps**: `~/plugin` bumps `plugin.json` and
  `marketplace.json` by hand, see `skills/AGENTS.md`. It has no release PR.

---

## Procedure: apply the standard to a repo

### 1. Detect the stack

| Stack | Marker files | Config template | Notes |
|---|---|---|---|
| node | `package.json`, `bun.lock` | `release-please-config.node.json` | release-type `node` |
| rust | `Cargo.toml` with `[package]` | `release-please-config.rust.json` | updates `Cargo.toml` + `Cargo.lock` |
| rust workspace | `Cargo.toml` with `[workspace]` + `crates/` | `release-please-config.rust-workspace.json` | `cargo-workspace` + `linked-versions` plugins |
| python (uv) | `pyproject.toml`, `uv.lock` | `release-please-config.python.json` | release-type `python` |
| tauri | `package.json` + `src-tauri/tauri.conf.json` + `Cargo.toml` | `release-please-config.tauri.json` | multi-manifest, see step 6 |
| generic | none of the above | `release-please-config.generic.json` | release-type `simple`, version in `version.txt` |

### 2. Copy the templates

From `${CLAUDE_SKILL_DIR}/assets/`:

```bash
cp assets/release-please-config.<stack>.json  release-please-config.json
cp assets/release-please.yml                  .github/workflows/release.yml
cp assets/pr-title.yml                        .github/workflows/pr-title.yml
```

Open `release.yml`, keep the one commented build block that matches the stack,
delete the others. Replace every `REPLACE_*` token in the config.

### 3. Seed the manifest from the current version

`.release-please-manifest.json` is the only place Release Please reads the
current version from. Seed it with what the repo is on *today*, not `0.0.0`, or
the first release PR proposes a version that goes backwards.

```bash
echo '{ ".": "0.4.2" }' > .release-please-manifest.json
```

If the repo already has `vX.Y.Z` tags, the seed must match the newest one.

### 4. Seed the changelog

```bash
cp assets/CHANGELOG.seed.md CHANGELOG.md
```

History before the standard is not backfilled. The seed says the generated
entries start here, and the old tags stay reachable in the GitHub releases list.

### 5. Add the PR title check

`pr-title.yml` lints the PR title with `amannn/action-semantic-pull-request`.
With squash merge the PR title *is* the commit on `main`, so a title like
"fix stuff" is a release that silently never happens.

### 6. Multi-manifest guard, tauri only

When one version lives in four files (`package.json`, `tauri.conf.json`,
`Cargo.toml`, `Cargo.lock`), copy `assets/check-versions.ts` to
`scripts/check-versions.ts`, wire `bun run check:versions`, and run it in CI.
Single-manifest repos skip this: there is nothing to disagree with.

### 7. Give the workflow a real token

Add `RELEASE_PLEASE_TOKEN`: a fine-grained PAT or a GitHub App installation
token with `contents: write` and `pull-requests: write`. **This is not optional.**
A PR opened by the default `GITHUB_TOKEN` does not trigger workflows, so CI
never runs on the release PR, required checks stay pending, and the PR cannot be
merged. The symptom looks like a stuck PR, the cause is the token.

### 8. Set required checks and merge style

Branch protection on `main`: squash merge only, linear history, required checks
= CI plus `pr-title`. Deleting the branch on merge is the repo setting, not a
step anyone performs.

### 9. Verify on the real repo

First push to `main` opens the release PR. Merge it, then check all three
outcomes, because the workflow being green proves only the first:

```bash
gh release view v0.5.0 --json tagName,assets,body
git ls-remote --tags origin | grep v0.5.0
```

A release with no asset attached means the build hook was left commented out.

---

## Procedure: cut a release

There is no manual step anywhere in this list.

1. Merge conventional PRs into `main` as usual. Release Please rewrites its open
   release PR after every merge.
2. Ready to ship means: merge the release PR. That is the whole release.
3. **Hotfix**: open a `fix:` PR, merge it, then merge the refreshed release PR.
   A hotfix is not a different pipeline, only an impatient one.
4. **Pre-1.0** (`bump-minor-pre-major: true` in every template): `feat:` moves
   the minor, `fix:` moves the patch, and a breaking change also moves the minor
   instead of jumping to `1.0.0`. Going to `1.0.0` is a deliberate `Release-As:
   1.0.0` commit footer, never an accident.
5. `feat!:` or a `BREAKING CHANGE:` footer is for a break the *consumer* must
   act on: a removed API, a renamed config key, a migration that is not
   automatic. Internal refactors are `refactor:`, not `feat!:`.
6. Nothing to release means no release PR is open. That is the correct state,
   not a broken workflow.

---

## Conventions

- Tags are `vX.Y.Z`, with the `v`. Versions inside manifests have no `v`.
- Release assets are named `<artifact>-<tag>.<ext>`, each with a
  `.sha256` sidecar next to it.
- One release workflow file per repo, named `.github/workflows/release.yml`.
- No hand-written tags. `git tag` on a laptop is a tag no release stands behind.
- No hand-edited versions in manifests, and no hand-edited generated changelog
  entries. The next release PR overwrites both.
- Conventional Commits scope is optional, subject is lowercase, no trailing period.

---

## Reference: the stack

**SemVer 2.0.0** (<https://semver.org/spec/v2.0.0.html>) is the contract the
version number makes: MAJOR for incompatible API changes, MINOR for
backwards-compatible features, PATCH for backwards-compatible fixes. `0.y.z` is
explicitly the unstable phase where anything may change, which is why the
pre-1.0 rules below exist.

**Conventional Commits 1.0.0** (<https://www.conventionalcommits.org/en/v1.0.0/>)
is the machine-readable commit format that lets a tool compute the next version.
`feat:` bumps the minor, `fix:` bumps the patch, `feat!:` or a `BREAKING CHANGE:`
footer bumps the major. `docs:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:`,
`perf:`, `revert:` bump nothing but still land in the changelog sections that are
enabled. Pre-1.0 the mapping is shifted by `bump-minor-pre-major: true`: a
breaking change moves the minor, not the major, so a `0.x` repo cannot be
accidentally promoted to `1.0.0` by one careless `!`.

**Release Please** (<https://github.com/googleapis/release-please>) reads those
commits and maintains a single open release PR containing the version bump, the
manifest edits, and the changelog entry. Merging the PR is the release trigger:
it tags the merge commit and creates the GitHub release. Config lives in
`release-please-config.json` (manifest mode, one entry per package) and the
current version in `.release-please-manifest.json`. Files outside the strategy's
defaults are updated through `extra-files`, either by jsonpath for JSON, YAML,
and TOML, or by an `x-release-please-version` annotation for anything else. The
action must run with a PAT or a GitHub App token, because pushes made with
`GITHUB_TOKEN` do not trigger workflows and the release PR would never get CI.

**Keep a Changelog** (<https://keepachangelog.com/en/1.1.0/>) is the shape of
`CHANGELOG.md`: newest first, grouped by change type, written for humans. Release
Please generates it in this shape, so the only hand-written part is the header
that `CHANGELOG.seed.md` provides.

**Trunk-Based Development** (<https://trunkbaseddevelopment.com/>) is why there
are no release branches: short-lived branches, squash merged into `main`, and
every commit on `main` is releasable. The cost of squash merge is that the PR
title becomes the commit that Release Please parses, so the title is linted by
`amannn/action-semantic-pull-request`
(<https://github.com/amannn/action-semantic-pull-request>).

**Immutable identifiers** are the other half of "which version is running".
SemVer names the release; the git SHA names the exact build. Container images
are tagged with the SHA and a floating `vX.Y.Z` tag may point at it, never the
other way round. Release assets carry a SHA-256 sidecar so a download can be
verified without trusting the transport.

**Signing and provenance** are named here, not implemented: artifact signing
(Sigstore cosign, <https://www.sigstore.dev/>) and build provenance
(SLSA, <https://slsa.dev/>, via `actions/attest-build-provenance`) both belong in
the build hook, between the build step and the upload step. Windows code signing
sits in the same slot and needs a certificate that is not in any repo. Adopt them
per repo when there is a consumer who checks them, and record the decision in an
ADR.

---

## Assets

| File | Use |
|---|---|
| `release-please-config.<stack>.json` | node, rust, rust-workspace, python, tauri, generic |
| `release-please.yml` | the release workflow, build hooks commented per stack |
| `pr-title.yml` | conventional PR title check |
| `CHANGELOG.seed.md` | Keep a Changelog header |
| `check-versions.ts` | multi-manifest agreement guard, tauri only |
