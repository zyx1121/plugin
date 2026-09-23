# ADR-0010: Retire the ocr domain and its backing service

Status: Accepted (2026-09-23, Loki's call).

## Context

The `ocr` domain (`ocr_health`, `ocr_file`, added in 0.22.0 by #50) wrapped
`ocr.winlab.tw`, a jina-ocr-v1 service on king (WSL vLLM behind a gateway
Caddy route and a Windows portproxy). Three weeks of use showed the cost did
not match the value:

- **The service monopolized king's GPU.** jina-ocr-v1 is a 3B MoE on the
  DeepSeek-OCR backbone: 6.3 GB of weights plus vLLM's KV preallocation held
  9.9 of the RTX 3080's 10 GB, blocking every other GPU workload on the host.
- **The common case does not need it.** Agents read images and PDFs natively;
  a handful of screenshots or lecture pages go straight into the model. A
  dedicated OCR stage only pays off for bulk scans or RAG ingestion, neither
  of which is running today.
- **Lighter models now score higher.** On OmniDocBench v1.6, jina-ocr-v1
  reports 91.14, below 0.9B-class models such as PaddleOCR-VL-1.6 (96.34)
  and GLM-OCR (95.22) that fit in about 2 GB.

## Decision

Remove the `ocr` domain from `utils` (tool module, `scripts/ocr.py`, test
samples, README rosters) and take `ocr.winlab.tw` offline: Caddy site block,
Cloudflare A record, king portproxy, firewall rule and boot task. The model
files stay on king, with the systemd unit disabled.

## Consequences

- **+** king's GPU is free for other work; one fewer public endpoint and
  bearer token to maintain.
- **+** The toolbox drops to 82 tools.
- **-** Scanned PDFs without a text layer have no batch path through
  `utils`; `pdf_extract_text` still returns nothing for them.
- If bulk OCR comes back, start from a 0.9B-class model (GLM-OCR via
  Ollama, or PaddleOCR-VL via vLLM) measured on real documents, not from
  reviving this service.
