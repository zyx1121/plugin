# ADR-0017: High-risk reviews run two models and sort findings into four buckets

- Status: accepted
- Date: 2026-10-23

## Context

ADR-0015 cut reviews down to high-risk changes and two rounds. Two problems
remain:

- The only reviewer is Claude reviewing work that Claude wrote. Its blind
  spots match the author's.
- The verdict is `pass` or `fail`. A finding is either blocking or ignored, so
  the lead has no place for "real, but not now".

Cursor's pstack plugin (`pstack/skills/interrogate`) solves both: reviewers on
different models challenge the same diff, and the lead sorts every finding
into Act on, Consider, Noted or Dismissed. Loki asked to adopt it with Codex,
which is already installed, and to keep the ADR-0015 gate.

A trial on 2026-10-23 ran `codex-companion.mjs adversarial-review --wait` on a
two-line auth bypass. It took 23 seconds and reported the bypass as high.

## Decision

- New skill `dual-review`. For a high-risk change the lead runs `zyx:reviewer`
  and a Codex adversarial review in parallel, merges the findings and sorts
  them into four buckets. Only Act on blocks the merge.
- A finding that both models raise goes to Act on unless the lead proves it
  wrong. A single-model finding needs a reproduction or a traced code path.
- The `reviewer` agent and its contract do not change. Its `blocking` items
  are candidates for Act on.
- The ADR-0015 gate and the two-round limit stay. Round 2 reruns Codex only
  when a fix changed the design.

## Consequences

- Each high-risk review costs one extra Codex run, about 30 seconds for a
  small diff, and uses Loki's Codex quota.
- Low-risk changes are unaffected.
- If Codex cannot run, the review continues with `reviewer` alone and the
  report says so.
