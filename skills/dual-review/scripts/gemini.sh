#!/usr/bin/env bash
# Run Gemini 4 Neon through the Antigravity CLI (agy), read-only.
#
#   gemini.sh review [--base <ref>] [--effort <level>] [risk focus...]
#   gemini.sh ask    [--effort <level>] <prompt...>
#
# review: sends the diff from the merge base of <ref> (default main) to the
#         working tree, and asks for an adversarial review.
# ask:    sends the prompt as is, for a second opinion or an investigation.
#
# Effort is low, medium, high (default) or xhigh. The run cannot write files
# or run commands: plan mode, plus per-session deny rules, plus a check that
# the git working tree is unchanged afterwards. It can still read files.
set -euo pipefail

die() { echo "gemini.sh: $*" >&2; exit 2; }

command -v agy >/dev/null 2>&1 || die "agy not found. Install it with
  curl -fsSL https://antigravity.google/cli/install.sh | bash
then run 'agy' once in a terminal to sign in."
command -v jq >/dev/null 2>&1 || die "jq not found."

cmd=${1:-}
[[ -n $cmd ]] && shift
base=main
effort=high
while [[ $# -gt 0 ]]; do
  case $1 in
    --base) base=${2:?--base needs a ref}; shift 2 ;;
    --effort) effort=${2:?--effort needs a level}; shift 2 ;;
    --) shift; break ;;
    *) break ;;
  esac
done
case $effort in low|medium|high|xhigh) ;; *) die "effort must be low, medium, high or xhigh" ;; esac
rest="$*"

case $cmd in
  review)
    git rev-parse --show-toplevel >/dev/null 2>&1 || die "review must run inside a git repository"
    cd "$(git rev-parse --show-toplevel)"
    diff=$(git diff --merge-base "$base") || die "cannot diff against $base"
    [[ -n $diff ]] || die "no changes against $base"
    prompt="You are an adversarial code reviewer. Try to break the change below, do not praise it.
Look for: security holes, data loss or corruption, wrong external side effects, broken existing behavior, crashes on common paths, and claims the code does not back up.
Skip style, wording, formatting and lint.
You may read any file in this repository for context. Do not edit files or run commands.

Risk focus: ${rest:-none given}

Report each finding as:
- [severity: blocking|issue|nit] path:line: what is wrong
  failure: concrete input or state, and the wrong result
  fix: one line
End with one line: 'verdict: pass' or 'verdict: fail'. If you find nothing, say so and give 'verdict: pass'.

Diff against the merge base of $base:

$diff"
    ;;
  ask)
    [[ -n $rest ]] || die "ask needs a prompt"
    prompt="$rest

You may read files in the current directory for context. Do not edit files or run commands. Cite file:line or a URL for each claim."
    ;;
  *) die "usage: gemini.sh review [--base <ref>] [--effort <level>] [focus] | gemini.sh ask [--effort <level>] <prompt>" ;;
esac

(( ${#prompt} < 900000 )) || die "prompt is ${#prompt} bytes, over the 900000 limit; narrow the diff"

snapshot() { git status --porcelain=v1 -uall 2>/dev/null; git diff 2>/dev/null | shasum; }
in_git=false
git rev-parse --show-toplevel >/dev/null 2>&1 && in_git=true
$in_git && before=$(snapshot)

settings='{"permissions":{"deny":["write_file(*)","command(*)"]}}'
out=$(agy -p="$prompt" --mode=plan --model "gemini-4-neon-$effort" \
  --print-timeout 900s --settings "$settings" --output-format json) || true

if $in_git && [[ $(snapshot) != "$before" ]]; then
  die "the working tree changed during the Gemini run; inspect 'git status' before trusting anything"
fi

status=$(printf "%s" "$out" | jq -r '.status // "ERROR"' 2>/dev/null || echo ERROR)
[[ $status == SUCCESS ]] || die "agy failed (status $status): $(printf "%s" "$out" | head -c 2000)"
printf '%s' "$out" | jq -r '.response'
printf "%s" "$out" | jq -r '"[gemini-4-neon-'"$effort"'] tokens in \(.usage.input_tokens // "?") out \(.usage.output_tokens // "?") thinking \(.usage.thinking_tokens // "?")"' >&2
