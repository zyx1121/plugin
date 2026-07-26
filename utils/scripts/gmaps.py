#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["typer", "rich"]
# ///
"""Google Maps toolbox — read shared place lists without a browser or API key.

Saved-place lists have no public API (Places API only covers public place data),
and the list page renders client-side, so plain HTML fetches return an empty
shell. The page itself calls an internal endpoint that shared lists expose
without auth:

    GET /maps/preview/entitylist/getlist?pb=!1m1!1s<LIST_ID>!2e2!3e2!4i<LIMIT>

The response is a `)]}'` guard prefix followed by nested arrays. Short links
(maps.app.goo.gl) 302 to the canonical list URL — but only for non-browser user
agents, so we deliberately send urllib's default UA instead of faking a browser.

Place and address names come back in whatever language the list was built in;
verified that hl / gl / authuser make no difference, so no locale knob exists.

Scope: lists the owner has shared. Private lists need a logged-in session and
are out of scope. Field positions belong to an undocumented internal endpoint;
they can change without notice, so parsing stays defensive.
"""
from __future__ import annotations

# Siblings shadow stdlib (json.py, uuid.py) — drop our dir off sys.path so deps resolve.
import sys as _sys
from pathlib import Path as _Path
_sys.path[:] = [p for p in _sys.path if _Path(p).resolve() != _Path(__file__).resolve().parent]
_LIB = str(_Path(__file__).resolve().parent.parent / "lib")
if _LIB not in _sys.path:
    _sys.path.insert(0, _LIB)

import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote

import typer
from rich.console import Console
from rich.table import Table

from _envelope import emit, fail  # noqa: E402

app = typer.Typer(
    rich_markup_mode=None,
    no_args_is_help=True,
    add_completion=False,
    help="Google Maps toolbox — read shared place lists.",
)
console = Console(highlight=False)


@app.callback()
def _root() -> None:
    # Registered so Typer keeps subcommand dispatch while there is only one command.
    return


GETLIST = "https://www.google.com/maps/preview/entitylist/getlist"
TIMEOUT = 30
# Long enough for a person's list; the endpoint caps the page itself.
MAX_LIMIT = 500

