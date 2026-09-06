/**
 * Host-aware registration: which tools a host is offered, and why the rest are missing.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { clearRequirementCache } from "../src/core/requires.ts";
import { selectRunnableTools, summariseHidden, type ToolboxTool } from "../src/core/tool.ts";
import { allTools } from "../src/tools/index.ts";
import { capabilitiesTool } from "../src/tools/capabilities/index.ts";

function stubTool(name: string, requires?: string[]): ToolboxTool {
  return {
    name,
    description: name,
    inputSchema: {},
    outputSchema: {},
    annotations: { readOnlyHint: true },
    requires,
    async run() {
      return { isError: false, structuredContent: {} };
    },
  };
}

/** Stands in for the real probes: only what this fake host provides is satisfied. */
function hostWith(satisfied: string[]) {
  return async (requirement: string) => satisfied.includes(requirement);
}

beforeEach(() => clearRequirementCache());
afterEach(() => clearRequirementCache());

describe("selectRunnableTools", () => {
  test("splits a toolset by what the host satisfies", async () => {
    const tools = [stubTool("always_on"), stubTool("safari_get_url", ["platform:darwin", "binary:osascript"]), stubTool("pve_list_guests", ["binary:uv", "ssh:pve"])];

    const { registered, hidden } = await selectRunnableTools(tools, { check: hostWith(["binary:uv", "platform:darwin", "binary:osascript"]) });

    expect(registered.map((tool) => tool.name)).toEqual(["always_on", "safari_get_url"]);
    expect(hidden).toEqual([{ tool: "pve_list_guests", failed: ["ssh:pve"] }]);
  });

  test("a tool with no requirements is always registered", async () => {
    const { registered, hidden } = await selectRunnableTools([stubTool("always_on")], { check: hostWith([]) });

    expect(registered.map((tool) => tool.name)).toEqual(["always_on"]);
    expect(hidden).toEqual([]);
  });

  test("every failed requirement of a tool is reported, not just the first", async () => {
    const { hidden } = await selectRunnableTools([stubTool("safari_get_url", ["platform:darwin", "binary:osascript", "binary:uv"])], { check: hostWith(["binary:uv"]) });

    expect(hidden).toEqual([{ tool: "safari_get_url", failed: ["platform:darwin", "binary:osascript"] }]);
  });

  test("a throwing probe hides its tool instead of rejecting", async () => {
    const check = async (requirement: string) => {
      if (requirement === "ssh:pve") throw new Error("ssh blew up");
      return true;
    };

    const { registered, hidden } = await selectRunnableTools([stubTool("pve_list_guests", ["ssh:pve"]), stubTool("pdf_info", ["binary:uv"])], { check });

    expect(registered.map((tool) => tool.name)).toEqual(["pdf_info"]);
    expect(hidden).toEqual([{ tool: "pve_list_guests", failed: ["ssh:pve"] }]);
  });

  test("a shared requirement is probed once for the whole family", async () => {
    let calls = 0;
    const check = async () => {
      calls += 1;
      return false;
    };
    const family = ["pve_list_guests", "pve_get_status", "pve_start_guest"].map((name) => stubTool(name, ["ssh:pve"]));

    const { hidden } = await selectRunnableTools(family, { check });

    expect(calls).toBe(1);
    expect(hidden).toHaveLength(3);
  });

  test("hidden tools collapse to one reason per family for the startup log", () => {
    const line = summariseHidden([
      { tool: "safari_get_url", failed: ["platform:darwin"] },
      { tool: "safari_open_url", failed: ["platform:darwin"] },
      { tool: "pve_list_guests", failed: ["ssh:pve"] },
    ]);

    expect(line).toBe("safari: platform:darwin, pve: ssh:pve");
  });
});

describe("utils_capabilities", () => {
  test("declares no requirements, so no host can hide it", () => {
    expect(capabilitiesTool.requires).toBeUndefined();
    expect(capabilitiesTool.annotations.readOnlyHint).toBe(true);
  });

  test("survives a host that satisfies nothing", async () => {
    const { registered } = await selectRunnableTools(allTools, { check: hostWith([]) });

    expect(registered.map((tool) => tool.name)).toEqual(["utils_capabilities"]);
  });

  test("reports the startup snapshot, not a live probe", async () => {
    const result = await capabilitiesTool.run({});
    const structured = result.structuredContent as { host: Record<string, string>; registered: string[]; hidden: unknown[] };

    expect(result.isError).toBe(false);
    expect(Object.keys(structured.host).sort()).toEqual(["arch", "hostname", "platform"]);
    expect(Array.isArray(structured.registered)).toBe(true);
    expect(Array.isArray(structured.hidden)).toBe(true);
  });
});

describe("declared requirements", () => {
  test("every script-backed tool declares at least one host requirement", () => {
    const undeclared = allTools.filter((tool) => tool.name !== "utils_capabilities" && (tool.requires ?? []).length === 0).map((tool) => tool.name);

    expect(undeclared, "a script-backed tool with no requires would register on a host that cannot run it").toEqual([]);
  });

  test("requirements use a known kind", () => {
    const KINDS = ["platform", "binary", "ssh", "env", "file"];
    const unknown = allTools.flatMap((tool) => (tool.requires ?? []).filter((requirement) => !KINDS.includes(requirement.split(":")[0] ?? "")));

    expect(unknown).toEqual([]);
  });

  test("the macOS-only families are declared macOS-only", async () => {
    const darwinOnly = ["calendar", "mail", "reminders", "safari", "screenshot", "ubereats"];

    for (const tool of allTools) {
      const family = tool.name.split("_")[0]!;
      if (!darwinOnly.includes(family)) continue;
      expect(tool.requires, `${tool.name} must be gated on macOS`).toContain("platform:darwin");
    }
  });

  test("a Linux host keeps the portable families and loses the AppleScript ones", async () => {
    const linux = hostWith(["platform:linux", "binary:uv", "binary:ssh", "ssh:pve"]);

    const { registered, hidden } = await selectRunnableTools(allTools, { check: linux });
    const families = (tools: string[]) => [...new Set(tools.map((name) => name.split("_")[0]))].sort();

    expect(families(registered.map((tool) => tool.name))).toEqual(["e3p", "gmaps", "md2slide", "pdf", "pve", "utils"]);
    expect(families(hidden.map((entry) => entry.tool))).toEqual(["calendar", "mail", "reminders", "safari", "screenshot", "ubereats"]);
  });
});
