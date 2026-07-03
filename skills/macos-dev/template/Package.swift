// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "__APP__",
    platforms: [.macOS(.v14)],
    targets: [
        // SwiftPM recursively globs every .swift under the path — subfolders are free-form.
        .executableTarget(name: "__APP__", path: "Sources/__APP__")
    ]
)
