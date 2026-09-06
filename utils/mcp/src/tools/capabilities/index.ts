import { arch, hostname } from "node:os";
import { z } from "zod";
import { currentPlatform } from "../../core/requires.ts";
import type { HiddenTool, ToolboxTool } from "../../core/tool.ts";

/**
 * The one tool that is always registered.
 *
 * Registration is host-aware (ADR-0003 in utils/decisions), so a caller that
 * remembers `safari_get_url` needs a way to find out why it is missing today
 * rather than guessing. This is not a scriptTool: it answers from the startup
 * snapshot, spawns nothing, and stays available on a host where every other
 * domain is hidden.
 */

export interface CapabilitiesSnapshot {
  registered: string[];
  hidden: HiddenTool[];
}

let snapshot: CapabilitiesSnapshot = { registered: [], hidden: [] };

/** Called once by server.ts after the requirement probes finish. */
export function setCapabilitiesSnapshot(next: CapabilitiesSnapshot): void {
  snapshot = next;
}

const hiddenSchema = z.looseObject({
  tool: z.string(),
  failed: z.array(z.string()).describe("Requirement strings this host did not satisfy, e.g. platform:darwin."),
});

export const capabilitiesTool: ToolboxTool = {
  name: "utils_capabilities",
  description:
    "Report what this utils host can run: platform/hostname/arch, the tools registered in this session, and the tools hidden with the requirement each one failed. Always available; answers from the startup probe without spawning anything.",
  inputSchema: {},
  outputSchema: {
    host: z.looseObject({
      platform: z.string().describe("Effective platform the requirement probes ran against."),
      hostname: z.string(),
      arch: z.string(),
    }),
    registered: z.array(z.string()).describe("Tool names available in this session."),
    hidden: z.array(hiddenSchema).describe("Tools left unregistered because the host does not meet their requirements."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run() {
    return {
      isError: false,
      structuredContent: {
        host: { platform: currentPlatform(), hostname: hostname(), arch: arch() },
        registered: snapshot.registered,
        hidden: snapshot.hidden,
      },
    };
  },
};

export const capabilitiesTools: ToolboxTool[] = [capabilitiesTool];
