import { z } from "zod";
import { pushFlag } from "../../core/argv.ts";
import { scriptTool, type ToolboxTool } from "../../core/tool.ts";

const script = "ubereats.py";
const envelope = false;
const timeoutMs = 300000;

/** Auth is a live browser session, so expiry looks like empty data rather than an error. */
const staleCookie = "Auth is a live Safari cookie; when it expires the result is an empty order list, not an error, so an empty result means re-auth before it means no orders.";

const common = {
  recent: z.number().optional().describe("Only include N most recent orders."),
  since: z.string().optional().describe("Only include orders on/after YYYY-MM-DD."),
  until: z.string().optional().describe("Only include orders on/before YYYY-MM-DD."),
  locale: z.string().optional().describe("Uber Eats locale code. Default: tw-en."),
  cookie_file: z.string().optional().describe("Path to raw Cookie header file. Optional: auth falls back to Safari cookies (macOS) then ~/.config/ubereats/cookie.txt."),
};

function pushCommon(argv: string[], input: { recent?: number; since?: string; until?: string; locale?: string; cookie_file?: string }): void {
  pushFlag(argv, "--recent", input.recent);
  pushFlag(argv, "--since", input.since);
  pushFlag(argv, "--until", input.until);
  pushFlag(argv, "--locale", input.locale);
  pushFlag(argv, "--cookie-file", input.cookie_file);
}

export const ubereatsTools: ToolboxTool[] = [
  scriptTool({
    name: "ubereats_fetch_receipts",
    description: `Fetch Uber Eats itemized receipt details into an output directory. One network call per order, so scope with recent/since. ${staleCookie}`,
    inputSchema: { ...common, out: z.string().optional().describe("Receipt output directory."), no_cache: z.boolean().optional().describe("Force refetch instead of cached JSON.") },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    script,
    envelope,
    timeoutMs,
    truncationHint: "scope with recent= or since=",
    buildArgs: (input) => {
      const argv: string[] = [];
      pushCommon(argv, input);
      pushFlag(argv, "--out", input.out);
      pushFlag(argv, "--no-cache", input.no_cache);
      return argv;
    },
  }),
  scriptTool({
    name: "ubereats_list_orders",
    description: `List matching Uber Eats past orders without fetching per-order receipt details. Much cheaper than ubereats_fetch_receipts; use it first. ${staleCookie}`,
    inputSchema: { ...common, out: z.string().optional().describe("Directory for index.json.") },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    script,
    envelope,
    timeoutMs,
    truncationHint: "scope with recent= or since=",
    buildArgs: (input) => {
      const argv = ["--list-only"];
      pushCommon(argv, input);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
  scriptTool({
    name: "ubereats_update_ledger",
    description: `Update group-order debt CSVs from Uber Eats orders. Overwrites debts.csv/names.csv in the target directory rather than appending. ${staleCookie}`,
    inputSchema: {
      ...common,
      csv_dir: z.string().optional().describe("Ledger CSV directory."),
      no_cache: z.boolean().optional().describe("Force refetch receipts."),
      me: z.string().optional().describe("Your Uber display name."),
      confirm: z.literal(true).describe("Required explicit confirmation; the ledger CSVs are rewritten in place."),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => {
      const argv = ["--ledger"];
      pushCommon(argv, input);
      pushFlag(argv, "--csv-dir", input.csv_dir);
      pushFlag(argv, "--no-cache", input.no_cache);
      pushFlag(argv, "--me", input.me);
      return argv;
    },
  }),
  scriptTool({
    name: "ubereats_dump_cookie",
    description: "Export the Safari ubereats.com Cookie header to a chmod 600 file. Writes a live session credential to disk; requires confirm=true, and the file grants account access until the session expires.",
    inputSchema: { path: z.string().describe("Output cookie file path."), confirm: z.literal(true).describe("Required explicit confirmation.") },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => ["--dump-cookie", input.path],
  }),
];
