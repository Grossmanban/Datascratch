// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "DSEditor",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "DSInk", targets: ["DSInk"]),
        .library(name: "DSEditorModel", targets: ["DSEditorModel"]),
        .library(name: "DSEditor", targets: ["DSEditor"]),
    ],
    dependencies: [
        .package(url: "https://github.com/mgriebling/SwiftMath.git", from: "1.7.0"),
    ],
    targets: [
        // Pure Swift: stroke format, codec, living-stroke geometry. Builds on Linux.
        .target(name: "DSInk"),
        // Pure Swift: editor document protocol, in-memory CRDT-like model, editing commands, projection.
        .target(name: "DSEditorModel", dependencies: ["DSInk"]),
        // UIKit + TextKit 2 editor and pen layer (iOS only; empty elsewhere).
        .target(
            name: "DSEditor",
            dependencies: [
                "DSInk", "DSEditorModel",
                .product(name: "SwiftMath", package: "SwiftMath", condition: .when(platforms: [.iOS])),
            ]
        ),
        .testTarget(name: "DSInkTests", dependencies: ["DSInk"]),
        .testTarget(name: "DSEditorModelTests", dependencies: ["DSEditorModel", "DSInk"]),
        .testTarget(name: "DSEditorTests", dependencies: ["DSEditor", "DSEditorModel", "DSInk"]),
    ]
)
