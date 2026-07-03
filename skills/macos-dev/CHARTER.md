# House charter — Loki 的 macOS app 設計系統

> 這份是「為什麼一眼看出是同一家產出」的成文版。`utils mac-app new` 吐出的骨架已內建這些慣例;
> 改既有 app、review 新 app 都對著這份對齊。機制細節在 `SKILL.md`,這份只講 **identity + 決策**。
>
> 藍本三隻:[Cappuccino](https://github.com/zyx1121/Cappuccino)(純選單列 utility)、[cursormon](https://github.com/zyx1121/cursormon)(NSPanel 桌寵)、[quickvm](https://github.com/zyx1121/quickvm)(選單列 + 嵌入 helper)。

## 1. 設計原則 — 站在 Apple HIG 上

house style 不是憑感覺,是 Apple Human Interface Guidelines 三原則的在地實作。先認原則,再認簽名:

- **Clarity(清晰)**:文字可讀、icon 精準、留白足。→ house 的「狀態用文字 + glyph 不靠顏色」「設定攤在 NSMenu 不藏」就是 Clarity;不靠顏色傳狀態同時顧到色盲無障礙。
- **Deference(退讓)**:UI 讓位給內容,不搶戲。→ house 的「精簡到痛、menubar-only、透明 overlay 用 nonactivating panel 不搶焦點」全是 Deference;macOS 26 的 Liquid Glass(半透明讓底下透出)正是這條的材質化延伸。
- **Depth(層次)**:用層級、半透明、動態回饋表達階層。→ menubar < popover < overlay panel 的 window level 階梯就是 Depth;Liquid Glass 把「浮在內容上的 navigation 層」做成看得見的材質。

一句話:**這套 house style 是 HIG 的「極簡 utility」切片** —— 不是反 Apple,是把 Clarity + Deference 推到極致。

## 2. 視覺簽名(一眼認出)

- **App icon = zyx 品牌標**,全家統一:深色 squircle(圓角 0.225×邊長)+ 垂直漸層 `#20232A → #0C0D10` + 白色 zyx logo(佔 0.60)+ Gaussian glow。來源 `scripts/zyx.svg`,產生器 `scripts/generate-icon.py`(`make icon`)。要做變體就換中央字符,**底維持不變**。
- **選單列圖示 = SF Symbol template image**(`isTemplate = true`),跟著選單列明暗轉色。功能性圖示可 per-app(Cappuccino `bolt.fill`/`moon.zzz` 表狀態、cursormon `pawprint.fill`)。
- **狀態用文字 + Unicode glyph,不靠顏色**:`○ 待命` / `● 執行中` / `⚠ 需要權限`。
- **設定全在選單列 NSMenu**,不開 Settings 視窗。
- **對使用者的字串繁中**,code / 註解英文。
- **macOS 26 設計語言 = Liquid Glass,但克制**:系統 controls / `NSMenu` / sheet 用 SDK 26 重編就自動套,免寫 code。**menubar utility 跟透明 click-through overlay 多半用不到**(panel 本來就要透明,硬套 glass 反而毀掉視覺);主動用 `.glassEffect()` 的場景 = popover / 設定面板 / 有內容視窗的 app(如 kilo-sense)。採用機制見 [`SKILL.md`](SKILL.md) Liquid Glass 章。

## 3. Code 慣例

| 面向 | 規範 |
|---|---|
| 構建 | SwiftPM `.executableTarget` + 手刻 Makefile 組 `.app`;**無 Xcode**(CLT 即可) |
| 依賴 | **零三方 SwiftPM 依賴**,只用系統 framework |
| 入口 | manual `NSApplication`(`main.swift` top-level,非 `@main`)+ `.accessory` + `LSUIElement` |
| 大腦 | 單一 `Coordinator`:把所有輸入匯流成一個 `reconcile()` 收斂點,**永遠對真實系統狀態決策**,不靠快取旗標 |
| 平台差異 | protocol/trait 抽象後端(參 quickvm `InputCapture` macOS/Windows 雙實作) |
| 檔案 | 一檔一職(超過單檔就拆;別學早期 cursormon 437 行擠六職) |
| 設定持久化 | `UserDefaults`;但**會重新拿到的狀態不存**(參 Cappuccino:manualOverride 故意不持久化) |
| 開機自啟 | `SMAppService`(macOS 13+),**不手寫 LaunchAgent**(搬家會壞) |
| bundle id | `tw.zyx.<app>` —— 對應網域 zyx.tw;**改 bundle-id = 砍掉所有 per-app 狀態**:TCC 授權、UserDefaults domain、SMAppService 登入註冊、sudoers grant 全失聯。retrofit 改名務必遷移(`defaults export 舊 \| defaults import 新`)或加 in-app 一次性遷移,否則 app 開了像「沒開」(設定/狀態全空) |
| 命名 | repo / 本地目錄小寫(`cappuccino` / `cursormon` / `quickvm`);SwiftPM target / 顯示名可大寫(`Cursormon` / `QuicKVM`) |
| 註解 | WHY-not-WHAT,貼著「在繞哪個 OS 坑」寫 |
| commit | Conventional Commits,英文 description |

## 4. 專案哲學(三隻 README 一致的價值觀)

- **安全 / 安全網優先,不放寬**:沒有不安全的預設(quickvm 沒 PSK 不啟動);退出 / force-quit 還原系統狀態(Cappuccino `shutdown()` 還睡眠);硬限制(電量地板)壓過手動覆蓋。安全邊界一次寫對,不「先簡化之後再收」。
- **least-privilege + 專門 Security 章節**:要 root 就給「剛好那兩條命令」的 sudoers,visudo 驗過、附 uninstall。
- **誠實講限制**:README 留 TODO / 盲點(Cappuccino 自爆 180s 推論盲點、quickvm 講 latency 瓶頸在 Wi-Fi 不過度宣稱)。
- **survey 並 credit 前人**:借鏡誰就在 README 標(lan-mouse / Deskflow / vibe-caffeine),不假裝原創。
- **IP-clean / secrets 隔離**:真實密鑰、IP 進 gitignored handoff;第三方素材不 commit(cursormon sprite 跑時抓)。
- **精簡到痛**:零依賴、小檔、無廢話 README。

## 5. 生命週期(無人介入產線)

```
utils mac-app new <Name>        # stamp 骨架(含 icon、CI、Makefile、LICENSE)
  ↓  implement(照本 charter + SKILL.md)
make run / make verify          # 自跑驗證(self-run,不代理給人)
  ↓  git tag v<x.y.z> && git push --tags
GitHub Actions release.yml      # build → Dev ID 簽 → notarize → staple → dmg → gh release
```

本機發版(私鑰不出機)走 `make publish`;CI 發版(私鑰進 repo secret)走 tag。兩條都在,看該 app 要不要把私鑰交給 CI。

第一步 `utils mac-app new`(MCP:`mcp__utils__mac_app_new`)stamp 骨架,細節見 `SKILL.md`。
