---
name: macos-dev
description: "Develop, design, sign, and ship a macOS Swift app from the terminal — SwiftPM + a hand-rolled Makefile bundle + Apple Development codesign, no Xcode; aligned to Apple HIG + macOS 26 Liquid Glass. Triggers on 'build a mac app', '做 mac app', 'menubar app', 'wrap swift binary into .app', 'codesign mac app', 'TCC / screen recording permission', 'LSUIElement menubar-only', 'NSPanel overlay', 'CGEventTap', 'ScreenCaptureKit', 'Liquid Glass', 'macOS app design / HIG', '怎麼不開 xcode 寫 mac app'. Skip for Xcode IDE features, provisioning profiles, or Mac App Store."
---

# /macos-dev — develop macOS apps from the terminal

Edit code → `make bundle` → `open .app` → verify with `pgrep` / `osascript` / `log stream`. No `.xcodeproj`, never open Xcode IDE. SwiftPM produces the executable; a Makefile wraps it into a `.app` bundle and codesigns.

**開新 app 不要從零手搓 —— 用 scaffolder:**

```bash
utils mac-app new <Name>          # stamp template/ 骨架(Package/Makefile/Info.plist/Swift/CI/icon/LICENSE)+ 產 zyx icon + git init
```

MCP 對應 `mcp__utils__mac_app_new`(同參數,CC/Codex session 內優先用)。

它套用 house 設計系統([`CHARTER.md`](CHARTER.md))。本檔是 **機制參考**(TCC / NSPanel / 簽名 / 公證);`CHARTER.md` 是 **identity + 慣例決策**;骨架本體在 `template/`。

藍本三隻:[Cappuccino](https://github.com/zyx1121/Cappuccino)(純選單列)、[cursormon](https://github.com/zyx1121/cursormon)(NSPanel 桌寵)、[quickvm](https://github.com/zyx1121/quickvm)(選單列 + 嵌入 helper);早期參考 [zyx1121/shake](https://github.com/zyx1121/shake)。

## 何時走這條

- 個人 / 內部 Mac app — menubar tool、overlay、AppKit + SwiftUI
- 想要乾淨 diff、可重現 build、agent 也能改
- 沒打算上 Mac App Store

不要走（直接打開 Xcode 比較快）：

- 需要 live SwiftUI Preview（rebuild 比 Preview 慢）
- 需要 LLDB step-debug GUI 或 Instruments 剖效能
- 需要 provisioning profile / Push / iCloud / 任何沒 entitlement 就跑不起來的 capability
- 上架 Mac App Store（沙箱 + 完整 entitlements 流程）

## 環境 check

```bash
xcode-select -p                                # /Applications/Xcode.app/Contents/Developer
swift --version                                # 6.x+
security find-identity -p codesigning -v       # 至少一張 Apple Development cert
```

沒 cert 就只能 ad-hoc（`--sign -`）— 也能跑，但 TCC 權限每次 rebuild 都要重 grant。看下面 codesign 章。

## 骨架

```
your-app/
├── Package.swift
├── Makefile
├── Resources/Info.plist
├── Sources/<App>/
└── .gitignore
```

### Package.swift

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "<App>",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "<App>", path: "Sources/<App>")
    ]
)
```

SwiftPM 預設 recursive 抓 path 下所有 `.swift`，子資料夾隨便切。

### Resources/Info.plist 關鍵欄位

| Key | Value | Why |
|-----|-------|-----|
| `CFBundleIdentifier` | `tw.zyx.<app>` | TCC 認 bundle id + team id，跨 rebuild 沿用權限。**首次授權後絕不改** —— 改了 TCC 全清 |
| `CFBundleName` / `Executable` / `DisplayName` | `<App>` | |
| `CFBundlePackageType` | `APPL` | |
| `CFBundleVersion` / `CFBundleShortVersionString` | `1` / `0.1.0` | |
| `LSMinimumSystemVersion` | `14.0` | 對齊 Package.swift platforms |
| `NSPrincipalClass` | `NSApplication` | |
| `NSHighResolutionCapable` | `<true/>` | retina |
| `LSUIElement` | `<true/>` | menubar-only：無 Dock、不在 Cmd-Tab |
| `LSApplicationCategoryType` | `public.app-category.<...>` | App Store 分類，列在 about |
| `NSHumanReadableCopyright` | `© YYYY ...` | about dialog |

### Makefile（核心 — bundle + codesign）

> 下面是教學用最小版。canonical 全功能版在 `template/Makefile`(多了 `release` / `publish` / `dmg` / `install` / `icon` / `verify` / `logs` + `Makefile.local` 簽名覆蓋),scaffold 出來就是它。

```makefile
APP_NAME    := <App>
BUNDLE_ID   := dev.<you>.<app>
BIN_PATH    := .build/release/$(APP_NAME)
APP_BUNDLE  := build/$(APP_NAME).app
CONTENTS    := $(APP_BUNDLE)/Contents

