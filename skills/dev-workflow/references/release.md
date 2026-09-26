# Release — how every repo here versions and ships

One standard for every repo. Publishing is a merge, not a command: conventional
commits land on `main`, Release Please keeps one open release PR carrying the
next version and the changelog, and merging that PR tags, cuts the GitHub
release, and attaches the artifact. Nothing is tagged by hand.

Already covered elsewhere, not restated here:

- Ship loop (commit, push, PR, CI green, squash merge, delete branch) is in
  `CLAUDE.md`; this file only adds what happens after the merge. Issues, sprints
  and the board are in `backlog.md`.
- Scheme per artifact: SemVer for release / package / image, `vN` for API and
  protocol schemas, git SHA for container tags. This file mechanizes SemVer.
- `~/plugin` bumps `plugin.json` and `marketplace.json` by hand (see
  `skills/AGENTS.md`). It has no release PR.

---

## Procedure: apply the standard to a repo

### 1. Detect the stack

| Stack | Marker files | Config template | release-type |
|---|---|---|---|
| node | `package.json`, `bun.lock` | `release-please-config.node.json` | `node` |
| rust | `Cargo.toml` with a real `[package]` | `release-please-config.rust.json` | `rust` |
| rust workspace | `Cargo.toml` with `[workspace]`, members on `version.workspace = true` | `release-please-config.rust-workspace.json` | `simple` + `extra-files` |
| python (uv) | `pyproject.toml`, `uv.lock` | `release-please-config.python.json` | `python` |
| tauri | `package.json` + `src-tauri/tauri.conf.json` + `Cargo.toml` | `release-please-config.tauri.json` | `simple` + `extra-files` |
| generic | none of the above | `release-please-config.generic.json` | `simple` |

**Why the two workspace stacks do not use release-type `rust`:** the rust
strategy throws on a virtual workspace root, which has no `[package]` to read,
and it cannot follow a member crate that carries `version.workspace = true`.
Proven on `zyx1121/ai-app-store`. The working recipe is release-type `simple`
driving every manifest through `extra-files`: `toml` with
`$.workspace.package.version` for `Cargo.toml`, `toml` with
`$.package[?(@.name.value=='<crate>')].version` for the `Cargo.lock` entries,
and `json` with `$.version` for `package.json` and `tauri.conf.json`. `simple`
also writes a root `version.txt` on the first release PR, which is harmless.

### 2. Copy the templates

From `${CLAUDE_SKILL_DIR}/assets/`:

```bash
cp assets/release-please-config.<stack>.json  release-please-config.json
cp assets/release-please.yml                  .github/workflows/release-please.yml
cp assets/pr-title.yml                        .github/workflows/pr-title.yml
```

Open `release-please.yml`, keep the one commented build block that matches the
stack, uncomment it, delete the others. Replace every `REPLACE_*` token in the
config, including the crate names inside the `Cargo.lock` jsonpath. For the
generic stack, the target file must carry an `x-release-please-version`
annotation on the version line; without it the `generic` updater changes
nothing and does not fail.

### 3. Seed the manifest from the current version

`.release-please-manifest.json` is the only place Release Please reads the
current version from. Seed it with what the repo is on today, not `0.0.0`, or
the first release PR proposes a version that goes backwards. If the repo already
has `vX.Y.Z` tags, the seed must match the newest one.

```bash
echo '{ ".": "0.4.2" }' > .release-please-manifest.json
```

### 4. Seed the changelog

```bash
cp assets/CHANGELOG.seed.md CHANGELOG.md
```

History before the standard is not backfilled: the generated entries start here
and the old tags stay reachable in the GitHub releases list.

### 5. Add the PR title check

`pr-title.yml` lints the PR title with `amannn/action-semantic-pull-request`.
With squash merge the PR title is the commit on `main`, so a title like
"fix stuff" is a release that silently never happens. Include the `edited` pull
request type: a retitle rewrites the future commit message.

If the check is going to be required, paste the job into `ci.yml` instead of
installing the standalone file, because step 7 dispatches `ci.yml` by name and
nothing outside it runs on the release PR.

### 6. Multi-manifest guard, tauri only

When one version lives in four files (`package.json`, `tauri.conf.json`,
`Cargo.toml`, `Cargo.lock`), copy `assets/check-versions.ts` to
`scripts/check-versions.ts`, wire `bun run check:versions`, and run it in CI.
Single-manifest repos skip this: there is nothing to disagree with.

### 7. Make CI run on the release PR, with no PAT

GitHub starts no workflow for a pull request opened by `GITHUB_TOKEN`, so the
release PR would carry no checks and the release commit would ship unproven.
**No secret is needed to fix this.** `workflow_dispatch` is one of the two
documented exceptions to that rule, so the release job asks for CI by name on
the release branch, with `github.token`:

