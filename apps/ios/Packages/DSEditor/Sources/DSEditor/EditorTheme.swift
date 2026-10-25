#if canImport(UIKit)
import DSEditorModel
import UIKit

/// Visual tokens of the editor ("Quiet paper", D-38). Local until DSDesign exposes its tokens;
/// names follow `design-tokens.md` so swapping to DSDesign is mechanical.
public struct EditorTheme: Sendable {
    public var style: DocumentStyle
    public var baseFontSize: CGFloat = 17

    public init(style: DocumentStyle = DocumentStyle()) { self.style = style }

    // MARK: Colors

    static func dynamic(_ light: UInt32, _ dark: UInt32) -> UIColor {
        UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) }
    }

    public static let paper = dynamic(0xFBF8F3, 0x1E1C1A)
    public static let paperPattern = dynamic(0xE6DFD3, 0x34312D)
    public static let text = dynamic(0x1F1D1A, 0xECE7DF)
    public static let secondaryText = dynamic(0x6F685E, 0xA49D92)
    public static let accent = dynamic(0x2F5D8A, 0x8DB4DD)
    public static let quoteBar = dynamic(0xCFC5B5, 0x5A544C)
    public static let codeBackground = dynamic(0xF2EDE4, 0x2A2724)
    public static let chipBackground = dynamic(0xECE5D8, 0x37332E)
    public static let agentEdit = dynamic(0xE8F0E0, 0x2E3A2A)
    public static let selectionTint = dynamic(0x2F5D8A, 0x8DB4DD)

    public static func callout(_ tone: String) -> UIColor {
        switch tone {
        case "info": dynamic(0xE7EFF7, 0x23303C)
        case "success": dynamic(0xE7F2E6, 0x243325)
        case "warning": dynamic(0xFAF0DA, 0x3A3222)
        case "danger": dynamic(0xF8E3E0, 0x3C2624)
        default: dynamic(0xF1ECE3, 0x2C2926)
        }
    }

    /// Ink and highlight color tokens (`strokes.md` §2: token or `#RRGGBB`).
    public static func color(token: String) -> UIColor {
        if token.hasPrefix("#"), let v = UInt32(token.dropFirst(), radix: 16) { return UIColor(hex: v) }
        switch token {
        case "ink.black": return dynamic(0x1F1D1A, 0xECE7DF)
        case "ink.blue": return dynamic(0x2F5D8A, 0x7FA9D6)
        case "ink.red": return dynamic(0xB0413E, 0xE07B76)
        case "ink.green": return dynamic(0x3E7A4F, 0x7DBB8C)
        case "ink.purple": return dynamic(0x6B4C9A, 0xA98BD6)
        case "ink.brown": return dynamic(0x7A5A3A, 0xC09A72)
        case "highlight.yellow": return UIColor(hex: 0xF7D774)
        case "highlight.green": return UIColor(hex: 0xA8DCA0)
        case "highlight.blue": return UIColor(hex: 0x9CC8EE)
        case "highlight.pink": return UIColor(hex: 0xF2A7C3)
        case "highlight.orange": return UIColor(hex: 0xF5B97A)
        case "text.red": return dynamic(0xB0413E, 0xE07B76)
        case "text.blue": return dynamic(0x2F5D8A, 0x7FA9D6)
        case "text.green": return dynamic(0x3E7A4F, 0x7DBB8C)
        case "text.gray": return dynamic(0x6F685E, 0xA49D92)
        default: return text
        }
    }

    public static let inkTokens = ["ink.black", "ink.blue", "ink.red", "ink.green", "ink.purple", "ink.brown"]
    public static let highlightTokens = ["highlight.yellow", "highlight.green", "highlight.blue", "highlight.pink", "highlight.orange"]

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

    /// Sizes follow Dynamic Type through `baseFontSize`; ink scales with them because it is stored in em.
    public func fontSize(for kind: ParagraphKind, attrs: [String: JSONValue]) -> CGFloat {
        let k = baseFontSize / 17
        switch kind.type {
        case NodeType.title: return (34 * k).rounded()
        case NodeType.heading:
            switch Int(attrs["level"]?.numberValue ?? 1) {
            case 1: return (28 * k).rounded()
            case 2: return (22 * k).rounded()
            default: return (19 * k).rounded()
            }
        case NodeType.codeBlock: return (15 * k).rounded()
        default: return baseFontSize
        }
    }

    /// Body size for the current Dynamic Type setting.
    public static func dynamicBaseSize(for traits: UITraitCollection) -> CGFloat {
        UIFontMetrics(forTextStyle: .body).scaledValue(for: 17, compatibleWith: traits).rounded()
    }

    public func weight(for kind: ParagraphKind) -> UIFont.Weight {
        switch kind.type {
        case NodeType.title: .bold
        case NodeType.heading: .semibold
        default: .regular
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
