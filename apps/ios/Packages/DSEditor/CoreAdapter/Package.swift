// swift-tools-version: 6.2
// DSEditorCore — connects the editor (DSEditorModel.EditorDocument) to the Yrs document model
// of DSCore (NoteDocument). Kept apart from DSEditor so the editor and its demo build without Rust.
import PackageDescription

let package = Package(
    name: "DSEditorCore",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "DSEditorCore", targets: ["DSEditorCore"]),
    ],
    dependencies: [
        .package(name: "DSEditor", path: ".."),
        .package(name: "DSCore", path: "../../DSCore"),
    ],
    targets: [
        .target(
            name: "DSEditorCore",
            dependencies: [
                .product(name: "DSEditorModel", package: "DSEditor"),
                .product(name: "DSInk", package: "DSEditor"),
                .product(name: "DSCore", package: "DSCore"),
            ]
        ),
        .testTarget(name: "DSEditorCoreTests", dependencies: ["DSEditorCore"]),
    ]
)
