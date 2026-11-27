#!/usr/bin/env bash
# Ask Gemini 4 Neon a question through the Antigravity CLI (agy), read-only.
#
#   gemini.sh ask [--effort <level>] <prompt...>
#
# Runs on this machine in the current directory, so Gemini can read local,
# uncommitted files. Effort is low, medium, high (default) or xhigh.
# The run cannot write files or run commands: plan mode, per-session deny
# rules, and a check that the git working tree is unchanged afterwards.
# Reviews do not use this script: they run on the sandbox through review.sh.
set -euo pipefail

die() { echo "gemini.sh: $*" >&2; exit 2; }

command -v agy >/dev/null 2>&1 || die "agy not found. Install it with
  curl -fsSL https://antigravity.google/cli/install.sh | bash
then run 'agy' once in a terminal to sign in."
command -v jq >/dev/null 2>&1 || die "jq not found."

[[ ${1:-} == ask ]] || die "usage: gemini.sh ask [--effort <level>] <prompt>"
shift
effort=high
while [[ $# -gt 0 ]]; do
  case $1 in
    --effort) effort=${2:?--effort needs a level}; shift 2 ;;
    --) shift; break ;;
    *) break ;;
  esac
done
case $effort in low|medium|high|xhigh) ;; *) die "effort must be low, medium, high or xhigh" ;; esac
[[ $# -gt 0 ]] || die "ask needs a prompt"

prompt="$*

You may read files in the current directory for context. Do not edit files or run commands. Cite file:line or a URL for each claim."
(( ${#prompt} < 900000 )) || die "prompt is ${#prompt} bytes, over the 900000 limit"

# Large here-strings deadlock in bash 5.3 command substitution: pipe instead.
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

status=$(printf '%s' "$out" | jq -r '.status // "ERROR"' 2>/dev/null || echo ERROR)
[[ $status == SUCCESS ]] || die "agy failed (status $status): $(printf '%s' "$out" | head -c 2000)"
printf '%s' "$out" | jq -r '.response'
printf '%s' "$out" | jq -r --arg e "$effort" '"[gemini-4-neon-\($e)] tokens in \(.usage.input_tokens // "?") out \(.usage.output_tokens // "?") thinking \(.usage.thinking_tokens // "?")"' >&2
