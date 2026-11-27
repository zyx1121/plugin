// Allowlist CONNECT proxy for dual-review reviewers.
// Usage: bun proxy.ts <socket-path> <allowlist-file>
// Listens on a Unix socket. Allows only `CONNECT host:443` where host is in
// the allowlist. Everything else gets 403. No TLS interception.
import { createServer, connect as netConnect, isIP, type Server, type Socket } from "node:net";
import { lookup } from "node:dns/promises";
import { readFileSync, rmSync } from "node:fs";

export type Resolver = (host: string) => Promise<string[]>;
export type Connector = (ip: string, port: number) => Socket;

export interface ProxyOptions {
  allowed: Set<string>;
  resolve?: Resolver;
  connect?: Connector;
}

const MAX_HEADER = 8192;

export function parseAllowlist(text: string): Set<string> {
  const hosts = new Set<string>();
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*/, "").trim().toLowerCase();
    if (line) hosts.add(line);
  }
  return hosts;
}

export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (kind === 6) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return (
      v === "::" ||
      v === "::1" ||
      v.startsWith("fe8") ||
      v.startsWith("fe9") ||
      v.startsWith("fea") ||
      v.startsWith("feb") ||
      v.startsWith("fc") ||
      v.startsWith("fd") ||
      v.startsWith("ff")
    );
  }
  return true;
}

const defaultResolve: Resolver = async (host) =>
  (await lookup(host, { all: true })).map((r) => r.address);
const defaultConnect: Connector = (ip, port) => netConnect({ host: ip, port });

function deny(sock: Socket, status = "403 Forbidden", why = ""): void {
  if (why) console.error(`deny ${why}`);
  sock.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

export function createProxy(opts: ProxyOptions): Server {
  const resolve = opts.resolve ?? defaultResolve;
  const connect = opts.connect ?? defaultConnect;

  return createServer((client) => {
    let buf = Buffer.alloc(0);
    client.on("error", () => client.destroy());

    const onData = async (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      const end = buf.indexOf("\r\n\r\n");
      if (end < 0) {
        if (buf.length > MAX_HEADER) {
          client.off("data", onData);
          deny(client);
        }
        return;
      }
      client.off("data", onData);
      client.pause();
      const head = buf.subarray(0, end).toString("latin1");
      const rest = buf.subarray(end + 4);
      const m = head.split("\r\n")[0].match(/^CONNECT ([^\s]+) HTTP\/1\.[01]$/);
      if (!m) return deny(client);

      const target = m[1].match(/^([A-Za-z0-9.-]+):(\d+)$/);
      if (!target) return deny(client);
      const host = target[1].toLowerCase().replace(/\.$/, "");
      if (target[2] !== "443" || isIP(host) || host === "localhost" || !opts.allowed.has(host)) {
        return deny(client, "403 Forbidden", `${host}:${target[2]}`);
      }

      let addrs: string[];
      try {
        addrs = await resolve(host);
      } catch {
        return deny(client, "502 Bad Gateway");
      }
      if (addrs.length === 0 || addrs.some(isBlockedAddress)) return deny(client);

      const upstream = connect(addrs[0], 443);
      upstream.on("error", () => {
        if (!client.destroyed && !client.writableEnded) deny(client, "502 Bad Gateway");
        upstream.destroy();
      });
      upstream.once("connect", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (rest.length) upstream.write(rest);
        client.pipe(upstream);
        upstream.pipe(client);
        client.resume();
      });
      client.on("close", () => upstream.destroy());
      upstream.on("close", () => client.destroy());
    };
    client.on("data", onData);
  });
}

if (import.meta.main) {
  const [socketPath, allowFile] = process.argv.slice(2);
  if (!socketPath || !allowFile) {
    console.error("usage: bun proxy.ts <socket-path> <allowlist-file>");
    process.exit(2);
  }
  const allowed = parseAllowlist(readFileSync(allowFile, "utf8"));
  rmSync(socketPath, { force: true });
  createProxy({ allowed }).listen(socketPath, () => {
    console.error(`proxy listening on ${socketPath} (${allowed.size} hosts)`);
  });
}
