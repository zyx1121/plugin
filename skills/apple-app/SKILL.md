---
name: apple-app
description: "Build and iterate on native iOS, iPadOS and macOS apps (SwiftUI): where it runs, which tools to use, and the fast feedback loop with previews, hot reload and agent-driven simulator checks. Use when starting, changing or verifying an Apple platform app. Triggers on 'iOS app', 'macOS app', 'SwiftUI', 'Xcode', '模擬器', 'simulator', 'hot reload', '熱重載', '#Preview', 'xcodebuild', 'TestFlight', '裝到 iPhone'. NOT web pages or demos，那是 task-web. NOT what a screen shows or cuts，那是 simple-first."
---

# Apple App

Native app work runs on the MacBook. It is the only machine with Xcode, so
this is the exception to "build and test on the sandbox".

## Tools

Apple's tools come first. Community tools are allowed when they are widely
used and clearly better at a job Apple's tools do not cover.

| Job | Tool |
| --- | --- |
| Project file | `xcodegen` from a `project.yml`; the `.xcodeproj` is generated and gitignored |
| Build, run, screenshot, tap, LLDB | MobileBuildMCP (MCP server, `getsentry/MobileBuildMCP`) |
| Render a SwiftUI preview to an image | Xcode MCP (`xcrun mcpbridge`), tool `RenderPreview` |
| Hot reload while the app runs | InjectionNext (`johnno1962/InjectionNext`) |
| Install on a device | `xcodebuild -allowProvisioningUpdates`, then `xcrun devicectl device install app` |
| Release | App Store Connect API, TestFlight |

### MobileBuildMCP

Installed with Homebrew and added at user scope. It loads only the tool
groups named in `MOBILEBUILDMCP_ENABLED_WORKFLOWS`. The default is
`simulator` alone, so the user config sets
`simulator,macos,device,ui-automation,debugging,project-discovery`.
`MOBILEBUILDMCP_SENTRY_DISABLED=true` turns off its error telemetry.

- `build_run_sim`, `build_run_macos`, `build_run_device`: build, install and launch.
- `snapshot_ui` returns the view tree with element refs; `tap` acts on a ref.
  Prefer this over pixel clicks.
- `screenshot` is for checking the look, after the tree check passes.

Check the live tool names with `/mcp` before you rely on them; they change
between releases.

### Xcode MCP

`xcrun mcpbridge` talks to the running Xcode. It sees tools only when Xcode
has the project open and Intelligence is on in Xcode settings. It may be
disabled per project; re-enable it with `/mcp`.

### InjectionNext

The successor to InjectionIII. Pick it over InjectionIII because it:

- is added as a Swift package, with no bundle-loading code in the app;
- injects on a physical device, not only the simulator and macOS;
- recompiles only the saved file, from Xcode's own build commands;
- ships an MCP server (2.0.1+) that screenshots the app and replays touches.

Setup, once per project:

1. Download the app from the GitHub releases into `/Applications`.
2. Quit Xcode, open InjectionNext, and use its menu item `Launch Xcode`.
3. Add the InjectionNext package to the app target.
4. Add `-Xlinker` and `-interposable` to Other Linker Flags, Debug only.
5. Add the Inject or HotSwiftUI package, or run the menu item `Prepare SwiftUI`.

The menu bar icon turns orange once the app connects. Saving a file then
swaps the new function bodies into the running app. It cannot add stored
properties, change signatures or reorder methods: relaunch for those.

## The loop

1. Give every screen a `#Preview` with realistic sample data.
2. While designing, render previews with `RenderPreview`. No simulator is needed.
3. When the person wants to watch live, run the app with InjectionNext attached.
4. Before reporting, run the real app through MobileBuildMCP.
   Walk the changed flow with `snapshot_ui` and `tap`, then take one `screenshot`.
5. For camera, photos, notifications or anything hardware-bound, install on the iPhone.

A macOS app never needs a simulator. Previews and the app run on the Mac.

## Simulators

Simulator runtimes take about 20 GB and may have been deleted to save space.
Check with `xcrun simctl list runtimes`. Download with
`xcodebuild -downloadPlatform iOS`.

Permission prompts in the simulator (Photos and others) do not always accept
`simctl privacy grant`. Answer them through `snapshot_ui` and `tap`.

## Signing

Use the paid Developer Program team. Its id is in the keychain item
`kilo/apple-mapkit-meta`. The personal team cannot sign for devices or
TestFlight. Device installs need Developer Mode on the phone and the current
program license agreement accepted at developer.apple.com.

## Screen automation outside the simulator

When you must click a macOS window directly, capture it by window id
(`screencapture -l <id>`). Confirm the window is on the current Space first,
or the click lands in whatever the person is using.
