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
    /// The pen palette folded into a small button at the bottom edge.
    var penPaletteCollapsed: Bool { didSet { defaults.set(penPaletteCollapsed, forKey: "penPaletteCollapsed") } }
    /// D-65: dictation sent with the better (slower) recognition.
    var voiceQuality: VoiceQuality { didSet { defaults.set(voiceQuality.rawValue, forKey: "voiceQuality") } }
    /// D-65: swear words kept as said, or softened in formatted text.
    var voiceProfanity: VoiceProfanity { didSet { defaults.set(voiceProfanity.rawValue, forKey: "voiceProfanity") } }
    /// D-65: the «where your voice goes» sheet was read on this device.
    var voiceConsentShown: Bool { didSet { defaults.set(voiceConsentShown, forKey: "voiceConsentShown") } }
    /// D-63, before «opened» lived in the account document (`SharedRef.openedAt`): what this
    /// device had opened. Read once to carry it over (`AppModel.syncSharedRefs`), then cleared.
    var seenShared: Set<String>? { didSet { defaults.set(seenShared.map { Array($0).sorted() }, forKey: "seenShared") } }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        seenShared = (defaults.array(forKey: "seenShared") as? [String]).map(Set.init)
        fingerDrawing = defaults.object(forKey: "fingerDrawing") as? Bool
            ?? (UIDevice.current.userInterfaceIdiom == .phone)
        appearance = Appearance(rawValue: defaults.string(forKey: "appearance") ?? "") ?? .system
        defaultFont = NoteStyle.Font(rawValue: defaults.string(forKey: "defaultFont") ?? "") ?? .serif
        defaultPaper = NoteStyle.Paper(rawValue: defaults.string(forKey: "defaultPaper") ?? "") ?? .plain
        // D-61: rows by default — more fits on screen; cards stay a choice in «Layout».
        libraryLayout = LibraryLayout(rawValue: defaults.string(forKey: "libraryLayout") ?? "") ?? .list
        hapticsEnabled = defaults.object(forKey: "haptics") as? Bool ?? true
        penPaletteCollapsed = defaults.bool(forKey: "penPaletteCollapsed")
        voiceQuality = VoiceQuality(rawValue: defaults.string(forKey: "voiceQuality") ?? "") ?? .standard
        voiceProfanity = VoiceProfanity(rawValue: defaults.string(forKey: "voiceProfanity") ?? "") ?? .keep
        voiceConsentShown = defaults.bool(forKey: "voiceConsentShown")
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