# 鎖 SHA-1 hash，比名字穩。撈：security find-identity -p codesigning -v
SIGN_ID := <40-char hash>

.PHONY: all build bundle run clean rebuild
all: bundle

build:
	swift build -c release

bundle: build
	@rm -rf $(APP_BUNDLE)
	@mkdir -p $(CONTENTS)/MacOS $(CONTENTS)/Resources
	@cp $(BIN_PATH) $(CONTENTS)/MacOS/$(APP_NAME)
	@cp Resources/Info.plist $(CONTENTS)/Info.plist
	@codesign --force --deep --options runtime --sign $(SIGN_ID) $(APP_BUNDLE)
	@echo "[OK] $(APP_BUNDLE) built and signed"

run: bundle
	open $(APP_BUNDLE)

rebuild: clean bundle

clean:
	rm -rf .build build
```

### .gitignore

```
.build/
build/
.swiftpm/
.DS_Store
Package.resolved
*.xcodeproj/
xcuserdata/
```

## Codesigning — 為什麼用 Apple Dev cert 不用 ad-hoc

| 簽法 | 何時用 | 結果 |
|------|--------|------|
| `--sign -` (ad-hoc) | 不戳 TCC 的 app（純 UI、無 Accessibility / Screen Recording / Camera） | 每次 rebuild cdhash 變 → TCC 要重 grant |
| `--sign <hash>` (Apple Development) | 戳 TCC 的 app | Team ID 穩定 → bundle id + team id 認，rebuild 不失權限 |

`--options runtime` 開 Hardened Runtime — Notarization 必須，平常啟用也無害（除非你動態 dlopen / JIT，那要加 entitlements）。

驗簽：

```bash
codesign -dvvv build/<App>.app 2>&1 | head
# 看：
#   Authority=Apple Development: <email> (<TeamID>)
#   TeamIdentifier=<10 chars>
#   CDHash=<40 chars>
#   flags=0x10000(runtime)
```

注意：cert 名字裡的 `(FJW6JALJHP)` 跟 codesign 報的 `TeamIdentifier` 可能是兩個不同字串 — 後者才是 TCC 真正認的。看 `TeamIdentifier` 那行。

## 開發 loop

| 動作 | 指令 |
|------|------|
| Build + bundle | `make bundle` |
| Launch | `open build/<App>.app`（或 `make run`） |
| Confirm running | `pgrep -l <App>` |
| Window state | `osascript -e 'tell application "System Events" to get name of every window of process "<App>"'` |
| Log (NSLog 全進來) | `log stream --predicate 'process == "<App>"' --style compact` |
| Quit | `osascript -e 'quit app "<App>"'` |
| Verify sig | `codesign -dvvv build/<App>.app` |
| Symbol exists? | `nm .build/release/<App> \| grep <Type>` |

`osascript` 那條超實用 — 不用 screenshot 就能確認視窗有沒有開、標題對不對。

## SourceKit LSP 亂叫 — 信 build，不信 LSP

寫 Swift 時 LSP 會一直噴 `Cannot find type 'X' in scope` 即便 X 在同 module 別檔。`sourcekit-lsp` 對單檔孤立 parse，看不到 cross-file symbols。

**`swift build` 是 whole-module compilation**，全 module 一起跑、symbol 找得到。Build pass 就 work，LSP 抱怨忽略。

## TCC 權限：流程 + 程式

```swift
// Accessibility
let trusted = AXIsProcessTrusted()                          // 不彈
let opts: NSDictionary = ["AXTrustedCheckOptionPrompt": true]
AXIsProcessTrustedWithOptions(opts)                         // 彈 prompt

