import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startRelay } from "../../../skills/dual-review/scripts/relay.ts";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "relay-"));
  const path = join(dir, "proxy.sock");
  const stub = Bun.listen({
    unix: path,
    socket: {
      data(s, chunk) {
        s.write(Buffer.concat([Buffer.from("echo:"), chunk]));
      },
    },
  });
  const relay = startRelay(path, 0);
  cleanups.push(() => {
    relay.stop(true);
    stub.stop(true);
    rmSync(dir, { recursive: true, force: true });
  });
  return relay;
}

test("relay binds loopback only", () => {
  const relay = setup();
  expect(relay.hostname).toBe("127.0.0.1");
});

test("round trip through the relay to a Unix socket", async () => {
  const relay = setup();
  const got = await new Promise<string>((resolve, reject) => {
    Bun.connect({
      hostname: "127.0.0.1",
      port: relay.port,
      socket: {
        open(s) {
          s.write("hello");
        },
        data(s, chunk) {
          resolve(Buffer.from(chunk).toString());
          s.end();
        },
        error(_s, e) {
          reject(e);
        },
        connectError(_s, e) {
          reject(e);
        },
      },
    });
  });
  expect(got).toBe("echo:hello");
});
