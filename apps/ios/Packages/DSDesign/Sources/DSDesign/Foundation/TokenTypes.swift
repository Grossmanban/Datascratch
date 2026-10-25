import CoreGraphics

/// An sRGB colour with alpha, components in 0...1.
public struct DSRGBA: Sendable, Hashable {
    public let red: Double
    public let green: Double
    public let blue: Double
    public let alpha: Double

    /// Creates a colour from a packed `0xRRGGBBAA` value.
    public init(_ value: UInt32) {
        red = Double((value >> 24) & 0xFF) / 255
        green = Double((value >> 16) & 0xFF) / 255
        blue = Double((value >> 8) & 0xFF) / 255
        alpha = Double(value & 0xFF) / 255
    }

    public init(red: Double, green: Double, blue: Double, alpha: Double = 1) {
        self.red = red
        self.green = green
        self.blue = blue
        self.alpha = alpha
    }

    /// `#RRGGBB`, or `#RRGGBBAA` when not opaque.
    public var hex: String {
        func byte(_ v: Double) -> String {
            let s = String(Int((v * 255).rounded()), radix: 16, uppercase: true)
            return s.count == 1 ? "0" + s : s
        }
        let base = "#" + byte(red) + byte(green) + byte(blue)
        return alpha >= 1 ? base : base + byte(alpha)
    }
}

/// A colour that differs between the light and the dark theme.
public struct DSColorPair: Sendable, Hashable {
    public let light: DSRGBA
    public let dark: DSRGBA

    public init(light: DSRGBA, dark: DSRGBA) {
        self.light = light
        self.dark = dark
    }

    public func resolved(dark isDark: Bool) -> DSRGBA {
        isDark ? dark : light
    }
}

/// Foreground + background of a folder / tag / callout tint.
public struct DSTintPair: Sendable, Hashable {
    public let fg: DSColorPair
    public let bg: DSColorPair

    public init(fg: DSColorPair, bg: DSColorPair) {
        self.fg = fg
        self.bg = bg
    }
}

/// A soft radial colour blob; position and radius are fractions of the backdrop.
public struct DSBackdropBlob: Sendable, Hashable {
    public let color: DSRGBA
    public let x: Double
    public let y: Double
    public let radius: Double

    public init(color: DSRGBA, x: Double, y: Double, radius: Double) {
        self.color = color
        self.x = x
        self.y = y
        self.radius = radius
    }
}

/// Backdrop: base linear gradient (CSS angle, degrees) + blobs + grain opacity.
public struct DSBackdropSpec: Sendable, Hashable {
    public let angle: Double
    public let base: [DSRGBA]
    public let blobs: [DSBackdropBlob]
    public let noise: Double

    public init(angle: Double, base: [DSRGBA], blobs: [DSBackdropBlob], noise: Double) {
        self.angle = angle
        self.base = base
        self.blobs = blobs
        self.noise = noise
    }
}

public enum DSFontWeight: Sendable, Hashable {
    case regular, medium, semibold, bold
}

public enum DSFontFamily: Sendable, Hashable {
    /// Serif headings (New York).
    case display
    /// Body text (SF Pro).
    case text
    /// Code (SF Mono).
    case mono
}

/// Dynamic Type text style a token scales with.
public enum DSTextStyle: Sendable, Hashable {
    case largeTitle, title, title2, title3, body, callout, footnote, caption
}

public struct DSTypeSpec: Sendable, Hashable {
    public let size: CGFloat
    public let weight: DSFontWeight
    public let family: DSFontFamily
    /// Line height as a multiple of the font size.
    public let lineHeight: CGFloat
    /// Letter spacing in points at the base size.
    public let tracking: CGFloat
    public let textStyle: DSTextStyle

    public init(
        size: CGFloat,
        weight: DSFontWeight,
        family: DSFontFamily,
        lineHeight: CGFloat,
        tracking: CGFloat,
        textStyle: DSTextStyle
    ) {
        self.size = size
        self.weight = weight
        self.family = family
        self.lineHeight = lineHeight
        self.tracking = tracking
        self.textStyle = textStyle
    }
}

/// One shadow layer in CSS terms (blur = CSS blur radius).
public struct DSShadowLayer: Sendable, Hashable {
    public let x: CGFloat
    public let y: CGFloat
    public let blur: CGFloat
    public let spread: CGFloat
    public let color: DSRGBA

    public init(x: CGFloat, y: CGFloat, blur: CGFloat, spread: CGFloat, color: DSRGBA) {
        self.x = x
        self.y = y
        self.blur = blur
        self.spread = spread
        self.color = color
    }
}

/// SwiftUI spring: `response` (seconds) and damping fraction.
public struct DSSpringSpec: Sendable, Hashable {
    public let response: Double
    public let damping: Double

    public init(response: Double, damping: Double) {
        self.response = response
        self.damping = damping
    }
}
