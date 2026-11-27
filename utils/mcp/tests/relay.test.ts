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

// Writes `buf` fully, honoring partial writes; call the returned pump on drain.
function writeAll(s: { write(b: Uint8Array): number }, buf: Uint8Array) {
  let rest = buf;
  const pump = () => {
    while (rest.byteLength) {
      const n = s.write(rest);
      if (n <= 0) return;
      rest = rest.subarray(n);
    }
  };
  pump();
  return pump;
}

function pattern(size: number): Uint8Array {
  const buf = new Uint8Array(size);
  for (let i = 0; i < size; i++) buf[i] = (i * 31 + 7) & 0xff;
  return buf;
}

function digest(parts: Uint8Array[]): string {
  return new Bun.CryptoHasher("sha256").update(Buffer.concat(parts)).digest("hex");
}

function unixSetup(server: Parameters<typeof Bun.listen>[0]["socket"]) {
  const dir = mkdtempSync(join(tmpdir(), "relay-"));
  const path = join(dir, "proxy.sock");
  const stub = Bun.listen({ unix: path, socket: server });
  const relay = startRelay(path, 0);
  cleanups.push(() => {
    relay.stop(true);
    stub.stop(true);
    rmSync(dir, { recursive: true, force: true });
  });
  return relay;
}

const SIZE = 6 * 1024 * 1024;

test("relay forwards a multi-MB upload intact to a slow Unix reader", async () => {
  const sent = pattern(SIZE);
  const received: Uint8Array[] = [];
  let count = 0;
  const done = Promise.withResolvers<void>();
  const relay = unixSetup({
    data(s, chunk) {
      received.push(new Uint8Array(chunk));
      count += chunk.byteLength;
      if (count >= SIZE) done.resolve();
      s.pause();
      setTimeout(() => s.resume(), 1);
    },
  });
  let pump = () => {};
  Bun.connect({
    hostname: "127.0.0.1",
    port: relay.port,
    socket: {
      open(s) {
        pump = writeAll(s, sent);
      },
      drain() {
        pump();
      },
      data() {},
    },
  });
  await done.promise;
  expect(count).toBe(SIZE);
  expect(digest(received)).toBe(digest([sent]));
}, 30_000);

test("relay forwards a multi-MB download intact to a slow TCP reader", async () => {
  const sent = pattern(SIZE);
  const received: Uint8Array[] = [];
  let count = 0;
  const done = Promise.withResolvers<void>();
  let pump = () => {};
  const relay = unixSetup({
    open(s) {
      pump = writeAll(s, sent);
    },
    drain() {
      pump();
    },
    data() {},
  });
  Bun.connect({
    hostname: "127.0.0.1",
    port: relay.port,
    socket: {
      open(s) {
        s.write("go");
      },
      data(s, chunk) {
        received.push(new Uint8Array(chunk));
        count += chunk.byteLength;
        if (count >= SIZE) done.resolve();
        s.pause();
        setTimeout(() => s.resume(), 1);
      },
    },
  });
  await done.promise;
  expect(count).toBe(SIZE);
  expect(digest(received)).toBe(digest([sent]));
}, 30_000);
