import SwiftUI

/// Tag chip: `#tag` in a tint colour.
public struct DSTagChip: View {
    private let name: String
    private let tint: DSTintToken
    private let showsHash: Bool

    public init(_ name: String, tint: DSTintToken = .gray, showsHash: Bool = true) {
        self.name = name
        self.tint = tint
        self.showsHash = showsHash
    }

    public var body: some View {
        Text(showsHash ? "#\(name)" : name)
            .dsFont(.caption)
            .lineLimit(1)
            .foregroundStyle(tint.foreground)
            .padding(.horizontal, DSSpace.s2)
            .padding(.vertical, 3)
            .background(Capsule().fill(tint.background))
    }
}

/// Small badge for counts and statuses.
public struct DSBadge: View {
    public enum Style: Sendable {
        /// Quiet grey, for counters.
        case neutral
        /// Filled accent, for unread / new.
        case accent
        /// Filled danger, for overdue counts.
        case danger
        /// Soft tint.
        case tint(DSTintToken)
    }

    private let text: String
    private let style: Style

    public init(_ text: String, style: Style = .neutral) {
        self.text = text
        self.style = style
    }

    public init(count: Int, style: Style = .neutral) {
        self.init(count > 99 ? "99+" : "\(count)", style: style)
    }

    private var colors: (fg: Color, bg: Color) {
        switch style {
        case .neutral: (Color.dsSecondary, Color.dsPrimary.opacity(0.07))
        case .accent: (Color.white, Color.dsAccent)
        case .danger: (Color.white, Color.dsDanger)
        case let .tint(token): (token.foreground, token.background)
        }
    }

    public var body: some View {
        Text(text)
            .dsFont(.caption)
            .fontWeight(.semibold)
            .monospacedDigit()
            .lineLimit(1)
            .foregroundStyle(colors.fg)
            .padding(.horizontal, 6)
            .frame(minWidth: 20, minHeight: 20)
            .background(Capsule().fill(colors.bg))
    }
}

#Preview("Chips — light") {
    ChipsPreview()
}

#Preview("Chips — dark") {
    ChipsPreview()
        .preferredColorScheme(.dark)
}

private struct ChipsPreview: View {
    var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s3) {
            HStack {
                ForEach(Array(DSTintToken.allCases.prefix(5)), id: \.self) { tint in
                    DSTagChip(tint.rawValue, tint: tint)
                }
            }
            HStack {
                ForEach(Array(DSTintToken.allCases.suffix(5)), id: \.self) { tint in
                    DSTagChip(tint.rawValue, tint: tint)
                }
            }
            HStack {
                DSBadge(count: 7)
                DSBadge(count: 3, style: .accent)
                DSBadge(count: 120, style: .danger)
                DSBadge("Новое", style: .tint(.green))
            }
        }
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
    }
}
