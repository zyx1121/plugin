/**
 * Host requirement evaluation.
 *
 * The point of these checks is that they are non-throwing and bounded: an
 * unreadable or hanging probe must hide one tool, never take the server down.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform, tmpdir } from "node:os";
import { join } from "node:path";
import { clearRequirementCache, evaluateRequirements, expandHome, findOnPath, sshAliasDefined, sshConfigHosts } from "../src/core/requires.ts";

const HERE = platform();
const OTHER = HERE === "darwin" ? "linux" : "darwin";

let scratch: string;

beforeEach(() => {
  clearRequirementCache();
  scratch = mkdtempSync(join(tmpdir(), "utils-requires-"));
});

afterEach(() => {
  clearRequirementCache();
  delete process.env.UTILS_FORCE_PLATFORM;
  rmSync(scratch, { recursive: true, force: true });
});

function fakeBinary(name: string): string {
  const path = join(scratch, name);
  writeFileSync(path, "#!/bin/sh\nexit 0\n");
  chmodSync(path, 0o755);
  return path;
}

describe("requirement kinds", () => {
  test("no requirements means runnable", async () => {
    expect(await evaluateRequirements([])).toEqual({ ok: true, failed: [] });
  });

  test("platform matches the host and rejects the other one", async () => {
    expect(await evaluateRequirements([`platform:${HERE}`])).toEqual({ ok: true, failed: [] });
    expect(await evaluateRequirements([`platform:${OTHER}`])).toEqual({ ok: false, failed: [`platform:${OTHER}`] });
  });

  test("UTILS_FORCE_PLATFORM overrides the real platform", async () => {
    process.env.UTILS_FORCE_PLATFORM = OTHER;

    expect(await evaluateRequirements([`platform:${OTHER}`])).toEqual({ ok: true, failed: [] });
    clearRequirementCache();
    expect(await evaluateRequirements([`platform:${HERE}`])).toEqual({ ok: false, failed: [`platform:${HERE}`] });
  });

  test("binary is found on the given PATH and missing without it", async () => {
    fakeBinary("utils-fake-bin");

    expect(findOnPath("utils-fake-bin", { PATH: scratch })).toBe(join(scratch, "utils-fake-bin"));
    expect(findOnPath("utils-fake-bin", { PATH: "/nonexistent-dir" })).toBeNull();
  });

  test("binary requirement passes for a real binary and fails for an absent one", async () => {
    expect(await evaluateRequirements(["binary:sh"])).toEqual({ ok: true, failed: [] });
    expect(await evaluateRequirements(["binary:utils-definitely-not-installed"])).toEqual({
      ok: false,
      failed: ["binary:utils-definitely-not-installed"],
    });
  });

  test("env requires a non-empty value", async () => {
    process.env.UTILS_TEST_REQ = "set";
    expect(await evaluateRequirements(["env:UTILS_TEST_REQ"])).toEqual({ ok: true, failed: [] });

    clearRequirementCache();
    process.env.UTILS_TEST_REQ = "   ";
    expect(await evaluateRequirements(["env:UTILS_TEST_REQ"])).toEqual({ ok: false, failed: ["env:UTILS_TEST_REQ"] });

    delete process.env.UTILS_TEST_REQ;
  });

  test("file checks existence and expands ~", async () => {
    const path = join(scratch, "present.txt");
    writeFileSync(path, "x");

    expect(await evaluateRequirements([`file:${path}`])).toEqual({ ok: true, failed: [] });
    expect(await evaluateRequirements([`file:${join(scratch, "absent.txt")}`])).toEqual({
      ok: false,
      failed: [`file:${join(scratch, "absent.txt")}`],
    });

    expect(expandHome("~")).toBe(homedir());
    expect(expandHome("~/x")).toBe(join(homedir(), "x"));
    expect(expandHome("/abs/x")).toBe("/abs/x");
  });

  test("unknown and malformed kinds fail closed", async () => {
    const bogus = ["gpu:cuda", "platform", "binary:", ":sh", ""];
    const result = await evaluateRequirements(bogus);

    expect(result.ok).toBe(false);
    expect(result.failed).toEqual(bogus);
  });

  test("failed requirements are reported in declaration order, satisfied ones omitted", async () => {
    const result = await evaluateRequirements([`platform:${OTHER}`, "binary:sh", "nope:x"]);

    expect(result).toEqual({ ok: false, failed: [`platform:${OTHER}`, "nope:x"] });
  });
});

describe("ssh aliases are read from the config, not dialled", () => {
  function writeConfig(body: string, name = "config"): string {
    const path = join(scratch, name);
    writeFileSync(path, body);
    return path;
  }

  test("an alias declared in the config counts", () => {
    const config = writeConfig(["Host pve", "  HostName 10.0.0.1", "  User root", "", "Host king", "  HostName 10.0.0.2"].join("\n"));

    expect([...sshConfigHosts(config)].sort()).toEqual(["king", "pve"]);
    expect(sshAliasDefined("pve", config)).toBe(true);
  });

  test("an alias absent from the config does not", () => {
    const config = writeConfig("Host king\n  HostName 10.0.0.2\n");

    expect(sshConfigHosts(config).has("pve")).toBe(false);
    expect(sshAliasDefined("pve", config)).toBe(false);
  });

  test("a missing config file is empty rather than an error", () => {
    expect([...sshConfigHosts(join(scratch, "no-such-config"))]).toEqual([]);
    expect(sshAliasDefined("pve", join(scratch, "no-such-config"))).toBe(false);
  });

  test("wildcard and negated patterns never satisfy an alias", () => {
    const config = writeConfig(["Host *", "  ServerAliveInterval 60", "", "Host 10.10.10.*", "  User root", "", "Host !secret build", "  User ci"].join("\n"));

    expect([...sshConfigHosts(config)]).toEqual(["build"]);
    expect(sshAliasDefined("anything", config)).toBe(false);
  });

  test("several aliases on one Host line all count, comments do not", () => {
    const config = writeConfig(["# Host commented", "Host pve pve-old  # trailing", "  HostName 10.0.0.1"].join("\n"));

    expect(sshConfigHosts(config).has("pve")).toBe(true);
    expect(sshConfigHosts(config).has("pve-old")).toBe(true);
    expect(sshConfigHosts(config).has("commented")).toBe(false);
    expect(sshConfigHosts(config).has("trailing")).toBe(false);
  });

  test("Include pulls in aliases from another file, relative to the config dir", () => {
    mkdirSync(join(scratch, "conf.d"), { recursive: true });
    writeFileSync(join(scratch, "conf.d", "lab.conf"), "Host pve\n  HostName 10.0.0.1\n");
    const config = writeConfig("Include conf.d/lab.conf\nHost king\n  HostName 10.0.0.2\n");

    expect([...sshConfigHosts(config)].sort()).toEqual(["king", "pve"]);
  });

  test("a globbed Include is followed, a broken one is ignored", () => {
    mkdirSync(join(scratch, "conf.d"), { recursive: true });
    writeFileSync(join(scratch, "conf.d", "a.conf"), "Host alpha\n");
    writeFileSync(join(scratch, "conf.d", "b.conf"), "Host beta\n");
    const config = writeConfig("Include conf.d/*.conf\nInclude nowhere/*.conf\n");

    expect([...sshConfigHosts(config)].sort()).toEqual(["alpha", "beta"]);
  });

  test("an Include cycle terminates", () => {
    writeFileSync(join(scratch, "a"), "Include b\nHost alpha\n");
    writeFileSync(join(scratch, "b"), "Include a\nHost beta\n");

    expect([...sshConfigHosts(join(scratch, "a"))].sort()).toEqual(["alpha", "beta"]);
  });

  test("the requirement is static: no network call, so an unreachable host still counts", async () => {
    const config = writeConfig("Host pve\n  HostName 203.0.113.1\n");

    // Reachability is deliberately not consulted; the tool reports its own timeout if the host is down.
    expect(sshAliasDefined("pve", config)).toBe(true);
  });
});

describe("probe cost and safety", () => {
  test("a requirement is probed once however many tools share it", async () => {
    let calls = 0;
    const check = async (requirement: string) => {
      calls += 1;
      return requirement === "ssh:pve";
    };

    const twenty = await Promise.all(Array.from({ length: 20 }, () => evaluateRequirements(["ssh:pve"], { check })));

    expect(calls).toBe(1);
    expect(twenty.every((result) => result.ok)).toBe(true);
  });

  test("clearing the cache re-probes", async () => {
    let calls = 0;
    const check = async () => {
      calls += 1;
      return true;
    };

    await evaluateRequirements(["ssh:pve"], { check });
    clearRequirementCache();
    await evaluateRequirements(["ssh:pve"], { check });

    expect(calls).toBe(2);
  });

  test("a probe that hangs fails at the timeout instead of blocking startup", async () => {
    const check = () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 5000));
    const startedAt = Date.now();

    const result = await evaluateRequirements(["ssh:unreachable"], { check, timeoutMs: 30 });

    expect(result).toEqual({ ok: false, failed: ["ssh:unreachable"] });
    expect(Date.now() - startedAt).toBeLessThan(2000);
  });

  test("a probe that throws fails closed rather than escaping", async () => {
    const check = async () => {
      throw new Error("probe exploded");
    };

    expect(await evaluateRequirements(["ssh:broken"], { check })).toEqual({ ok: false, failed: ["ssh:broken"] });
  });

  test("a probe that throws synchronously also fails closed", async () => {
    const check = (() => {
      throw new Error("probe exploded synchronously");
    }) as () => Promise<boolean>;

    expect(await evaluateRequirements(["ssh:broken"], { check })).toEqual({ ok: false, failed: ["ssh:broken"] });
  });
});
