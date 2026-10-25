import Foundation
import Testing
@testable import DSCore

@Suite struct StorageTests {
    @Test func updatesOutboxAndAck() throws {
        let store = try LocalStore.inMemory()
        try store.ensureDocument(docId: "n1", kind: .note, notebookId: "nb")
        let note = NoteDocument(noteId: "n1")
        let sub = note.crdt.observeUpdates { update, origin in
            if origin.isOutgoing { try? store.appendLocalUpdate(docId: "n1", update: update, origin: origin) }
        }
        try note.initialize(title: "Hello")
        try note.insertText("world", at: 0, inBlock: [1])
        sub.cancel()

        let pending = try store.pendingOutbox()
        #expect(pending.count == 2)
        #expect(pending.allSatisfy { $0.kind == .push })

        try store.acknowledge(clientMsgId: pending[0].clientMsgId, seq: 1)
        #expect(try store.outboxCount() == 1)

        // Reload from storage.
        let copy = NoteDocument(noteId: "n1")
        try copy.crdt.applyUpdates(try store.updates(docId: "n1"), origin: .storage)
        #expect(try copy.title() == "Hello")
        #expect(try copy.block(at: [1])?.text == "world")

        // Compaction keeps the unacknowledged update separate and the content intact.
        try store.compact(docId: "n1")
        #expect(try store.updates(docId: "n1").count == 2)
        let compacted = NoteDocument(noteId: "n1")
        try compacted.crdt.applyUpdates(try store.updates(docId: "n1"), origin: .storage)
        #expect(try compacted.block(at: [1])?.text == "world")
    }

    @Test func remoteUpdatesSnapshotsAndThresholds() throws {
        let store = try LocalStore.inMemory()
        try store.ensureDocument(docId: "d", kind: .notebook, notebookId: "d")
        try store.appendRemoteUpdates(docId: "d", items: [(1, Data([1])), (2, Data([2]))])
        try store.appendRemoteUpdates(docId: "d", items: [(2, Data([2])), (3, Data([3]))])
        #expect(try store.document("d")?.lastSeq == 3)
        #expect(try store.updates(docId: "d") == [Data([1]), Data([2]), Data([3])])
        #expect(try !store.needsSnapshot(docId: "d"))

        // An older snapshot is ignored; a newer one replaces what it covers.
        #expect(try !store.applyRemoteSnapshot(docId: "d", seq: 2, state: Data([8])))
        #expect(try store.applyRemoteSnapshot(docId: "d", seq: 4, state: Data([9])))
        #expect(try store.updates(docId: "d") == [Data([9])])
        #expect(try store.document("d")?.snapshotSeq == 4)

        let many = (5...505).map { (Int64($0), Data([0])) }
        try store.appendRemoteUpdates(docId: "d", items: many)
        #expect(try store.needsSnapshot(docId: "d"))
        let snap = try store.enqueueSnapshot(docId: "d", state: Data([7]), baseSeq: 505)
        try store.acknowledge(clientMsgId: snap.clientMsgId, seq: 506)
        #expect(try !store.needsSnapshot(docId: "d"))
        #expect(try store.document("d")?.snapshotSeq == 505)
    }

    @Test func indexesSearchTasksLinksTags() throws {
        let store = try LocalStore.inMemory()
        let d1 = NoteDerivedData(noteId: "n1", blocks: [
            .title("Поездка в Казань"),
            .paragraph([.text("Купить билеты на поезд ", marks: []), .tag("travel/2026"), .noteLink(noteId: "n2", label: "Бюджет")]),
            .container(BlockType.taskList, [
                .taskItem("Забронировать отель", scheduled: "2026-10-26", taskId: "t1"),
                .taskItem("Собрать вещи", taskId: "t2"),
            ]),
        ])
        let d2 = NoteDerivedData(noteId: "n2", blocks: [.title("Budget"), .paragraph([.tag("travel")])])
        try store.index(d1, notebookId: "nb1")
        try store.index(d2, notebookId: "nb2")

        #expect(try store.search("казан").map(\.noteId) == ["n1"])
        #expect(try store.search("поез билет").first?.snippet.contains("[") == true)
        #expect(try store.search("budget", notebookId: "nb1").isEmpty)
        #expect(try store.search("   ").isEmpty)

        #expect(try store.tasks().map(\.taskId) == ["t1", "t2"])
        #expect(try store.tasks(TaskQuery(dueOnOrBefore: "2026-10-26")).map(\.taskId) == ["t1"])
        #expect(try store.tasks(TaskQuery(unscheduledOnly: true)).map(\.taskId) == ["t2"])
        #expect(try store.tasks(TaskQuery(states: [.done])).isEmpty)

        #expect(try store.backlinks(to: "n2").map(\.sourceNoteId) == ["n1"])
        #expect(try store.notes(withTag: "travel") == ["n1", "n2"])
        #expect(try store.tags().map(\.tag) == ["travel", "travel/2026"])

        // Re-indexing replaces old entries.
        try store.index(NoteDerivedData(noteId: "n1", blocks: [.title("Поездка")]), notebookId: "nb1")
        #expect(try store.tasks().isEmpty)
        #expect(try store.search("билеты").isEmpty)
        try store.unindex(noteId: "n2")
        #expect(try store.tags().isEmpty)
    }

    @Test func attachmentsAndKV() throws {
        let store = try LocalStore.inMemory()
        var a = AttachmentRecord(attachmentId: "a1", noteId: "n1", mime: "image/png", size: 100, chunkCount: 2, state: .pendingUpload, localPath: "a1")
        try store.saveAttachment(a)
        try store.markChunkUploaded(attachmentId: "a1", index: 1)
        a = try #require(try store.attachment("a1"))
        #expect(a.missingChunks == [0])
        try store.markChunkUploaded(attachmentId: "a1", index: 0)
        #expect(try store.attachment("a1")?.state == .synced)
        #expect(try store.attachments(state: .pendingUpload).isEmpty)

        let id = try store.deviceId()
        #expect(try store.deviceId() == id)
        try store.setString("x", for: "k")
        #expect(try store.string("k") == "x")
        try store.setString(nil, for: "k")
        #expect(try store.string("k") == nil)
    }

    @Test func onDiskDatabase() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("db.sqlite")
        do {
            let store = try LocalStore(url: url)
            try store.setString("v", for: "k")
        }
        #expect(try LocalStore(url: url).string("k") == "v")
    }
}
