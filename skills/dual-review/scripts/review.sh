#!/usr/bin/env bash
# Run the Codex or Gemini leg of dual-review on the sandbox host.
#
#   review.sh <codex|gemini> --intent <file> [--base main] [--round 1|2] [--effort high] [--review-id <id>]
#
# Run from the repo root on a pushed branch. The sandbox makes a fresh clone
# of the commit under ~/p/<org>/<repo>/review-<branch>-<hash>/<model>/ (the hash covers the branch and a review id) and
# runs the reviewer in a bwrap jail that sees only that checkout and its own
# sign-in. Prints one JSON object: finding.schema.json plus model, sha, round.
# Round 2 resumes the round 1 conversation against the new HEAD.
set -euo pipefail

die() { echo "review.sh: $*" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd)

model=${1:-}
case $model in codex|gemini) shift ;; *) die "usage: review.sh <codex|gemini> --intent <file> [--base main] [--round 1|2] [--effort high] [--review-id <id>]" ;; esac
base=main round=1 effort=high intent_file= review_id=
while [[ $# -gt 0 ]]; do
  case $1 in
    --intent) intent_file=${2:?}; shift 2 ;;
    --base) base=${2:?}; shift 2 ;;
    --round) round=${2:?}; shift 2 ;;
    --effort) effort=${2:?}; shift 2 ;;
    --review-id) review_id=${2:?}; shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[[ -s $intent_file ]] || die "--intent must name a non-empty file with the intent paragraph"
# The review id keeps two reviews of one branch apart. Default: the name of the
# intent file's directory (the mktemp dir), which both rounds of a review share.
[[ -n $review_id ]] || review_id=$(basename "$(cd "$(dirname "$intent_file")" && pwd)")
[[ $review_id =~ ^[A-Za-z0-9_.-]{1,64}$ ]] || die "review id must be 1-64 chars of A-Z a-z 0-9 . _ -"
case $round in 1|2) ;; *) die "round must be 1 or 2" ;; esac
case $effort in low|medium|high|xhigh) ;; *) die "effort must be low, medium, high or xhigh" ;; esac

git rev-parse --show-toplevel >/dev/null 2>&1 || die "run inside a git repository"
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner) || die "cannot resolve the GitHub repo"
branch=$(git branch --show-current)
[[ -n $branch ]] || die "detached HEAD; check out the branch under review"
sha=$(git rev-parse HEAD)
[[ -z $(git status --porcelain --untracked-files=no) ]] || die "uncommitted changes; the sandbox reviews only pushed commits"
# ls-remote matches by suffix, so keep only the exact ref.
remote_sha=$(git ls-remote origin "refs/heads/$branch" | awk -v r="refs/heads/$branch" '$2 == r {print $1}')
[[ -n $remote_sha ]] || die "branch $branch is not on origin; push it first"
[[ $remote_sha == "$sha" ]] || die "origin has $branch at ${remote_sha:0:7}, HEAD is ${sha:0:7}; push first"

# ssh joins its arguments into one string for the remote shell, so every
# value travels base64-encoded and remote.sh decodes and validates it.
e() { printf '%s' "$1" | base64 | tr -d '\n'; }
ssh -o BatchMode=yes sandbox bash -s -- \
  "$(e "$model")" "$(e "$repo")" "$(e "$branch")" "$(e "$sha")" "$(e "$base")" \
  "$(e "$round")" "$(e "$effort")" "$(e "$(cat "$intent_file")")" \
  "$(e "$(cat "$here/finding.schema.json")")" "$(e "$review_id")" \
  "$(e "$(cat "$here/proxy.ts")")" "$(e "$(cat "$here/relay.ts")")" "$(e "$(cat "$here/allowed-hosts.txt")")" < "$here/remote.sh"
