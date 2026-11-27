---
name: dual-review
description: "Review a high-risk change with three models: the zyx reviewer agent (Claude), a Codex adversarial review and a Gemini 4 Neon review run in parallel, then sort every finding into four buckets where only Act on blocks the merge. Use when a change touches auth, secrets, migrations, deletes, the lab door, money, email, third-party writes, DNS or certificates, or when Loki or a project memory asks for a review. Triggers on 'dual review', 'review this', '送審', '審一下', '雙模型審', 'codex review', 'gemini review', 'adversarial review', 'high-risk review'. NOT low-risk changes: they merge on green CI plus one real run."
---

# dual-review

Three models review the same change: Claude, Codex and Gemini. Findings that
two or more raise are the strongest signal. The name stays `dual-review`. The lead sorts every finding into one of four buckets, and only
**Act on** blocks the merge. Claude Code only: it needs the Agent tool.

The gate and the round limit come from ADR-0015 and do not change: review
high-risk changes only, at most two rounds.

## 1. Scope and intent

1. Commit the change on a branch. Codex reviews git state, so uncommitted
   work is invisible to a branch review.
2. Write the intent in one paragraph: what the change must do, and the risk
   that made it high-risk. Every reviewer gets the same paragraph.
3. Note the CI state. Checks that are already green are not rerun.

## 2. Run all three reviewers in one message

Send the three calls in the same response so they run in parallel.

Codex, in the background, from the repo root:

```bash
C=~/.claude/plugins/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs
node "$C" adversarial-review --wait --base main "<risk focus in one line>"
```

- Run it with `run_in_background: true`. A small diff takes about 30 seconds.
- Use `--base <ref>` when the branch is not cut from `main`.
- If the script is missing, run `/codex:setup` once. If Codex still cannot
  run, continue with the reviewer alone and say so in the report.

Gemini, in the background, from the repo root:

```bash
G=$(ls -d ~/.claude/plugins/cache/zyx1121/zyx/*/ | sort -V | tail -1)skills/dual-review/scripts/gemini.sh
bash "$G" review --base main "<risk focus in one line>"
```

- Run it with `run_in_background: true`. It sends the diff from the merge
  base to the working tree to `gemini-4-neon-high` through the Antigravity
  CLI (`agy`), and can read the repo for context.
- The run cannot write files or run commands: plan mode, deny rules for
  `write_file` and `command`, and a check that the working tree is unchanged.
- If `agy` is missing or signed out, the script says how to fix it. Continue
  with the other two reviewers and say so in the report.

Claude, through the Agent tool:

- `subagent_type: zyx:reviewer`, with the intent paragraph, the acceptance
  criteria, the risk level, the round number and the CI state.
- State where to run tests (the sandbox by default) in the prompt.
- If the repo has a verify skill (`.claude/skills/verify/SKILL.md`), point
  the reviewer at it so it drives the real app the same way.

## 3. Sort the findings

Merge findings that describe the same problem. Mark which model raised each.
Then put each one in exactly one bucket:

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
- Rerun Codex and Gemini only when a fix changed the design, not for a
  one-line fix.
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
