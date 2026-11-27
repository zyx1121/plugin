// In-jail relay: accepts TCP on 127.0.0.1:<port> and pipes each connection to a Unix socket.
// Usage: bun relay.ts <unix-socket> <port>
// The jail has its own empty network namespace, so 127.0.0.1 here is the jail's loopback only.
import type { Socket, TCPSocketListener } from "bun";

// One side of a relayed connection. `queue` holds bytes not yet accepted by this socket.
type End = {
  sock?: Socket<End>;
  peer?: End;
  queue: Uint8Array[];
  ending: boolean;
  closed: boolean;
};

const newEnd = (): End => ({ queue: [], ending: false, closed: false });

// Write what the socket accepts now, keep the unwritten tail queued.
function flush(end: End): void {
  const sock = end.sock;
  if (!sock || end.closed) return;
  while (end.queue.length) {
    const chunk = end.queue[0]!;
    const written = sock.write(chunk);
    if (written >= chunk.byteLength) {
      end.queue.shift();
      continue;
    }
    end.queue[0] = chunk.subarray(Math.max(written, 0));
    return;
  }
  if (end.ending) sock.end();
}

// Send bytes read from `from` to its peer. Pause `from` while the peer has a backlog.
function forward(from: End, chunk: Uint8Array): void {
  const to = from.peer!;
  if (to.closed) return;
  to.queue.push(new Uint8Array(chunk));
  flush(to);
  if (to.queue.length || !to.sock) from.sock?.pause();
}

// The peer accepted its backlog: read from `from` again.
function drained(end: End): void {
  flush(end);
  if (!end.queue.length && end.sock && end.peer && !end.peer.closed) end.peer.sock?.resume();
}

function finish(end: End): void {
  end.ending = true;
  if (!end.queue.length) end.sock?.end();
}

function closed(end: End): void {
  end.closed = true;
  end.queue = [];
  if (end.peer) finish(end.peer);
}

export function startRelay(unixPath: string, port: number): TCPSocketListener<End> {
  return Bun.listen<End>({
    hostname: "127.0.0.1",
    port,
    socket: {
      open(client) {
        const down = newEnd();
        const up = newEnd();
        down.sock = client;
        down.peer = up;
        up.peer = down;
        client.data = down;
        Bun.connect<End>({
          unix: unixPath,
          data: up,
          socket: {
            open(upstream) {
              upstream.data = up;
              up.sock = upstream;
              drained(up);
            },
            data(upstream, chunk) {
              forward(upstream.data, chunk);
            },
            drain(upstream) {
              drained(upstream.data);
            },
            close() {
              closed(up);
            },
            error() {
              closed(up);
            },
            connectError() {
              closed(up);
            },
          },
        }).catch(() => closed(up));
      },
      data(client, chunk) {
        forward(client.data, chunk);
      },
      drain(client) {
        drained(client.data);
      },
      close(client) {
        closed(client.data);
      },
      error(client) {
        closed(client.data);
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
