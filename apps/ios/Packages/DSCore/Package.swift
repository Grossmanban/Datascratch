// swift-tools-version: 6.1
//
// DSCore — data core of the Datascratch iOS app: Yrs document model, crypto, local storage,
// REST and sync clients. See README.md for the public API.
//
// Yrs (Rust) is linked through yrs-ffi (UniFFI). On Apple platforms it comes as an
// xcframework built by scripts/build-xcframework.sh into build/. On Linux (cloud development
// sessions) scripts/build-linux.sh builds a host static library and the package links it
// directly, so the non-UI code can be compiled and tested without a Mac.

import PackageDescription
import Foundation

let packageDir = Context.packageDirectory

#if os(Linux)
let yrsTarget: Target = .target(
    name: "yrs_ffiFFI",
    path: "Sources/yrs_ffiFFI",
    linkerSettings: [
        .unsafeFlags(["-L\(packageDir)/build/linux"]),
        .linkedLibrary("yrs_ffi"),
        .linkedLibrary("m"),
    ]
)
#else
/// Prebuilt xcframework published by the ios-core workflow (release `yrs-ffi-<hash>`, hash from
/// scripts/yrs-ffi-hash.sh). A local build in build/ (scripts/build-xcframework.sh) wins, so
/// that changes to yrs-ffi can be tested before a release exists.
let yrsRelease: (url: String, checksum: String)? = (
    url: "https://github.com/Grossmanban/Datascratch/releases/download/yrs-ffi-127334fa5e29/yrs_ffiFFI.xcframework.zip",
    checksum: "65b9cf0b311cf449e6045f0d371ab9147327031ca7ab6460645555936ba9a761"
)

let localXCFramework = "\(packageDir)/build/yrs_ffiFFI.xcframework"
let yrsTarget: Target = {
    if let release = yrsRelease, !FileManager.default.fileExists(atPath: localXCFramework) {
        return .binaryTarget(name: "yrs_ffiFFI", url: release.url, checksum: release.checksum)
    }
    return .binaryTarget(name: "yrs_ffiFFI", path: "build/yrs_ffiFFI.xcframework")
}()
#endif

let strict: [SwiftSetting] = [
    .enableUpcomingFeature("ExistentialAny"),
]

let package = Package(
    name: "DSCore",
    platforms: [.iOS("26.0"), .macOS("26.0")],
    products: [
        .library(name: "DSCore", targets: ["DSCore"]),
    ],
    dependencies: [
        .package(url: "https://github.com/jedisct1/swift-sodium.git", from: "0.11.0"),
        .package(url: "https://github.com/groue/GRDB.swift.git", from: "7.11.0"),
    ],
    targets: [
        yrsTarget,
        // UniFFI-generated bindings. Kept in Swift 5 mode: generated code is not ours to adapt.
        .target(
            name: "YrsFFI",
            dependencies: ["yrs_ffiFFI"],
            swiftSettings: [.swiftLanguageMode(.v5)]
        ),
        .target(
            name: "DSCore",
            dependencies: [
                "YrsFFI",
                .product(name: "Clibsodium", package: "swift-sodium"),
                .product(name: "GRDB", package: "GRDB.swift"),
            ],
            swiftSettings: strict
        ),
        .testTarget(
            name: "DSCoreTests",
            dependencies: ["DSCore"],
            resources: [.copy("Fixtures")],
            swiftSettings: strict
        ),
    ],
    swiftLanguageModes: [.v6]
)
