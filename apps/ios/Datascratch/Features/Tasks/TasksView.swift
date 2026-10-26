import SwiftUI
#if canImport(DSDesign)
import DSDesign
#endif

/// Inbox / Today / Upcoming / All — tasks collected from every document (spec/12 §12.1).
/// Craft-style: a floating segmented control, groups as cards without separators,
/// one compact date per row.
struct TasksView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var newTaskText = ""
    @FocusState private var newTaskFocused: Bool

    var body: some View {
        let today = DayKey.from(Date())
        let entries = app.library.taskEntries
        let visible = TaskIndex.filter(entries, bucket: scene.taskBucket, today: today)
        List {
            if scene.taskBucket == .inbox || scene.taskBucket == .today {
                Section {
                    HStack(spacing: Theme.Space.s3) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Theme.Palette.accent)
                        TextField(scene.taskBucket == .today ? LocalizedStringKey("New task for today") : "New task",
                                  text: $newTaskText)
                            .focused($newTaskFocused)
                            .submitLabel(.done)
                            .onSubmit(addTask)
                            .accessibilityIdentifier("tasks.newTask")
                    }
                    .padding(.vertical, Theme.Space.s1)
                    .cardRow()
                }
            }

            if visible.isEmpty {
                Section {
                    emptyState
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
            } else {
                ForEach(groups(visible, today: today), id: \.title) { group in
                    Section {
                        ForEach(group.entries) { entry in
                            TaskRow(entry: entry, today: today, date: dateLabel(for: entry, today: today),
                                    showsSource: scene.taskBucket != .all)
                                .cardRow()
                        }
                    } header: {
                        Text(group.title)
                            .font(Theme.Typography.caption.weight(.semibold))
                            .foregroundStyle(group.isWarning ? Theme.Palette.warning : Theme.Palette.textSecondary)
                            .textCase(nil)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .listSectionSpacing(Theme.Space.s5)
        .contentMargins(.horizontal, Theme.Space.s1, for: .scrollContent)
        .scrollContentBackground(.hidden)
        .background(Theme.Palette.canvas)
        .safeAreaInset(edge: .top, spacing: 0) { bucketPicker }
        .navigationTitle("Tasks")

        .animation(Theme.Motion.smooth, value: visible.map(\.id))
    }

    /// The segmented control floats on glass above the list.
    private var bucketPicker: some View {
        @Bindable var scene = scene
        return Group {
            #if canImport(DSDesign)
            // Labels are never cut off: in a narrow column the segments give way to a menu.
            ViewThatFits(in: .horizontal) {
                DSSegmentedControl(selection: $scene.taskBucket, segments: TaskIndex.Bucket.allCases.map {
                    DSSegment(String(localized: $0.title), value: $0, systemImage: $0.symbol)
                })
                .fixedSize(horizontal: true, vertical: false)
                Menu {
                    Picker("View", selection: $scene.taskBucket) {
                        ForEach(TaskIndex.Bucket.allCases) { bucket in
                            Label { Text(bucket.title) } icon: { Image(systemName: bucket.symbol) }.tag(bucket)
                        }
                    }
                } label: {
                    HStack(spacing: Theme.Space.s2) {
                        Image(systemName: scene.taskBucket.symbol)
                        Text(scene.taskBucket.title).lineLimit(1)
                        Image(systemName: "chevron.up.chevron.down").font(.caption2.weight(.semibold))
                            .foregroundStyle(Theme.Palette.textTertiary)
                    }
                    .font(Theme.Typography.callout.weight(.semibold))
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .padding(.horizontal, Theme.Space.s3)
                    .frame(maxWidth: .infinity, minHeight: 32)
                }
            }
            #else
            Picker("View", selection: $scene.taskBucket) {
                ForEach(TaskIndex.Bucket.allCases) { bucket in
                    Text(bucket.title).tag(bucket)
                }
            }
            .pickerStyle(.segmented)
            #endif
        }
        .padding(Theme.Space.s1)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
        .frame(maxWidth: 560)
        .padding(.horizontal, Theme.Space.s5)
        .padding(.vertical, Theme.Space.s2)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("tasks.bucket")
    }

    @ViewBuilder private var emptyState: some View {
        let bucket = scene.taskBucket
        #if canImport(DSDesign)
        DSEmptyState(systemImage: bucket.emptySymbol, title: String(localized: bucket.emptyTitle),
                     message: String(localized: bucket.emptyMessage), tint: bucket.tint)
            .transition(.opacity.combined(with: .scale(scale: 0.96)))
        #else
        ContentUnavailableView(String(localized: bucket.emptyTitle), systemImage: bucket.emptySymbol,
                               description: Text(bucket.emptyMessage))
        #endif
    }

    /// One compact date: none in Today and Upcoming (the section says it), else the
    /// deadline if set, otherwise the scheduled day.
    private func dateLabel(for entry: TaskEntry, today: String) -> TaskRow.DateLabel? {
        let deadline = entry.attributes.deadline
        switch scene.taskBucket {
        case .today, .upcoming:
            guard let deadline, deadline != today else { return nil }
            return .deadline(deadline)
        case .inbox, .all:
            if let deadline { return .deadline(deadline) }
            return entry.scheduledDay.map { .scheduled($0) }
        }
    }

    private func addTask() {
        let text = newTaskText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        app.library.addInboxTask(text, scheduled: scene.taskBucket == .today ? DayKey.from(Date()) : nil)
        newTaskText = ""
        newTaskFocused = true
    }

    private struct TaskGroup {
        let title: String
        let entries: [TaskEntry]
        var isWarning = false
    }

    private func groups(_ entries: [TaskEntry], today: String) -> [TaskGroup] {
        switch scene.taskBucket {
        case .upcoming:
            var order: [String] = []
            var byDay: [String: [TaskEntry]] = [:]
            for entry in entries {
                let day = entry.scheduledDay ?? entry.attributes.deadline ?? today
                if byDay[day] == nil { order.append(day) }
                byDay[day, default: []].append(entry)
            }
            return order.map { day in
                let title = DayKey.date(day)?.formatted(.dateTime.weekday(.wide).day().month(.wide)) ?? day
                return TaskGroup(title: title, entries: byDay[day] ?? [])
            }
        case .all:
            var order: [String] = []
            var byNote: [String: [TaskEntry]] = [:]
            for entry in entries {
                if byNote[entry.noteId] == nil { order.append(entry.noteId) }
                byNote[entry.noteId, default: []].append(entry)
            }
            return order.map { id in
                let first = byNote[id]?.first
                let title = first.map { $0.noteTitle.isEmpty ? String(localized: "Untitled") : $0.noteTitle } ?? ""
                return TaskGroup(title: title, entries: byNote[id] ?? [])
            }
        case .today:
            let overdue = entries.filter { ($0.scheduledDay ?? today) < today || ($0.attributes.deadline ?? today) < today }
            let rest = entries.filter { entry in !overdue.contains(entry) }
            var result: [TaskGroup] = []
            if !overdue.isEmpty { result.append(TaskGroup(title: String(localized: "Overdue"), entries: overdue, isWarning: true)) }
            if !rest.isEmpty { result.append(TaskGroup(title: String(localized: "Today"), entries: rest)) }
            return result
        case .inbox:
            return [TaskGroup(title: String(localized: "Inbox"), entries: entries)]
        }
    }
}

private extension View {
    /// A row inside a group card: no separators, comfortable insets.
    func cardRow() -> some View {
        listRowSeparator(.hidden)
            .listRowBackground(Theme.Palette.surface)
            .listRowInsets(EdgeInsets(top: Theme.Space.s1, leading: Theme.Space.s4,
                                      bottom: Theme.Space.s1, trailing: Theme.Space.s4))
    }
}

struct TaskRow: View {
    enum DateLabel: Hashable {
        case scheduled(String)
        case deadline(String)
    }

    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let entry: TaskEntry
    let today: String
    var date: DateLabel?
    var showsSource = true

    private var title: String { entry.text.isEmpty ? String(localized: "New task") : entry.text }
    private var source: String? {
        guard showsSource, entry.noteKind != .inbox else { return nil }
        return entry.noteTitle.isEmpty ? String(localized: "Untitled") : entry.noteTitle
    }

    private func setState(_ state: TaskState) {
        withAnimation(Theme.Motion.smooth) {
            app.library.updateTask(noteId: entry.noteId, blockId: entry.blockId) { $0.state = state }
        }
    }

    var body: some View {
        content
            .contentShape(Rectangle())
            .onTapGesture(count: 2) { scene.open(entry.noteId) }
            .contextMenu {
                TaskMenuItems(noteId: entry.noteId, blockId: entry.blockId, task: entry.attributes)
            }
            .swipeActions(edge: .leading) {
                Button("Today", systemImage: "star") {
                    app.library.updateTask(noteId: entry.noteId, blockId: entry.blockId) { $0.scheduled = today }
                }
                .tint(Theme.Palette.warning)
            }
            .swipeActions(edge: .trailing) {
                Button("Tomorrow", systemImage: "sunrise") {
                    app.library.updateTask(noteId: entry.noteId, blockId: entry.blockId) {
                        $0.scheduled = DayKey.adding(days: 1, to: today)
                    }
                }
                .tint(Theme.Palette.accent)
            }
            .accessibilityIdentifier("task.row")
    }

    @ViewBuilder private var content: some View {
        #if canImport(DSDesign)
        let state = Binding<DSTaskState>(
            get: { DSTaskState(rawValue: entry.attributes.state.rawValue) ?? .open },
            set: { setState(TaskState(rawValue: $0.rawValue) ?? .open) })
        let scheduled: Date? = if case .scheduled(let day) = date { DayKey.date(day) } else { nil }
        let deadline: Date? = if case .deadline(let day) = date { DayKey.date(day) } else { nil }
        DSTaskRow(state: state, title: title, scheduled: scheduled, deadline: deadline, source: source)
        #else
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s3) {
            TaskCheckbox(state: entry.attributes.state) {
                setState(entry.attributes.state == .open ? .done : .open)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .foregroundStyle(entry.isOpen ? Theme.Palette.textPrimary : Theme.Palette.textTertiary)
                HStack(spacing: Theme.Space.s2) {
                    if let date {
                        switch date {
                        case .scheduled(let day):
                            TaskDateChips(task: TaskAttributes(taskId: entry.attributes.taskId, state: entry.attributes.state,
                                                               scheduled: day))
                        case .deadline(let day):
                            TaskDateChips(task: TaskAttributes(taskId: entry.attributes.taskId, state: entry.attributes.state,
                                                               deadline: day))
                        }
                    }
                    if let source {
                        Text(source)
                            .font(Theme.Typography.caption)
                            .foregroundStyle(Theme.Palette.textTertiary)
                            .lineLimit(1)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        #endif
    }
}

extension TaskIndex.Bucket {
    var title: LocalizedStringResource {
        switch self {
        case .inbox: "Inbox"
        case .today: "Today"
        case .upcoming: "Upcoming"
        case .all: "All"
        }
    }

    var emptySymbol: String {
        switch self {
        case .inbox: "tray"
        case .today: "sun.max"
        case .upcoming: "calendar"
        case .all: "checkmark.circle"
        }
    }

    var emptyTitle: LocalizedStringResource {
        switch self {
        case .inbox: "Inbox is clear"
        case .today: "Nothing for today"
        case .upcoming: "Nothing scheduled"
        case .all: "No open tasks"
        }
    }

    var emptyMessage: LocalizedStringResource {
        switch self {
        case .inbox: "Quick tasks that don't belong to a document land here."
        case .today: "Tasks scheduled for today and overdue ones appear here."
        case .upcoming: "Give a task a date to see it here."
        case .all: "Type [] in any document to add a task."
        }
    }

    #if canImport(DSDesign)
    var tint: DSTintToken {
        switch self {
        case .inbox: .blue
        case .today: .yellow
        case .upcoming: .purple
        case .all: .green
        }
    }
    #endif

    var symbol: String {
        switch self {
        case .inbox: "tray"
        case .today: "star"
        case .upcoming: "calendar"
        case .all: "checklist"
        }
    }
}
