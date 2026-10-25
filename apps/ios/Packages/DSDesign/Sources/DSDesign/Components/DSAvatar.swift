import SwiftUI

/// Presence of a collaborator.
public enum DSPresence: Sendable, Hashable {
    case none
    case online
    case away
}

/// Round avatar: photo or initials on a tint, optional presence dot.
public struct DSAvatar: View {
    private let name: String
    private let image: Image?
    private let tint: DSTintToken
    private let size: CGFloat
    private let presence: DSPresence

    public init(name: String, image: Image? = nil, tint: DSTintToken? = nil, size: CGFloat = 32, presence: DSPresence = .none) {
        self.name = name
        self.image = image
        self.tint = tint ?? DSAvatar.tint(for: name)
        self.size = size
        self.presence = presence
    }

    /// Up to two initials from the name.
    public nonisolated static func initials(of name: String) -> String {
        let words = name.split(whereSeparator: { $0.isWhitespace || $0 == "-" }).prefix(2)
        return words.compactMap(\.first).map { String($0).uppercased() }.joined()
    }

    /// Stable tint for a name, so a person keeps their colour everywhere.
    public nonisolated static func tint(for name: String) -> DSTintToken {
        let palette = DSTintToken.allCases.filter { $0 != .gray }
        let hash = name.unicodeScalars.reduce(UInt32(5381)) { ($0 &* 33) &+ $1.value }
        return palette[Int(hash % UInt32(palette.count))]
    }

    public var body: some View {
        ZStack {
            if let image {
                image
                    .resizable()
                    .scaledToFill()
            } else {
                Circle().fill(tint.background)
                Text(Self.initials(of: name))
                    .font(.system(size: size * 0.4, weight: .semibold, design: .rounded))
                    .foregroundStyle(tint.foreground)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.06), lineWidth: 0.5))
        .overlay(alignment: .bottomTrailing) {
            if presence != .none {
                Circle()
                    .fill(presence == .online ? Color.dsSuccess : Color.dsWarning)
                    .frame(width: size * 0.3, height: size * 0.3)
                    .overlay(Circle().strokeBorder(Color.dsSurface, lineWidth: max(1.5, size * 0.06)))
                    .offset(x: size * 0.04, y: size * 0.04)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(presenceLabel)
    }

    private var presenceLabel: String {
        switch presence {
        case .none: name
        case .online: "\(name), \(DSStrings.online)"
        case .away: "\(name), \(DSStrings.away)"
        }
    }
}

/// Overlapping avatars of the people in a document.
public struct DSAvatarStack: View {
    private let names: [String]
    private let size: CGFloat
    private let limit: Int

    public init(names: [String], size: CGFloat = 26, limit: Int = 4) {
        self.names = names
        self.size = size
        self.limit = limit
    }

    public var body: some View {
        HStack(spacing: -size * 0.3) {
            ForEach(Array(names.prefix(limit).enumerated()), id: \.offset) { _, name in
                DSAvatar(name: name, size: size)
                    .overlay(Circle().strokeBorder(Color.dsSurface, lineWidth: 2))
            }
            if names.count > limit {
                Text("+\(names.count - limit)")
                    .font(.system(size: size * 0.38, weight: .semibold))
                    .foregroundStyle(.ds(.textSecondary))
                    .frame(width: size, height: size)
                    .background(Circle().fill(Color.dsSidebar))
                    .overlay(Circle().strokeBorder(Color.dsSurface, lineWidth: 2))
            }
        }
    }
}

#Preview("Avatars — light") {
    AvatarPreview()
}

#Preview("Avatars — dark") {
    AvatarPreview()
        .preferredColorScheme(.dark)
}

private struct AvatarPreview: View {
    var body: some View {
        VStack(spacing: DSSpace.s4) {
            HStack(spacing: DSSpace.s3) {
                DSAvatar(name: "Анна Петрова", presence: .online)
                DSAvatar(name: "Ben Carter", size: 44, presence: .away)
                DSAvatar(name: "Claude")
            }
            DSAvatarStack(names: ["Анна", "Ben", "Claude", "Дима", "Eve", "Фёдор"])
        }
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
    }
}
