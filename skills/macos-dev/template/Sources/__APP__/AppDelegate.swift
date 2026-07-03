import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let coordinator = Coordinator()
    private var menuBar: MenuBarController!

    func applicationDidFinishLaunching(_ notification: Notification) {
        menuBar = MenuBarController(coordinator: coordinator)
        coordinator.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        // 退出前還原任何被改動的系統狀態 —— 別把使用者晾在半路（safety net）。
        coordinator.shutdown()
    }
}
