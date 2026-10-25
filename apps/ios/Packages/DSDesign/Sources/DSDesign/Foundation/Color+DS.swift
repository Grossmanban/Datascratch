import SwiftUI
import UIKit

extension DSRGBA {
    public var uiColor: UIColor {
        UIColor(red: CGFloat(red), green: CGFloat(green), blue: CGFloat(blue), alpha: CGFloat(alpha))
    }

    public var color: Color {
        Color(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}

extension DSColorPair {
    /// Dynamic colour that follows the trait collection's interface style.
    public var uiColor: UIColor {
        let light = light
        let dark = dark
        return UIColor { traits in
            (traits.userInterfaceStyle == .dark ? dark : light).uiColor
        }
    }

    public var color: Color {
        Color(uiColor: uiColor)
    }

    public func resolved(in scheme: ColorScheme) -> DSRGBA {
        resolved(dark: scheme == .dark)
    }
}

extension DSColorToken {
    public var color: Color { value.color }
}

extension DSInkToken {
    public var color: Color { value.color }
}

extension DSHighlightToken {
    public var color: Color { value.color }
}

extension DSTintToken {
    public var foreground: Color { value.fg.color }
    public var background: Color { value.bg.color }
}

extension ShapeStyle where Self == Color {
    /// Semantic colour: `.foregroundStyle(.ds(.textPrimary))`.
    public static func ds(_ token: DSColorToken) -> Color { token.color }

    /// Pen ink colour.
    public static func ink(_ token: DSInkToken) -> Color { token.color }

    /// Highlighter colour.
    public static func highlight(_ token: DSHighlightToken) -> Color { token.color }

    /// Tint foreground (folder icons, tag text).
    public static func dsTint(_ token: DSTintToken) -> Color { token.foreground }

    /// Tint background (tag chips, callouts).
    public static func dsTintBackground(_ token: DSTintToken) -> Color { token.background }
}

extension Color {
    public static var dsCanvas: Color { DSColorToken.bgCanvas.color }
    public static var dsSurface: Color { DSColorToken.bgSurface.color }
    public static var dsSidebar: Color { DSColorToken.bgSidebar.color }
    public static var dsElevated: Color { DSColorToken.bgElevated.color }
    public static var dsPrimary: Color { DSColorToken.textPrimary.color }
    public static var dsSecondary: Color { DSColorToken.textSecondary.color }
    public static var dsTertiary: Color { DSColorToken.textTertiary.color }
    public static var dsSeparator: Color { DSColorToken.lineSeparator.color }
    public static var dsAccent: Color { DSColorToken.accent.color }
    public static var dsDanger: Color { DSColorToken.danger.color }
    public static var dsSuccess: Color { DSColorToken.success.color }
    public static var dsWarning: Color { DSColorToken.warning.color }
    /// Text and glyphs on filled accent / danger surfaces: white in light theme,
    /// ink-dark in dark theme (the dark accents are light, white would not read).
    public static var dsOnAccent: Color {
        DSColorPair(light: DSRGBA(0xFFFF_FFFF), dark: DSColorToken.bgCanvas.value.dark).color
    }
}
