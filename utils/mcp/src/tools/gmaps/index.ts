import { z } from "zod";
import { pushFlag, pushPos } from "../../core/argv.ts";
import { scriptTool, type ToolboxTool } from "../../core/tool.ts";

const script = "gmaps.py";
const envelope = true;
const timeoutMs = 60000;

export const gmapsTools: ToolboxTool[] = [
  scriptTool({
    name: "gmaps_get_list",
    description:
      "Read a shared Google Maps place list: list name, owner, and every place with address, coordinates, note, and date added. Takes a share link — private (unshared) lists are not readable, and a link that stops being shared starts failing without warning.",
    inputSchema: {
      target: z.string().describe("Share link (maps.app.goo.gl/...), /maps/placelists/list/<id> URL, or bare list id."),
      limit: z.number().optional().describe("Maximum places to request, 1-500. Default: 500."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    script,
    envelope,
    timeoutMs,
    truncationHint: "lower limit to fetch fewer places",
    buildArgs: (input) => {
      const argv = ["list"];
      pushPos(argv, input.target);
      pushFlag(argv, "--limit", input.limit);
      return argv;
    },
  }),
];
