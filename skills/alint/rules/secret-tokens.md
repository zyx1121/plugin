---
id: secret-tokens
engine: grep
files: ["**"]
exclude: ["**/*.lock", "**/bun.lock", "**/package-lock.json"]
pattern: "(glpat-[0-9A-Za-z_-]{20}|gh[pousr]_[0-9A-Za-z]{36}|github_pat_[0-9A-Za-z_]{40}|sk-[A-Za-z0-9_-]{32}|sk_live_[0-9A-Za-z]{24}|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10}|-----BEGIN [A-Z ]*PRIVATE KEY-----)"
source: memory kilo-keychain, secrets-in-transcripts
---

A token or private key in the diff. Secrets live in the login keychain
(`kilo/<system>`) or the server's env file, never in a repo, a test fixture
or a doc example. Rotate any key that reached a pushed commit.

## Bad

`const token = "glpat-AbCdEf..."`

## Good

`const token = process.env.GITLAB_TOKEN`
