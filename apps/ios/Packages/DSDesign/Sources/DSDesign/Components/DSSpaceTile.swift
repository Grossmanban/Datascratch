import SwiftUI

/// Space (or notebook) badge: emoji or letter on its tint, as in the space switcher.
public struct DSSpaceTile: View {
    private let icon: String
    private let tint: DSTintToken
    private let size: CGFloat

    public init(_ icon: String, tint: DSTintToken = .gray, size: CGFloat = 26) {
        self.icon = icon
        self.tint = tint
        self.size = size
    }

    private var isLetter: Bool {
        icon.count == 1 && icon.unicodeScalars.allSatisfy { CharacterSet.letters.contains($0) }
    }

    public var body: some View {
        Text(isLetter ? icon.uppercased() : icon)
            .font(isLetter ? .system(size: size * 0.56, weight: .semibold, design: .serif) : .system(size: size * 0.62))
            .foregroundStyle(tint.foreground)
            .frame(width: size, height: size)
            .background(
                RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                    .fill(tint.background)
            )
            .overlay(
                RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                    .strokeBorder(tint.foreground.opacity(0.18), lineWidth: 0.5)
            )
            .accessibilityHidden(true)
    }
}

#Preview("Space tiles") {
    HStack(spacing: DSSpace.s3) {
        DSSpaceTile("🏡", tint: .green)
        DSSpaceTile("💼", tint: .blue)
        DSSpaceTile("Л", tint: .purple)
        DSSpaceTile("📚", tint: .orange, size: 36)
    }
    .padding()
    .background(Color.dsSidebar)
}
