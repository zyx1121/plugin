#!/usr/bin/env bash
# Run the Codex or Gemini leg of dual-review on the sandbox host.
#
#   review.sh <codex|gemini> --intent <file> [--base main] [--round 1|2] [--effort high]
#
# Run from the repo root on a pushed branch. The sandbox clones the branch
# into ~/p/<org>/<repo>/review-<branch>/<model>/, a disposable checkout where
# the reviewer may run commands and tests. Prints one JSON object that
# follows finding.schema.json, plus "model" and "sha".
# Round 2 resumes the same conversation with the new HEAD.
set -euo pipefail

die() { echo "review.sh: $*" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd)

model=${1:-}
case $model in codex|gemini) shift ;; *) die "usage: review.sh <codex|gemini> --intent <file> [--base main] [--round 1|2] [--effort high]" ;; esac
base=main round=1 effort=high intent_file=
while [[ $# -gt 0 ]]; do
  case $1 in
    --intent) intent_file=${2:?}; shift 2 ;;
    --base) base=${2:?}; shift 2 ;;
    --round) round=${2:?}; shift 2 ;;
    --effort) effort=${2:?}; shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[[ -f $intent_file ]] || die "--intent must name a file with the intent paragraph"
case $round in 1|2) ;; *) die "round must be 1 or 2" ;; esac
case $effort in low|medium|high|xhigh) ;; *) die "effort must be low, medium, high or xhigh" ;; esac

git rev-parse --show-toplevel >/dev/null 2>&1 || die "run inside a git repository"
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner) || die "cannot resolve the GitHub repo"
branch=$(git branch --show-current)
[[ -n $branch ]] || die "detached HEAD; check out the branch under review"
sha=$(git rev-parse HEAD)
[[ -z $(git status --porcelain --untracked-files=no) ]] || die "uncommitted changes; the sandbox reviews only pushed commits"
git fetch -q origin "$branch" || die "branch $branch is not on origin; push it first"
[[ $(git rev-parse "origin/$branch") == "$sha" ]] || die "origin/$branch is not HEAD; push first"

b64() { base64 < "$1" | tr -d '\n'; }
ssh -o BatchMode=yes sandbox bash -s -- \
  "$model" "$repo" "$branch" "$sha" "$base" "$round" "$effort" \
  "$(b64 "$intent_file")" "$(b64 "$here/finding.schema.json")" < "$here/remote.sh"