// Screen Recording
CGPreflightScreenCaptureAccess()                            // 不彈
CGRequestScreenCaptureAccess()                              // 彈

// 直接開設定 deep link
NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!)
NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")!)
```

UX 慣例：主視窗 / popover 顯示權限狀態 badge + 引導按鈕 + relaunch 按鈕。Ad-hoc 簽通常 grant 後要重 launch；Apple Dev cert 簽的多半當下就認，rebuild 後也維持。

關於 Swift 6 strict concurrency：`kAXTrustedCheckOptionPrompt` 是 CFString global var，編譯會抱怨「concurrency-safe」。直接用字面值 `"AXTrustedCheckOptionPrompt"` 繞過。

## Menubar-only app（無 Dock、無一般視窗）

Info.plist `LSUIElement = true` 配：

```swift
@main
struct <App>App: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    var body: some Scene { Settings { EmptyView() } }       // 沒一般視窗
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!

    func applicationDidFinishLaunching(_ n: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.image = NSImage(systemSymbolName: "<sf-symbol>", accessibilityDescription: "<App>")
        statusItem.button?.image?.isTemplate = true         // adapt menubar 主題
        statusItem.button?.action = #selector(togglePopover)
        statusItem.button?.target = self

        popover = NSPopover()
        popover.behavior = .transient
        popover.contentSize = NSSize(width: 480, height: 480)
        popover.contentViewController = NSHostingController(rootView: ContentView())
    }

    @objc func togglePopover() {
        guard let button = statusItem.button else { return }
        if popover.isShown { popover.performClose(nil) }
        else { popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY) }
    }
}
```

## Overlay 視窗（floating-on-everything）

要做 spotlight / heads-up / pin overlay 用 `NSPanel` 不是 `NSWindow`，subclass 寫成 AX-隱形（不會被自己的 AXUIElement query 抓到）：

```swift
final class OverlayPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
    override func accessibilityRole() -> NSAccessibility.Role? { nil }
    override func accessibilityChildren() -> [Any]? { [] }
    override func isAccessibilityElement() -> Bool { false }
}

