#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "a2a-sdk==1.1.0",
#     "httpx",
# ]
# ///
"""a2a-delegate client — send a task to a peer agent over A2A (mTLS) and
print its full lifecycle (SUBMITTED -> WORKING -> artifact -> COMPLETED).

Self-contained (PEP 723) — `uv run` resolves deps on the fly, no venv needed.

Zero endpoints/certs live in this file (this plugin is public). Peer config
(endpoint + cert filenames) is an instance secret:
`$SCRIPTORIUM_HOME/secrets/a2a/peers.json` (falls back to ~/.kilo if
SCRIPTORIUM_HOME is unset), with cert files sitting alongside it. To add a
peer: append an entry there and issue that peer a client cert — nothing in
this script changes.

peers.json shape:
    {"noir": {"endpoint": "https://host:port",
               "ca": "ca.crt", "cert": "client-kilo.crt", "key": "client-kilo.key"}}
(cert paths are resolved relative to the peers.json directory.)

Run:
    uv run client.py --peer noir --prompt "回你的 hostname 跟 UTC 時間"
"""

import argparse
import asyncio
import json
import os
import ssl
import sys
import uuid

import httpx

from a2a.client import A2ACardResolver, ClientConfig, create_client
from a2a.helpers import get_artifact_text, get_message_text
from a2a.types import Message, Part, Role, SendMessageRequest, TaskState


def load_peer(peer: str) -> tuple[dict, str]:
    home = os.environ.get("SCRIPTORIUM_HOME") or os.path.expanduser("~/.kilo")
    secrets_dir = os.path.join(home, "secrets", "a2a")
    peers_path = os.path.join(secrets_dir, "peers.json")
    if not os.path.isfile(peers_path):
        sys.exit(
            f"error: no peers.json at {peers_path} — no peer configured yet "
            "(see SKILL.md for the expected shape)."
        )
    with open(peers_path) as f:
        peers = json.load(f)
    if peer not in peers:
        sys.exit(
            f"error: peer '{peer}' not found in {peers_path}. "
            f"Known peers: {sorted(peers) or '(none)'}"
        )
    return peers[peer], secrets_dir


def resolve_cert_paths(peer_cfg: dict, secrets_dir: str) -> dict:
    paths = {}
    for key in ("ca", "cert", "key"):
        path = os.path.join(secrets_dir, peer_cfg[key])
        if not os.path.isfile(path):
            sys.exit(f"error: '{key}' file missing for this peer: {path}")
        paths[key] = path
    return paths


async def main() -> None:
    parser = argparse.ArgumentParser(description="Send an A2A task to a peer agent.")
    parser.add_argument("--peer", required=True, help="peer name — a key in peers.json (e.g. noir)")
    parser.add_argument("--prompt", required=True, help="task text to send to the peer")
    args = parser.parse_args()

    peer_cfg, secrets_dir = load_peer(args.peer)
    endpoint = peer_cfg["endpoint"]
    certs = resolve_cert_paths(peer_cfg, secrets_dir)

    ssl_ctx = ssl.create_default_context(cafile=certs["ca"])
    ssl_ctx.load_cert_chain(certfile=certs["cert"], keyfile=certs["key"])

    # server-side turn can legitimately run minutes — client SSE read timeout
    # must outlive it, or the client misreports A2AClientTimeoutError while
    # the server is still working (see project_kilo_noir_a2a.md spike trap).
    long_timeout = httpx.Timeout(120.0, connect=10.0)

    try:
        async with httpx.AsyncClient(timeout=long_timeout, verify=ssl_ctx) as httpx_client:
            resolver = A2ACardResolver(httpx_client, endpoint)
            card = await resolver.get_agent_card()
    except httpx.ConnectError as e:
        sys.exit(f"error: cannot reach peer '{args.peer}' at {endpoint}: {e}")
    except ssl.SSLError as e:
        sys.exit(f"error: TLS handshake failed for peer '{args.peer}' (bad/expired cert?): {e}")

    print(f"=== agent card: {args.peer} ({endpoint}) ===")
    print(f"name: {card.name}")
    print(f"description: {card.description}")
    print(f"skills: {[s.id for s in card.skills]}")
    print()

    config = ClientConfig(httpx_client=httpx.AsyncClient(timeout=long_timeout, verify=ssl_ctx))
    client = await create_client(card, client_config=config)

    message = Message(
        role=Role.ROLE_USER,
        message_id=str(uuid.uuid4()),
        parts=[Part(text=args.prompt)],
        context_id=str(uuid.uuid4()),
    )
    request = SendMessageRequest(message=message)

    print("=== task lifecycle ===")
    try:
        async for event in client.send_message(request):
            if event.HasField("task"):
                print(f"[task] id={event.task.id} state={TaskState.Name(event.task.status.state)}")
            elif event.HasField("status_update"):
                state_name = TaskState.Name(event.status_update.status.state)
                msg = ""
                if event.status_update.status.HasField("message"):
                    msg = " | message=" + get_message_text(event.status_update.status.message, delimiter=" ")
                print(f"[status_update] state={state_name}{msg}")
            elif event.HasField("artifact_update"):
                name = event.artifact_update.artifact.name
                text = get_artifact_text(event.artifact_update.artifact, delimiter=" ")
                print(f"[artifact_update] name={name}")
                print(f"  content: {text!r}")
            elif event.HasField("message"):
                print("[message]", get_message_text(event.message, delimiter=" "))
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
