import { z } from "zod";
import { pushFlag } from "../../core/argv.ts";
import { envelopeOutput } from "../../core/schema.ts";
import { scriptTool, type ToolboxTool } from "../../core/tool.ts";

const script = "ubereats.py";
const envelope = true;
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

/** One row of the past-orders index; fields come straight from the internal API, so most can be null. */
const orderShape = z.looseObject({
  uuid: z.string(),
  completedAt: z.string().nullish(),
  storeUuid: z.string().nullish(),
  creator: z.string().nullish().describe("Display name of whoever placed the order."),
  isCreator: z.boolean().nullish().describe("True when Loki placed it, which is what the ledger keys on."),
  numItems: z.number().nullish(),
  isCancelled: z.boolean().nullish(),
});

const receiptsOutput = envelopeOutput(
  z.looseObject({
    out_dir: z.string(),
    index_file: z.string(),
    summary_file: z.string(),
    receipts: z.array(
      z.looseObject({
        uuid: z.string(),
        date: z.string(),
        store: z.string().nullish(),
        total: z.number(),
        people: z.number(),
        source: z.string().describe("receipt, cache, or order-list fallback."),
        file: z.string(),
      }),
    ),
    skipped: z.array(z.string()).describe("Order uuids with no recoverable detail."),
    total: z.number(),
    with_details: z.number(),
    from_order_list: z.number(),
  }),
);

const ledgerOutput = envelopeOutput(
  z.looseObject({
    summary: z.string().describe("Human-readable digest; this is what a chat wrapper forwards."),
    new_debts: z.array(
      z.looseObject({
        order_uuid: z.string(),
        date: z.string(),
        store: z.string(),
        uber_name: z.string(),
        items: z.string(),
        amount: z.string().describe("Numeric string, matching the CSV column."),
        paid: z.string().describe("'no' until settled; the CSV is the source of truth and is never overwritten once set."),
        paid_date: z.string().describe("Empty until settled by hand."),
        note: z.string().describe("Empty unless filled in by hand."),
      }),
    ),
    unpaid_by_person: z.record(z.string(), z.number()).describe("Outstanding total per person across every order."),
    csv_dir: z.string(),
    debts_csv: z.string(),
    names_csv: z.string(),
  }),
);

export const ubereatsTools: ToolboxTool[] = [
  scriptTool({
    name: "ubereats_fetch_receipts",
    description: `Fetch Uber Eats itemized receipt details into an output directory. One network call per order, so scope with recent/since. ${staleCookie}`,
    inputSchema: { ...common, out: z.string().optional().describe("Receipt output directory."), no_cache: z.boolean().optional().describe("Force refetch instead of cached JSON.") },
    outputSchema: receiptsOutput,
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
    outputSchema: envelopeOutput(z.array(orderShape)),
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
    outputSchema: ledgerOutput,
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
    outputSchema: envelopeOutput(z.looseObject({ path: z.string(), cookies: z.number(), mode: z.number() })),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => ["--dump-cookie", input.path],
  }),
];
