import Foundation
import Testing
@testable import DSCore

/// Sync protocol 3 (sync-protocol.md §3.1): resume from the account cursor instead of
/// subscribing the whole library on every connection.
@Suite(.serialized) struct SyncResumeTests {
    let key = DSCrypto.newKey()

    func device(_ name: String, server: FakeSyncServer, store: LocalStore? = nil, resumeTimeout: Duration = .seconds(20),
                keyFor: (@Sendable (DocumentRecord) -> Data?)? = nil) throws -> SyncEngine {
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        config.maxBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = self.key
        return SyncEngine(store: try store ?? LocalStore.inMemory(), client: client, keyFor: keyFor ?? { _ in key },
                          register: { record in await server.register(record.docId) }, resumeTimeout: resumeTimeout)
    }

    /// Notes with a line of text each, written by `writer` and known to the server.
    func notes(_ count: Int, by writer: SyncEngine) async throws -> [NoteDocument] {
        var made: [NoteDocument] = []
        for i in 0..<count {
            let note = NoteDocument(noteId: EntityID.make())
            try await writer.open(note.crdt, notebookId: "nb")
            try note.initialize(title: "n\(i)")
            made.append(note)
        }
        #expect(try await eventually(timeout: .seconds(10)) { (try? writer.store.outboxCount()) == 0 })
        return made
    }

    /// The device knows these notes (from its notebook index) and syncs them.
    func knows(_ engine: SyncEngine, _ notes: [NoteDocument]) throws {
        for n in notes {
            try engine.store.ensureDocument(docId: n.noteId, kind: .note, notebookId: "nb")
            // From the notebook index: it exists on the server.
            try engine.store.setRegistered(n.noteId)
        }
    }

