#!/usr/bin/env bash
# utils MCP launcher — fail fast on machines without ~/utils (e.g. Noir)
set -euo pipefail

server="$HOME/utils/mcp/server.ts"
[ -f "$server" ] || exit 1

if command -v bun >/dev/null 2>&1; then
  exec bun run "$server"
elif [ -x /opt/homebrew/bin/bun ]; then
  exec /opt/homebrew/bin/bun run "$server"
fi

exit 1
