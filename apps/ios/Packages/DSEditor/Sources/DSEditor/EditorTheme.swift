#if canImport(UIKit)
import DSDesign
import DSEditorModel
import UIKit

/// Visual tokens of the editor ("Quiet paper", D-38). Local until DSDesign exposes its tokens;
/// names follow `design-tokens.md` so swapping to DSDesign is mechanical.
public struct EditorTheme: Sendable {
    public var style: DocumentStyle
    public var baseFontSize: CGFloat = 17

    public init(style: DocumentStyle = DocumentStyle()) { self.style = style }

    // MARK: Colors (design tokens "Quiet paper" from DSDesign, D-38)

    static func dynamic(_ light: UInt32, _ dark: UInt32) -> UIColor {
        UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) }
    }

    public static let paper = DSColorToken.bgCanvas.value.uiColor
    public static let paperPattern = DSColorToken.lineSeparator.value.uiColor
    public static let text = DSColorToken.textPrimary.value.uiColor
    public static let secondaryText = DSColorToken.textSecondary.value.uiColor
    public static let tertiaryText = DSColorToken.textTertiary.value.uiColor
    public static let accent = DSColorToken.accent.value.uiColor
    public static let quoteBar = DSColorToken.lineSeparator.value.uiColor
    public static let codeBackground = DSTintToken.gray.value.bg.uiColor
    public static let chipBackground = DSTintToken.gray.value.bg.uiColor
    /// Agent edits (D-10): a quiet bar in the left margin of each paragraph with unaccepted edits.
    public static let agentEdit = DSTintToken.green.value.fg.uiColor.withAlphaComponent(0.55)
    public static let selectionTint = DSColorToken.accent.value.uiColor

    public static func callout(_ tone: String) -> UIColor {
        switch tone {
        case "info": DSTintToken.blue.value.bg.uiColor
        case "success": DSTintToken.green.value.bg.uiColor
        case "warning": DSTintToken.yellow.value.bg.uiColor
        case "danger": DSTintToken.red.value.bg.uiColor
        default: DSTintToken.gray.value.bg.uiColor
        }
    }

    /// Ink and highlight color tokens (`strokes.md` §2: token or `#RRGGBB`; `design-tokens.md`).
    public static func color(token: String) -> UIColor {
        if token.hasPrefix("#"), let v = UInt32(token.dropFirst(), radix: 16) { return UIColor(hex: v) }
        let parts = token.split(separator: ".", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return text }
        switch parts[0] {
        case "ink": return DSInkToken(rawValue: parts[1])?.value.uiColor ?? text
        case "highlight": return DSHighlightToken(rawValue: parts[1])?.value.uiColor ?? DSHighlightToken.yellow.value.uiColor
        case "text", "tint": return DSTintToken(rawValue: parts[1])?.value.fg.uiColor ?? text
        default: return text
        }
    }

    public static let inkTokens = DSInkToken.allCases.map { "ink." + $0.rawValue }
    public static let highlightTokens = DSHighlightToken.allCases.map { "highlight." + $0.rawValue }

    // MARK: Layout

    /// Max text column width for the document width style.
    public func columnWidth(available: CGFloat) -> CGFloat {
        switch style.width {
        case .normal: min(available, 680)
        case .wide: min(available, 920)
        case .full: available
        }
    }

    public var horizontalPadding: CGFloat { 24 }

    // MARK: Fonts

    func design() -> UIFontDescriptor.SystemDesign {
        switch style.font {
        case .serif: .serif
        case .sans: .default
        case .mono: .monospaced
        }
    }

    nonisolated(unsafe) private static let fontCache = NSCache<NSString, UIFont>()

    public func font(size: CGFloat, weight: UIFont.Weight = .regular, italic: Bool = false, design override: UIFontDescriptor.SystemDesign? = nil) -> UIFont {
        let d = override ?? design()
        let key = "\(size)|\(weight.rawValue)|\(italic)|\(d.rawValue)" as NSString
        if let cached = Self.fontCache.object(forKey: key) { return cached }
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        var desc = base.fontDescriptor.withDesign(d) ?? base.fontDescriptor
        if italic, let it = desc.withSymbolicTraits(desc.symbolicTraits.union(.traitItalic)) { desc = it }
        let font = UIFont(descriptor: desc, size: size)
        Self.fontCache.setObject(font, forKey: key)
        return font
    }

    public var bodyFont: UIFont { font(size: baseFontSize) }

    /// Line pitch of ruled, grid and dot paper: the body line height, so text sits on the rules.
    /// Every text line, paragraph spacing and block height is a whole number of pitches on such
    /// paper (`spec/03-pencil.md`, «Бумага»). Nil on plain paper.
    public var paperPitch: CGFloat? {
        style.paper == .plain ? nil : (bodyFont.lineHeight * Self.bodyLineHeightMultiple).rounded()
    }
    static let bodyLineHeightMultiple: CGFloat = 1.22

    /// Type token of a paragraph kind (`design-tokens.md`: title, h1–h3), nil for body text.
    static func typeToken(for kind: ParagraphKind, attrs: [String: JSONValue]) -> DSTypeToken? {
        switch kind.type {
        case NodeType.title: return .title
        case NodeType.heading:
            switch Int(attrs["level"]?.numberValue ?? 1) {
            case 1: return .h1
            case 2: return .h2
            default: return .h3
            }
        default: return nil
        }
    }

    /// Sizes follow Dynamic Type through `baseFontSize`; ink scales with them because it is stored in em.
    public func fontSize(for kind: ParagraphKind, attrs: [String: JSONValue]) -> CGFloat {
        let k = baseFontSize / 17
        if let token = Self.typeToken(for: kind, attrs: attrs) { return (token.value.size * k).rounded() }
        if kind.type == NodeType.codeBlock { return (15 * k).rounded() }
        return baseFontSize
    }

    /// Body size for the current Dynamic Type setting.
    public static func dynamicBaseSize(for traits: UITraitCollection) -> CGFloat {
        UIFontMetrics(forTextStyle: .body).scaledValue(for: 17, compatibleWith: traits).rounded()
    }

    /// Headings use the token's family (`display` = New York) whatever the document font is.
    func design(for kind: ParagraphKind, attrs: [String: JSONValue]) -> UIFontDescriptor.SystemDesign? {
        guard let token = Self.typeToken(for: kind, attrs: attrs) else { return nil }
        switch token.value.family {
        case .display: return .serif
        case .text: return .default
        case .mono: return .monospaced
        }
    }

    /// Letter spacing of a heading token, scaled with Dynamic Type.
    func tracking(for kind: ParagraphKind, attrs: [String: JSONValue]) -> CGFloat? {
        guard let token = Self.typeToken(for: kind, attrs: attrs) else { return nil }
        return token.value.tracking * baseFontSize / 17
    }

    public func weight(for kind: ParagraphKind, attrs: [String: JSONValue] = [:]) -> UIFont.Weight {
        guard let token = Self.typeToken(for: kind, attrs: attrs) else { return .regular }
        switch token.value.weight {
        case .regular: return .regular
        case .medium: return .medium
        case .semibold: return .semibold
        case .bold: return .bold
        }
    }
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(red: CGFloat((hex >> 16) & 0xff) / 255, green: CGFloat((hex >> 8) & 0xff) / 255,
                  blue: CGFloat(hex & 0xff) / 255, alpha: alpha)
    }
}
#endif
