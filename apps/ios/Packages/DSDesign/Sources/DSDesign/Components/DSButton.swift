import SwiftUI

/// Design-system button style: `.buttonStyle(.ds(.primary))`.
public struct DSButtonStyle: ButtonStyle {
    public enum Variant: Sendable, Hashable {
        case primary
        case secondary
        case ghost
        case destructive
    }

    public enum Size: Sendable, Hashable {
        case small
        case regular
        case large
    }

    public var variant: Variant
    public var size: Size

    public init(_ variant: Variant = .primary, size: Size = .regular) {
        self.variant = variant
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        DSButtonBody(configuration: configuration, variant: variant, size: size)
    }
}

extension ButtonStyle where Self == DSButtonStyle {
    public static func ds(_ variant: DSButtonStyle.Variant = .primary, size: DSButtonStyle.Size = .regular) -> DSButtonStyle {
        DSButtonStyle(variant, size: size)
    }
}

private struct DSButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let variant: DSButtonStyle.Variant
    let size: DSButtonStyle.Size
    @Environment(\.isEnabled) private var isEnabled
    @State private var isHovering = false

    private var height: CGFloat {
        switch size {
        case .small: 28
        case .regular: 36
        case .large: 44
        }
    }

    private var foreground: Color {
        switch variant {
        case .primary, .destructive: Color.white
        case .secondary, .ghost: Color.dsPrimary
        }
    }

    private var fill: Color {
        let pressed = configuration.isPressed
        switch variant {
        case .primary: return Color.dsAccent.opacity(pressed ? 0.85 : 1)
        case .destructive: return Color.dsDanger.opacity(pressed ? 0.85 : 1)
        case .secondary: return Color.dsPrimary.opacity(pressed ? 0.1 : (isHovering ? 0.08 : 0.06))
        case .ghost: return Color.dsPrimary.opacity(pressed ? 0.08 : (isHovering ? 0.05 : 0))
        }
    }

    var body: some View {
        configuration.label
            .dsFont(size == .small ? .footnote : .callout)
            .fontWeight(.semibold)
            .lineLimit(1)
            .foregroundStyle(foreground)
            .padding(.horizontal, size == .small ? DSSpace.s3 : DSSpace.s4)
            .frame(minHeight: height)
            .background(
                RoundedRectangle(cornerRadius: size == .large ? DSRadius.lg : DSRadius.md, style: .continuous)
                    .fill(fill)
            )
            .contentShape(RoundedRectangle(cornerRadius: DSRadius.md, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(isEnabled ? 1 : 0.45)
            .onHover { isHovering = $0 }
            .dsAnimation(.snappy, value: configuration.isPressed)
    }
}

#Preview("Buttons — light") {
    ButtonsPreview()
}

#Preview("Buttons — dark") {
    ButtonsPreview()
        .preferredColorScheme(.dark)
}

private struct ButtonsPreview: View {
    var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s3) {
            HStack {
                Button("Создать") {}.buttonStyle(.ds(.primary))
                Button("Отмена") {}.buttonStyle(.ds(.secondary))
                Button("Ещё") {}.buttonStyle(.ds(.ghost))
                Button("Удалить") {}.buttonStyle(.ds(.destructive))
            }
            HStack {
                Button("Маленькая") {}.buttonStyle(.ds(.secondary, size: .small))
                Button {} label: { Label("Новый документ", systemImage: "plus") }
                    .buttonStyle(.ds(.primary, size: .large))
                Button("Недоступно") {}.buttonStyle(.ds()).disabled(true)
            }
        }
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
    }
}
