import SwiftUI
import UIKit
#if canImport(DSDesign)
import DSDesign
#endif

// "Quiet paper" tokens (contracts/design-tokens.md, D-38). With the DSDesign
// package linked, colours come from its generated tokens; without it, the
// literals below (copied from the contract) stand in.

enum Theme {
    enum Palette {
        #if canImport(DSDesign)
        static var canvas: Color { DSColorToken.bgCanvas.color }
        static var surface: Color { DSColorToken.bgSurface.color }
        static var sidebar: Color { DSColorToken.bgSidebar.color }
        static var elevated: Color { DSColorToken.bgElevated.color }
        static var textPrimary: Color { DSColorToken.textPrimary.color }
        static var textSecondary: Color { DSColorToken.textSecondary.color }
        static var textTertiary: Color { DSColorToken.textTertiary.color }
        static var separator: Color { DSColorToken.lineSeparator.color }
        static var accent: Color { DSColorToken.accent.color }
        static var danger: Color { DSColorToken.danger.color }
        static var success: Color { DSColorToken.success.color }
        static var warning: Color { DSColorToken.warning.color }
        /// Text and icons on an accent fill (dark text on the light dark-mode accent).
        static var onAccent: Color { .dsOnAccent }
        #else
        static let canvas = Color(light: 0xFAF8F4, dark: 0x1A1917)
        static let surface = Color(light: 0xFFFFFF, dark: 0x22211E)
        static let sidebar = Color(light: 0xF3EFE7, dark: 0x1F1E1B)
        static let elevated = Color(light: 0xFFFFFF, dark: 0x2A2926, alpha: 0.8)
        static let textPrimary = Color(light: 0x1D1C1A, dark: 0xECE9E3)
        static let textSecondary = Color(light: 0x6B6862, dark: 0xA19D95)
        static let textTertiary = Color(light: 0x9C978E, dark: 0x77736C)
        static let separator = Color(light: 0xE6E1D8, dark: 0x34322E)
        static let accent = Color(light: 0x2E5BDB, dark: 0x7B9BFF)
        static let danger = Color(light: 0xD2453B, dark: 0xFF6B5E)
        static let success = Color(light: 0x3E8E5A, dark: 0x6BC48A)
        static let warning = Color(light: 0xC98A1B, dark: 0xF2B54B)
        static let onAccent = Color(light: 0xFFFFFF, dark: 0x14161F)
        #endif
    }

    enum Space {
        static let s1: CGFloat = 4
        static let s2: CGFloat = 8
        static let s3: CGFloat = 12
        static let s4: CGFloat = 16
        static let s5: CGFloat = 20
        static let s6: CGFloat = 24
        static let s8: CGFloat = 32
        static let s10: CGFloat = 40
    }

    enum Radius {
        static let sm: CGFloat = 6
        static let md: CGFloat = 10
        static let lg: CGFloat = 14
        static let xl: CGFloat = 20
    }

    enum Motion {
        static let snappy = Animation.spring(response: 0.3, dampingFraction: 0.85)
        static let smooth = Animation.spring(response: 0.45, dampingFraction: 0.9)
        static let gentle = Animation.spring(response: 0.6, dampingFraction: 1.0)
    }

    enum Typography {
        static let title = Font.system(size: 34, weight: .semibold, design: .serif)
        static let h1 = Font.system(size: 28, weight: .semibold, design: .serif)
        static let h2 = Font.system(size: 22, weight: .semibold, design: .serif)
        static let h3 = Font.system(size: 19, weight: .semibold, design: .serif)
        static let body = Font.system(size: 17)
        static let callout = Font.system(size: 16)
        static let footnote = Font.system(size: 13)
        static let caption = Font.system(size: 12)

        static func display(_ style: Font.TextStyle) -> Font {
            .system(style, design: .serif).weight(.semibold)
        }
    }

    /// Column widths of a document (`style.width`).
    static func columnWidth(_ width: NoteStyle.Width) -> CGFloat {
        switch width {
        case .normal: 720
        case .wide: 960
        case .full: .infinity
        }
    }
}

extension Tint {
    #if canImport(DSDesign)
    var foreground: Color { (DSTintToken(rawValue: rawValue) ?? .gray).foreground }
    var background: Color { (DSTintToken(rawValue: rawValue) ?? .gray).background }
    #else
    var foreground: Color {
        switch self {
        case .red: Color(light: 0xC2413A, dark: 0xFF7A6E)
        case .orange: Color(light: 0xC8661C, dark: 0xFFA25C)
        case .yellow: Color(light: 0xA77F0E, dark: 0xF2C94C)
        case .green: Color(light: 0x3E8E5A, dark: 0x6BC48A)
        case .teal: Color(light: 0x23857F, dark: 0x5CC8C0)
        case .blue: Color(light: 0x2E5BDB, dark: 0x7B9BFF)
        case .indigo: Color(light: 0x4B4FC9, dark: 0x9A9DFF)
        case .purple: Color(light: 0x7A4FD6, dark: 0xB894FF)
        case .pink: Color(light: 0xC2457E, dark: 0xFF8DBE)
        case .gray: Color(light: 0x6B6862, dark: 0xA19D95)
        }
    }

    var background: Color { foreground.opacity(0.14) }
    #endif
}

extension Backdrop {
    /// Soft Craft-like gradients (2–3 colours), used for covers and backdrops.
    var colors: [Color] {
        switch self {
        case .none: [Theme.Palette.surface, Theme.Palette.surface]
        case .sand: [Color(light: 0xF6E7CF, dark: 0x4A3B28), Color(light: 0xEFD3C4, dark: 0x3D2A2A), Color(light: 0xF8F1E4, dark: 0x2A2622)]
        case .dusk: [Color(light: 0xD9D2F3, dark: 0x2E2A4D), Color(light: 0xF3D5E2, dark: 0x45293A), Color(light: 0xF9E6D8, dark: 0x3B2D26)]
        case .mist: [Color(light: 0xDCE8F2, dark: 0x22344A), Color(light: 0xE8EEF0, dark: 0x2B3236), Color(light: 0xF4F1EA, dark: 0x262523)]
        case .meadow: [Color(light: 0xDDEFD9, dark: 0x233D2C), Color(light: 0xEEF2D2, dark: 0x3A3D24), Color(light: 0xF6F2E6, dark: 0x262521)]
        case .ember: [Color(light: 0xF8D9C2, dark: 0x4D2A1D), Color(light: 0xF4C7B8, dark: 0x4A2224), Color(light: 0xFBEBD9, dark: 0x302620)]
        }
    }

    var gradient: LinearGradient {
        LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

extension Color {
    /// A colour that follows the light/dark appearance.
    nonisolated init(light: UInt32, dark: UInt32, alpha: CGFloat = 1) {
        self.init(uiColor: UIColor { traits in
            UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light, alpha: alpha)
        })
    }
}

extension UIColor {
    nonisolated convenience init(rgb: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: alpha
        )
    }
}

enum Haptics {
    static func selection() { UISelectionFeedbackGenerator().selectionChanged() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func warning() { UINotificationFeedbackGenerator().notificationOccurred(.warning) }
}

extension View {
    /// The prominent Liquid Glass button with label colour that keeps contrast on the
    /// accent fill in both themes (the dark-mode accent is light).
    func prominentGlass() -> some View {
        buttonStyle(.glassProminent)
            .foregroundStyle(Theme.Palette.onAccent)
    }
}
