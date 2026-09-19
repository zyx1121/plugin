#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["typer", "rich"]
# ///
"""OCR atoms — file / health, via ocr.winlab.tw (jina-ocr-v1 on king's RTX 3080).

Wraps a small gateway that runs jina-ocr-v1 behind Caddy on king, so agents
and humans can turn a scanned page, photo, or PDF into markdown without local
GPU or model weights.

Auth: `Authorization: Bearer <token>`. Env `UTILS_OCR_TOKEN` overrides the
file `~/.config/utils/ocr.json` (`{"token": "...", "base": "..."}`, mode
0600) — same shape/precedence as `utils e3p login`'s config, minus the
interactive login: the token is issued out of band, so drop it into the
config file yourself.

Env knobs (all optional):
    UTILS_OCR_BASE   Service base URL (default: https://ocr.winlab.tw)
    UTILS_OCR_TOKEN  Pre-shared bearer token (skip the config file)
"""
from __future__ import annotations

import sys as _sys
from pathlib import Path as _Path

# Siblings shadow stdlib (json.py, uuid.py) — drop our dir off sys.path so deps resolve.
_sys.path[:] = [p for p in _sys.path if _Path(p).resolve() != _Path(__file__).resolve().parent]
_LIB = str(_Path(__file__).resolve().parent.parent / "lib")
if _LIB not in _sys.path:
    _sys.path.insert(0, _LIB)

import json
import os
import uuid
from pathlib import Path
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import typer
from rich.console import Console

from _envelope import emit, fail  # noqa: E402

BASE_DEFAULT = "https://ocr.winlab.tw"
CONTENT_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf"}

app = typer.Typer(
    rich_markup_mode=None,
    no_args_is_help=True,
    add_completion=False,
    help="OCR atoms — file / health, via ocr.winlab.tw (jina-ocr-v1).",
)
console = Console(highlight=False)


# ── config ───────────────────────────────────────────────────────
def _config_path() -> Path:
    root = os.environ.get("XDG_CONFIG_HOME") or "~/.config"
    return Path(root).expanduser() / "utils" / "ocr.json"


def _config() -> dict:
    p = _config_path()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except json.JSONDecodeError:
        return {}


def _base_url() -> str:
    return (os.environ.get("UTILS_OCR_BASE") or _config().get("base") or BASE_DEFAULT).rstrip("/")


def _token() -> str:
    tok = os.environ.get("UTILS_OCR_TOKEN") or _config().get("token")
    if not tok:
        fail(
            "no OCR token",
            why=f"no UTILS_OCR_TOKEN env and no token in {_config_path()}",
            hint="set UTILS_OCR_TOKEN or ~/.config/utils/ocr.json",
        )
    return tok


# ── HTTP / multipart plumbing ───────────────────────────────────
def _check_writable(out_path: Path) -> None:
    """Fail fast on a bad output path before spending an upload on it."""
    if out_path.is_dir():
        fail(
            f"output path is a directory: {out_path}",
            hint="pass a file path, not a directory",
            code=2,
        )
    parent = out_path.parent
    if not parent.exists():
        fail(
            f"output directory does not exist: {parent}",
            hint="create it first, or pass a different --out",
            code=2,
        )
    if not os.access(parent, os.W_OK):
        fail(
            f"output directory is not writable: {parent}",
            hint="check permissions, or pass a different --out",
            code=2,
        )


