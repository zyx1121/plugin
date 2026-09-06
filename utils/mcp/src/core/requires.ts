import { existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { augmentedEnv } from "./exec.ts";

/**
 * Host requirement DSL.
 *
 * A tool declares what the machine must provide before it is worth registering.
 * Supported kinds:
 *
 * - `platform:darwin` / `platform:linux` — process platform matches.
 * - `binary:<name>`  — executable found on the augmented PATH.
 * - `ssh:<alias>`    — `ssh` is on PATH and the alias is a Host entry in the
 *                      user's SSH config. Static on purpose: see below.
 * - `env:<NAME>`     — environment variable set and non-empty.
 * - `file:<path>`    — path exists (leading `~` expanded).
 *
 * Unknown kinds fail closed: an unreadable requirement hides the tool rather
 * than silently registering something the host cannot run.
 *
 * No check touches the network. The evaluation runs once at startup and the
 * result is what the session is stuck with, so a requirement must describe
 * whether the host is *configured* for a tool, not whether the target answers
 * right now. A laptop that is briefly off the tailnet is still a pve machine;
 * losing 16 tools for the rest of the session over one dropped packet is a
 * worse failure than the timeout the tool would have reported itself.
 */

/** Per-check budget. A probe that hangs must not stall server startup. */
export const REQUIREMENT_TIMEOUT_MS = 4000;

export interface RequirementResult {
  ok: boolean;
  /** Requirement strings that were not satisfied, in declaration order. */
  failed: string[];
}

/**
 * Effective platform. `UTILS_FORCE_PLATFORM` is a test-only override so the
 * darwin/linux split can be exercised on one machine; documented in the README.
 */
export function currentPlatform(): string {
  const forced = process.env.UTILS_FORCE_PLATFORM;
  return forced && forced.trim() ? forced.trim() : platform();
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

/** PATH lookup against the same augmented PATH the tools run with, so probe and run agree. */
export function findOnPath(name: string, env: Record<string, string | undefined> = augmentedEnv()): string | null {
  if (name.includes("/")) return existsSync(name) ? name : null;
  return Bun.which(name, { PATH: env.PATH ?? "" });
}

/**
 * Literal host aliases declared in an SSH config, following `Include` best effort.
 *
 * Pattern entries (`Host *`, `Host 10.10.10.*`) are ignored: an alias only
 * counts when the user named it, otherwise a catch-all `Host *` block would
 * satisfy every `ssh:` requirement on the machine.
 */
export function sshConfigHosts(configPath: string = join(homedir(), ".ssh", "config"), seen: Set<string> = new Set()): Set<string> {
  const aliases = new Set<string>();
  const resolved = expandHome(configPath);
  if (seen.has(resolved) || seen.size > 16) return aliases;
  seen.add(resolved);

  let text: string;
  try {
    text = readFileSync(resolved, "utf8");
  } catch {
    return aliases;
  }

  const configDir = dirname(resolved);

  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0]!.trim();
    if (!line) continue;

    const [keyword, ...rest] = line.replace(/=/g, " ").split(/\s+/);
    const directive = keyword?.toLowerCase();
    if (!directive || rest.length === 0) continue;

    if (directive === "host") {
      for (const pattern of rest) {
        if (pattern.includes("*") || pattern.includes("?") || pattern.startsWith("!")) continue;
        aliases.add(pattern);
      }
      continue;
    }

    if (directive === "include") {
      for (const pattern of rest) {
        for (const included of expandInclude(pattern, configDir)) {
          for (const alias of sshConfigHosts(included, seen)) aliases.add(alias);
        }
      }
    }
  }

  return aliases;
}

/** Include paths are relative to the config's own directory, and may glob. Failure means no extra aliases. */
function expandInclude(pattern: string, configDir: string): string[] {
  const expanded = expandHome(pattern);
  const absolute = isAbsolute(expanded) ? expanded : join(configDir, expanded);

  if (!absolute.includes("*") && !absolute.includes("?")) return existsSync(absolute) ? [absolute] : [];

  const marker = absolute.search(/[*?]/);
  const base = dirname(absolute.slice(0, marker + 1));
  const glob = absolute.slice(base.length + 1);

  try {
    return [...new Bun.Glob(glob).scanSync({ cwd: base, onlyFiles: true })].map((match) => join(base, match));
  } catch {
    return [];
  }
}

/** An alias is usable when ssh exists and the user configured that host. Never dials out. */
export function sshAliasDefined(alias: string, configPath?: string): boolean {
  if (findOnPath("ssh") === null) return false;
  return sshConfigHosts(configPath).has(alias);
}

/** Never throws: any probe failure is a failed requirement, not a crash. */
async function checkRequirement(requirement: string): Promise<boolean> {
  const separator = requirement.indexOf(":");
  if (separator <= 0) return false;

  const kind = requirement.slice(0, separator);
  const value = requirement.slice(separator + 1);
  if (!value) return false;

  switch (kind) {
    case "platform":
      return currentPlatform() === value;
    case "binary":
      return findOnPath(value) !== null;
    case "ssh":
      return sshAliasDefined(value);
    case "env": {
      const found = process.env[value];
      return typeof found === "string" && found.trim() !== "";
    }
    case "file":
      return existsSync(expandHome(value));
    default:
      // Unknown kind: fail closed.
      return false;
  }
}

const cache = new Map<string, Promise<boolean>>();

export interface EvaluateOptions {
  /** Test seam: replace the real probes with a stub. */
  check?: (requirement: string) => Promise<boolean>;
  /** Per-check budget override; tests use a short one to exercise the timeout path. */
  timeoutMs?: number;
}

/** Test seam: drop memoised probe results. */
export function clearRequirementCache(): void {
  cache.clear();
}

/** One probe per distinct requirement string, so 20 tools sharing `ssh:pve` cost one SSH round trip. */
export function checkRequirementCached(requirement: string, options: EvaluateOptions = {}): Promise<boolean> {
  const hit = cache.get(requirement);
  if (hit) return hit;

  const pending = withTimeout(requirement, options);
  cache.set(requirement, pending);
  return pending;
}

async function withTimeout(requirement: string, options: EvaluateOptions): Promise<boolean> {
  const check = options.check ?? checkRequirement;
  const budgetMs = options.timeoutMs ?? REQUIREMENT_TIMEOUT_MS;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), budgetMs);
  });

  try {
    const probe = (async () => check(requirement))().catch(() => false);
    return await Promise.race([probe, timeout]);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Evaluate a tool's requirements. Every check is bounded and non-throwing, so a
 * broken probe hides one tool instead of taking the server down.
 */
export async function evaluateRequirements(reqs: string[], options: EvaluateOptions = {}): Promise<RequirementResult> {
  if (reqs.length === 0) return { ok: true, failed: [] };

  const results = await Promise.all(reqs.map((requirement) => checkRequirementCached(requirement, options)));
  const failed = reqs.filter((_, index) => !results[index]);
  return { ok: failed.length === 0, failed };
}
