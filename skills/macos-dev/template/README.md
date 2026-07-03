# __APP__

> __TAGLINE__

![macOS](https://img.shields.io/badge/macOS-14%2B-111111)
![Swift](https://img.shields.io/badge/Swift-6-F05138)
![License](https://img.shields.io/badge/license-MIT-blue)

## Why

<!-- 一兩段：這個 app 補的是什麼縫？跟現有方案差在哪？誠實講限制。 -->

## How it works

<!-- 機制表 / 流程。menubar accessory（無 Dock、無視窗），設定全在選單列。 -->

## Build

無 Xcode —— SwiftPM build binary，Makefile 組 `.app` 並 codesign。

```bash
make            # build + bundle + sign（開發態，預設 ad-hoc）
make run        # bundle 後直接開
make install    # 裝到 /Applications（開機自啟 + 穩定 TCC 需要）
make icon       # 從 scripts/zyx.svg 重生 App icon
```

簽名 / 公證設定放 `Makefile.local`（見 `Makefile.local.example`）。發版 `make publish`（本機）或推 `v*` tag 走 CI（見 `.github/workflows/release.yml`）。

## Usage

<!-- 選單列圖示 → 操作。權限引導（若有）。 -->

## Prior art

<!-- survey 過、借鏡 / credit 的前人專案。 -->

## License

MIT。詳見 [LICENSE](LICENSE)。
