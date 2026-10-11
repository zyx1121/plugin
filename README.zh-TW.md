<!-- 翻譯自 README.md @ docs/readme-template-v2。只翻 "For AI agents" 以上的章節，英文版更新時一起改。 -->

<div align="center">

<h1>zyx</h1>

<p><strong>一個 Claude Code plugin：自家風格的 skill、worker agent 群與本機 MCP 工具箱。</strong></p>

[![CI](https://img.shields.io/github/actions/workflow/status/zyx1121/plugin/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/zyx1121/plugin/actions)
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fzyx1121%2Fplugin%2Fmain%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version&style=flat-square)](.claude-plugin/plugin.json)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-d97757?style=flat-square)](https://docs.anthropic.com/en/docs/claude-code/plugins)
[![License](https://img.shields.io/github/license/zyx1121/plugin?style=flat-square)](LICENSE)

[English](README.md) | **繁體中文** | [简体中文](README.zh-CN.md)

</div>

```
> utils_capabilities
{"host":{"platform":"darwin","arch":"arm64"},"registered":["utils_capabilities",
"gmaps_get_list","md2slide_init","md2slide_build","pdf_info","pdf_extract_text",
"pdf_extract_comments","pdf_compress","pdf_decrypt","pdf_merge","pdf_split",
"pdf_rotate","pdf_render"],"hidden":[]}
```

skill、agent 和工具以前分散在不同 repo，每台機器裝到的組合都不一樣。這個 plugin 把它們收進同一個 repo、同一個命名空間 `zyx:*`，裝一次每台機器就一致。每次結構調整都在 [decisions/](decisions/) 留一份 ADR。

## 功能

- **Skill**：簡報、專案文件、學術寫作、Next.js、開發流程與寫實生圖 prompt 的自家規則。
- **Worker agent**：`planner`、`surveyor`、`developer`、`reviewer` 回傳結構化報告，不是聊天。`reviewer` 先嘗試反駁，主張才算數。
- **utils MCP server**：13 個工具，處理 PDF、Google 地圖清單與 Markdown 投影片。plugin 會自動註冊這個 server。
- **依主機註冊工具**：server 只註冊這台機器能跑的工具，其餘由 `utils_capabilities` 回報。

## 快速開始

需要 Claude Code 2.1.186 以上：

```sh
claude plugin marketplace add zyx1121/plugin
claude plugin install zyx@zyx
```

開新 session，請它呼叫 `utils_capabilities`。工具名稱是 `mcp__plugin_zyx_utils__<tool>`。

Codex 只拿得到 skill：從 [zyx1121/marketplace](https://github.com/zyx1121/marketplace) 安裝 `zyx@zyx1121`。

## 使用方式

| 部分 | 內容 |
|------|------|
| [skills/](skills/) | `academic-sentence`、`dev-workflow`、`nextjs-dev`、`paper-revise`、`photo-realism`、`project-docs`、`winlab-pptx`、`xiao-lin-shuo` |
| [agents/](agents/) | `planner`、`surveyor`、`developer`、`reviewer`、`utils-promoter` |
| [utils/](utils/) | MCP 工具：`pdf_*`(9 個)、`md2slide_init`、`md2slide_build`、`gmaps_get_list`、`utils_capabilities` |
| [decisions/](decisions/) | 每次合併、拆出與退役的 ADR |

請求符合 skill 的描述時，skill 會自動載入。agent 透過 Agent 工具以 `zyx:<name>` 執行。

要新增工具，把腳本交給 `utils-promoter` agent。它會在 `utils/scripts/` 寫 PEP 723 腳本，需要時加上 MCP 工具，再開 PR。

## 設定

| 需要 | 用途 |
|------|------|
| `bun` | utils MCP server |
| `uv` | PDF、投影片與地圖腳本 |
| `gs`(Ghostscript) | 只有 `pdf_compress` 需要 |

不需要任何密鑰。把本機 clone 當 marketplace，`git pull` 後就能拿到 skill 的修改：`claude plugin marketplace add <clone>`，再跑 `claude plugin update zyx@zyx`。

## 限制

- 不要再另外在 user scope 註冊 `utils`。同名的 user scope server 會蓋掉 plugin 的 server。
- PVE、NYCU、macOS 與 Uber Eats 工具已拆成獨立 plugin：[pve](https://github.com/zyx1121/pve)、[nycu](https://github.com/zyx1121/nycu)、[macos](https://github.com/zyx1121/macos)、[ubereats](https://github.com/zyx1121/ubereats)。原因見 ADR-0012 到 ADR-0014。

## 其他

給 AI agent 的結構化資訊與開發說明在[英文版](README.md#for-ai-agents)。

## 授權

[MIT](LICENSE)
