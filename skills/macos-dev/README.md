# macos-dev

Claude Code skill — 不開 Xcode,從終端 build / design / sign / **ship** 一隻 macOS Swift app(SwiftPM + 手刻 Makefile + codesign + notarize)。內含 Loki 的 house design system 與一鍵 scaffold。

> 這份 README 是**資料夾地圖**。要動手 → 讀 `SKILL.md`;要對齊設計 → 讀 `CHARTER.md`。

## 三個組件

| 檔 | 角色 | 內容 |
|---|---|---|
| [`SKILL.md`](SKILL.md) | **怎麼做**(機制) | build / sign / notarize / TCC / menubar / NSPanel overlay / CGEventTap / ScreenCaptureKit / **Liquid Glass** / 座標系 / SMAppService / sudoers / uninstall |
| [`CHARTER.md`](CHARTER.md) | **為什麼長這樣**(identity) | 設計原則(對齊 Apple HIG)+ 視覺簽名 + code 慣例 + 專案哲學 + 產線 |
| [`template/`](template/) | **起手式**(code) | Package / 全功能 Makefile(release + CI)/ Info.plist / Swift 骨架 / entitlements / icon 產生器 / LICENSE |

分工一句話:**CHARTER 講 identity、SKILL 講機制、template 給 code。**

## 開新 app

```bash
utils mac-app new <Name>     # copy template/ → 換 token → 產 zyx icon → git init
```

MCP 對應 `mcp__utils__mac_app_new`。

藍本(改它們也回頭對齊這份):[Cappuccino](https://github.com/zyx1121/Cappuccino)(純選單列)· [cursormon](https://github.com/zyx1121/cursormon)(NSPanel 桌寵)· [quickvm](https://github.com/zyx1121/quickvm)(選單列 + helper)。macOS 26 / Liquid Glass 的採用對象見 [kilo-sense](https://github.com/zyx1121/kilo-sense)。

## 維護

本體在 `~/.kilo/skills/macos-dev/`,symlink 進 `~/.claude/skills/`(改這邊即生效)。改 `SKILL.md` 的 `description` 守 [`../AGENTS.md`](../AGENTS.md) 文法;**改完 push kilo repo**,否則下次 sync 蓋掉。
