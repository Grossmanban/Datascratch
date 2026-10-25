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

extension View {
    /// Liquid Glass background in a continuous rounded rectangle.
    public func dsGlass(cornerRadius: CGFloat = DSRadius.xl, tint: Color? = nil, interactive: Bool = false) -> some View {
        var glass = Glass.regular
        if let tint {
            glass = glass.tint(tint)
        }
        if interactive {
            glass = glass.interactive()
        }
        return glassEffect(glass, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
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
