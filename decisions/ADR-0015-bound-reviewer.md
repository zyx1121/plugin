# ADR-0015: Review only high-risk changes, at most two rounds

- Status: accepted
- Date: 2026-10-03

## Context

Since 2026-09-28 the lead writes all code itself and sends every code delivery
to `reviewer` (dotfiles #6). Loki reported that every implementation now feels
slow. A retro over 30 days of transcripts (2026-09-03 to 2026-10-03) found:

- 152 `reviewer` dispatches ran 314 rounds. 162 of them were the lead resuming
  the same reviewer after a fix. Round 1 failed 73% of the time.
- The loop had no exit. Each new round hunted for fresh edge cases instead of
  confirming the fixes: one Caelum PR ran 22 rounds over 8 hours, two others
  ran 16 and 14.
- On low-risk changes the blocking items were often wording or polish: a PR
  body, a README sentence, a DESIGN.md line, a prettier failure that CI had
  already reported, a photo angle.
- The catches that paid for the cost sat in a narrow band: session fixation
  through cookie tossing and an open redirect (auth), a door tool reporting
  "stayed locked" when it could not know, an HR sign-out that fired a sign-in,
  an editor save queue writing patches onto the wrong shape, certificates left
  behind in a Vercel team transfer.
- In the 43 sessions that used `reviewer`, the lead sat blocked on it for 29
  of 213 working hours (14%), before counting the fix work between rounds.

## Decision

- The lead dispatches `reviewer` only for high-risk changes, where a mistake
  leaks data, destroys data, or acts on the outside world: auth, permissions
  and secrets; migrations, deletes and save paths; the lab door, money, email,
  writes to third-party systems; DNS, certificates and platform moves. Loki or
  a project memory can still ask for a review. Everything else merges on green
  CI plus one real run, and is fixed forward.
- A review has at most two rounds. Round 2 only confirms that each round-1
  blocking item is fixed and that the fix broke nothing else. A new finding in
  round 2 blocks only for a security hole or data loss; the rest become issues.
- `blocking` is reserved for what normal use or a real attacker would hit:
  security holes, data loss or corruption, wrong external side effects, broken
  existing features, crashes on common paths. Wording, formatting, style, perf
  hints and contrived edge cases go to `issues`.
- `reviewer` does not rerun checks that CI already passed. Its time goes to
  targeted reproduction of the claims and the risk points.

## Consequences

- **+** Low-risk work ships at CI speed. Loki's personal sites already treat
  production as the place to look and fix forward.
- **+** Every review has a known end, so a PR can no longer stall for hours in
  a find, fix and find-again loop.
- **-** Some medium bugs now reach production and are found by use, such as a
  cached home page not refreshing after a create.
- **-** The lead has to classify risk up front. The trigger list leans broad
  (save paths and external writes count as high-risk) so that a misread change
  errs toward review.