let panel = OverlayPanel(
    contentRect: ...,
    styleMask: [.borderless, .nonactivatingPanel],
    backing: .buffered,
    defer: false
)
panel.isOpaque = false
panel.backgroundColor = .clear
panel.hasShadow = false
panel.level = .screenSaver                                  // 蓋所有 app（含 Dock / menubar）
panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
panel.ignoresMouseEvents = false                            // false = panel 自己接 click
```

兩個高度 level 常用：

- `.statusBar` (25) — 高過普通視窗、低於系統 UI
- `.screenSaver` (1000) — 蓋系統 UI，做 spotlight overlay 用這個

要 panel **跨 Space 跟著走**：`collectionBehavior` 含 `.canJoinAllSpaces`。
要 panel 不會因為 user 切 Mission Control 而閃：加 `.stationary`。

## 座標系 — Cocoa vs CG，整個 mac dev 最大坑

| 系統 | 原點 | Y | 出現處 |
|------|------|---|--------|
| Cocoa | 主螢幕**左下** | 向上 | `NSEvent.mouseLocation`、`NSWindow.frame`、`NSScreen.frame` |
| CG / Quartz | 主螢幕**左上** | 向下 | `CGEvent.location`、`AXValue` position、`CGDisplayBounds` |

任一點轉換：

```swift
let primary = NSScreen.screens.first(where: { $0.frame.origin == .zero }) ?? NSScreen.main!
let cgY    = primary.frame.height - cocoaY
let cocoaY = primary.frame.height - cgY
```

多螢幕：用 `CGDisplayBounds(displayID)` 拿每個 display 在 CG 的 rect，做 intersection / containment。`NSScreen.cgDisplayID` 可由 `deviceDescription[NSScreenNumber]` 拿。

## CGEventTap — 全域擋 / 改滑鼠、鍵盤

需 Accessibility 權限。重點：

```swift
guard let tap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .defaultTap,
    eventsOfInterest: mask,
    callback: { _, type, event, refcon in
        // 這 callback 跑在 tap thread，不是 main。要動 main-actor 物件用 DispatchQueue.main.async
        return Unmanaged.passUnretained(event)              // 放行
        // return nil                                       // 吞掉
    },
    userInfo: Unmanaged.passUnretained(self).toOpaque()
) else { /* AX 沒給 */ }

CGEvent.tapEnable(tap: tap, enable: false)                  // 先 disable
let src = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), src, .commonModes)
```

兩個重要陷阱：

1. **Tap 創出來預設 enabled**。要先 `tapEnable(false)` 再加 runloop，否則中間有空窗會吞 event。
2. **`tapDisabledByTimeout` / `tapDisabledByUserInput` 會被觸發**（callback 太慢、或 OS 自動關）。Re-enable 前先看你自己的 intent flag，否則明明該關的 tap 又被你打開亂吞 click。

intent flag 用 lock 保護（callback 在 tap thread、setter 在 main）：

```swift
private let lock = NSLock()
private var _intercept = false
private func intent() -> Bool { lock.lock(); defer { lock.unlock() }; return _intercept }
```

## ScreenCaptureKit — 截圖排除自家視窗

```swift
import ScreenCaptureKit

let content = try await SCShareableContent.excludingDesktopWindows(
    false,
    onScreenWindowsOnly: true
)
let display = content.displays.first(where: { CGDisplayBounds($0.displayID).contains(point) })!
let mine = content.windows.filter { $0.owningApplication?.bundleIdentifier == Bundle.main.bundleIdentifier }
let filter = SCContentFilter(display: display, excludingWindows: mine)

let cfg = SCStreamConfiguration()
cfg.sourceRect = rectInDisplayLocalCoords                   // CG points，display-local origin
cfg.width  = Int(rect.width  * backingScale)                // backingScale → retina 解析度
cfg.height = Int(rect.height * backingScale)
cfg.showsCursor = false

let cg = try await SCScreenshotManager.captureImage(
    contentFilter: filter,
    configuration: cfg
)
let nsImage = NSImage(cgImage: cg, size: NSSize(width: rect.width, height: rect.height))
```

需 Screen Recording 權限。`sourceRect` 是 display-local（每個 display 原點 (0,0)），用 `CGDisplayBounds` 把 global CG point 轉成 local。

## Liquid Glass — macOS 26 設計語言

macOS 26 起系統視覺語言是 **Liquid Glass**:半透明材質浮在內容上、即時折射背景。鐵則一條:**只用在 navigation 層(浮在 content 上的控制),絕不套在 content 本身(list / table / 媒體)** —— 違反就毀掉視覺階層。

**先決條件**:要用主動 API,Package.swift 與 Info.plist 都得拉到 macOS 26 —— `.macOS(.v26)`(enum 沒有就用字串 `.macOS("26.0")`)+ `LSMinimumSystemVersion 26.0`。代價:砍掉 macOS 14/15 使用者。自用 app 無妨,對外散佈先想清楚;不想 bump 就只吃「自動」那層。

**兩種採用:**

1. **自動(零 code)** — 用 SDK 26 重編,系統 controls / toolbar / `NSMenu` / sheet / `NavigationSplitView` sidebar 自動套 glass。多數 house app(menubar-only)吃這層就夠。

2. **主動(SwiftUI in `NSHostingView` 的 popover / 面板才需要):**

```swift
// 單一元素
someView.glassEffect()                               // 預設 Glass.regular
someView.glassEffect(.regular.tint(.accentColor), in: .capsule)

