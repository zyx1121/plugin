// In-jail relay: accepts TCP on 127.0.0.1:<port> and pipes each connection to a Unix socket.
// Usage: bun relay.ts <unix-socket> <port>
// The jail has its own empty network namespace, so 127.0.0.1 here is the jail's loopback only.
import type { Socket, TCPSocketListener } from "bun";

type PeerData = { peer?: Socket<unknown>; pending: Uint8Array[]; closed: boolean };

export function startRelay(unixPath: string, port: number): TCPSocketListener<PeerData> {
  return Bun.listen<PeerData>({
    hostname: "127.0.0.1",
    port,
    socket: {
      open(client) {
        client.data = { pending: [], closed: false };
        Bun.connect<PeerData>({
          unix: unixPath,
          socket: {
            open(upstream) {
              upstream.data = client.data;
              client.data.peer = upstream;
              for (const chunk of client.data.pending) upstream.write(chunk);
              client.data.pending = [];
              if (client.data.closed) upstream.end();
            },
            data(_upstream, chunk) {
              client.write(chunk);
            },
            close() {
              client.end();
            },
            error() {
              client.end();
            },
            connectError() {
              client.end();
            },
          },
        }).catch(() => client.end());
      },
      data(client, chunk) {
        if (client.data.peer) client.data.peer.write(chunk);
        else client.data.pending.push(new Uint8Array(chunk));
      },
      close(client) {
        client.data.closed = true;
        client.data.peer?.end();
      },
      error(client) {
        client.data.peer?.end();
      },
    },
  });
}

if (import.meta.main) {
  const [unixPath, portArg] = process.argv.slice(2);
  const port = Number(portArg);
  if (!unixPath || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("usage: bun relay.ts <unix-socket> <port>");
    process.exit(2);
  }
  const parent = process.ppid;
  startRelay(unixPath, port);
  // Exit when the parent exits (the process is re-parented, so ppid changes).
  setInterval(() => {
    if (process.ppid !== parent) process.exit(0);
  }, 500);
}
