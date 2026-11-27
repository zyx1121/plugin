#!/usr/bin/env bash
# Runs on the sandbox host, fed through `ssh sandbox bash -s` by review.sh.
# Every argument arrives base64-encoded, so ssh never re-parses user data:
#   model repo branch sha base round effort intent schema
# All work happens inside main(), so bash has read the whole script before
# any child process can touch stdin.
set -euo pipefail

main() {
  export PATH="$HOME/.local/bin:$PATH"
  die() { echo "remote.sh: $*" >&2; exit 2; }
  d() { printf '%s' "$1" | base64 -d; }

  [[ $# -eq 9 ]] || die "expected 9 arguments, got $#"
  local model repo branch sha base round effort intent
  model=$(d "$1") repo=$(d "$2") branch=$(d "$3") sha=$(d "$4")
  base=$(d "$5") round=$(d "$6") effort=$(d "$7") intent=$(d "$8")

  [[ $model == codex || $model == gemini ]] || die "bad model"
  [[ $repo =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ && $repo != *..* ]] || die "bad repo"
  git check-ref-format --branch "$branch" >/dev/null 2>&1 || die "bad branch"
  git check-ref-format --branch "$base" >/dev/null 2>&1 || die "bad base"
  [[ $sha =~ ^[0-9a-f]{40}$ ]] || die "bad sha"
  [[ $round == 1 || $round == 2 ]] || die "bad round"
  [[ $effort =~ ^(low|medium|high|xhigh)$ ]] || die "bad effort"
  [[ -n $intent ]] || die "empty intent"

  # One dir per branch: a readable slug plus a hash, so feat/a and feat-a differ.
  local key work src state home
  key=$(printf '%s' "$branch" | tr -c 'A-Za-z0-9._-' '-' | cut -c1-40)-$(printf '%s' "$repo:$branch" | sha256sum | cut -c1-16)
  work=$HOME/p/$repo/review-$key
  src=$work/$model
  state=$work/$model.state
  home=$work/$model.home
  # Only touch a dir this script created: a new one gets an owner marker, an
  # existing one without the marker is someone else's.
  if [[ -e $work ]]; then
    [[ -f $work/.review-owner ]] || die "$work exists but was not made by review.sh"
  else
    mkdir -p "$work" && printf '%s\n' "$repo:$branch" > "$work/.review-owner"
  fi
  [[ $(cat "$work/.review-owner") == "$repo:$branch" ]] || die "$work belongs to another branch"
  mkdir -p "$state"
  touch "$work/.seeded" # `claim --reap` deletes the dir after 24 h idle

  exec 9>"$work/$model.lock"
  flock -n 9 || die "another $model review of $branch is running"

  # $state is host-only: it is never mounted into the jail, so a reviewer
  # cannot plant symlinks where the host writes.
  rm -f -- "$state/schema.json"
  d "$9" > "$state/schema.json"
  # A new round 1 voids any earlier session, so round 2 never resumes a stale one.
  [[ $round == 1 ]] && rm -f -- "$state/id"

  # The CLI home the reviewer sees: a per-review copy holding only the sign-in,
  # never the real ~/.codex or ~/.gemini, so a reviewer cannot plant config,
  # hooks or plugins that would run outside the jail later. Sessions stay in
  # it for round 2. rm before cp, so a planted symlink is replaced, not followed.
  mkdir -p "$home"
  case $model in
    codex)
      rm -f -- "$home/auth.json"
      cp -- "$HOME/.codex/auth.json" "$home/auth.json" || die "codex is not signed in on the sandbox"
      ;;
    gemini)
      mkdir -p "$home/antigravity-cli"
      rm -f -- "$home/antigravity-cli/antigravity-oauth-token"
      cp -- "$HOME/.gemini/antigravity-cli/antigravity-oauth-token" "$home/antigravity-cli/" \
        || die "agy is not signed in on the sandbox"
      ;;
  esac

  # A fresh full clone every round: nothing from an earlier run survives, and
  # the diff never needs a lazy fetch, which would need credentials the jail hides.
  rm -rf -- "$src"
  gh repo clone "$repo" "$src" -- -q </dev/null >&2 || die "clone of $repo failed"
  git -C "$src" fetch -q origin "+refs/heads/$base:refs/remotes/origin/$base" "$sha" </dev/null \
    || die "fetch failed: base must be a branch on origin"
  git -C "$src" checkout -q --detach "$sha" || die "commit $sha not found on origin"

  local prompt
  if [[ $round == 1 ]]; then
    prompt="You are an adversarial code reviewer for $repo, branch $branch at commit $sha. Try to break the change; do not praise it.

Intent from the author:
$intent

Review the change from the merge base of origin/$base to HEAD. Start with: git diff origin/$base...HEAD

This checkout is disposable and you run in a jail: you may read files, run commands and tests, and edit files to prove an exploit or a fix. Nothing you change is kept. Do not push and do not call external services the project talks to.

Look for: security holes, data loss or corruption, wrong external side effects, broken existing behavior, crashes on common paths, and claims the code does not back up. Skip style, wording, formatting and lint; CI owns those.
Every finding needs a concrete failure: the input or state, and the wrong result. Prefer findings you reproduced. Mark every finding status \"new\". Give verdict \"fail\" if any finding is blocking."
  else
    prompt="The author pushed fixes. This is a fresh checkout of $branch at $sha. Run: git diff origin/$base...HEAD

For each finding from your previous review, set status \"fixed\" or \"still_open\" after checking the code, and run the reproduction again where you had one. Then check whether the fixes broke anything else; mark such findings \"new\". Only security holes and data loss count as blocking among new findings. Give verdict \"fail\" if any finding that is not fixed is blocking."
  fi

  # The jail: the whole filesystem read-only; home, /tmp and /run replaced by
  # empty tmpfs; then only the checkout (writable), the schema (read-only),
  # the per-review CLI home and the DNS resolver mounted back; and a clean
  # environment. Other repos, gh, ssh keys, the agent socket, user sockets and
  # the other model's tokens are invisible. Network stays open because the
  # model API needs it.
  jail() {
    local args=(--ro-bind / / --tmpfs "$HOME" --tmpfs /tmp --tmpfs /run --dev /dev --proc /proc
      --ro-bind /run/systemd/resolve /run/systemd/resolve
      --ro-bind "$HOME/.local" "$HOME/.local"
      --ro-bind "$state/schema.json" "$HOME/.review-schema.json"
      --bind "$src" "$src" --chdir "$src" --die-with-parent
      --clearenv --setenv HOME "$HOME" --setenv PATH "$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
      --setenv LANG C.UTF-8 --setenv TERM dumb)
    case $model in
      gemini) args+=(--bind "$home" "$HOME/.gemini") ;;
      codex) args+=(--bind "$home" "$HOME/.codex") ;;
    esac
    bwrap "${args[@]}" "$@" </dev/null
  }

  case $model in
    gemini)
      [[ -x $HOME/.local/bin/agy ]] || die "agy is not installed on the sandbox"
      local settings='{"permissions":{"allow":["command(*)","write_file(*)","read_file(*)"]}}'
      local args=(-p="$prompt" --model "gemini-4-neon-$effort" --output-format json
        --json-schema "$HOME/.review-schema.json" --settings "$settings" --print-timeout 1500s)
      if [[ $round == 2 ]]; then
        local id; id=$(cat "$state/id" 2>/dev/null || true)
        [[ -n $id && $id != null ]] || die "no round 1 conversation to resume"
        args+=(--conversation "$id")
      fi
      jail "$HOME/.local/bin/agy" "${args[@]}" > "$state/raw.json" 2> "$state/err" || true
      [[ $(jq -r '.status // "ERROR"' "$state/raw.json" 2>/dev/null) == SUCCESS ]] \
        || die "agy failed: $(tail -c 2000 "$state/err") $(head -c 2000 "$state/raw.json")"
      local tid; tid=$(jq -r '.conversation_id // empty' "$state/raw.json")
      jq -r '.response' "$state/raw.json" > "$state/out.json"
      ;;
    codex)
      [[ -x $HOME/.local/bin/codex ]] || die "codex is not installed on the sandbox"
      # Codex cannot nest its own bwrap sandbox inside the jail, so the jail
      # is the sandbox and Codex runs with full access inside it.
      local common=(-c "model_reasoning_effort=$effort" --output-schema "$HOME/.review-schema.json"
        --json --skip-git-repo-check)
      if [[ $round == 1 ]]; then
        jail "$HOME/.local/bin/codex" exec -C "$src" -s danger-full-access "${common[@]}" "$prompt" \
          > "$state/events.jsonl" 2> "$state/err" || die "codex failed: $(tail -c 2000 "$state/err")"
      else
        local id; id=$(cat "$state/id" 2>/dev/null || true)
        [[ -n $id ]] || die "no round 1 session to resume"
        jail "$HOME/.local/bin/codex" exec resume -c sandbox_mode=danger-full-access "${common[@]}" "$id" "$prompt" \
          > "$state/events.jsonl" 2> "$state/err" || die "codex failed: $(tail -c 2000 "$state/err")"
      fi
      # The report is the last agent message on stdout; nothing is read back
      # from a path the reviewer could write.
      jq -s -r 'map(select(.type == "item.completed" and .item.type == "agent_message")) | last | .item.text // empty' \
        "$state/events.jsonl" > "$state/out.json"
      local tid; tid=$(jq -r 'select(.type == "thread.started") | .thread_id' "$state/events.jsonl" | head -1)
      ;;
  esac

  # Exactly one report that matches the schema, then the host's metadata,
  # which the report cannot override.
  jq -e -s '
    length == 1 and (.[0] | type == "object" and (keys == ["findings", "verdict"])
      and (.verdict == "pass" or .verdict == "fail") and (.findings | type == "array")
      and all(.findings[];
        type == "object" and (keys == ["failure", "file", "fix", "line", "severity", "status", "title"])
        and (.severity | IN("blocking", "issue", "nit")) and (.status | IN("new", "still_open", "fixed"))
        and (.line | type == "number" and . == floor) and ([.file, .title, .failure, .fix] | all(type == "string"))))' \
    "$state/out.json" >/dev/null 2>&1 || die "$model returned no valid report: $(head -c 2000 "$state/out.json")"
  # Codex may rotate its refresh token during the run. Copy a newer sign-in
  # back only if it is a regular file with a newer last_refresh, so the host
  # copy stays valid and a reviewer cannot swap in anything else.
  if [[ $model == codex && -f $home/auth.json && ! -L $home/auth.json ]] \
    && jq -e --slurpfile host "$HOME/.codex/auth.json" \
      '(.tokens.refresh_token | type == "string") and ((.last_refresh // "") > ($host[0].last_refresh // ""))' \
      "$home/auth.json" >/dev/null 2>&1; then
    install -m 600 -- "$home/auth.json" "$HOME/.codex/auth.json.review" && mv -f -- "$HOME/.codex/auth.json.review" "$HOME/.codex/auth.json"
  fi

  # Publish the session id only after a valid report, so round 2 resumes this run.
  [[ -n ${tid:-} && ${tid:-} != null ]] && printf '%s\n' "$tid" > "$state/id"
  jq -c --arg m "$model" --arg s "$sha" --argjson r "$round" '. + {model: $m, sha: $s, round: $r}' "$state/out.json"
}

main "$@"