# maps.app.goo.gl/<code>, /maps/placelists/list/<id>, or ...!2s<id> inside a data= blob.
_ID_PATTERNS = (
    re.compile(r"/placelists/list/([A-Za-z0-9_-]{16,})"),
    re.compile(r"!2s([A-Za-z0-9_-]{16,})"),
)
_BARE_ID = re.compile(r"^[A-Za-z0-9_-]{16,}$")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Stop at the 302 so we can read Location instead of downloading the page."""

    def redirect_request(self, *_args, **_kwargs):
        return None


def _resolve_list_id(target: str) -> str:
    """Turn a share link, canonical URL, or bare id into a list id."""
    target = target.strip()
    if _BARE_ID.match(target):
        return target

    if not target.startswith(("http://", "https://")):
        fail(
            f"not a Maps list link or id: {target!r}",
            why="expected a maps.app.goo.gl share link, a /maps/placelists/list/<id> URL, or a bare list id",
            hint="in Google Maps open the list, tap Share, and copy the link",
            code=2,
        )

    for pattern in _ID_PATTERNS:
        found = pattern.search(target)
        if found:
            return found.group(1)

    # Short links resolve only for non-browser UAs; a browser UA gets a JS interstitial.
    try:
        opener = urllib.request.build_opener(_NoRedirect)
        with opener.open(target, timeout=TIMEOUT) as resp:
            fail(
                "share link did not redirect to a list",
                why=f"expected a 302 to /maps/placelists/list/<id>, got HTTP {resp.status}",
                hint="open the link in a browser and copy the /maps/placelists/list/<id> URL instead",
            )
    except urllib.error.HTTPError as err:
        location = err.headers.get("location") or "" if err.headers else ""
        for pattern in _ID_PATTERNS:
            found = pattern.search(location)
            if found:
                return found.group(1)
        fail(
            "could not find a list id behind the share link",
            why=f"redirect target was {location[:120] or '(empty)'}",
            hint="the link may point at a place or map view rather than a saved list",
        )
    except urllib.error.URLError as err:
        fail("could not reach Google Maps", why=str(err.reason), hint="check network access")


def _fetch(list_id: str, limit: int) -> Any:
    pb = f"!1m1!1s{list_id}!2e2!3e2!4i{limit}"
    url = f"{GETLIST}?pb={quote(pb, safe='')}"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        fail(
            f"Maps rejected the list request (HTTP {err.code})",
            why="shared lists are readable anonymously; private ones are not",
            hint="ask the owner to share the list, or check the id",
        )
    except urllib.error.URLError as err:
        fail("could not reach Google Maps", why=str(err.reason), hint="check network access")

    start = raw.find("[")
    if start < 0:
        fail(
            "unexpected response from Maps",
            why=f"no JSON array in {len(raw)} bytes of response",
            hint="this is an internal endpoint and may have changed",
        )
    try:
        return json.loads(raw[start:])
    except json.JSONDecodeError as err:
        fail(
            "could not parse the Maps response",
            why=str(err),
            hint="this is an internal endpoint and may have changed",
        )


def _at(node: Any, *path: int) -> Any:
    """Index into nested lists, returning None instead of raising."""
    for index in path:
        if not isinstance(node, list) or len(node) <= index:
            return None
        node = node[index]
    return node


def _ts(node: Any) -> Optional[str]:
    """[epoch_seconds, nanos] -> ISO 8601 UTC."""
    seconds = _at(node, 0)
    if not isinstance(seconds, (int, float)):
        return None
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat()


def _place(entry: Any) -> dict:
    detail = _at(entry, 1)
    lat = _at(detail, 5, 2)
    lng = _at(detail, 5, 3)
    note = _at(entry, 3)
    return {
        "name": _at(entry, 2),
        "address": _at(detail, 4),
        "lat": lat,
        "lng": lng,
        "mid": _at(detail, 7),
        "note": note or None,
        "added": _ts(_at(entry, 9)),
        "maps_url": (
            f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
            if isinstance(lat, (int, float)) and isinstance(lng, (int, float))
            else None
        ),
    }


@app.command(
    "list",
    help="Read a shared Google Maps place list: name, owner, and every place with address, coordinates, note, and date added.",
)
def list_(
    target: str = typer.Argument(..., help="Share link (maps.app.goo.gl/...), list URL, or bare list id."),
    limit: int = typer.Option(MAX_LIMIT, "--limit", min=1, max=MAX_LIMIT, help=f"Maximum places to request (1-{MAX_LIMIT})."),
):
    list_id = _resolve_list_id(target)
    payload = _at(_fetch(list_id, limit), 0)
    if not isinstance(payload, list):
        fail(
            "no list in the Maps response",
            why="the payload had no list envelope",
            hint="confirm the list is shared, not private",
        )

    entries = _at(payload, 8)
    places = [_place(entry) for entry in entries] if isinstance(entries, list) else []
    data = {
        "id": _at(payload, 0, 0) or list_id,
        "name": _at(payload, 4),
        "description": _at(payload, 5) or None,
        "url": _at(payload, 2, 2) or f"https://www.google.com/maps/placelists/list/{list_id}",
        "owner": _at(payload, 3, 0),
        "place_count": _at(payload, 12),
        "created": _ts(_at(payload, 10)),
        "updated": _ts(_at(payload, 11)),
        "places": places,
    }

    def human(d: dict, _m: dict) -> None:
        header = f"[bold]{d['name'] or d['id']}[/]"
        if d["owner"]:
            header += f"  ·  {d['owner']}"
        header += f"  ·  {len(d['places'])} places"
        console.print(header)
        if d["description"]:
            console.print(f"[dim]{d['description']}[/]")
        table = Table(show_lines=False)
        table.add_column("#", justify="right")
        table.add_column("place")
        table.add_column("address")
        table.add_column("note")
        for i, place in enumerate(d["places"], 1):
            table.add_row(str(i), place["name"] or "", place["address"] or "", place["note"] or "")
        console.print(table)

    emit(data, {"list": data["name"], "count": len(places)}, human=human)


if __name__ == "__main__":
    app()
