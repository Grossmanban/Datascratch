import Foundation
import Testing
@testable import Datascratch

@MainActor
struct TaskIndexTests {
    let today = "2026-10-25"

    private func makeStore() -> LibraryStore {
        let store = LibraryStore(persistence: .inMemory)
        let space = store.createSpace(name: "S")
        let notebook = store.createNotebook(in: space.id, name: "N", mode: .private)
        var overdue = NoteBlock.task("Overdue")
        overdue.task?.scheduled = "2026-10-20"
        var due = NoteBlock.task("Deadline today")
        due.task?.deadline = today
        var later = NoteBlock.task("Later")
        later.task?.scheduled = "2026-11-02"
        var done = NoteBlock.task("Done")
        done.task?.state = .done
        done.task?.scheduled = today
        store.createNote(in: notebook.id, title: "Doc",
                         body: NoteBody(blocks: [overdue, due, later, done, .task("Someday"), .task("")]))
        store.addInboxTask("Inbox task")
        store.addInboxTask("Inbox today", scheduled: today)
        store.createNote(in: notebook.id, title: "Day", kind: .daily, dailyDate: today,
                         body: NoteBody(blocks: [.task("From daily note")]))
        return store
    }

    private func texts(_ bucket: TaskIndex.Bucket, _ store: LibraryStore) -> Set<String> {
        Set(TaskIndex.filter(store.taskEntries, bucket: bucket, today: today).map(\.text))
    }

    @Test func emptyTasksInDocumentsAreSkipped() {
        let store = makeStore()
        #expect(!store.taskEntries.contains { $0.text.isEmpty && $0.noteKind == .note })
    }

    @Test func inbox() {
        #expect(texts(.inbox, makeStore()) == ["Inbox task"])
    }

    @Test func today() {
        #expect(texts(.today, makeStore()) == ["Overdue", "Deadline today", "Inbox today", "From daily note"])
    }

    @Test func upcoming() {
        #expect(texts(.upcoming, makeStore()) == ["Later"])
    }

    @Test func allOpen() {
        #expect(texts(.all, makeStore()) == ["Overdue", "Deadline today", "Later", "Someday", "Inbox task",
                                             "Inbox today", "From daily note"])
    }

    @Test func calendarDay() {
        let store = makeStore()
        let future = TaskIndex.tasks(on: "2026-11-02", entries: store.taskEntries, today: today)
        #expect(future.map(\.text) == ["Later"])
    }

    @Test func completingSetsTimestamp() throws {
        let store = makeStore()
        let entry = try #require(store.taskEntries.first { $0.text == "Someday" })
        store.updateTask(noteId: entry.noteId, blockId: entry.blockId) { $0.state = .done }
        let updated = try #require(store.taskEntries.first { $0.blockId == entry.blockId })
        #expect(updated.attributes.completedAt != nil)
        store.updateTask(noteId: entry.noteId, blockId: entry.blockId) { $0.state = .open }
        #expect(store.taskEntries.first { $0.blockId == entry.blockId }?.attributes.completedAt == nil)
    }
}
