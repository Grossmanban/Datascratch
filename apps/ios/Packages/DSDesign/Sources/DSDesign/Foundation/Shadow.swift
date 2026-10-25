import SwiftUI

struct DSShadowModifier: ViewModifier {
    let token: DSShadowToken
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let layers = colorScheme == .dark ? token.dark : token.light
        let first = layers.first
        let second = layers.dropFirst().first
        // SwiftUI has no spread; radius ≈ half the CSS blur.
        content
            .shadow(color: first?.color.color ?? .clear, radius: (first?.blur ?? 0) / 2, x: first?.x ?? 0, y: first?.y ?? 0)
            .shadow(color: second?.color.color ?? .clear, radius: (second?.blur ?? 0) / 2, x: second?.x ?? 0, y: second?.y ?? 0)
    }
}

extension View {
    /// Soft layered elevation from the shadow tokens (adapts to the colour scheme).
    public func dsShadow(_ token: DSShadowToken) -> some View {
        modifier(DSShadowModifier(token: token))
    }
}