```yaml
- name: Run CI on the release pull request
  if: steps.release.outputs.pr != ''
  env:
    GH_TOKEN: ${{ github.token }}
    BRANCH: ${{ fromJSON(steps.release.outputs.pr || '{}').headBranchName }}
  run: gh workflow run ci.yml --ref "$BRANCH"
```

Two things this needs: the job holds `actions: write` on top of
`contents: write` and `pull-requests: write`, and the repo's `ci.yml` carries a
bare `workflow_dispatch:` trigger. Without that trigger the dispatch fails and
the release PR stays checkless. The run reports against the branch head, which
is the commit the PR shows.

### 8. Set required checks and merge style

Branch protection on `main`: squash merge only, linear history, required checks
= CI plus the title gate. Deleting the branch on merge is a repo setting.

### 9. Verify on the real repo

First push to `main` opens the release PR, which should show a CI run started by
the dispatch. Merge it, then check the outcomes the green workflow does not
prove:

```bash
gh release view v0.5.0 --json tagName,assets,body
git ls-remote --tags origin | grep v0.5.0
```

A release with no asset means the build hook was left commented out.

---

## Procedure: cut a release

1. Merge conventional PRs into `main` as usual. Release Please rewrites its open
   release PR after every merge.
2. Ready to ship means: merge the release PR. That is the whole release.
3. Hotfix: open a `fix:` PR, merge it, then merge the refreshed release PR.
4. Pre-1.0 house rule, `bump-minor-pre-major: true` plus
   `bump-patch-for-minor-pre-major: false` in every template: `feat:` moves the
   minor, `fix:` moves the patch, and a breaking change also moves the minor
   instead of jumping to `1.0.0`. Going to `1.0.0` is a deliberate `Release-As:
   1.0.0` commit footer, never an accident.
5. `feat!:` or a `BREAKING CHANGE:` footer is for a break the consumer must
   act on: a removed API, a renamed config key, a migration that is not
   automatic. Internal refactors are `refactor:`, not `feat!:`.
6. Nothing to release means no release PR is open. That is the correct state,
   not a broken workflow.

---

## Conventions

- Tags are `vX.Y.Z`, with the `v`. Versions inside manifests have no `v`.
- Release assets are named `<artifact>-<tag>.<ext>` with a `.sha256` sidecar.
  Only the node build hook does this today: the rust hook uploads the bare
  binary name (its `.sha256` sidecar keeps the same bare name), and the tauri hook uploads the NSIS `.exe` as built with no
  sidecar (kept byte-identical to `zyx1121/ai-app-store#3`).
- One release workflow file per repo, named `.github/workflows/release-please.yml`.
- No hand-written tags, hand-edited versions, or hand-edited changelog entries.
  The next release PR overwrites the last two.
- Conventional Commits scope is optional, subject is lowercase, no trailing period.

---

## Reference

Standards: SemVer 2.0.0 (<https://semver.org/spec/v2.0.0.html>), Conventional
Commits 1.0.0 (<https://www.conventionalcommits.org/en/v1.0.0/>), Release Please
(<https://github.com/googleapis/release-please>), Keep a Changelog 1.1.0
(<https://keepachangelog.com/en/1.1.0/>), Trunk-Based Development
(<https://trunkbaseddevelopment.com/>), PR title lint via
`amannn/action-semantic-pull-request`.

House choices on top of them:

- Changelog shows only `feat`, `fix`, `perf`; every other type is a hidden
  section in the config templates. The only hand-written part of
  `CHANGELOG.md` is the header from `CHANGELOG.seed.md`.
- No release branches: every commit on `main` is releasable.
- No repo holds a release secret. The action runs on `GITHUB_TOKEN` and the
  release PR gets CI through the `ci.yml` dispatch in step 7.
- Container images are tagged with the git SHA; a floating `vX.Y.Z` tag may
  point at a SHA, never the other way round.
- Signing and provenance are named, not implemented: cosign
  (<https://www.sigstore.dev/>), SLSA provenance (<https://slsa.dev/>, via
  `actions/attest-build-provenance`), and Windows code signing all go in the
  build hook between build and upload. Adopt per repo when a consumer checks
  them, and record the decision in an ADR.

---

## Assets

| File | Use |
|---|---|
| `release-please-config.<stack>.json` | node, rust, rust-workspace, python, tauri, generic |
| `release-please.yml` | the release workflow, one commented build hook per stack |
| `pr-title.yml` | conventional PR title check, standalone or pasted into `ci.yml` |
| `CHANGELOG.seed.md` | Keep a Changelog header |
| `check-versions.ts` | multi-manifest agreement guard, tauri only |
