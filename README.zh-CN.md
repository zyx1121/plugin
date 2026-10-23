<!-- 翻译自 README.md @ docs/readme-template-v2。只翻 "For AI agents" 以上的章节，英文版更新时一起改。 -->

<div align="center">

<h1>zyx</h1>

<p><strong>一个 Claude Code plugin：自家风格的 skill、worker agent 群与本机 MCP 工具箱。</strong></p>

[![CI](https://img.shields.io/github/actions/workflow/status/zyx1121/plugin/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/zyx1121/plugin/actions)
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fzyx1121%2Fplugin%2Fmain%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version&style=flat-square)](.claude-plugin/plugin.json)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-d97757?style=flat-square)](https://docs.anthropic.com/en/docs/claude-code/plugins)
[![License](https://img.shields.io/github/license/zyx1121/plugin?style=flat-square)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md) | **简体中文**

</div>

```
> utils_capabilities
{"host":{"platform":"darwin","arch":"arm64"},"registered":["utils_capabilities",
"gmaps_get_list","md2slide_init","md2slide_build","pdf_info","pdf_extract_text",
"pdf_extract_comments","pdf_compress","pdf_decrypt","pdf_merge","pdf_split",
"pdf_rotate","pdf_render"],"hidden":[]}
```

skill、agent 和工具以前分散在不同 repo，每台机器装到的组合都不一样。这个 plugin 把它们收进同一个 repo、同一个命名空间 `zyx:*`，装一次每台机器就一致。每次结构调整都在 [decisions/](decisions/) 留一份 ADR。

## 功能

- **Skill**：幻灯片、项目文档、学术写作、Next.js、开发流程与写实生图 prompt 的自家规则。
- **Worker agent**：`planner`、`surveyor`、`developer`、`reviewer` 返回结构化报告，不是聊天。`reviewer` 先尝试反驳，结论才算数；高风险改动由 `dual-review` skill 再加一份 Codex 审查。`surveyor` 与 `reviewer` 用 Admiralty Code 给每条说法评级。
- **utils MCP server**：13 个工具，处理 PDF、Google 地图列表与 Markdown 幻灯片。plugin 会自动注册这个 server。
- **按主机注册工具**：server 只注册这台机器能运行的工具，其余由 `utils_capabilities` 报告。

## 快速开始

需要 Claude Code 2.1.186 以上：

```sh
claude plugin marketplace add zyx1121/plugin
claude plugin install zyx@zyx
```

开新 session，让它调用 `utils_capabilities`。工具名称是 `mcp__plugin_zyx_utils__<tool>`。

Codex 只能获得 skill：从 [zyx1121/marketplace](https://github.com/zyx1121/marketplace) 安装 `zyx@zyx1121`。

## 使用方式

| 部分 | 内容 |
|------|------|
| [skills/](skills/) | `academic-sentence`、`create-verify`、`dev-workflow`、`dual-review`、`nextjs-dev`、`paper-revise`、`photo-realism`、`project-docs`、`winlab-pptx`、`xiao-lin-shuo` |
| [agents/](agents/) | `planner`、`surveyor`、`developer`、`reviewer`、`utils-promoter` |
| [utils/](utils/) | MCP 工具：`pdf_*`(9 个)、`md2slide_init`、`md2slide_build`、`gmaps_get_list`、`utils_capabilities` |
| [decisions/](decisions/) | 每次合并、拆分与退役的 ADR |

请求符合 skill 的描述时，skill 会自动加载。agent 通过 Agent 工具以 `zyx:<name>` 运行。

要新增工具，把脚本交给 `utils-promoter` agent。它会在 `utils/scripts/` 写 PEP 723 脚本，需要时加上 MCP 工具，再开 PR。

## 配置

| 需要 | 用途 |
|------|------|
| `bun` | utils MCP server |
| `uv` | PDF、幻灯片与地图脚本 |
| `gs`(Ghostscript) | 只有 `pdf_compress` 需要 |
| [admiralty-code](https://github.com/zyx1121/admiralty-code) plugin | `surveyor` 与 `reviewer` 汇报里的评级 |

不需要任何密钥。把本机 clone 当 marketplace，`git pull` 后就能拿到 skill 的修改：`claude plugin marketplace add <clone>`，再运行 `claude plugin update zyx@zyx`。

## 限制

- 不要再另外在 user scope 注册 `utils`。同名的 user scope server 会覆盖 plugin 的 server。
- PVE、NYCU、macOS 与 Uber Eats 工具已拆成独立 plugin：[pve](https://github.com/zyx1121/pve)、[nycu](https://github.com/zyx1121/nycu)、[macos](https://github.com/zyx1121/macos)、[ubereats](https://github.com/zyx1121/ubereats)。原因见 ADR-0012 到 ADR-0014。

## 其他

给 AI agent 的结构化信息与开发说明在[英文版](README.md#for-ai-agents)。

## 许可证

[MIT](LICENSE)
