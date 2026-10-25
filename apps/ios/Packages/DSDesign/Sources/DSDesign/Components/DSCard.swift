import SwiftUI

/// Paper card: surface colour, hairline border, soft shadow.
public struct DSCard<Content: View>: View {
    private let padding: CGFloat
    private let cornerRadius: CGFloat
    private let content: Content

    public init(padding: CGFloat = DSSpace.s4, cornerRadius: CGFloat = DSRadius.lg, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s1) {
            content
        }
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .dsCardSurface(cornerRadius: cornerRadius)
    }
}

extension View {
    /// Surface fill, hairline separator border and card shadow.
    public func dsCardSurface(cornerRadius: CGFloat = DSRadius.lg) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        return background(shape.fill(Color.dsSurface))
            .clipShape(shape)
            .overlay(shape.strokeBorder(Color.dsSeparator, lineWidth: 0.5))
            .dsShadow(.card)
    }
}

/// Document card (Craft-style): cover image or backdrop, emoji icon, serif title, subtitle.
public struct DSDocCard: View {
    private let title: String
    private let subtitle: String?
    private let detail: String?
    private let icon: String?
    private let cover: Image?
    private let backdrop: DSBackdropToken
    private let coverHeight: CGFloat

    public init(
        title: String,
        subtitle: String? = nil,
        detail: String? = nil,
        icon: String? = nil,
        cover: Image? = nil,
        backdrop: DSBackdropToken = .sand,
        coverHeight: CGFloat = 96
    ) {
        self.title = title
        self.subtitle = subtitle
        self.detail = detail
        self.icon = icon
        self.cover = cover
        self.backdrop = backdrop
        self.coverHeight = coverHeight
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Color.clear
                .frame(height: coverHeight)
                .overlay {
                    if let cover {
                        cover
                            .resizable()
                            .scaledToFill()
                    } else {
                        DSBackdrop(backdrop)
                    }
                }
                .clipped()
                .overlay(alignment: .bottomLeading) {
                    if let icon {
                        Text(icon)
                            .font(.system(size: 26))
                            .frame(width: 44, height: 44)
                            .background(Circle().fill(Color.dsSurface))
                            .overlay(Circle().strokeBorder(Color.dsSeparator, lineWidth: 0.5))
                            .offset(x: DSSpace.s4, y: 22)
                            .accessibilityHidden(true)
                    }
                }
                .zIndex(1)
            VStack(alignment: .leading, spacing: DSSpace.s1) {
                Text(title)
                    .dsFont(.h3)
                    .foregroundStyle(.ds(.textPrimary))
                    .lineLimit(2)
                if let subtitle {
                    Text(subtitle)
                        .dsFont(.footnote)
                        .foregroundStyle(.ds(.textSecondary))
                        .lineLimit(2)
                }
                if let detail {
                    Text(detail)
                        .dsFont(.caption)
                        .foregroundStyle(.ds(.textTertiary))
                        .padding(.top, 2)
                }
            }
            .padding(.horizontal, DSSpace.s4)
            .padding(.top, icon == nil ? DSSpace.s3 : DSSpace.s8)
            .padding(.bottom, DSSpace.s4)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .dsCardSurface()
        .contentShape(.hoverEffect, RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous))
        .hoverEffect(.lift)
        .accessibilityElement(children: .combine)
    }
}

#Preview("Cards — light") {
    CardsPreview()
}

#Preview("Cards — dark") {
    CardsPreview()
        .preferredColorScheme(.dark)
}

private struct CardsPreview: View {
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 200), spacing: DSSpace.s4)], spacing: DSSpace.s4) {
                DSDocCard(title: "Заметки о пере", subtitle: "Штрихи едут вместе с текстом", detail: "Сегодня", icon: "✍️", backdrop: .dusk)
                DSDocCard(title: "Путешествие в Тбилиси", subtitle: "План, бюджет, места", detail: "Вчера", backdrop: .ember)
                DSDocCard(title: "Учёба", subtitle: "Конспекты лекций", icon: "📚", backdrop: .meadow)
                DSDocCard(title: "Идеи", backdrop: .mist)
            }
            .padding(DSSpace.s4)
            DSCard {
                Text("Простая карточка").dsFont(.h3)
                Text("Поверхность, тонкая граница и мягкая тень").dsFont(.footnote).foregroundStyle(.ds(.textSecondary))
            }
            .padding(DSSpace.s4)
        }
        .background(.ds(.bgCanvas))
    }
}
