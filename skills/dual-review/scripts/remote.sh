#!/usr/bin/env bash
# Runs on the sandbox host, fed through `ssh sandbox bash -s` by review.sh.
# Args: model repo branch sha base round effort intent_b64 schema_b64
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

die() { echo "remote.sh: $*" >&2; exit 2; }
model=$1 repo=$2 branch=$3 sha=$4 base=$5 round=$6 effort=$7
intent=$(printf '%s' "$8" | base64 -d)

slug=$(printf '%s' "$branch" | tr -c 'A-Za-z0-9._-' '-' | cut -c1-60)
work=$HOME/p/$repo/review-$slug
src=$work/$model
state=$work/.state
mkdir -p "$state"
touch "$work/.seeded" # `claim --reap` deletes the dir after 24 h idle
printf '%s' "$9" | base64 -d > "$state/schema.json"

# One disposable checkout per model, so parallel reviewers never collide.
if [[ ! -d $src/.git ]]; then
  gh repo clone "$repo" "$src" -- -q --filter=blob:none >&2 || die "clone of $repo failed"
fi
git -C "$src" fetch -q origin "$base" "$branch" || die "fetch failed"
git -C "$src" checkout -q -f --detach "$sha" || die "commit $sha not found on origin"
git -C "$src" clean -q -fd

if [[ $round == 1 ]]; then
  prompt="You are an adversarial code reviewer for $repo, branch $branch at commit $sha. Try to break the change; do not praise it.

Intent from the author:
$intent

Review the change from the merge base of origin/$base to HEAD. Start with: git diff origin/$base...HEAD

This checkout is disposable. You may read any file, run commands and tests, and edit files to prove an exploit or a fix; nothing you change is kept. Do not push, do not write outside this directory, and do not call external services the project talks to.

Look for: security holes, data loss or corruption, wrong external side effects, broken existing behavior, crashes on common paths, and claims the code does not back up. Skip style, wording, formatting and lint; CI owns those.
Every finding needs a concrete failure: the input or state, and the wrong result. Prefer findings you reproduced. Mark every finding status \"new\". Give verdict \"fail\" if any finding is blocking."
else
  prompt="The author pushed fixes. HEAD is now $sha on $branch. Run: git diff origin/$base...HEAD

For each finding from your previous review, set status \"fixed\" or \"still_open\" after checking the code, and run the reproduction again where you had one. Then check whether the fixes broke anything else; mark such findings \"new\". Only security holes and data loss count as blocking among new findings. Give verdict \"fail\" if any finding that is not fixed is blocking."
fi

cd "$src"
case $model in
  gemini)
    command -v agy >/dev/null || die "agy is not installed on the sandbox"
    settings='{"permissions":{"allow":["command(*)","write_file(*)","read_file(*)"]}}'
    args=(-p="$prompt" --model "gemini-4-neon-$effort" --output-format json
      --json-schema "$state/schema.json" --settings "$settings" --print-timeout 1500s)
    if [[ $round == 2 ]]; then
      [[ -s $state/gemini.id ]] || die "no round 1 conversation to resume"
      args+=(--conversation "$(cat "$state/gemini.id")")
    fi
    agy "${args[@]}" > "$state/gemini.json" 2> "$state/gemini.err" || true
    status=$(jq -r '.status // "ERROR"' "$state/gemini.json" 2>/dev/null || echo ERROR)
    [[ $status == SUCCESS ]] || die "agy failed: $(tail -c 2000 "$state/gemini.err") $(head -c 2000 "$state/gemini.json")"
    jq -r '.conversation_id' "$state/gemini.json" > "$state/gemini.id"
    jq -r '.response' "$state/gemini.json" > "$state/gemini.out"
    ;;
  codex)
    command -v codex >/dev/null || die "codex is not installed on the sandbox"
    common=(--output-schema "$state/schema.json" -o "$state/codex.out" --json)
    if [[ $round == 1 ]]; then
      codex exec -C "$src" -s workspace-write "${common[@]}" "$prompt" > "$state/codex.events" 2> "$state/codex.err" \
        || die "codex failed: $(tail -c 2000 "$state/codex.err")"
      jq -r 'select(.type == "thread.started") | .thread_id' "$state/codex.events" | head -1 > "$state/codex.id"
    else
      [[ -s $state/codex.id ]] || die "no round 1 session to resume"
      codex exec resume -c sandbox_mode=workspace-write "${common[@]}" "$(cat "$state/codex.id")" "$prompt" \
        > "$state/codex.events" 2> "$state/codex.err" || die "codex failed: $(tail -c 2000 "$state/codex.err")"
    fi
    ;;
esac

jq -c --arg m "$model" --arg s "$sha" --arg r "$round" '. + {model: $m, sha: $s, round: ($r | tonumber)}' "$state/$model.out" \
  || die "$model did not return JSON: $(head -c 2000 "$state/$model.out")"
