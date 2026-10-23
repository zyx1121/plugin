#!/usr/bin/env node
// The deterministic half of alint. Reads the diff against a base, loads the
// rules (this skill's rules/ plus the repo's .alint/rules/, repo wins on the
// same id), runs every `engine: grep` rule on the added lines, and lists the
// `engine: model` rules that apply to the changed files. Prints JSON.
//
//   node alint.mjs [--base main] [--repo .]
//
// No dependencies: Node 22 or later.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const repo = opt("repo", ".");
const base = opt("base", "main");
const skillRules = join(dirname(fileURLToPath(import.meta.url)), "..", "rules");

/** `**` crosses folders, `*` does not, `{a,b}` picks one. */
export function globToRegExp(glob) {
  let out = "";
  let depth = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      out += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += glob[i + 2] === "/" ? 2 : 1;
    } else if (c === "*") out += "[^/]*";
    else if (c === "?") out += "[^/]";
    else if (c === "{") {
      depth++;
      out += "(?:";
    } else if (c === "}" && depth > 0) {
      depth--;
      out += ")";
    } else if (c === "," && depth > 0) out += "|";
    else out += c.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/** Front matter of a rule file: flat `key: value` lines and `[a, b]` lists. */
export function parseRule(text, path) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`${path}: no front matter`);
  const meta = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value.startsWith("[")) {
      // Items are quoted, so commas inside a glob's {a,b} stay put.
      value = [...value.slice(1, -1).matchAll(/"([^"]*)"|'([^']*)'/g)].map(
        (m) => m[1] ?? m[2]
      );
    } else value = value.replace(/^["']|["']$/g, "");
    meta[kv[1]] = value;
  }
  for (const key of ["id", "engine", "files"]) {
    if (!meta[key]) throw new Error(`${path}: missing ${key}`);
  }
  if (meta.engine === "grep" && !meta.pattern) {
    throw new Error(`${path}: a grep rule needs a pattern`);
  }
  return { ...meta, body: match[2].trim(), path };
}

function loadRules(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parseRule(readFileSync(join(dir, name), "utf8"), join(dir, name)));
}

/** Added lines of a unified diff with zero context: file, line, text. */
export function addedLines(diff) {
  const lines = [];
  let file = null;
  let line = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw === "+++ /dev/null" ? null : raw.slice(6);
    } else if (raw.startsWith("@@")) {
      line = Number(raw.match(/\+(\d+)/)[1]);
    } else if (file && raw.startsWith("+")) {
      lines.push({ file, line, text: raw.slice(1) });
      line++;
    }
  }
  return lines;
}

const matches = (rule, file) =>
  rule.files.some((glob) => globToRegExp(glob).test(file)) &&
  !(rule.exclude ?? []).some((glob) => globToRegExp(glob).test(file));

export function run({ rules, diff, exists }) {
  const added = addedLines(diff);
  const changed = [...new Set(added.map((a) => a.file))];
  const active = rules.filter((rule) => !rule.requires || exists(rule.requires));
  const findings = [];
  for (const rule of active.filter((r) => r.engine === "grep")) {
    const re = new RegExp(rule.pattern);
    for (const a of added) {
      if (matches(rule, a.file) && re.test(a.text)) {
        findings.push({ rule: rule.id, file: a.file, line: a.line, text: a.text.trim() });
      }
    }
  }
  const model = active
    .filter((r) => r.engine === "model")
    .map((rule) => ({
      id: rule.id,
      path: rule.path,
      files: changed.filter((file) => matches(rule, file)),
    }))
    .filter((r) => r.files.length > 0);
  return { changed, grep: findings, model };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const byId = new Map();
  for (const rule of [...loadRules(skillRules), ...loadRules(join(repo, ".alint", "rules"))]) {
    byId.set(rule.id, rule);
  }
  // The working tree against the merge base, so uncommitted work counts too.
  const mergeBase = execFileSync("git", ["-C", repo, "merge-base", base, "HEAD"], {
    encoding: "utf8",
  }).trim();
  const diff = execFileSync(
    "git",
    ["-C", repo, "diff", "--unified=0", "--no-color", "--no-ext-diff", mergeBase],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  // New files that are not staged yet are not in that diff: add each as a
  // diff from /dev/null. `git diff --no-index` exits 1 when files differ.
  const untracked = execFileSync(
    "git",
    ["-C", repo, "ls-files", "--others", "--exclude-standard"],
    { encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean)
    .map((file) => {
      try {
        execFileSync("git", ["-C", repo, "diff", "--no-index", "--unified=0", "--no-color", "/dev/null", file]);
        return "";
      } catch (error) {
        return error.stdout?.toString() ?? "";
      }
    });
  const result = run({
    rules: [...byId.values()],
    diff: [diff, ...untracked].join("\n"),
    exists: (path) => existsSync(join(repo, path)),
  });
  console.log(JSON.stringify({ base, mergeBase, ...result }, null, 2));
}