// 多個 glass「務必」包進 container —— 共享採樣省 GPU,且彼此會形變融合
GlassEffectContainer(spacing: 12) {
    HStack { iconA.glassEffect(); iconB.glassEffect() }
}

// 按鈕:次要 .glass / 主要動作 .glassProminent
Button("Go") { }.buttonStyle(.glass)

// 條件停用免 re-layout(.identity = 等同關閉)
view.glassEffect(isOn ? .regular : .identity)
```

`Glass` 三型:`.regular`(預設,自適應背景)、`.clear`(高透,只在媒體背景上用)、`.identity`(關閉)。

**別踩:**
- 絕不 glass 疊 glass、絕不 glass 上 content。
- 多個 glass 不包 `GlassEffectContainer` = 各自採樣,GPU 浪費 + 不會融合。
- 別每個元素都 `.tint`、別 hard-code 配色。
- **無障礙系統自動處理**(Reduce Transparency → 加霜、Increase Contrast → 加邊框、Reduce Motion → 收動畫)—— **別自己 override**。

**house 適配**:menubar / 透明 click-through overlay panel 用不到(panel 要透明,glass 反而毀掉);真正受益 = 有 popover / 設定面板 / 內容視窗的 app。

**真實案例 — [kilo-sense](https://github.com/zyx1121/kilo-sense)**(正確採用 ↔ 正確不採用的對照):
- `Overlay/SummaryWindow.swift`:整個 floating overlay(逐字稿 + 輸入 + agent feed)外層套 `.glassEffect(in: .rect(cornerRadius: 16))`;panel `isOpaque=false` + `hasShadow=false`(視窗陰影會在 glass 圓角積成一圈黑框),層次全交給 glass rim;內部分區用 `.background(.white.opacity(0.04~0.07))` 而非疊 glass。
- `Overlay/NotchCaptionView.swift`:notch 字幕**刻意 `.background(.black)` 不套 glass** —— 它要假裝成瀏海實體的延伸,玻璃透出桌面會毀掉錯覺。看似 navigation 層卻該用純黑的反例。

## 發版 — Developer ID 簽 + 公證 + Release

開發態 `make bundle`(ad-hoc / Apple Dev cert)只能本機跑。對外要過 Gatekeeper 必須 Developer ID 簽 + notarize + staple。canonical Makefile 已備:

| target | 做什麼 |
|---|---|
| `make release` | Developer ID 簽 → notarytool 公證 → staple → 公證 DMG → staple |
| `make publish` | release 後 `gh release create v<版本> <dmg>`(本機,私鑰不出機) |

一次性前置(放 `Makefile.local`):① Apple Developer Program 的 Developer ID Application cert ② `xcrun notarytool store-credentials <profile> --apple-id <id> --team-id <team> --password <app-specific-pw>` ③ `DEV_ID_APP := Developer ID Application: <Name> (<TEAM>)`。

**CI 發版**(`template/.github/workflows/release.yml`,推 `v*` tag 觸發):私鑰進 repo secret —— Dev ID cert 的 `.p12`(base64)匯入暫時 keychain、ASC API key 的 `.p8`(base64)餵 `notarytool store-credentials`。需要的 secret:`DEV_ID_CERT_P12` / `DEV_ID_CERT_PASSWORD` / `KEYCHAIN_PASSWORD` / `DEV_ID_APP` / `AC_API_KEY_ID` / `AC_API_ISSUER_ID` / `AC_API_KEY_P8`。Makefile `release` 吃 `DEV_ID_APP` / `NOTARY_PROFILE` override,本機 / CI 共用同一 target。

**權衡**:CI 發版方便但私鑰上雲;不想交出私鑰就只用 `make publish`(本機),CI 只跑 `ci.yml`(ad-hoc build 煙霧測試)。

## 開機自啟 — SMAppService（別手寫 LaunchAgent）

```swift
import ServiceManagement
SMAppService.mainApp.status                 // .enabled / .notRegistered / .requiresApproval
try SMAppService.mainApp.register()         // 開
try SMAppService.mainApp.unregister()       // 關
```

需 macOS 13+、app 要在 `/Applications`(`make install`)。手寫 `~/Library/LaunchAgents/*.plist` 會寫死絕對路徑,app 搬家 / 改名就壞 —— 不要。

## Entitlements — 要 mic / camera 才碰

預設 `Resources/<App>.entitlements` 是空 dict(Hardened Runtime 開著但不開例外)。要錄音 / 相機才加:

```xml
<key>com.apple.security.device.audio-input</key><true/>
<key>com.apple.security.device.camera</key><true/>
```

**地雷:entitlements plist 裡不能有 XML 註解** —— AMFI 直接拒簽,app 靜默無法啟動。深坑(授權瞬間 0Hz installTap 閃退、闔蓋 mic 斷流)見 memory `reference_macos_hardened_runtime_mic_entitlement`。

## 要 root — sudoers NOPASSWD drop-in（least-privilege）

GUI app 沒 TTY,別在 app 裡跑互動 sudo。Cappuccino 模式:裝一條**只允許那幾條命令**的 sudoers drop-in,app 用 `sudo -n`(non-interactive,`stdin=/dev/null`)跑、看 exit status 判斷;grant 一次性用原生授權框(`osascript 'do shell script … with administrator privileges'` 跑 bundled `grant.sh`,內含 `visudo -c` 驗證)。grant 行放單一 template 檔當 source of truth,附 uninstall。兩條路(sudoers vs XPC helper)見 memory `reference_macos_lid_closed_keep_awake`。

## App icon — zyx 品牌標

`scripts/generate-icon.py`(scaffold 時自動跑一次,之後 `make icon`):`scripts/zyx.svg` → 深色 squircle 漸層 + glow → `Resources/AppIcon.icns`。全家共用同一品牌標 = 一眼認出;要變體換中央字符,底不變。需 Pillow(經 uv)+ 系統 qlmanage / sips / iconutil。選單列那顆小圖示是另一回事:SF Symbol template image,per-app 表功能 / 狀態。

## 解除安裝 / 殘留

self-uninstall 或文件化清單涵蓋:`/Applications/<App>.app`、`~/Library/{Preferences,Caches,Application Support,Logs}/<bundle-id>*`、`~/Library/LaunchAgents`(若用過)、SMAppService 註冊、sudoers drop-in(若裝過)。帶 system extension 的有 SIP 下 `systemextensionsctl` 被擋的坑 —— 見 memory `reference_macos_remove_app_with_system_extension`。

## 何時切回 Xcode IDE

| 需求 | 走 IDE |
|------|--------|
| Live SwiftUI Preview | ✓ |
| LLDB step-debug GUI | ✓ |
| Instruments profiling | ✓ |
| Provisioning profile workflow | ✓ |
| App Store submission | ✓ |

要時直接 `open Package.swift` — Xcode 14+ 直接吃 SwiftPM，不用 generate `.xcodeproj`。寫好就回 CLI。

## 真實案例

[zyx1121/shake](https://github.com/zyx1121/shake) — menubar overlay 工具，從零到 ship 都這 workflow。看 `Makefile` / `Resources/Info.plist` / `Sources/Shake/App/` 是參考實作。
