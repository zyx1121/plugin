import { describe, expect, test } from "bun:test";
import type { ZodType } from "zod";
import { allTools } from "../src/tools/index.ts";
import type { ToolboxTool } from "../src/core/tool.ts";

const GATE_FIELDS = ["confirm", "yes"] as const;

/** A gate is a field that accepts only literal true, so the caller cannot opt out by passing false. */
function gateFields(tool: ToolboxTool): string[] {
  return GATE_FIELDS.filter((field) => {
    const schema = tool.inputSchema[field] as ZodType | undefined;
    if (!schema) return false;
    return schema.safeParse(true).success && !schema.safeParse(false).success;
  });
}

describe("native tool registry", () => {
  test("exposes only the selected agent-toolbox domains", () => {
    const domains = new Set(allTools.map((tool) => tool.name.split("_")[0]));

    expect([...domains].sort()).toEqual(["calendar", "e3p", "gmaps", "mail", "md2slide", "pdf", "pve", "reminders", "safari", "screenshot", "ubereats"]);
    expect(allTools).toHaveLength(69);
  });

  test("tool names are unique and prefixed by their domain", () => {
    const names = allTools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);

    for (const name of names) {
      expect(name).toMatch(/^(calendar|e3p|gmaps|mail|md2slide|pdf|pve|reminders|safari|screenshot|ubereats)_/);
    }
  });
});

describe("tool contracts", () => {
  test("every tool declares an output schema", () => {
    for (const tool of allTools) {
      expect(Object.keys(tool.outputSchema).length, `${tool.name} has an empty outputSchema`).toBeGreaterThan(0);
    }
  });

  test("every tool declares whether it reads or writes", () => {
    for (const tool of allTools) {
      expect(typeof tool.annotations.readOnlyHint, `${tool.name} has no readOnlyHint`).toBe("boolean");
    }
  });

  test("descriptions stay within the context budget", () => {
    for (const tool of allTools) {
      expect(tool.description.length, `${tool.name} description is too long for 69 tools in every context`).toBeLessThanOrEqual(300);
    }
  });
});

describe("destructive tools are gated", () => {
  test("destructiveHint implies a literal-true confirm/yes field", () => {
    const ungated = allTools.filter((tool) => tool.annotations.destructiveHint === true && gateFields(tool).length === 0).map((tool) => tool.name);

    expect(ungated, "destructive tools must not be callable without an explicit confirmation").toEqual([]);
  });

  test("read-only tools never carry a confirmation gate", () => {
    const misclassified = allTools.filter((tool) => tool.annotations.readOnlyHint === true && gateFields(tool).length > 0).map((tool) => tool.name);

    expect(misclassified, "a tool that needs confirmation is not read-only").toEqual([]);
  });

  test("read-only tools never take an output path", () => {
    // pdf_extract_text reads a PDF but writes a file when out= is given; that is not read-only.
    const OUTPUT_FIELDS = ["out", "out_dir", "csv_dir", "path"];
    const writers = allTools.filter((tool) => tool.annotations.readOnlyHint === true && OUTPUT_FIELDS.some((field) => field in tool.inputSchema)).map((tool) => tool.name);

    expect(writers, "a tool that can write a file is not read-only").toEqual([]);
  });

  test("read-only tools are never marked destructive", () => {
    const contradictory = allTools.filter((tool) => tool.annotations.readOnlyHint === true && tool.annotations.destructiveHint === true).map((tool) => tool.name);

    expect(contradictory).toEqual([]);
  });

  test("the known destructive surface is annotated as such", () => {
    const expected = [
      "calendar_delete_event",
      "e3p_logout",
      "pve_destroy_guest",
      "pve_remove_caddy",
      "pve_remove_dns",
      "pve_remove_forward",
      "pve_stop_guest",
      "reminders_delete",
      "safari_close_tab",
      "ubereats_dump_cookie",
      "ubereats_update_ledger",
    ];
    const actual = allTools
      .filter((tool) => tool.annotations.destructiveHint === true)
      .map((tool) => tool.name)
      .sort();

    expect(actual).toEqual(expected);
  });
});
