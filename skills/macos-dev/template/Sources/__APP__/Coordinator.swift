import Foundation

// Coordinator 是 app 的大腦：把所有輸入（使用者選擇、系統狀態）匯流成單一 reconcile() 收斂點。
// 真實 app 在這裡接子系統 —— 每個子系統一個小 final @MainActor class，對外只露一個 onChange callback，
// 在 start() 裡 wire 起來。決策永遠讀「真實狀態」，不靠快取旗標。
@MainActor
final class Coordinator {
    enum Status { case idle, active }

    private(set) var status: Status = .idle {
        didSet { if status != oldValue { onChange?() } }
    }

    // UI 掛這裡：狀態變了就重畫。
    var onChange: (() -> Void)?

    func start() {
        // TODO: 啟動子系統、wire 它們的 onChange 到 reconcile()。
        reconcile()
    }

    // 單一收斂點：把子系統的真實狀態 fold 成 status，再把結果套用回系統。
    func reconcile() {
        // TODO: status = …（依真實狀態決定）
        onChange?()
    }

    func shutdown() {
        // TODO: 還原任何被改動的系統狀態。
    }
}
