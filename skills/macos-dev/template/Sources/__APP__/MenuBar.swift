import AppKit
import ServiceManagement

// 設定全部住在選單列的 NSMenu —— 不開 Settings 視窗。狀態用文字 + glyph 表達，不靠顏色。
// 對使用者的字串一律繁中；code / 註解英文。
@MainActor
final class MenuBarController: NSObject, NSMenuDelegate {
    private let statusItem: NSStatusItem
    private let coordinator: Coordinator

    init(coordinator: Coordinator) {
        self.coordinator = coordinator
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        super.init()

        // 選單列圖示 = 全家共用的 zyx 品牌標(Resources/MenubarIcon.png,template,跟選單列明暗轉色),
        // 找不到才退回 SF Symbol。狀態靠選單文字表達,不換圖示。
        let icon: NSImage
        if let p = Bundle.main.path(forResource: "MenubarIcon", ofType: "pdf"),
           let mark = NSImage(contentsOfFile: p) {
            let h: CGFloat = 18
            mark.size = NSSize(width: h * mark.size.width / max(mark.size.height, 1), height: h)
            icon = mark
        } else {
            icon = NSImage(systemSymbolName: "__SF_SYMBOL__", accessibilityDescription: "__APP__") ?? NSImage()
        }
        icon.isTemplate = true
        statusItem.button?.image = icon

        let menu = NSMenu()
        menu.delegate = self
        statusItem.menu = menu

        coordinator.onChange = { [weak self] in self?.rebuild() }
        rebuild()
    }

    // 每次開選單都先 reconcile + 重建，確保顯示的是即時狀態。
    func menuWillOpen(_ menu: NSMenu) {
        coordinator.reconcile()
        rebuild()
    }

    private func rebuild() {
        guard let menu = statusItem.menu else { return }
        menu.removeAllItems()

        let status = NSMenuItem(title: statusText(), action: nil, keyEquivalent: "")
        status.isEnabled = false
        menu.addItem(status)
        menu.addItem(.separator())

        let login = NSMenuItem(title: "登入時啟動", action: #selector(toggleLogin), keyEquivalent: "")
        login.target = self
        login.state = (SMAppService.mainApp.status == .enabled) ? .on : .off
        menu.addItem(login)

        menu.addItem(.separator())
        let quit = NSMenuItem(title: "結束 __APP__", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        menu.addItem(quit)
    }

    private func statusText() -> String {
        switch coordinator.status {
        case .idle:   return "○ 待命"
        case .active: return "● 執行中"
        }
    }

    // 開機自啟走 SMAppService（macOS 13+），不手寫 LaunchAgent —— app 搬家 / 改名也不會壞。
    // 需要 app 安裝在 /Applications（make install）。
    @objc private func toggleLogin() {
        do {
            if SMAppService.mainApp.status == .enabled {
                try SMAppService.mainApp.unregister()
            } else {
                try SMAppService.mainApp.register()
            }
        } catch {
            NSLog("[__APP__] login item toggle failed: \(error)")
        }
        rebuild()
    }
}
