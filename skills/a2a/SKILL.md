---
name: a2a
description: "Delegate a task to a peer agent over the A2A protocol (mTLS) — currently one peer, Noir (the PVE autonomous agent), with room to add more. Use when the user wants another agent to actually run something, not just be told about it. Triggers on '派給 Noir', '叫 Noir 做', '叫 Noir 幫我', 'delegate to noir', 'a2a 派工', 'Noir 幫我跑', 'send to noir via a2a', 'ask noir to'."
---

# a2a — delegate a task to a peer agent

`a2a-delegate`: send a task to another agent over the A2A protocol and wait
for its full lifecycle (submit → work → artifact → done). Not a chat message
— the peer actually **runs a turn** to produce the result.

**硬提醒**:一次呼叫 = 對方燒一次真的 turn(目前跟 Kilo 共用同一個 Anthropic 帳號配額)。派無謂/好奇心任務前想清楚是否值得,不要拿它當免費 curiosity probe。

## 有哪些 peer

Peer 清單 + endpoint + cert 在 instance secret,**不在這個 plugin 裡**(this repo is public — zero real IPs/ports/certs ever go here):

```
$SCRIPTORIUM_HOME/secrets/a2a/peers.json   # falls back to ~/.kilo if unset
```

```json
{
  "noir": {
    "endpoint": "https://<host>:<port>",
    "ca": "ca.crt",
    "cert": "client-kilo.crt",
    "key": "client-kilo.key"
  }
}
```

`ca` / `cert` / `key` 是相對 `secrets/a2a/` 目錄的檔名。目前只有 `noir` 一條;加新 peer = 在這個 JSON 多加一條 + 幫它發一張 client cert(小 CA 簽發,見 memory `project_kilo_noir_a2a`),不用動這個 skill 的任何檔案。

## 怎麼用

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/skills/a2a/client.py" --peer noir --prompt "<task 文字>"
```

`client.py` 是 PEP 723 self-contained script(`uv run` 自動裝 `a2a-sdk` + `httpx`,不吃任何外部 venv)。跑起來會依序印:

1. `=== agent card ===` — resolve 對方的 A2A agent card(name/description/skills),確認打對 peer。
2. `=== task lifecycle ===` — 逐行事件:
   - `[task] id=... state=SUBMITTED` — 對方已收下、任務進了它的 queue。
   - `[status_update] state=WORKING` — 對方正在跑那個 turn。
   - `[artifact_update] name=... content=...` — 對方跑完寫回的實際輸出,這是任務的答案。
   - `[status_update] state=COMPLETED`(或 `FAILED`)— 終態。

**COMPLETED 但沒有 artifact** 通常代表對方那個 turn 沒有把結果寫進 A2A sink,不是這支 client 的問題 —— 回去看對方的 pipeline。

## 失敗怎麼判讀

- `error: no peers.json at ...` — instance 沒配 `secrets/a2a/peers.json`,先建它。
- `error: peer 'X' not found in ...` — peers.json 裡沒有這個 key,打錯名字或還沒加。
- `error: 'ca'/'cert'/'key' file missing for this peer` — cert 檔案掉了或路徑寫錯,去 `secrets/a2a/` 底下核對檔名。
- `error: cannot reach peer ... ` — 網路不通或對方 endpoint 掛了(先確認對方 server process 活著)。
- `error: TLS handshake failed ...` — cert 過期/CA 不對/mTLS 被拒,不是 code 問題,是 PKI 問題。
- 卡住很久沒任何 `[status_update]` 印出來 — 對方那端可能真的在跑一個長 turn,client 的 SSE read timeout 設了 120s 撐住,不會提早誤報;真的沒反應才當異常。

## 為什麼設計成這樣

- **client 進 public plugin,secret 留 instance**:`~/plugin` 是 public repo,`client.py` 本身完全不含 IP/port/cert;真實連線資訊在 `~/.kilo/secrets/a2a/`(該目錄已 gitignore),讀不到就是還沒配,不是 bug。
- **peer 參數化**:介面是「對某個 peer 派 task」的通用能力,不是寫死 Noir 的一次性 script —— 之後加其他 agent 只動 peers.json,不動 skill。
- **PEP 723 self-contained**:不依賴哪支機器裝了對的 venv,`uv run` 直接跑。
