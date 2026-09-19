import { z } from "zod";
import { pushFlag, pushPos } from "../../core/argv.ts";
import { envelopeOutput } from "../../core/schema.ts";
import { scriptTool, type ToolboxTool } from "../../core/tool.ts";

const script = "ocr.py";
/** Pure HTTP against ocr.winlab.tw; the only host dependency is the uv runtime. */
const requires = ["binary:uv"];
const envelope = true;

/** Reads a remote GPU service over the open network; writes nothing locally. */
const read = { readOnlyHint: true, openWorldHint: true } as const;
/** Writes a markdown file next to the source; never mutates or deletes anything pre-existing. */
const derive = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

export const ocrTools: ToolboxTool[] = [
  scriptTool({
    name: "ocr_health",
    description: "Check whether the OCR service (ocr.winlab.tw, jina-ocr-v1 on king's RTX 3080) is reachable. No auth required.",
    inputSchema: {},
    outputSchema: envelopeOutput(z.looseObject({ ok: z.boolean(), model: z.string() })),
    annotations: read,
    script,
    requires,
    envelope,
    timeoutMs: 25000,
    buildArgs: () => ["health"],
  }),
  scriptTool({
    name: "ocr_file",
    description: "OCR a png/jpg/pdf into markdown via jina-ocr-v1 (ocr.winlab.tw on king's RTX 3080). Writes markdown next to the source file and never overwrites it. A dense page takes 10-30s; a big PDF can take minutes.",
    inputSchema: {
      file: z.string().describe("Image or PDF path to OCR."),
      pages: z.string().optional().describe("Page range for PDFs, e.g. 1-3,5. Default: all."),
      dpi: z.number().optional().describe("Render DPI for PDFs. Default: 150."),
    },
    outputSchema: envelopeOutput(
      z.looseObject({
        out: z.string().describe("Path to the written markdown file."),
        pages: z.number(),
        stats: z.looseObject({ pages: z.number(), seconds: z.number(), output_tokens: z.number(), tok_per_s: z.number() }),
      }),
    ),
    annotations: derive,
    script,
    requires,
    envelope,
    timeoutMs: 620000,
    buildArgs: (input) => {
      const argv = ["file"];
      pushPos(argv, input.file);
      pushFlag(argv, "--pages", input.pages);
      pushFlag(argv, "--dpi", input.dpi);
      return argv;
    },
  }),
];
