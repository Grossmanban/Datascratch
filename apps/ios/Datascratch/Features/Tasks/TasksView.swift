import SwiftUI

/// Inbox / Today / Upcoming / All — tasks collected from every document (spec/12 §12.1).
struct TasksView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var newTaskText = ""
    @FocusState private var newTaskFocused: Bool

    var body: some View {
        @Bindable var scene = scene
        let today = DayKey.from(Date())
        let entries = app.library.taskEntries
        let visible = TaskIndex.filter(entries, bucket: scene.taskBucket, today: today)
        List {
            Section {
                Picker("View", selection: $scene.taskBucket) {
                    ForEach(TaskIndex.Bucket.allCases) { bucket in
                        Text(bucket.title).tag(bucket)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
                .accessibilityIdentifier("tasks.bucket")
            }

            if scene.taskBucket == .inbox || scene.taskBucket == .today {
                Section {
                    HStack(spacing: Theme.Space.s3) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(Theme.Palette.accent)
                        TextField(scene.taskBucket == .today ? LocalizedStringKey("New task for today") : "New task",
                                  text: $newTaskText)
                            .focused($newTaskFocused)
                            .submitLabel(.done)
                            .onSubmit(addTask)
                            .accessibilityIdentifier("tasks.newTask")
                    }
                }
            }

            if visible.isEmpty {
                Section {
                    ContentUnavailableView(scene.taskBucket.emptyTitle, systemImage: scene.taskBucket.symbol,
                                           description: Text(scene.taskBucket.emptyMessage))
                        .listRowBackground(Color.clear)
                }
            } else {
                ForEach(groups(visible, today: today), id: \.title) { group in
                    Section(group.title) {
                        ForEach(group.entries) { entry in
                            TaskRow(entry: entry, today: today)
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.Palette.canvas)
        .navigationTitle("Tasks")
        .animation(Theme.Motion.smooth, value: visible.map(\.id))
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
            if !overdue.isEmpty { result.append(TaskGroup(title: String(localized: "Overdue"), entries: overdue)) }
            if !rest.isEmpty { result.append(TaskGroup(title: String(localized: "Today"), entries: rest)) }
            return result
        case .inbox:
            return [TaskGroup(title: String(localized: "Inbox"), entries: entries)]
        }
    }
}

struct TaskRow: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let entry: TaskEntry
    let today: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s3) {
            TaskCheckbox(state: entry.attributes.state) {
                withAnimation(Theme.Motion.smooth) {
                    app.library.updateTask(noteId: entry.noteId, blockId: entry.blockId) {
                        $0.state = $0.state == .open ? .done : .open
                    }
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.text.isEmpty ? String(localized: "New task") : entry.text)
                    .foregroundStyle(entry.isOpen ? Theme.Palette.textPrimary : Theme.Palette.textTertiary)
                HStack(spacing: Theme.Space.s2) {
                    if entry.noteKind != .inbox {
                        Label(entry.noteTitle.isEmpty ? String(localized: "Untitled") : entry.noteTitle,
                              systemImage: entry.noteKind == .daily ? "sun.max" : "doc.text")
                            .font(Theme.Typography.caption)
                            .foregroundStyle(Theme.Palette.textTertiary)
                            .lineLimit(1)
                    }
                    TaskDateChips(task: entry.attributes,
                                  scheduledOverride: entry.attributes.scheduled == nil ? entry.noteDay : nil)
                }
            }
            Spacer(minLength: 0)
        }
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
}

extension TaskIndex.Bucket {
    var title: LocalizedStringKey {
        switch self {
        case .inbox: "Inbox"
        case .today: "Today"
        case .upcoming: "Upcoming"
        case .all: "All"
        }
    }

    var symbol: String {
        switch self {
        case .inbox: "tray"
        case .today: "star"
        case .upcoming: "calendar"
        case .all: "checklist"
        }
    }

    var emptyTitle: LocalizedStringKey {
        switch self {
        case .inbox: "Inbox is clear"
        case .today: "Nothing for today"
        case .upcoming: "Nothing scheduled"
        case .all: "No open tasks"
        }
    }

    var emptyMessage: LocalizedStringKey {
        switch self {
        case .inbox: "Quick tasks that don't belong to a document land here."
        case .today: "Tasks scheduled for today and overdue ones appear here."
        case .upcoming: "Give a task a date to see it here."
        case .all: "Type [] in any document to add a task."
        }
    }
}
