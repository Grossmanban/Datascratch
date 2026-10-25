import SwiftUI

struct TaskCheckbox: View {
    let state: TaskState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .strokeBorder(state == .open ? Theme.Palette.textTertiary : Theme.Palette.accent, lineWidth: 1.5)
                    .background(Circle().fill(state == .done ? Theme.Palette.accent : .clear))
                switch state {
                case .done:
                    Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundStyle(.white)
                case .cancelled:
                    Image(systemName: "xmark").font(.system(size: 9, weight: .bold)).foregroundStyle(Theme.Palette.accent)
                case .open:
                    EmptyView()
                }
            }
            .frame(width: 20, height: 20)
            .contentShape(Rectangle().inset(by: -8))
            .animation(Theme.Motion.snappy, value: state)
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.success, trigger: state) { _, new in new == .done }
        .accessibilityLabel(state == .done ? Text("Completed") : state == .cancelled ? Text("Cancelled") : Text("Not completed"))
        .accessibilityAddTraits(.isToggle)
        .accessibilityIdentifier("task.checkbox")
    }
}

/// "Today", "Tomorrow", a date, and a flag for the deadline.
struct TaskDateChips: View {
    let task: TaskAttributes
    var scheduledOverride: String?

    var body: some View {
        let today = DayKey.from(Date())
        HStack(spacing: Theme.Space.s1) {
            if let scheduled = scheduledOverride ?? task.scheduled {
                chip(Self.label(for: scheduled, today: today), systemImage: "calendar",
                     color: scheduled < today ? Theme.Palette.warning : Theme.Palette.accent)
            }
            if let deadline = task.deadline {
                chip(Self.label(for: deadline, today: today), systemImage: "flag",
                     color: deadline < today ? Theme.Palette.danger
                         : deadline == today ? Theme.Palette.warning : Theme.Palette.textSecondary)
            }
        }
        .opacity(task.state == .open ? 1 : 0.5)
    }

    private func chip(_ text: String, systemImage: String, color: Color) -> some View {
        Label(text, systemImage: systemImage)
            .font(Theme.Typography.caption.weight(.medium))
            .labelStyle(.titleAndIcon)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12), in: Capsule())
            .fixedSize()
    }

    static func label(for day: String, today: String) -> String {
        if day == today { return String(localized: "Today") }
        if day == DayKey.adding(days: 1, to: today) { return String(localized: "Tomorrow") }
        if day == DayKey.adding(days: -1, to: today) { return String(localized: "Yesterday") }
        guard let date = DayKey.date(day) else { return day }
        return date.formatted(.dateTime.day().month(.abbreviated))
    }
}

/// Context menu items of a task (spec/12 §12.1).
struct TaskMenuItems: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let noteId: String
    let blockId: String
    let task: TaskAttributes
    var showOpenDocument = true

    var body: some View {
        let library = app.library
        let today = DayKey.from(Date())
        Menu("Schedule", systemImage: "calendar") {
            Button("Today", systemImage: "star") { set(\.scheduled, today) }
            Button("Tomorrow", systemImage: "sunrise") { set(\.scheduled, DayKey.adding(days: 1, to: today)) }
            Button("Next Week", systemImage: "calendar.badge.clock") { set(\.scheduled, DayKey.nextWeek(from: today)) }
            Button("Pick a Date…", systemImage: "calendar.badge.plus") {
                scene.sheet = .taskDate(noteId: noteId, blockId: blockId, field: .scheduled)
            }
            if task.scheduled != nil {
                Divider()
                Button("Remove Date", systemImage: "xmark", role: .destructive) { set(\.scheduled, nil) }
            }
        }
        Menu("Deadline", systemImage: "flag") {
            Button("Today") { set(\.deadline, today) }
            Button("Tomorrow") { set(\.deadline, DayKey.adding(days: 1, to: today)) }
            Button("Pick a Date…") { scene.sheet = .taskDate(noteId: noteId, blockId: blockId, field: .deadline) }
            if task.deadline != nil {
                Divider()
                Button("Remove Deadline", role: .destructive) { set(\.deadline, nil) }
            }
        }
        if task.state == .open {
            Button("Complete", systemImage: "checkmark.circle") {
                library.updateTask(noteId: noteId, blockId: blockId) { $0.state = .done }
            }
            Button("Cancel Task", systemImage: "xmark.circle") {
                library.updateTask(noteId: noteId, blockId: blockId) { $0.state = .cancelled }
            }
        } else {
            Button("Reopen", systemImage: "circle") {
                library.updateTask(noteId: noteId, blockId: blockId) { $0.state = .open }
            }
        }
        if showOpenDocument {
            Divider()
            Button("Open Document", systemImage: "doc.text") { scene.open(noteId) }
            Menu("Move To", systemImage: "arrow.right.doc.on.clipboard") {
                if let inbox = library.ensureInboxIfPossible(), inbox.id != noteId {
                    Button("Inbox", systemImage: "tray") {
                        library.moveTask(from: noteId, blockId: blockId, to: inbox.id)
                    }
                }
                if let daily = library.dailyNote(for: today), daily.id != noteId {
                    Button("Today's Note", systemImage: "sun.max") {
                        library.moveTask(from: noteId, blockId: blockId, to: daily.id)
                    }
                }
                ForEach(library.documents.prefix(12).filter { $0.id != noteId && $0.kind == .note }) { note in
                    Button(note.title.isEmpty ? String(localized: "Untitled") : note.title) {
                        library.moveTask(from: noteId, blockId: blockId, to: note.id)
                    }
                }
            }
        }
        Divider()
        Button("Delete Task", systemImage: "trash", role: .destructive) {
            library.deleteBlock(noteId: noteId, blockId: blockId)
        }
    }

    private func set(_ field: WritableKeyPath<TaskAttributes, String?>, _ value: String?) {
        app.library.updateTask(noteId: noteId, blockId: blockId) { $0[keyPath: field] = value }
        if app.settings.hapticsEnabled { Haptics.selection() }
    }
}

extension LibraryStore {
    /// The inbox if it exists already (menus must not create notes while rendering).
    func ensureInboxIfPossible() -> NoteMeta? {
        data.notes.first { $0.kind == .inbox && !$0.isTrashed }
    }
}

/// Date picker for "Pick a Date…".
struct TaskDateSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let noteId: String
    let blockId: String
    let field: TaskDateField
    @State private var date = Date()

    var body: some View {
        NavigationStack {
            DatePicker(field == .scheduled ? LocalizedStringKey("Scheduled") : "Deadline",
                       selection: $date, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .padding()
                .navigationTitle(field == .scheduled ? LocalizedStringKey("Schedule") : "Deadline")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            let day = DayKey.from(date)
                            app.library.updateTask(noteId: noteId, blockId: blockId) {
                                if field == .scheduled { $0.scheduled = day } else { $0.deadline = day }
                            }
                            dismiss()
                        }
                    }
                }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            let attributes = app.library.body(noteId).blocks.first { $0.id == blockId }?.task
            let current = field == .scheduled ? attributes?.scheduled : attributes?.deadline
            if let current, let parsed = DayKey.date(current) { date = parsed }
        }
    }
}
