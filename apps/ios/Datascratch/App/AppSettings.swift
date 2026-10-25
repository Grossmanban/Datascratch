import Foundation
import Observation
import SwiftUI

/// Device-local preferences (account-wide settings will sync via the account document).
@Observable
final class AppSettings {
    nonisolated enum Appearance: String, CaseIterable, Identifiable, Sendable {
        case system, light, dark
        var id: String { rawValue }
    }

    nonisolated enum LibraryLayout: String, CaseIterable, Sendable {
        case grid, list
    }

    @ObservationIgnored private let defaults: UserDefaults

    /// D-06: on iPhone a finger scrolls and selects by default; drawing is opt-in.
    var fingerDrawing: Bool { didSet { defaults.set(fingerDrawing, forKey: "fingerDrawing") } }
    var appearance: Appearance { didSet { defaults.set(appearance.rawValue, forKey: "appearance") } }
    var defaultFont: NoteStyle.Font { didSet { defaults.set(defaultFont.rawValue, forKey: "defaultFont") } }
    var defaultPaper: NoteStyle.Paper { didSet { defaults.set(defaultPaper.rawValue, forKey: "defaultPaper") } }
    var libraryLayout: LibraryLayout { didSet { defaults.set(libraryLayout.rawValue, forKey: "libraryLayout") } }
    var hapticsEnabled: Bool { didSet { defaults.set(hapticsEnabled, forKey: "haptics") } }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        fingerDrawing = defaults.bool(forKey: "fingerDrawing")
        appearance = Appearance(rawValue: defaults.string(forKey: "appearance") ?? "") ?? .system
        defaultFont = NoteStyle.Font(rawValue: defaults.string(forKey: "defaultFont") ?? "") ?? .serif
        defaultPaper = NoteStyle.Paper(rawValue: defaults.string(forKey: "defaultPaper") ?? "") ?? .plain
        libraryLayout = LibraryLayout(rawValue: defaults.string(forKey: "libraryLayout") ?? "") ?? .grid
        hapticsEnabled = defaults.object(forKey: "haptics") as? Bool ?? true
    }

    var colorScheme: ColorScheme? {
        switch appearance {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
