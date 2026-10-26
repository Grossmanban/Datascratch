import Foundation
import SwiftUI
import Testing
@testable import DSDesign

/// Renders the showcase to PNG for design review. Runs only when CI sets
/// `DS_SNAPSHOT_DIR` (passed as `TEST_RUNNER_DS_SNAPSHOT_DIR` to xcodebuild).
private let snapshotDirectory = ProcessInfo.processInfo.environment["DS_SNAPSHOT_DIR"]

@Suite("Snapshots")
@MainActor
struct SnapshotTests {
    @Test(.enabled(if: snapshotDirectory != nil), arguments: [ColorScheme.light, .dark])
    func showcase(scheme: ColorScheme) throws {
        let now = Calendar(identifier: .gregorian).date(from: DateComponents(year: 2026, month: 10, day: 25, hour: 12)) ?? .now
        let view = DSShowcase(now: now)
            .frame(width: 1366, height: 1024)
            .environment(\.colorScheme, scheme)
            .environment(\.locale, Locale(identifier: "ru_RU"))
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        let image = try #require(renderer.uiImage)
        let data = try #require(image.pngData())
        let url = URL(fileURLWithPath: snapshotDirectory ?? NSTemporaryDirectory())
            .appendingPathComponent("showcase-\(scheme == .dark ? "dark" : "light").png")
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url)
        #expect(image.size.width == 1366)
    }

    @Test(
        .enabled(if: snapshotDirectory != nil),
        arguments: [DSSettingsSampleScreen.Kind.settings, .account],
        [ColorScheme.light, .dark]
    )
    func settings(kind: DSSettingsSampleScreen.Kind, scheme: ColorScheme) throws {
        let now = Calendar(identifier: .gregorian).date(from: DateComponents(year: 2026, month: 10, day: 25, hour: 12)) ?? .now
        let view = DSSettingsSampleContent(kind: kind, now: now)
            .frame(width: 820, height: 1180, alignment: .top)
            .background(Color.dsCanvas)
            .environment(\.colorScheme, scheme)
            .environment(\.locale, Locale(identifier: "ru_RU"))
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        let image = try #require(renderer.uiImage)
        let data = try #require(image.pngData())
        let name = "\(kind == .settings ? "settings" : "account")-\(scheme == .dark ? "dark" : "light").png"
        let url = URL(fileURLWithPath: snapshotDirectory ?? NSTemporaryDirectory()).appendingPathComponent(name)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url)
        #expect(image.size.width == 820)
    }

    @Test func syncChipLabels() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        #expect(DSSyncChip.label(.localOnly, now: now, language: .ru) == "Только на этом устройстве")
        #expect(DSSyncChip.label(.error("x"), now: now, language: .en) == "Sync error")
        #expect(DSSyncChip.label(.synced(nil), now: now, language: .ru) == "Синхронизировано")
        #expect(DSSyncChip.label(.synced(now.addingTimeInterval(-120)), now: now, language: .ru).hasPrefix("Синхронизировано · "))
    }
}
