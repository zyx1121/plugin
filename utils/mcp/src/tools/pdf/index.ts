import { z } from "zod";
import { pushFlag, pushPos } from "../../core/argv.ts";
import { envelopeOutput } from "../../core/schema.ts";
import { scriptTool, type ToolboxTool } from "../../core/tool.ts";

const script = "pdf.py";
const envelope = true;
const timeoutMs = 60000;

const file = z.string().describe("PDF path.");
const pages = z.string().optional().describe("Page range, e.g. 1-3,5.");
const out = z.string().optional().describe("Output path.");

const read = { readOnlyHint: true, openWorldHint: false } as const;
/** Writes a new file; never mutates the source PDF in place. */
const derive = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
/** Reads by default, but writes a file when out= is given, so it is not read-only. */
const readOrWrite = derive;

export const pdfTools: ToolboxTool[] = [
  scriptTool({
    name: "pdf_info",
    description: "Get page count, encryption status, version, metadata, and file size. Cheap; call before extracting to size the job and detect encryption.",
    inputSchema: { file },
    outputSchema: envelopeOutput(
      z.looseObject({
        file: z.string(),
        pages: z.number(),
        encrypted: z.boolean(),
        pdf_version: z.string(),
        size_bytes: z.number(),
        metadata: z.record(z.string(), z.unknown()).describe("Embedded document metadata; often empty."),
      }),
    ),
    annotations: read,
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => ["info", input.file],
  }),
  scriptTool({
    name: "pdf_extract_text",
    description: "Extract plain text from a PDF, optionally limited to pages. A whole document easily exceeds the response budget and is truncated; pass out= to get the full text on disk.",
    inputSchema: { file, pages, out },
    annotations: readOrWrite,
    script,
    envelope,
    timeoutMs,
    truncationHint: "pass out=<path> to write the full text to a file, or narrow pages=",
    buildArgs: (input) => {
      const argv = ["text"];
      pushPos(argv, input.file);
      pushFlag(argv, "--pages", input.pages);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
  scriptTool({
    name: "pdf_extract_comments",
    description: "Extract annotations, highlights, and comments from a PDF. Use fields= to drop marked_text when only the comment bodies matter.",
    inputSchema: { file, pages, fields: z.string().optional().describe("Comma-separated keys: page,type,author,content,marked_text."), out },
    annotations: readOrWrite,
    script,
    envelope,
    timeoutMs,
    truncationHint: "pass out=<path>, narrow pages=, or drop marked_text from fields=",
    buildArgs: (input) => {
      const argv = ["comments"];
      pushPos(argv, input.file);
      pushFlag(argv, "--pages", input.pages);
      pushFlag(argv, "--fields", input.fields);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
  scriptTool({
    name: "pdf_compress",
    description: "Shrink a PDF via Ghostscript recompression. Lossy for images; writes a new file rather than editing the source.",
    inputSchema: { file, level: z.enum(["screen", "ebook", "printer", "prepress"]).optional().describe("Compression preset. Default: ebook."), out },
    annotations: derive,
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => {
      const argv = ["compress"];
      pushPos(argv, input.file);
      pushFlag(argv, "--level", input.level);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
  scriptTool({
    name: "pdf_decrypt",
    description: "Remove PDF password protection/encryption. The password is passed through the environment, not argv, so it stays out of process listings and shell history.",
    inputSchema: { file, password: z.string().optional().describe("Open password, if required."), out },
    annotations: derive,
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => {
      const argv = ["decrypt"];
      pushPos(argv, input.file);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
    buildEnv: (input) => ({ UTILS_PDF_PASSWORD: input.password ?? "" }),
  }),
  scriptTool({
    name: "pdf_merge",
    description: "Concatenate two or more PDFs in order. Output order follows the inputs array exactly.",
    inputSchema: { inputs: z.array(z.string()).describe("Input PDF paths in merge order."), out: z.string().describe("Output path.") },
    annotations: derive,
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => {
      const argv = ["merge", ...input.inputs];
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
  scriptTool({
    name: "pdf_split",
    description: "Extract a page range into a new PDF. The source file is left untouched.",
    inputSchema: { file, pages: z.string().describe("Pages to keep, e.g. 1-3,5."), out },
    annotations: derive,
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => {
      const argv = ["split"];
      pushPos(argv, input.file);
      pushFlag(argv, "--pages", input.pages);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
  scriptTool({
    name: "pdf_rotate",
    description: "Rotate PDF pages by a multiple of 90 degrees.",
    inputSchema: { file, deg: z.number().describe("Degrees clockwise: 90, 180, 270, or negative equivalent."), pages, out },
    annotations: derive,
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => {
      const argv = ["rotate"];
      pushPos(argv, input.file);
      pushFlag(argv, "--deg", input.deg);
      pushFlag(argv, "--pages", input.pages);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
  scriptTool({
    name: "pdf_render",
    description: "Render PDF pages to PNG images for visual inspection. Writes image files and returns their paths; read those paths back to actually see the pages.",
    inputSchema: { file, pages, dpi: z.number().optional().describe("Render DPI. Default: 150."), out },
    annotations: derive,
    script,
    envelope,
    timeoutMs,
    buildArgs: (input) => {
      const argv = ["render"];
      pushPos(argv, input.file);
      pushFlag(argv, "--pages", input.pages);
      pushFlag(argv, "--dpi", input.dpi);
      pushFlag(argv, "--out", input.out);
      return argv;
    },
  }),
];
