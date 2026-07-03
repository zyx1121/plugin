// __APP__ — entry point. SwiftPM treats main.swift as top-level code, so the app boots
// here with no @main. Menubar-only accessory: no Dock icon, not in Cmd-Tab (LSUIElement).
import AppKit

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
