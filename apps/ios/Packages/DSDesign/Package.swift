// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "DSDesign",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "DSDesign", targets: ["DSDesign"]),
    ],
    targets: [
        .target(name: "DSDesign", resources: [.process("Resources")]),
        .testTarget(name: "DSDesignTests", dependencies: ["DSDesign"]),
    ]
)
