// node --test skills/alint/scripts/alint.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { addedLines, annotations, globToRegExp, parseRule, run } from "./alint.mjs";

const rulesDir = join(import.meta.dirname, "..", "rules");
const rules = readdirSync(rulesDir).map((name) =>
  parseRule(readFileSync(join(rulesDir, name), "utf8"), name)
);

const diff = (file, ...added) =>
  [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -10,0 +11,${added.length} @@`,
    ...added.map((line) => `+${line}`),
  ].join("\n");

test("globs", () => {
  assert.ok(globToRegExp("**/*.{md,tsx}").test("README.md"));
  assert.ok(globToRegExp("**/*.{md,tsx}").test("app/page.tsx"));
  assert.ok(!globToRegExp("**/*.{md,tsx}").test("app/page.ts"));
  assert.ok(globToRegExp("components/ui/**").test("components/ui/button.tsx"));
  assert.ok(!globToRegExp("*.md").test("docs/a.md"));
  assert.ok(globToRegExp("**").test("a/b/c"));
});

test("every rule parses", () => {
  assert.equal(rules.length, 6);
  for (const rule of rules) assert.ok(["grep", "model"].includes(rule.engine));
});

test("added lines keep their new line numbers", () => {
  assert.deepEqual(addedLines(diff("a.md", "x", "y")), [
    { file: "a.md", line: 11, text: "x" },
    { file: "a.md", line: 12, text: "y" },
  ]);
});

test("grep rules hit added lines only in their files", () => {
  const out = run({
    rules,
    diff: [
      diff("README.md", "Agents \u2014 fast", "plain"),
      diff("app/page.tsx", '<h2 className="text-lg">', "<p>3 \u9801 \u00b7 10/23</p>"),
      diff("lib/x.ts", "a \u2014 b"),
    ].join("\n"),
    exists: (path) => path === "components/task-shell.tsx",
  });
  assert.deepEqual(out.grep.map((f) => `${f.rule} ${f.file}:${f.line}`).sort(), [
    "no-dash-separators README.md:11",
    "no-dash-separators app/page.tsx:12",
    "text-size-scale app/page.tsx:11",
  ]);
});

test("requires turns a rule off when the path is missing", () => {
  const out = run({
    rules,
    diff: diff("app/page.tsx", '<h2 className="text-lg">'),
    exists: () => false,
  });
  assert.equal(out.grep.length, 0);
});

test("secret tokens", () => {
  const out = run({
    rules,
    diff: diff("src/c.ts", `const t = "glpat-${"a".repeat(20)}"`, "const t = env.TOKEN"),
    exists: () => false,
  });
  assert.deepEqual(out.grep.map((f) => f.line), [11]);
});

test("model rules list only the changed files they cover", () => {
  const out = run({
    rules,
    diff: [diff("app/page.tsx", "<p>x</p>"), diff("README.zh-TW.md", "x")].join("\n"),
    exists: () => false,
  });
  const byId = Object.fromEntries(out.model.map((r) => [r.id, r.files]));
  assert.deepEqual(byId["ui-copy-no-filler"], ["app/page.tsx"]);
  assert.deepEqual(byId["github-english"], ["app/page.tsx"]);
  assert.deepEqual(byId["markdown-image-exfil"], ["app/page.tsx"]);
});

test("ci annotations: an error per grep finding, a notice per model rule", () => {
  const out = run({
    rules,
    diff: diff("app/page.tsx", "<p>a \u00b7 b</p>"),
    exists: () => false,
  });
  const lines = annotations(out);
  assert.equal(lines.filter((l) => l.startsWith("::error ")).length, 1);
  assert.ok(lines[0].startsWith("::error file=app/page.tsx,line=11,title=alint no-dash-separators::"));
  assert.equal(lines.filter((l) => l.startsWith("::notice ")).length, out.model.length);
});
