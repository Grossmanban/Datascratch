import Foundation

/// A task found in some document (contracts/document-model.md §5, derived data).
nonisolated struct TaskEntry: Identifiable, Hashable, Sendable {
    var id: String { blockId }
    let noteId: String
    let noteTitle: String
    let noteKind: NoteKind
    /// `dailyDate` of the containing daily note.
    let noteDay: String?
    let blockId: String
    let text: String
    let attributes: TaskAttributes

    var isOpen: Bool { attributes.state == .open }

    /// Explicit date, or the day of the daily note the task was written in.
    var scheduledDay: String? { attributes.scheduled ?? noteDay }
}

/// Builds and filters the local task index for the Tasks screen (spec/12 §12.1).
nonisolated enum TaskIndex {
    nonisolated enum Bucket: String, CaseIterable, Identifiable, Sendable {
        case inbox, today, upcoming, all
        var id: String { rawValue }
    }

    static func build(notes: [NoteMeta], bodies: [String: NoteBody]) -> [TaskEntry] {
        notes.filter { !$0.isTrashed }.flatMap { note in
            (bodies[note.id]?.blocks ?? []).compactMap { block -> TaskEntry? in
                guard block.kind == .task, let task = block.task else { return nil }
                if block.text.isEmpty, note.kind != .inbox { return nil }
                return TaskEntry(noteId: note.id, noteTitle: note.title, noteKind: note.kind,
                                 noteDay: note.dailyDate,
                                 blockId: block.id, text: block.text, attributes: task)
            }
        }
    }

    static func filter(_ entries: [TaskEntry], bucket: Bucket, today: String) -> [TaskEntry] {
        switch bucket {
        case .inbox:
            return entries.filter { $0.noteKind == .inbox && $0.isOpen && $0.attributes.scheduled == nil }
        case .today:
            return entries.filter { isDueToday($0, today: today) }
                .sorted { ($0.scheduledDay ?? today) < ($1.scheduledDay ?? today) }
        case .upcoming:
            return entries.filter { entry in
                guard entry.isOpen else { return false }
                if let scheduled = entry.scheduledDay { return scheduled > today }
                if let deadline = entry.attributes.deadline { return deadline > today }
                return false
            }
            .sorted { sortKey($0) < sortKey($1) }
        case .all:
            return entries.filter(\.isOpen)
        }
    }

    /// Tasks for a calendar day: scheduled (or due) that day, plus overdue ones on today.
    static func tasks(on day: String, entries: [TaskEntry], today: String) -> [TaskEntry] {
        if day == today { return entries.filter { isDueToday($0, today: today) } }
        return entries.filter { entry in
            entry.scheduledDay == day || entry.attributes.deadline == day

        }
    }

    static func isDueToday(_ entry: TaskEntry, today: String) -> Bool {
        guard entry.isOpen else { return false }
        if let scheduled = entry.scheduledDay, scheduled <= today { return true }
        if let deadline = entry.attributes.deadline, deadline <= today { return true }
        return false
    }

    static func isOverdue(_ entry: TaskEntry, today: String) -> Bool {
        guard entry.isOpen, let deadline = entry.attributes.deadline else { return false }
        return deadline < today
    }

    private static func sortKey(_ entry: TaskEntry) -> String {
        entry.scheduledDay ?? entry.attributes.deadline ?? "9999-99-99"
    }
}

extension LibraryStore {
    /// Task index over all documents of all spaces (tasks are global, like in Craft).
    var taskEntries: [TaskEntry] {
        TaskIndex.build(notes: data.notes, bodies: data.bodies)
    }
}
