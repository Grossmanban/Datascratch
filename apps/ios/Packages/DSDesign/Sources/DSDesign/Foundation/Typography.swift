import SwiftUI

extension DSFontWeight {
    public var swiftUI: Font.Weight {
        switch self {
        case .regular: .regular
        case .medium: .medium
        case .semibold: .semibold
        case .bold: .bold
        }
    }
}

extension DSFontFamily {
    /// New York for display, SF Pro for text, SF Mono for code.
    public var design: Font.Design {
        switch self {
        case .display: .serif
        case .text: .default
        case .mono: .monospaced
        }
    }
}

extension DSTextStyle {
    public var swiftUI: Font.TextStyle {
        switch self {
        case .largeTitle: .largeTitle
        case .title: .title
        case .title2: .title2
        case .title3: .title3
        case .body: .body
        case .callout: .callout
        case .footnote: .footnote
        case .caption: .caption
        }
    }
}

extension DSTypeToken {
    /// Font at a fixed size (defaults to the token size, no Dynamic Type).
    /// Prefer `.dsFont(_:)`, which scales with Dynamic Type.
    public func font(size: CGFloat? = nil) -> Font {
        let spec = value
        return .system(size: size ?? spec.size, weight: spec.weight.swiftUI, design: spec.family.design)
    }
}

/// System fonts render at roughly 1.2× their size; extra spacing brings
/// lines to the token's line height.
private let systemLineHeight: CGFloat = 1.2

struct DSFontModifier: ViewModifier {
    let token: DSTypeToken
    @ScaledMetric private var size: CGFloat

    init(token: DSTypeToken) {
        self.token = token
        _size = ScaledMetric(wrappedValue: token.value.size, relativeTo: token.value.textStyle.swiftUI)
    }

    func body(content: Content) -> some View {
        let spec = token.value
        let scale = size / spec.size
        content
            .font(token.font(size: size))
            .tracking(spec.tracking * scale)
            .lineSpacing(max(0, size * (spec.lineHeight - systemLineHeight)))
    }
}

extension View {
    /// Applies a type token with Dynamic Type scaling, tracking and line height.
    public func dsFont(_ token: DSTypeToken) -> some View {
        modifier(DSFontModifier(token: token))
    }
}
