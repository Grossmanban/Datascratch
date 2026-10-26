import Foundation
import Observation
import SwiftUI
import UIKit

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

    /// D-06: whether a finger draws when a pen tool is active (in text mode a finger
    /// always scrolls and selects). Off by default on iPad (Apple Pencil); on by default
    /// on iPhone, which has no Pencil.
    var fingerDrawing: Bool { didSet { defaults.set(fingerDrawing, forKey: "fingerDrawing") } }
    var fingerDrawingEffective: Bool { fingerDrawing }
    var appearance: Appearance {
        didSet {
            defaults.set(appearance.rawValue, forKey: "appearance")
            applyAppearanceToWindows()
        }
    }
    var defaultFont: NoteStyle.Font { didSet { defaults.set(defaultFont.rawValue, forKey: "defaultFont") } }
    var defaultPaper: NoteStyle.Paper { didSet { defaults.set(defaultPaper.rawValue, forKey: "defaultPaper") } }
    var libraryLayout: LibraryLayout { didSet { defaults.set(libraryLayout.rawValue, forKey: "libraryLayout") } }
    var hapticsEnabled: Bool { didSet { defaults.set(hapticsEnabled, forKey: "haptics") } }
    /// Which columns the main window showed last ("all", "doubleColumn", "detailOnly").
    var columnLayout: String { didSet { defaults.set(columnLayout, forKey: "columnLayout") } }
    /// The pen palette folded into a small button at the bottom edge.
    var penPaletteCollapsed: Bool { didSet { defaults.set(penPaletteCollapsed, forKey: "penPaletteCollapsed") } }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        fingerDrawing = defaults.object(forKey: "fingerDrawing") as? Bool
            ?? (UIDevice.current.userInterfaceIdiom == .phone)
        appearance = Appearance(rawValue: defaults.string(forKey: "appearance") ?? "") ?? .system
        defaultFont = NoteStyle.Font(rawValue: defaults.string(forKey: "defaultFont") ?? "") ?? .serif
        defaultPaper = NoteStyle.Paper(rawValue: defaults.string(forKey: "defaultPaper") ?? "") ?? .plain
        libraryLayout = LibraryLayout(rawValue: defaults.string(forKey: "libraryLayout") ?? "") ?? .grid
        hapticsEnabled = defaults.object(forKey: "haptics") as? Bool ?? true
        columnLayout = defaults.string(forKey: "columnLayout") ?? "all"
        penPaletteCollapsed = defaults.bool(forKey: "penPaletteCollapsed")
    }

    var interfaceStyle: UIUserInterfaceStyle {
        switch appearance {
        case .system: .unspecified
        case .light: .light
        case .dark: .dark
        }
    }

    /// Applies the theme to every window of every scene at once — sheets, UIKit
    /// hosts (the editor) and secondary windows included, without a relaunch.
    func applyAppearanceToWindows() {
        let style = interfaceStyle
        for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
            for window in scene.windows where window.overrideUserInterfaceStyle != style {
                window.overrideUserInterfaceStyle = style
            }
        }
    }

    var colorScheme: ColorScheme? {
        switch appearance {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
