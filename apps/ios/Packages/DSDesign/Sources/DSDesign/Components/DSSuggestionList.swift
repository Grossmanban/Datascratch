import SwiftUI

/// One entry of the "/" block menu or the [[ ]] link menu.
public struct DSSuggestionItem: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let subtitle: String?
    public let systemImage: String?
    /// Markdown or shortcut hint shown on the right ("#", "[]", "⌘⌥1").
    public let hint: String?

    public init(id: String, title: String, subtitle: String? = nil, systemImage: String? = nil, hint: String? = nil) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.systemImage = systemImage
        self.hint = hint
    }
}

public struct DSSuggestionGroup: Identifiable, Hashable, Sendable {
    public let id: String
    public let heading: String?
    public let items: [DSSuggestionItem]

    public init(id: String? = nil, heading: String?, items: [DSSuggestionItem]) {
        self.id = id ?? heading ?? UUID().uuidString
        self.heading = heading
        self.items = items
    }
}

/// Glass suggestion list (SwiftUI twin of the web `SuggestionMenu`). Presentational:
/// the editor owns the keyboard and moves `selectedID`; the list scrolls to it.
public struct DSSuggestionList: View {
    private let groups: [DSSuggestionGroup]
    @Binding private var selectedID: String?
    private let onPick: (DSSuggestionItem) -> Void
    private let emptyText: String?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.locale) private var locale

    public init(
        groups: [DSSuggestionGroup],
        selectedID: Binding<String?>,
        emptyText: String? = nil,
        onPick: @escaping (DSSuggestionItem) -> Void
    ) {
        self.groups = groups
        _selectedID = selectedID
        self.emptyText = emptyText
        self.onPick = onPick
    }

    private var isEmpty: Bool { groups.allSatisfy { $0.items.isEmpty } }

    public var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 1) {
                    if isEmpty {
                        Text(emptyText ?? (DSLanguage(locale: locale) == .ru ? "Ничего не найдено" : "No results"))
                            .dsFont(.footnote)
                            .foregroundStyle(Color.dsTertiary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, DSSpace.s4)
                    }
                    ForEach(groups) { group in
                        if !group.items.isEmpty {
                            if let heading = group.heading {
                                Text(heading)
                                    .dsFont(.caption)
                                    .foregroundStyle(Color.dsTertiary)
                                    .padding(.horizontal, DSSpace.s2)
                                    .padding(.top, DSSpace.s2)
                                    .padding(.bottom, 2)
                                    .accessibilityAddTraits(.isHeader)
                            }
                            ForEach(group.items) { item in
                                row(item).id(item.id)
                            }
                        }
                    }
                }
                .padding(DSSpace.s1)
            }
            .scrollBounceBehavior(.basedOnSize)
            .onChange(of: selectedID) { _, id in
                guard let id else { return }
                withAnimation(DSMotionToken.snappy.animation(reduceMotion: reduceMotion)) {
                    proxy.scrollTo(id)
                }
            }
        }
        .frame(width: 300)
        .frame(maxHeight: 360)
        .fixedSize(horizontal: false, vertical: true)
        .dsGlass(cornerRadius: DSRadius.lg)
    }

    private func row(_ item: DSSuggestionItem) -> some View {
        let selected = item.id == selectedID
        return Button {
            onPick(item)
        } label: {
            HStack(spacing: DSSpace.s3) {
                if let systemImage = item.systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.dsSecondary)
                        .frame(width: 32, height: 32)
                        .background(
                            RoundedRectangle(cornerRadius: DSRadius.sm + 1, style: .continuous)
                                .fill(Color.dsSurface)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: DSRadius.sm + 1, style: .continuous)
                                .strokeBorder(Color.dsSeparator, lineWidth: 0.5)
                        )
                        .accessibilityHidden(true)
                }
                VStack(alignment: .leading, spacing: 0) {
                    Text(item.title)
                        .dsFont(.callout)
                        .foregroundStyle(Color.dsPrimary)
                        .lineLimit(1)
                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .dsFont(.caption)
                            .foregroundStyle(Color.dsTertiary)
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: DSSpace.s2)
                if let hint = item.hint {
                    Text(hint)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Color.dsTertiary)
                }
            }
            .padding(.horizontal, DSSpace.s2)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: DSRadius.sm + 1, style: .continuous)
                    .fill(selected ? Color.dsPrimary.opacity(0.06) : Color.clear)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

#Preview("Suggestion list — light") {
    SuggestionPreview()
}

#Preview("Suggestion list — dark") {
    SuggestionPreview().preferredColorScheme(.dark)
}

private struct SuggestionPreview: View {
    @State private var selected: String? = "task"

    var body: some View {
        ZStack {
            DSBackdrop(.mist).ignoresSafeArea()
            DSSuggestionList(groups: DSSuggestionGroup.blockInsertSample, selectedID: $selected) { selected = $0.id }
        }
    }
}

extension DSSuggestionGroup {
    /// Sample block-insert menu (previews, showcase).
    static let blockInsertSample: [DSSuggestionGroup] = [
        DSSuggestionGroup(heading: "Текст", items: [
            DSSuggestionItem(id: "h1", title: "Заголовок 1", systemImage: "textformat.size.larger", hint: "#"),
            DSSuggestionItem(id: "h2", title: "Заголовок 2", systemImage: "textformat.size", hint: "##"),
            DSSuggestionItem(id: "task", title: "Задача", subtitle: "Чек-бокс с датой", systemImage: "checkmark.square", hint: "[]"),
            DSSuggestionItem(id: "list", title: "Список", systemImage: "list.bullet", hint: "-"),
            DSSuggestionItem(id: "quote", title: "Цитата", systemImage: "text.quote", hint: ">"),
            DSSuggestionItem(id: "callout", title: "Выноска", systemImage: "lightbulb"),
            DSSuggestionItem(id: "code", title: "Код", systemImage: "chevron.left.forwardslash.chevron.right", hint: "```"),
        ]),
        DSSuggestionGroup(heading: "Рукопись", items: [
            DSSuggestionItem(id: "drawing", title: "Рисунок", subtitle: "Блок для пера", systemImage: "pencil.and.scribble"),
        ]),
    ]
}