def _multipart(fields: dict[str, str], filename: str, content: bytes, content_type: str) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    parts: list[bytes] = []
    for name, value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: {content_type}\r\n\r\n'.encode()
    )
    parts.append(content)
    parts.append(f"\r\n--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


# ── health ───────────────────────────────────────────────────────
@app.command(help="Check whether the OCR service is reachable. No auth required.")
def health() -> None:
    url = f"{_base_url()}/health"
    try:
        with urlopen(Request(url, headers={"User-Agent": "utils-ocr/1.0"}), timeout=15) as resp:
            raw = resp.read()
    except HTTPError as e:
        fail("ocr health check failed", why=f"{e.code} {e.reason}", hint=url)
    except URLError as e:
        fail("ocr service unreachable", why=str(e), hint=f"check {url} / network")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        fail("ocr health: non-JSON response", why=raw[:200].decode(errors="replace"), hint=url)

    emit(
        data,
        {"base": _base_url()},
        human=lambda d, m: console.print(
            f"[bold]{m['base']}[/] — {'[green]ok[/]' if d.get('ok') else '[red]not ok[/]'} · {d.get('model', '?')}"
        ),
    )


# ── file ─────────────────────────────────────────────────────────
@app.command(help="OCR a png/jpg/pdf and write markdown next to the source. Never overwrites the source.")
def file(
    path: Path = typer.Argument(..., help="Image or PDF to OCR."),
    pages: Optional[str] = typer.Option(None, "--pages", help="Page range for PDFs, e.g. 1-3,5 (default: all)."),
    dpi: Optional[int] = typer.Option(None, "--dpi", help="Render DPI for PDFs (default: 150, service side)."),
    out: Optional[str] = typer.Option(None, "--out", "-o", help="Write markdown here instead of <path>.md."),
) -> None:
    if not path.exists():
        fail(f"no such file: {path}", hint="check the path", code=2)
    ctype = CONTENT_TYPES.get(path.suffix.lower())
    if ctype is None:
        fail(
            f"unsupported file type: {path.suffix or '(none)'}",
            why="the OCR service accepts png, jpg/jpeg, and pdf",
            hint="convert first, or pass a supported file",
            code=2,
        )

    out_path = Path(out) if out else path.with_name(path.name + ".md")
    if out_path.resolve() == path.resolve():
        fail(f"refusing to overwrite source: {out_path}", hint="pass --out with a different path", code=2)
    _check_writable(out_path)

    token = _token()
    fields: dict[str, str] = {}
    if pages:
        fields["pages"] = pages
    if dpi is not None:
        fields["dpi"] = str(dpi)

    body, content_type = _multipart(fields, path.name, path.read_bytes(), ctype)
    req = Request(
        f"{_base_url()}/v1/ocr",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
            "User-Agent": "utils-ocr/1.0",
        },
    )
    try:
        with urlopen(req, timeout=600) as resp:
            raw = resp.read()
    except HTTPError as e:
        detail = e.read().decode(errors="replace")[:300] if e.fp else ""
        if e.code == 401:
            fail("ocr: invalid API key", why=detail or f"{e.code} {e.reason}", hint="check UTILS_OCR_TOKEN / ~/.config/utils/ocr.json")
        if e.code == 413:
            fail("ocr: too many pages", why=detail or f"{e.code} {e.reason}", hint="the service caps requests at 50 pages; narrow --pages")
        if e.code == 400:
            fail("ocr: bad input", why=detail or f"{e.code} {e.reason}", hint="check the file and --pages/--dpi values")
        fail("ocr HTTP error", why=detail or f"{e.code} {e.reason}", hint=f"{_base_url()}/v1/ocr")
    except URLError as e:
        fail("ocr network error", why=str(e), hint="check connectivity / UTILS_OCR_BASE")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        fail("ocr: non-JSON response", why=raw[:200].decode(errors="replace"), hint="the service may still be starting up; retry in a bit")

    markdown = data.get("markdown")
    if markdown is None:
        fail(
            "ocr: response had no markdown",
            why="the service returned markdown=null",
            hint="retry, or check --pages/--dpi and the input file",
        )
    try:
        out_path.write_text(markdown, encoding="utf-8")
    except OSError as e:
        fail(f"ocr: cannot write output: {out_path}", why=str(e), hint="check the output path is writable")
    stats = data.get("stats", {})
    result = {"out": str(out_path), "pages": stats.get("pages", len(data.get("pages", []))), "stats": stats}

    emit(
        result,
        {"input": str(path), "model": data.get("model")},
        human=lambda d, m: console.print(
            f"OCR'd {d['pages']} page(s) in {d['stats'].get('seconds', '?')}s → [bold]{d['out']}[/]"
        ),
    )


if __name__ == "__main__":
    app()
