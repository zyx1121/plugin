// node --test skills/alint/scripts/alint.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { addedLines, annotations, collect, globToRegExp, parseRule, run } from "./alint.mjs";

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
  assert.equal(rules.length, 16);
  for (const rule of rules) assert.ok(["grep", "model", "path"].includes(rule.engine));
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
    exists: (path) => path === "src/components/task-shell.tsx",
  });
  assert.deepEqual(out.grep.map((f) => `${f.rule} ${f.file}:${f.line}`).sort(), [
    "no-dash-separators README.md:11",
    "no-dash-separators app/page.tsx:12",
    "text-size-scale app/page.tsx:11",
  ]);
});

test("ai tone phrases", () => {
  const out = run({
    rules,
    diff: [
      diff("docs/intro.md", "\u503c\u5f97\u4e00\u63d0\u7684\u662f\uff0c\u5b83\u5f88\u5feb", "It's worth noting that it is fast", "It is fast"),
      diff("skills/human-voice/SKILL.md", "\u503c\u5f97\u4e00\u63d0\u7684\u662f"),
      diff("lib/x.ts", "// \u503c\u5f97\u4e00\u63d0\u7684\u662f"),
    ].join("\n"),
    exists: () => false,
  });
  assert.deepEqual(
    out.grep.filter((f) => f.rule === "ai-tone-phrases").map((f) => `${f.file}:${f.line}`),
    ["docs/intro.md:11", "docs/intro.md:12"],
  );
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

const hits = (out, id) =>
  out.grep.filter((f) => f.rule === id).map((f) => `${f.file}:${f.line}`);

test("icloud duplicate files hit by name", () => {
  const out = run({
    rules,
    diff: [
      diff("app/page 2.tsx", "x"),
      diff("README 3.md", "x"),
      diff("app/page.tsx", "x"),
      diff("docs/v2.md", "x"),
      diff("fonts/Inter 400.woff2", "x"),
      "diff --git a/f/A 2.woff2 b/f/A 2.woff2\nnew file mode 100644\nBinary files /dev/null and b/f/A 2.woff2 differ",
    ].join("\n"),
    exists: () => false,
  });
  assert.deepEqual(hits(out, "icloud-duplicate-files"), ["app/page 2.tsx:1", "README 3.md:1", "f/A 2.woff2:1"]);
});

test("native form controls outside components/ui", () => {
  const out = run({
    rules,
    diff: [
      diff("app/page.tsx", "<select value={a}>", "<textarea rows={3} />", "<Select items={a}>", '<input type="file" />'),
      diff("components/ui/textarea.tsx", "<textarea"),
    ].join("\n"),
    exists: () => false,
  });
  assert.deepEqual(hits(out, "native-form-controls"), ["app/page.tsx:11", "app/page.tsx:12"]);
});

test("referrer policy header, not the img attribute", () => {
  const out = run({
    rules,
    diff: [
      diff("next.config.ts", '{ key: "Referrer-Policy", value: "no-referrer" }', '{ key: "Referrer-Policy", value: "same-origin" }'),
      diff("Caddyfile", "header Referrer-Policy no-referrer", "header Referrer-Policy no-referrer-when-downgrade"),
      diff("app/song.tsx", 'referrerPolicy="no-referrer"'),
    ].join("\n"),
    exists: () => false,
  });
  assert.deepEqual(hits(out, "referrer-policy-same-origin"), ["next.config.ts:11", "Caddyfile:11"]);
});

test("model prompt wraps the rule and the diff as data", async () => {
  const { prompt } = await import("./alint-model.mjs");
  const rule = rules.find((r) => r.id === "sign-in-centered");
  const text = prompt(rule, "+<h1>x</h1>");
  assert.ok(text.startsWith('<rule id="sign-in-centered">'));
  assert.ok(text.includes("<diff>\n+<h1>x</h1>\n</diff>"));
});

test("model diff numbers added lines and keeps only findings on them", async () => {
  const { numberDiff, validFindings } = await import("./alint-model.mjs");
  const { text, added } = numberDiff(
    ["--- a/app/p.tsx", "+++ b/app/p.tsx", "@@ -4,2 +4,3 @@", " keep", "-old", "+new", "+more", " tail"].join("\n")
  );
  assert.ok(text.includes("+[L5] new") && text.includes("+[L6] more"));
  assert.deepEqual([...added.get("app/p.tsx")], [5, 6]);
  const kept = validFindings(
    [
      { file: "app/p.tsx", line: 5 },
      { file: "app/p.tsx", line: 4 },
      { file: "x,line=1::evil\n::error", line: 5 },
    ],
    added
  );
  assert.deepEqual(kept, [{ file: "app/p.tsx", line: 5 }]);
});

test("model batches split by size and flag files too large", async () => {
  const { batches } = await import("./alint-model.mjs");
  const plan = batches([["a", "x".repeat(6)], ["b", "x".repeat(6)], ["c", "x".repeat(20)]], 10);
  assert.deepEqual(plan.batches.map((b) => b.map(([f]) => f)), [["a"], ["b"]]);
  assert.deepEqual(plan.tooLarge, ["c"]);
});

test("kicad rules files and install paths", () => {
  const out = run({
    rules,
    diff: [
      diff("kicad/b.kicad_dru", "(constraint track_angle (min 89deg))", "(condition \"A.Parent.Reference == 'U5'\")", "(constraint track_angle (min 89))", "(condition \"A.memberOfFootprint('U5')\")"),
      diff("tools/fab.py", "CLI = r\"C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe\"", "CLI = shutil.which(\"kicad-cli\")"),
    ].join("\n"),
    exists: () => false,
  });
  assert.deepEqual(hits(out, "kicad-dru-silent-drop"), ["kicad/b.kicad_dru:11", "kicad/b.kicad_dru:12"]);
  assert.deepEqual(hits(out, "kicad-hardcoded-path"), ["tools/fab.py:11"]);
});

test("ci loads repo rules from the merge base, not the pull request", () => {
  const repo = mkdtempSync(join(tmpdir(), "alint-"));
  const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  const rule = (pattern) =>
    `---\nid: repo-rule\nengine: grep\nfiles: ["**/*.txt"]\npattern: ${pattern}\nmessage: hit\n---\nbody\n`;
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  mkdirSync(join(repo, ".alint", "rules"), { recursive: true });
  writeFileSync(join(repo, ".alint", "rules", "repo-rule.md"), rule("FORBIDDEN"));
  git("add", ".");
  git("commit", "-qm", "base");
  git("checkout", "-qb", "pr");
  // The pull request weakens the rule and adds the text it forbids.
  writeFileSync(join(repo, ".alint", "rules", "repo-rule.md"), rule("NOTHING"));
  writeFileSync(join(repo, "a.txt"), "FORBIDDEN\n");
  git("add", ".");
  git("commit", "-qm", "pr");
  const ci = collect({ repo, base: "main", ci: true });
  assert.equal(ci.result.grep.length, 1);
  const local = collect({ repo, base: "main" });
  assert.equal(local.result.grep.length, 0);
});