    /// Starts `engine` and waits until its cursor is stored (everything caught up).
    func syncUntilCursorStored(_ engine: SyncEngine, previous: ResumeState? = nil) async throws -> ResumeState {
        await engine.start()
        #expect(try await eventually(timeout: .seconds(10)) {
            let s = try? engine.store.resumeState()
            return s != nil && s != previous
        })
        return try #require(try engine.store.resumeState())
    }

    func text(_ docId: String, in store: LocalStore) throws -> String? {
        let note = NoteDocument(noteId: docId)
        try note.crdt.applyUpdates(try store.updates(docId: docId), origin: .storage)
        return try? note.block(at: [1])?.text
    }

    /// Only what changed while the device was away is subscribed; the rest is live at once.
    @Test func resumeSubscribesOnlyWhatChanged() async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(40, by: writer)
        let phone = try device("phone", server: server)
        try knows(phone, all)
        let first = try await syncUntilCursorStored(phone)
        await phone.stop()

        try all[3].insertText("с Mac", at: 0, inBlock: [1])
        try all[17].insertText("от агента", at: 0, inBlock: [1])
        #expect(try await eventually { (try? writer.store.outboxCount()) == 0 })
        let mark = await server.subscribedOrder.count
        let second = try await syncUntilCursorStored(phone, previous: first)
        #expect(Set(await server.subscribedSince(mark)) == [all[3].noteId, all[17].noteId])
        #expect(second.epoch == first.epoch)
        #expect(try text(all[3].noteId, in: phone.store) == "с Mac")
        #expect(try text(all[17].noteId, in: phone.store) == "от агента")
        // Live afterwards through the account subscription, without a subscribe of its own.
        try all[25].insertText("живьём", at: 0, inBlock: [1])
        #expect(try await eventually { (try? text(all[25].noteId, in: phone.store)) == "живьём" })
        await phone.stop()
        await writer.stop()
    }

    /// A document without its key during a resume is not covered by the stored cursor: once the
    /// key is there, the next resume subscribes it even though nothing changed after the cursor.
    @Test func aDocumentPausedWithoutAKeyIsNotCovered() async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(3, by: writer)
        let held = all[1]
        try held.insertText("тайное", at: 0, inBlock: [1])
        #expect(try await eventually { (try? writer.store.outboxCount()) == 0 })

        let hasKey = Locked(false)
        let key = self.key
        let store = try LocalStore.inMemory()
        let phone = try device("phone", server: server, store: store, keyFor: { $0.docId == held.noteId && !hasKey.withLock { $0 } ? nil : key })
        try knows(phone, all)
        _ = try await syncUntilCursorStored(phone)
        #expect(try store.document(held.noteId)?.covered == nil)
        #expect(try store.document(all[0].noteId)?.covered != nil)
        #expect(try text(held.noteId, in: store) == nil)
        await phone.stop()

        // The key arrives; nothing changed on the server since the cursor.
        hasKey.withLock { $0 = true }
        let later = try device("phone", server: server, store: store)
        let mark = await server.subscribedOrder.count
        await later.start()
        #expect(try await eventually { (try? text(held.noteId, in: store)) == "тайное" })
        #expect(await server.subscribedSince(mark) == [held.noteId])
        #expect(try await eventually { (try? store.document(held.noteId)?.covered) != nil })
        await later.stop()
        await writer.stop()
    }

    /// `reset`: everything is subscribed as in version 1, under a new epoch.
    @Test func aResetSubscribesEverythingUnderANewEpoch() async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(10, by: writer)
        let phone = try device("phone", server: server)
        try knows(phone, all)
        let first = try await syncUntilCursorStored(phone)
        await phone.stop()

        await server.setResumeMode(.reset)
        let mark = await server.subscribedOrder.count
        let second = try await syncUntilCursorStored(phone, previous: first)
        #expect(Set(await server.subscribedSince(mark)) == Set(all.map(\.noteId)))
        #expect(second.epoch != first.epoch)
        await phone.stop()
        await writer.stop()
    }

    /// `removed`: the document is handled as `doc_not_found` — not syncing, waiting for access.
    @Test func aRemovedDocumentStopsSyncing() async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(3, by: writer)
        let phone = try device("phone", server: server)
        try knows(phone, all)
        let first = try await syncUntilCursorStored(phone)
        await phone.stop()

        await server.deny(all[2].noteId, to: "phone")
        _ = try await syncUntilCursorStored(phone, previous: first)
        #expect(await phone.status().waiting[all[2].noteId] == .access)
        #expect(await phone.diagnostics().events.contains { $0.docId == all[2].noteId && $0.detail.contains("removed") })
        await phone.stop()
        await writer.stop()
    }

    /// Access granted after the cursor (a shared notebook, a space joined): the document comes
    /// in `docs`, and its content arrives.
    @Test func accessGrantedAfterTheCursorBringsTheDocument() async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(3, by: writer)
        let shared = all[0]
        try shared.insertText("общее", at: 0, inBlock: [1])
        #expect(try await eventually { (try? writer.store.outboxCount()) == 0 })
        await server.deny(shared.noteId, to: "phone")
        let phone = try device("phone", server: server)
        try knows(phone, all)
        let first = try await syncUntilCursorStored(phone)
        #expect(await phone.status().waiting[shared.noteId] == .access)
        #expect(try text(shared.noteId, in: phone.store) == nil)
        await phone.stop()

        await server.allow(shared.noteId, to: "phone")
        _ = try await syncUntilCursorStored(phone, previous: first)
        #expect(try await eventually { (try? text(shared.noteId, in: phone.store)) == "общее" })
        #expect(await phone.status().waiting[shared.noteId] == nil)
        await phone.stop()
        await writer.stop()
    }

    /// A server that never answers `resume`: after the timeout everything is subscribed as in
    /// version 1, and the stored cursor is left alone. One that refuses it (`bad_request`
    /// without `ref`) does the same at once.
    @Test(arguments: [FakeSyncServer.ResumeMode.silent, .refuse])
    func noAnswerToResumeSubscribesEverything(mode: FakeSyncServer.ResumeMode) async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(5, by: writer)
        let phone = try device("phone", server: server, resumeTimeout: .milliseconds(300))
        try knows(phone, all)
        let first = try await syncUntilCursorStored(phone)
        await phone.stop()

        try all[1].insertText("пока молчал", at: 0, inBlock: [1])
        #expect(try await eventually { (try? writer.store.outboxCount()) == 0 })
        await server.setResumeMode(mode)
        let mark = await server.subscribedOrder.count
        await phone.start()
        #expect(try await eventually { Set(await server.subscribedSince(mark)) == Set(all.map(\.noteId)) })
        #expect(try await eventually { (try? text(all[1].noteId, in: phone.store)) == "пока молчал" })
        #expect(try phone.store.resumeState() == first)
        await phone.stop()
        await writer.stop()
    }

    /// The cursor is stored only once everything subscribed on the connection has caught up: a
    /// drop in the middle keeps the old one, and the next resume asks from it again.
    @Test func aDropBeforeTheCatchUpEndsKeepsTheOldCursor() async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(30, by: writer)
        let phone = try device("phone", server: server)
        try knows(phone, all)
        let first = try await syncUntilCursorStored(phone)
        await phone.stop()

        for n in all { try n.insertText("правка", at: 0, inBlock: [1]) }
        #expect(try await eventually(timeout: .seconds(10)) { (try? writer.store.outboxCount()) == 0 })
        await server.setSubscribeDelayPerDoc(.milliseconds(30))
        await phone.start()
        #expect(try await eventually { await server.resumeCursors.count >= 3 })
        try await Task.sleep(for: .milliseconds(150))
        await server.closeConnections(deviceId: "phone", frame: nil, code: 1006, reason: nil)
        #expect(try phone.store.resumeState() == first)
        // The next connection resumes from the same cursor and finishes.
        await server.setSubscribeDelayPerDoc(.zero)
        #expect(try await eventually(timeout: .seconds(10)) { (try? phone.store.resumeState()) != first })
        let cursors = await server.resumeCursors
        #expect(cursors.suffix(2).allSatisfy { $0 == first.cursor })
        for n in all { #expect(try text(n.noteId, in: phone.store) == "правка") }
        await phone.stop()
        await writer.stop()
    }

    /// A live update (account subscription) that comes before the document's catch-up is
    /// applied but does not move `lastSeq` (§3.1): a drop before the catch-up leaves no hole.
    @Test func anEarlyLiveUpdateDoesNotMoveLastSeq() async throws {
        let server = FakeSyncServer()
        let writer = try device("W", server: server)
        await writer.start()
        let all = try await notes(2, by: writer)
        let late = all[1]
        let phone = try device("phone", server: server)
        try knows(phone, all)
        let first = try await syncUntilCursorStored(phone)
        await phone.stop()

        try late.insertText("раз", at: 0, inBlock: [1])
        #expect(try await eventually { (try? writer.store.outboxCount()) == 0 })
        let seqBefore = try #require(try phone.store.document(late.noteId)?.lastSeq)
        let rowsBefore = try phone.store.updates(docId: late.noteId).count
        // The catch-up of `late` is slow; a second edit arrives live meanwhile.
        await server.setSubscribeDelayPerDoc(.milliseconds(400))
        await phone.start()
        #expect(try await eventually { await server.resumeCursors.count == 2 })
        try await Task.sleep(for: .milliseconds(100))
        try late.insertText("два ", at: 0, inBlock: [1])
        // Stored while the catch-up is still on its way, and `lastSeq` stays.
        #expect(try await eventually {
            (try? phone.store.updates(docId: late.noteId).count) == rowsBefore + 1
                && (try? phone.store.document(late.noteId)?.lastSeq) == seqBefore
        })
        // After the catch-up: everything, and `lastSeq` at the server's.
        #expect(try await eventually(timeout: .seconds(5)) { (try? phone.store.resumeState()) != first })
        #expect(try text(late.noteId, in: phone.store) == "два раз")
        #expect(try phone.store.document(late.noteId)?.lastSeq == (await server.nextSeq[late.noteId]))
        await phone.stop()
        await writer.stop()
    }
}
