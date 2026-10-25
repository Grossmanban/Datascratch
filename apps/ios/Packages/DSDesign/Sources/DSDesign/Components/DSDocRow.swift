import SwiftUI

/// Leading glyph of a document: an emoji or an SF Symbol.
public enum DSDocIcon: Hashable, Sendable {
    case emoji(String)
    case symbol(String)
}

/// List row for a document: icon, serif title, one-line excerpt, trailing date,
/// optional folder tint dot and a selected state.
public struct DSDocRow: View {
    private let title: String
    private let subtitle: String?
    private let detail: String?
    private let icon: DSDocIcon
    private let folderTint: DSTintToken?
    private let isSelected: Bool
    @State private var isHovering = false

    public init(
        title: String,
        subtitle: String? = nil,
        detail: String? = nil,
        icon: DSDocIcon = .symbol("doc.text"),
        folderTint: DSTintToken? = nil,
        isSelected: Bool = false
    ) {
        self.title = title
        self.subtitle = subtitle
        self.detail = detail
        self.icon = icon
        self.folderTint = folderTint
        self.isSelected = isSelected
    }

    public var body: some View {
        HStack(spacing: DSSpace.s3) {
            glyph
                .frame(width: 32, height: 32)
                .background(
                    RoundedRectangle(cornerRadius: DSRadius.sm, style: .continuous)
                        .fill(Color.dsSurface)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DSRadius.sm, style: .continuous)
                        .strokeBorder(Color.dsSeparator, lineWidth: 0.5)
                )
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .dsFont(.h3)
                    .foregroundStyle(Color.dsPrimary)
                    .lineLimit(1)
                if let subtitle {
                    Text(subtitle)
                        .dsFont(.footnote)
                        .foregroundStyle(Color.dsSecondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: DSSpace.s2)
            if let folderTint {
                Circle()
                    .fill(folderTint.foreground)
                    .frame(width: 8, height: 8)
                    .accessibilityHidden(true)
            }
            if let detail {
                Text(detail)
                    .dsFont(.caption)
                    .foregroundStyle(Color.dsTertiary)
                    .monospacedDigit()
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, DSSpace.s3)
        .padding(.vertical, DSSpace.s2)
        .background(
            RoundedRectangle(cornerRadius: DSRadius.md, style: .continuous)
                .fill(Color.dsPrimary.opacity(isSelected ? 0.075 : (isHovering ? 0.045 : 0)))
        )
        .contentShape(RoundedRectangle(cornerRadius: DSRadius.md, style: .continuous))
        .onHover { isHovering = $0 }
        .dsAnimation(.snappy, value: isSelected)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    @ViewBuilder private var glyph: some View {
        switch icon {
        case let .emoji(emoji):
            Text(emoji).font(.system(size: 18))
        case let .symbol(name):
            Image(systemName: name)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.dsSecondary)
        }
    }
}

/// Adaptive grid for document cards (`DSDocCard`) or any cards of similar size.
public struct DSDocGrid<Content: View>: View {
    private let minWidth: CGFloat
    private let spacing: CGFloat
    private let content: Content

    public init(minWidth: CGFloat = 210, spacing: CGFloat = DSSpace.s4, @ViewBuilder content: () -> Content) {
        self.minWidth = minWidth
        self.spacing = spacing
        self.content = content()
    }

    public var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: minWidth), spacing: spacing, alignment: .top)], spacing: spacing) {
            content
        }
    }
}

#Preview("Doc rows — light") {
    DocRowPreview()
}

#Preview("Doc rows — dark") {
    DocRowPreview()
        .preferredColorScheme(.dark)
}

private struct DocRowPreview: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 2) {
                DSDocRow(title: "Дневник поездки в Тбилиси", subtitle: "Старый город, серные бани", detail: "2 ч", icon: .emoji("🏔️"), folderTint: .orange, isSelected: true)
                DSDocRow(title: "Конспект: теория графов", subtitle: "Лекции 4–6", detail: "Вчера", folderTint: .green)
                DSDocRow(title: "План квартала", detail: "12 окт", icon: .symbol("chart.bar.doc.horizontal"))
            }
            .padding(DSSpace.s4)
            DSDocGrid {
                DSDocCard(title: "Идеи для рассказа", subtitle: "Персонажи", backdrop: .dusk)
                DSDocCard(title: "Рецепты", subtitle: "С первого раза", backdrop: .sand)
                DSDocCard(title: "Учёба", subtitle: "Конспекты", backdrop: .meadow)
            }
            .padding(DSSpace.s4)
        }
        .background(.ds(.bgCanvas))
    }
}
