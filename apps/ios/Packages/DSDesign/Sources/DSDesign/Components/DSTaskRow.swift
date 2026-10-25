import SwiftUI

/// A tag shown on a task or document (`#name` in a tint colour).
public struct DSTag: Hashable, Sendable, Identifiable {
    public let name: String
    public let tint: DSTintToken

    public var id: String { name }

    public init(_ name: String, tint: DSTintToken = .gray) {
        self.name = name
        self.tint = tint
    }
}

/// A whole task row (Things / Craft): round checkbox, title, optional note,
/// date chips, tags and the source document. Attach `.contextMenu` at the call site.
public struct DSTaskRow: View {
    @Binding private var state: DSTaskState
    private let title: String
    private let note: String?
    private let scheduled: Date?
    private let deadline: Date?
    private let tags: [DSTag]
    private let source: String?
    private let now: Date
    @Environment(\.locale) private var locale

    public init(
        state: Binding<DSTaskState>,
        title: String,
        note: String? = nil,
        scheduled: Date? = nil,
        deadline: Date? = nil,
        tags: [DSTag] = [],
        source: String? = nil,
        now: Date = .now
    ) {
        _state = state
        self.title = title
        self.note = note
        self.scheduled = scheduled
        self.deadline = deadline
        self.tags = tags
        self.source = source
        self.now = now
    }

    /// Done and cancelled tasks are drawn muted and struck through.
    nonisolated public static func isMuted(_ state: DSTaskState) -> Bool {
        state != .open
    }

    private var muted: Bool { Self.isMuted(state) }

    private var sourceCaption: String? {
        guard let source else { return nil }
        return DSLanguage(locale: locale) == .ru ? "из «\(source)»" : "in “\(source)”"
    }

    private var hasMeta: Bool {
        scheduled != nil || deadline != nil || !tags.isEmpty || sourceCaption != nil
    }

    public var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: DSSpace.s3) {
            DSTaskCheckbox(state: $state, label: title)
                .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 6 }
            VStack(alignment: .leading, spacing: DSSpace.s1) {
                Text(title)
                    .dsFont(.body)
                    .foregroundStyle(muted ? Color.dsTertiary : Color.dsPrimary)
                    .strikethrough(muted, color: .dsTertiary)
                    .fixedSize(horizontal: false, vertical: true)
                if let note, !note.isEmpty {
                    Text(note)
                        .dsFont(.footnote)
                        .foregroundStyle(Color.dsSecondary)
                        .lineLimit(2)
                }
                if hasMeta {
                    meta
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .dsAnimation(.smooth, value: state)
        }
        .padding(.vertical, DSSpace.s2)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private var meta: some View {
        HStack(spacing: DSSpace.s2) {
            if let scheduled {
                DSDateChip(date: scheduled, now: now, isCompleted: muted)
            }
            if let deadline {
                DSDateChip(date: deadline, now: now, isDeadline: true, isCompleted: muted)
            }
            ForEach(tags) { tag in
                DSTagChip(tag.name, tint: tag.tint)
            }
            if let sourceCaption {
                Text(sourceCaption)
                    .dsFont(.caption)
                    .foregroundStyle(Color.dsTertiary)
                    .lineLimit(1)
            }
        }
    }
}

#Preview("Task row — light") {
    TaskRowPreview()
}

#Preview("Task row — dark") {
    TaskRowPreview()
        .preferredColorScheme(.dark)
}

private struct TaskRowPreview: View {
    @State private var states: [DSTaskState] = [.open, .open, .done, .cancelled]

    var body: some View {
        let day: (Int) -> Date = { Calendar.current.date(byAdding: .day, value: $0, to: .now) ?? .now }
        VStack(alignment: .leading, spacing: 0) {
            DSTaskRow(state: $states[0], title: "Отправить черновик договора", scheduled: day(-2), source: "Работа")
            Divider()
            DSTaskRow(
                state: $states[1],
                title: "Сдать курсовую",
                note: "Глава 3 и список литературы",
                scheduled: day(0),
                deadline: day(1),
                tags: [DSTag("учёба", tint: .green)]
            )
            Divider()
            DSTaskRow(state: $states[2], title: "Позвонить в типографию", scheduled: day(0))
            Divider()
            DSTaskRow(state: $states[3], title: "Старая идея", tags: [DSTag("идеи", tint: .purple)])
        }
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
        .environment(\.locale, Locale(identifier: "ru_RU"))
    }
}
