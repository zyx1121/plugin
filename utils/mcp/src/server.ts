#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { allTools } from "./tools/index.ts";
import { setCapabilitiesSnapshot } from "./tools/capabilities/index.ts";
import { registerTools, selectRunnableTools, summariseHidden } from "./core/tool.ts";

const server = new McpServer({ name: "utils", version: "0.3.0" });

/**
 * Registration is host-aware: a tool whose host requirements are unmet is never
 * offered, so a Linux box does not advertise AppleScript tools that can only
 * fail. Probes run in parallel, are bounded, and never throw; the worst case is
 * a hidden tool, never a dead server.
 */
const { registered, hidden } = await selectRunnableTools(allTools);

setCapabilitiesSnapshot({ registered: registered.map((tool) => tool.name), hidden });
registerTools(server, registered);

const reasons = hidden.length > 0 ? ` (${summariseHidden(hidden)})` : "";
console.error(`[utils-mcp] registered ${registered.length}, hidden ${hidden.length}${reasons}`);

const transport = new StdioServerTransport();
await server.connect(transport);
