import SwiftUI

/// Floating Liquid Glass panel (toolbars, popovers, the format bar).
public struct DSGlassPanel<Content: View>: View {
    private let cornerRadius: CGFloat
    private let padding: CGFloat
    private let tint: Color?
    private let interactive: Bool
    private let content: Content

    public init(
        cornerRadius: CGFloat = DSRadius.xl,
        padding: CGFloat = DSSpace.s3,
        tint: Color? = nil,
        interactive: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.padding = padding
        self.tint = tint
        self.interactive = interactive
        self.content = content()
    }

    public var body: some View {
        content
            .padding(padding)
            .dsGlass(cornerRadius: cornerRadius, tint: tint, interactive: interactive)
    }
}

private struct DSGlassFallbackKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    /// Draw `.dsGlass` as a solid elevated surface instead of Liquid Glass.
    /// `ImageRenderer` (snapshot tests) cannot render glass, so snapshots set this.
    public var dsGlassFallback: Bool {
        get { self[DSGlassFallbackKey.self] }
        set { self[DSGlassFallbackKey.self] = newValue }
    }
}

struct DSGlassModifier: ViewModifier {
    let cornerRadius: CGFloat
    let tint: Color?
    let interactive: Bool
    @Environment(\.dsGlassFallback) private var fallback

    @ViewBuilder
    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        if fallback {
            content
                .background(shape.fill(Color.dsElevated))
                .background(shape.fill(Color.dsSurface.opacity(0.6)))
                .overlay(shape.strokeBorder(Color.dsSeparator, lineWidth: 0.5))
                .dsShadow(.popover)
        } else {
            content.glassEffect(glass, in: shape)
        }
    }

    private var glass: Glass {
        var glass = Glass.regular
        if let tint {
            glass = glass.tint(tint)
        }
        if interactive {
            glass = glass.interactive()
        }
        return glass
    }
}

extension View {
    /// Liquid Glass background in a continuous rounded rectangle
    /// (solid elevated surface when `\.dsGlassFallback` is on).
    public func dsGlass(cornerRadius: CGFloat = DSRadius.xl, tint: Color? = nil, interactive: Bool = false) -> some View {
        modifier(DSGlassModifier(cornerRadius: cornerRadius, tint: tint, interactive: interactive))
    }
}

#Preview("Glass — light") {
    GlassPreview()
}

#Preview("Glass — dark") {
    GlassPreview()
        .preferredColorScheme(.dark)
}

private struct GlassPreview: View {
    var body: some View {
        ZStack {
            DSBackdrop(.dusk)
                .ignoresSafeArea()
            VStack(spacing: DSSpace.s6) {
                DSGlassPanel {
                    VStack(alignment: .leading, spacing: DSSpace.s1) {
                        Text("Тихая бумага").dsFont(.h3)
                        Text("Стеклянная плавающая панель").dsFont(.footnote).foregroundStyle(.ds(.textSecondary))
                    }
                }
                GlassEffectContainer(spacing: DSSpace.s2) {
                    HStack(spacing: DSSpace.s2) {
                        ForEach(["bold", "italic", "underline", "pencil.tip"], id: \.self) { symbol in
                            Image(systemName: symbol)
                                .font(.system(size: 17, weight: .medium))
                                .frame(width: 44, height: 44)
                                .dsGlass(cornerRadius: 22, interactive: true)
                        }
                    }
                }
            }
            .foregroundStyle(.ds(.textPrimary))
        }
    }
}
