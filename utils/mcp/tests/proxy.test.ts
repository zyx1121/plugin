import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createServer, connect, type Server, type Socket } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProxy, isBlockedAddress, parseAllowlist } from "../../../skills/dual-review/scripts/proxy.ts";

let dir: string;
let sock: string;
let proxy: Server;
let echo: Server;
let echoPort: number;
const resolved: Record<string, string[]> = {
  "allowed.test": ["93.184.216.34"],
  "evil.test": ["127.0.0.1"],
  "mixed.test": ["93.184.216.34", "10.0.0.5"],
};

function request(line: string): Promise<{ head: string; socket: Socket }> {
  return new Promise((res, rej) => {
    const s = connect(sock);
    s.once("error", rej);
    s.once("data", (d) => res({ head: d.toString().split("\r\n")[0], socket: s }));
    s.write(`${line}\r\nHost: x\r\n\r\n`);
  });
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "proxy-test-"));
  sock = join(dir, "p.sock");
  echo = createServer((c) => c.on("data", (d) => c.write(d)));
  await new Promise<void>((r) => echo.listen(0, "127.0.0.1", r));
  echoPort = (echo.address() as { port: number }).port;
  proxy = createProxy({
    allowed: parseAllowlist("allowed.test\nevil.test\nmixed.test # comment\n"),
    resolve: async (h) => resolved[h] ?? [],
    connect: () => connect({ host: "127.0.0.1", port: echoPort }),
  });
  await new Promise<void>((r) => proxy.listen(sock, r));
});

afterAll(() => {
  proxy.close();
  echo.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("allowlist proxy", () => {
  test("an allowed host tunnels", async () => {
    const { head, socket } = await request("CONNECT allowed.test:443 HTTP/1.1");
    expect(head).toBe("HTTP/1.1 200 Connection Established");
    const back = new Promise<string>((r) => socket.once("data", (d) => r(d.toString())));
    socket.write("ping");
    expect(await back).toBe("ping");
    socket.destroy();
  });

  test("a host not on the list gets 403", async () => {
    expect((await request("CONNECT other.test:443 HTTP/1.1")).head).toContain("403");
  });

  test("IP literals and localhost get 403", async () => {
    expect((await request("CONNECT 127.0.0.1:443 HTTP/1.1")).head).toContain("403");
    expect((await request("CONNECT localhost:443 HTTP/1.1")).head).toContain("403");
  });

  test("other ports and methods get 403", async () => {
    expect((await request("CONNECT allowed.test:80 HTTP/1.1")).head).toContain("403");
    expect((await request("GET http://allowed.test/ HTTP/1.1")).head).toContain("403");
  });

  test("a host that resolves to loopback or private gets 403", async () => {
    expect((await request("CONNECT evil.test:443 HTTP/1.1")).head).toContain("403");
    expect((await request("CONNECT mixed.test:443 HTTP/1.1")).head).toContain("403");
  });
});

describe("isBlockedAddress", () => {
  test("blocks loopback, private and link-local", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.1.1", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedAddress(ip)).toBe(true);
    }
    expect(isBlockedAddress("93.184.216.34")).toBe(false);
  });
});
