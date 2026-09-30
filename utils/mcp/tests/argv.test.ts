import { describe, expect, test } from "bun:test";
import { pushBoolFlag, pushFlag, pushPos } from "../src/core/argv.ts";
import type { ToolboxTool } from "../src/core/tool.ts";
import { pdfTools } from "../src/tools/pdf/index.ts";

const testTools = [...pdfTools];

function getTool(name: string): ToolboxTool {
  const tool = testTools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`missing test tool ${name}`);
  return tool;
}

async function runCaptured(name: string, input: Record<string, unknown>): Promise<{ argv: string[]; env?: Record<string, string | undefined> }> {
  const tool = getTool(name);
  let captured: string[] | undefined;
  let capturedEnv: Record<string, string | undefined> | undefined;
  const original = Bun.spawn;
  Bun.spawn = ((argv: string[], options?: { env?: Record<string, string | undefined> }) => {
    captured = argv.slice(1);
    capturedEnv = options?.env;
    return {
      stdout: new ReadableStream({ start(controller) { controller.close(); } }),
      stderr: new ReadableStream({ start(controller) { controller.close(); } }),
      exited: Promise.resolve(0),
      kill() {},
    };
  }) as typeof Bun.spawn;

  try {
    await tool.run(input);
    if (!captured) throw new Error("argv was not captured");
    return { argv: captured, env: capturedEnv };
  } finally {
    Bun.spawn = original;
  }
}

describe("argv helpers", () => {
  test("pushFlag handles scalar, boolean, and array values", () => {
    const argv: string[] = [];
    pushFlag(argv, "--x", "a");
    pushFlag(argv, "--n", 2);
    pushFlag(argv, "--on", true);
    pushFlag(argv, "--off", false);
    pushFlag(argv, "--arr", ["a", "b"]);
    expect(argv).toEqual(["--x", "a", "--n", "2", "--on", "--arr", "a", "--arr", "b"]);
  });

  test("pushBoolFlag supports explicit false flags", () => {
    const argv: string[] = [];
    pushBoolFlag(argv, "--unprivileged", false, "--privileged");
    pushBoolFlag(argv, "--nesting", true);
    expect(argv).toEqual(["--privileged", "--nesting"]);
  });

  test("pushPos omits undefined only", () => {
    const argv: string[] = [];
    pushPos(argv, undefined);
    pushPos(argv, 0);
    expect(argv).toEqual(["0"]);
  });
});

describe("selected native tool argv mappings", () => {


  test("pdf_decrypt passes password through env, not argv", async () => {
    const result = await runCaptured("pdf_decrypt", { file: "locked.pdf", password: "secret", out: "plain.pdf" });
    expect(result.argv).toEqual(["decrypt", "locked.pdf", "--out", "plain.pdf"]);
    expect(result.env?.UTILS_PDF_PASSWORD).toBe("secret");
  });

});
