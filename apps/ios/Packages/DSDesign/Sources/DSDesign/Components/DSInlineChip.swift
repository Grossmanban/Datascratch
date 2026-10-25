import SwiftUI
import UIKit

/// Metrics and colours of inline chips in document text: `[[wiki links]]` and `#tags`.
/// Same look as the web (`[data-wikilink]`, `TagChip`).
public struct DSInlineChipStyle: Sendable, Hashable {
    /// Font size relative to the surrounding text size.
    public var fontScale: CGFloat
    public var weight: DSFontWeight
    public var horizontalPadding: CGFloat
    public var verticalPadding: CGFloat
    /// `nil` = capsule.
    public var cornerRadius: CGFloat?
    public var foreground: DSColorPair
    public var background: DSColorPair
    public var systemImage: String?

    public init(
        fontScale: CGFloat = 0.94,
        weight: DSFontWeight = .medium,
        horizontalPadding: CGFloat = 5,
        verticalPadding: CGFloat = 1,
        cornerRadius: CGFloat? = 5,
        foreground: DSColorPair,
        background: DSColorPair,
        systemImage: String? = nil
    ) {
        self.fontScale = fontScale
        self.weight = weight
        self.horizontalPadding = horizontalPadding
        self.verticalPadding = verticalPadding
        self.cornerRadius = cornerRadius
        self.foreground = foreground
        self.background = background
        self.systemImage = systemImage
    }

    /// `[[Document]]`: ink text on a faint accent wash.
    public static func wikiLink(showsIcon: Bool) -> DSInlineChipStyle {
        let accent = DSColorToken.accent.value
        return DSInlineChipStyle(
            fontScale: 1,
            weight: .regular,
            horizontalPadding: 4,
            verticalPadding: 0,
            cornerRadius: 5,
            foreground: DSColorToken.textPrimary.value,
            background: DSColorPair(light: accent.light.withAlpha(0.10), dark: accent.dark.withAlpha(0.16)),
            systemImage: showsIcon ? "link" : nil
        )
    }

    public static let wikiLink = Self.wikiLink(showsIcon: false)

    /// `#tag` in a tint (folder / tag colour).
    public static func tag(_ tint: DSTintToken) -> DSInlineChipStyle {
        DSInlineChipStyle(
            fontScale: 0.88,
            weight: .medium,
            horizontalPadding: 7,
            verticalPadding: 1,
            cornerRadius: nil,
            foreground: tint.value.fg,
            background: tint.value.bg
        )
    }

    public static let tag = Self.tag(.blue)

    /// Font for a chip inside text of `textSize` points (SF Pro, Dynamic Type is the caller's text size).
    public func uiFont(for textSize: CGFloat) -> UIFont {
        let uiWeight: UIFont.Weight = switch weight {
        case .regular: .regular
        case .medium: .medium
        case .semibold: .semibold
        case .bold: .bold
        }
        return UIFont.systemFont(ofSize: (textSize * fontScale).rounded(), weight: uiWeight)
    }
}

extension DSRGBA {
    func withAlpha(_ alpha: Double) -> DSRGBA {
        DSRGBA(red: red, green: green, blue: blue, alpha: alpha)
    }
}

/// Inline chip view (SwiftUI). For TextKit, use `renderImage` as a text attachment.
public struct DSInlineChip: View {
    private let text: String
    private let style: DSInlineChipStyle
    private let textSize: CGFloat

    public init(text: String, style: DSInlineChipStyle = .wikiLink, textSize: CGFloat = 17) {
        self.text = text
        self.style = style
        self.textSize = textSize
    }

    public var body: some View {
        HStack(spacing: 3) {
            if let systemImage = style.systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: textSize * style.fontScale * 0.75, weight: .semibold))
                    .accessibilityHidden(true)
            }
            Text(text)
                .font(Font(style.uiFont(for: textSize) as CTFont))
                .lineLimit(1)
        }
        .foregroundStyle(style.foreground.color)
        .padding(.horizontal, style.horizontalPadding)
        .padding(.vertical, style.verticalPadding)
        .background(shape.fill(style.background.color))
    }

    private var shape: AnyShape {
        if let radius = style.cornerRadius {
            AnyShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
        } else {
            AnyShape(Capsule())
        }
    }

    /// Image of the chip for an `NSTextAttachment` (colours resolved for `colorScheme`).
    @MainActor
    public static func renderImage(
        text: String,
        style: DSInlineChipStyle,
        textSize: CGFloat,
        scale: CGFloat,
        colorScheme: ColorScheme
    ) -> UIImage? {
        let renderer = ImageRenderer(
            content: DSInlineChip(text: text, style: style, textSize: textSize)
                .environment(\.colorScheme, colorScheme)
        )
        renderer.scale = scale
        renderer.isOpaque = false
        return renderer.uiImage
    }
}

#Preview("Inline chips — light") {
    InlineChipsPreview()
}

#Preview("Inline chips — dark") {
    InlineChipsPreview().preferredColorScheme(.dark)
}

private struct InlineChipsPreview: View {
    var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s3) {
            HStack(spacing: 4) {
                Text("Смотри").dsFont(.body)
                DSInlineChip(text: "Теория графов")
                Text("и").dsFont(.body)
                DSInlineChip(text: "План", style: .wikiLink(showsIcon: true))
            }
            HStack(spacing: 4) {
                DSInlineChip(text: "#идеи", style: .tag(.purple))
                DSInlineChip(text: "#работа", style: .tag(.blue))
                DSInlineChip(text: "#срочно", style: .tag(.red))
            }
        }
        .padding(DSSpace.s6)
        .background(Color.dsCanvas)
    }
}
