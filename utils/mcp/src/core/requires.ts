import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { augmentedEnv } from "./exec.ts";

/**
 * Host requirement DSL.
 *
 * A tool declares what the machine must provide before it is worth registering.
 * Supported kinds:
 *
 * - `platform:darwin` / `platform:linux` — process platform matches.
 * - `binary:<name>`  — executable found on the augmented PATH.
 * - `ssh:<alias>`    — `ssh -o BatchMode=yes -o ConnectTimeout=3 <alias> true` exits 0.
 * - `env:<NAME>`     — environment variable set and non-empty.
 * - `file:<path>`    — path exists (leading `~` expanded).
 *
 * Unknown kinds fail closed: an unreadable requirement hides the tool rather
 * than silently registering something the host cannot run.
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

async function probeSsh(alias: string): Promise<boolean> {
  const proc = Bun.spawn(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=3", alias, "true"], {
    stdio: ["ignore", "ignore", "ignore"],
    env: augmentedEnv(),
  });
  try {
    return (await proc.exited) === 0;
  } finally {
    proc.kill();
  }
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
      return probeSsh(value);
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
