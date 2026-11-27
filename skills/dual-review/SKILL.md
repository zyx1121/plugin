---
name: dual-review
description: "Review a high-risk change with three models: the zyx reviewer agent (Claude), a Codex adversarial review and a Gemini 4 Neon review run in parallel, then sort every finding into four buckets where only Act on blocks the merge. Use when a change touches auth, secrets, migrations, deletes, the lab door, money, email, third-party writes, DNS or certificates, or when Loki or a project memory asks for a review. Triggers on 'dual review', 'review this', '送審', '審一下', '雙模型審', 'codex review', 'gemini review', 'adversarial review', 'high-risk review'. NOT low-risk changes: they merge on green CI plus one real run."
---

# dual-review

Three models review the same change: Claude, Codex and Gemini. Findings that
two or more raise are the strongest signal. The name stays `dual-review`.
The lead sorts every finding into one of four buckets, and only **Act on**
blocks the merge. Claude Code only: it needs the Agent tool.

The gate and the round limit come from ADR-0015 and do not change: review
high-risk changes only, at most two rounds.

## 1. Scope and intent

1. Commit the change on a branch and push it. Codex and Gemini review the
   pushed commit on the sandbox, so local work is invisible to them.
2. Make a private directory for this review (`D=$(mktemp -d)`) and write
   the intent in one paragraph to `$D/intent.md`: what the change must do,
   and the risk that made it high-risk. Every reviewer gets this paragraph.
3. Note the CI state. Checks that are already green are not rerun.

## 2. Run all three reviewers in one message

Send the three calls in the same response so they run in parallel.

Codex and Gemini, each as its own Bash call with `run_in_background: true`,
from the repo root. `$SKILL_DIR` is this skill's base directory, shown when
the skill loads; stop if `review.sh` is not there.

```bash
R="$SKILL_DIR/scripts/review.sh"  # D is the review dir from step 1
bash "$R" codex  --intent "$D/intent.md" --base main > "$D/codex.json"
bash "$R" gemini --intent "$D/intent.md" --base main > "$D/gemini.json"
```

- Each run makes a fresh clone of the pushed commit on the sandbox under
  `~/p/<org>/<repo>/review-<branch>-<hash>/<model>/`. The hash includes the
  name of `$D`, so keep the same `$D` for round 2 and use a new one for a
  separate review of the same branch (or pass `--review-id`). `claim --reap` deletes
  it after 24 hours idle.
- The reviewer runs in a bwrap jail: it sees the checkout and its own
  sign-in, nothing else in the home directory. Inside it may run commands and
  tests and edit files to prove an exploit. Nothing is pushed back.
  Its writable trees are size-capped tmpfs (checkout 2 GiB), so a runaway test
  cannot fill the sandbox disk.
- Codex runs `codex exec`, Gemini runs `agy` with `gemini-4-neon-high`. Add
  `--effort xhigh` to either for the riskiest changes.
- The jail has no network of its own. Model traffic goes through a loopback
  relay to an allowlist proxy outside (`scripts/allowed-hosts.txt`), so the
  reviewer cannot reach sandbox loopback services or other hosts.
- Both return one JSON object that follows `scripts/finding.schema.json`:
  a verdict and findings with severity, status, file, line, failure and fix,
  plus `model`, `sha` and `round`.
- Use `--base <branch>` when the branch is not cut from `main`. The base
  must be a branch on origin, not a tag.
- If one leg fails, the script says why. Continue with the others and say so
  in the report.

Claude, through the Agent tool:

- `subagent_type: zyx:reviewer`, with the same intent paragraph, the
  acceptance criteria, the risk level, the round number and the CI state.
- State where to run tests (the sandbox by default) in the prompt.
- If the repo has a verify skill (`.claude/skills/verify/SKILL.md`), point
  the reviewer at it so it drives the real app the same way.

## 3. Sort the findings

List the Codex and Gemini findings side by side, sorted by file and line, so
findings about the same spot sit next to each other:

```bash
jq -s -r --arg sha "$(git rev-parse HEAD)" '
  if all(.[]; .sha == $sha) then . else error("report from another commit") end
  | [.[] | .model as $m | .findings[] | . + {model: $m}] | sort_by(.file, .line)[]
  | "\(.file):\(.line)  \(.model)  \(.severity)  \(.status)  \(.title)"' "$D/codex.json" "$D/gemini.json"
```

Add the reviewer's findings by hand. Merge findings that describe the same
problem and mark which models raised each. Then put each one in exactly one
bucket:

| Bucket | What goes in | Effect |
|---|---|---|
| Act on | Security hole, data loss or corruption, wrong external side effect, broken existing feature, crash on a common path | Blocks the merge; fix before round 2 |
| Consider | Real, but the cost of fixing now may outweigh it | Ask Loki only if it changes a business rule; else open an issue |
| Noted | Valid but not actionable now | One line in the report |
| Dismissed | Wrong, a nitpick, or missing context | One line with the reason |

Rules for sorting:

- A finding raised by two or more models goes to Act on unless the lead can show it
  is wrong. Write that proof in Dismissed.
- A finding from one model only needs the lead to reproduce it or trace the
  code path before it goes to Act on.
- Wording, formatting, lint and style never go to Act on. CI owns lint.
- The reviewer's `blocking` items are candidates for Act on, not automatic
  ones. Its `issues` start in Consider or Noted.

## 4. Round 2

- Fix every Act on item, commit, then resume the same `zyx:reviewer` with the
  list. It confirms each fix and checks that the fix broke nothing else.
- Push the fixes, then run Codex and Gemini again with `--round 2`. Each
  resumes its round 1 conversation, so it checks its own findings against
  the new HEAD and marks each `fixed` or `still_open`.
- A new finding in round 2 blocks only for a security hole or data loss. The
  rest become issues. There is no round 3.

## 5. Report

```
intent:     one paragraph
reviewers:  reviewer (Claude) N, Codex N, Gemini N findings
act on:     [item, raised by, where, status after fix]
consider:   [item, raised by, trade-off, issue link]
noted:      [one line each]
dismissed:  [item, reason]
agreement:  where the models agreed or split, and what that says
```

Merge only when Act on is empty or every item in it is fixed and confirmed,
and the PR checks are green.
