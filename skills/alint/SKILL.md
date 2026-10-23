---
name: alint
description: "Agent lint: check the current branch's diff against Loki's house rules before a PR. Rules that a regex can judge run as grep in a script; rules that need reading run in a cheap haiku agent. Rules live one per file, here and in a repo's .alint/rules/. Use before opening a PR, or when a correction from Loki should become a rule instead of more prose. Triggers on 'alint', 'agent lint', 'lint the diff', '跑 alint', '掃規則', '加一條 alint 規則', 'house rules check'. NOT a code review for bugs; that's dual-review."
---

# alint

A repeated correction becomes a rule file, not another paragraph of
instructions. Each rule names the files it covers, a Bad example and a Good
example. `engine: grep` rules run in `scripts/alint.mjs`, which costs nothing.
`engine: model` rules go to the `zyx:alint` agent (haiku), only for the
changed files they cover. Claude Code only: the model half needs the Agent
tool.

## Run it

1. From the repo root, with the work committed or not (uncommitted changes
   count):

   ```bash
   node <this skill's folder>/scripts/alint.mjs --base main --repo .
   ```

   The JSON has `grep` (findings with `file:line`) and `model` (rule ids,
   rule file paths and the files each covers). Use `--base <ref>` when the
   branch is not cut from `main`.
2. If `model` is not empty, dispatch one `zyx:alint` agent with the repo
   path, the `mergeBase`, and each model rule's path and files. Skip the
   agent when `model` is empty.
3. Fix every finding, or dismiss it with a reason. A dismissed finding that
   comes back means the rule is wrong: tighten its text or its Good example.
4. Rerun step 1 after fixing. Open the PR when `grep` is empty and the agent
   reports `total: 0` or only dismissed items.

Run the script where the repo's git history is, which is the MacBook clone or
the sandbox copy with `.git`. It is read-only and needs only Node 22.

## Rule files

One Markdown file per rule. Front matter keys:

| Key | Required | Meaning |
|---|---|---|
| `id` | yes | Kebab-case name, same as the file name |
| `engine` | yes | `grep` or `model` |
| `files` | yes | Quoted globs: `["**/*.{md,tsx}"]`. `**` crosses folders |
| `exclude` | no | Quoted globs to skip |
| `pattern` | grep only | A JavaScript regular expression, tested per added line |
| `requires` | no | A repo path that must exist for the rule to apply |
| `source` | yes | Where the rule came from: a memory name, a PR, a date |

Body: the rule in 2 to 4 sentences, then `## Bad` and `## Good` examples.
Put a literal character the rule forbids as its Unicode name, so the rule
file does not trip the rule.

## Where rules live

- `rules/` next to this file: rules for every repo of Loki's.
- `.alint/rules/` in a repo: rules for that repo only. A repo rule with the
  same `id` replaces the shared one.

## Adding a rule

1. Take a correction Loki has made twice, or a feedback memory.
2. If a regex can decide it, write a `grep` rule. Otherwise write a `model`
   rule with a sharp Bad and Good pair.
3. Add a case to `scripts/alint.test.mjs` for a grep rule, and run
   `node --test scripts/alint.test.mjs`.
4. Name the memory in `source`, and note in the memory that alint now
   checks it.
