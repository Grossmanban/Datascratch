import Foundation
import Testing
@testable import DSCore

/// The owner's build 46 on imperfect 4G (2026-11-11): «синхронизация» all the time, a note made
/// on the phone never reached the server, a note written by an agent showed its title long
/// before its body. Each test is one suspect, on a slow link with dropped connections.
@Suite(.serialized) struct SyncResilienceTests {
    let key = DSCrypto.newKey()

    func device(_ name: String, server: FakeSyncServer, keyFor: (@Sendable (DocumentRecord) -> Data?)? = nil,
                configure: (inout SyncClient.Configuration) -> Void = { _ in }) throws -> SyncEngine {
        let store = try LocalStore.inMemory()
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        config.maxBackoff = .milliseconds(50)
        configure(&config)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = self.key
        return SyncEngine(store: store, client: client, keyFor: keyFor ?? { _ in key },
                          register: { record in await server.register(record.docId) })
    }

    /// A library the server already has: `count` empty notes known to the device.
    func library(_ count: Int, on engine: SyncEngine, server: FakeSyncServer) async throws -> [String] {
        var ids: [String] = []
        for _ in 0..<count {
            let id = EntityID.make()
            await server.register(id)
            try engine.store.ensureDocument(docId: id, kind: .note, notebookId: "nb")
            try engine.store.setRegistered(id)
            ids.append(id)
        }
        return ids
    }

    /// Drops every connection of `deviceId` every `every` until cancelled (flaky 4G).
    func dropper(_ server: FakeSyncServer, deviceId: String, every: Duration) -> Task<Void, Never> {
        Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: every)
                await server.closeConnections(deviceId: deviceId, frame: nil, code: 1006, reason: nil)
            }
        }
    }

    /// Suspect (a), queue form: the send loop looked only at the 200 oldest queued messages and
    /// skipped those of documents that are not live. A document that cannot go live (here: no
    /// key yet) with 200+ queued edits blocked every document behind it, forever.
    @Test func aDocumentThatCannotSendDoesNotBlockTheQueue() async throws {
        let server = FakeSyncServer()
        let held = EntityID.make()
        let key = self.key
        let a = try device("A", server: server, keyFor: { $0.docId == held ? nil : key })
        try a.store.ensureDocument(docId: held, kind: .note, notebookId: "nb")
        let heldNote = NoteDocument(noteId: held)
        try heldNote.initialize(title: "held")
        for i in 0..<250 {
            try heldNote.insertText("\(i)", at: 0, inBlock: [1])
            try a.store.appendLocalUpdate(docId: held, update: try heldNote.crdt.encodeStateAsUpdate(), origin: .local)
        }
        await a.start()
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "Баги дс")
        #expect(try await eventually { await server.docs[note.noteId]?.isEmpty == false })
        await a.stop()
    }

    /// Suspect (b): drops every few hundred ms on a slow link, with a library big enough that a
    /// full catch-up never finishes between drops. The note made on the phone was the newest
    /// document, so it was subscribed last — never, under the storm. Documents with something to
    /// send go first now.
    @Test func aNewNoteGetsOutThroughAReconnectStorm() async throws {
        let server = FakeSyncServer()
        let b = try device("B", server: server)
        _ = try await library(600, on: b, server: server)
        await server.setSubscribeDelayPerDoc(.milliseconds(1))
        await b.start()
        let storm = dropper(server, deviceId: "B", every: .milliseconds(250))
        defer { storm.cancel() }
        let note = NoteDocument(noteId: EntityID.make())
        try await b.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "Баги дс")
        try note.insertText("продиктовано", at: 0, inBlock: [1])
        let ok = try await eventually(timeout: .seconds(10)) {
            await server.docs[note.noteId].map { $0.count >= 2 } == true
        }
        if !ok {
            let order = await server.subscribedOrder
            let received = await server.received
            let pushes = received.filter { if case .push(let id, _, _) = $0 { return id == note.noteId } else { return false } }.count
            print("DEBUG hellos=\(await server.helloCount()) subs-of-note=\(order.filter { $0 == note.noteId }.count) total-subs=\(order.count) pushes=\(pushes) registered=\(await server.registered.contains(note.noteId)) docs=\(await server.docs[note.noteId]?.count ?? -1) outbox=\((try? b.store.outboxCount()) ?? -1) status=\(await b.status())")
        }
        #expect(ok)
        storm.cancel()
        await b.stop()
    }

    /// Suspect (b), self-inflicted: on a slow link the pong queues behind catch-up frames. A late
    /// pong while frames keep arriving is not a dead connection; replacing it started the next
    /// full resubscribe, which delayed the next pong — a loop.
    @Test func aLatePongWhileFramesArriveKeepsTheConnection() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server, configure: {
            $0.pingInterval = .milliseconds(40)
            $0.pongTimeout = .milliseconds(30)
        })
        let writer = try device("W", server: server)
        await a.start()
        await writer.start()
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "busy")
        let remote = NoteDocument(noteId: note.noteId)
        try await writer.open(remote.crdt, notebookId: "nb")
        #expect(try await eventually { (try? remote.title()) == "busy" })
        await server.setPongDelay(.milliseconds(200))
        let hellos = await server.helloCount()
        // Frames every 10 ms for over a second: many pings, every pong late.
        for i in 0..<100 {
            try remote.insertText("\(i % 10)", at: 0, inBlock: [1])
            try await Task.sleep(for: .milliseconds(10))
        }
        #expect(await server.helloCount() == hellos)
        await server.setPongDelay(.zero)
        #expect(try await eventually { (try? note.block(at: [1])?.text) == (try? remote.block(at: [1])?.text) })
        await a.stop()
        await writer.stop()
    }

    /// Suspect (c): a note changed elsewhere (an agent) shows its title from the index long
    /// before its body arrives when it is subscribed after the whole library. `prefetch` puts
    /// it at the front; the body arrives without opening the note.
    @Test func aChangedNoteIsFetchedFirst() async throws {
        let server = FakeSyncServer()
        let agent = try device("agent", server: server)
        await agent.start()
        let written = NoteDocument(noteId: EntityID.make())
        try await agent.open(written.crdt, notebookId: "nb")
        try written.initialize(title: "От агента")
        try written.insertText("тело заметки", at: 0, inBlock: [1])
        #expect(try await eventually { (try? agent.store.outboxCount()) == 0 })
        await agent.stop()

        let phone = try device("phone", server: server)
        _ = try await library(600, on: phone, server: server)
        try phone.store.ensureDocument(docId: written.noteId, kind: .note, notebookId: "nb")
        try phone.store.setRegistered(written.noteId)
        await server.setSubscribeDelayPerDoc(.milliseconds(5))
        // The index said the note changed: fetch its body first.
        await phone.prefetch([written.noteId])
        await phone.start()
        #expect(try await eventually(timeout: .seconds(2)) {
            ((try? phone.store.updates(docId: written.noteId)) ?? []).isEmpty == false
        })
        let order = await server.subscribedOrder
        #expect((order.firstIndex(of: written.noteId) ?? .max) < 5)
        await phone.stop()
    }

    /// Messages that «failed» only because the connection broke under them (build 46 counted
    /// those as delivery attempts) go back into the queue; refusals by the server stay failed.
    @Test func connectionFailuresAreRequeuedServerRefusalsStay() throws {
        let store = try LocalStore.inMemory()
        let doc = EntityID.make()
        try store.ensureDocument(docId: doc, kind: .note, notebookId: "nb")
        for _ in 0..<3 { try store.appendLocalUpdate(docId: doc, update: Data([1, 2, 3]), origin: .local) }
        let ids = try store.pendingOutbox(docId: doc).map(\.clientMsgId)
        try store.markFailed(clientMsgId: ids[0], error: "closed", permanent: true)
        try store.markFailed(clientMsgId: ids[1], error: "Error Domain=NSPOSIXErrorDomain Code=57 \"Socket is not connected\"", permanent: true)
        try store.markFailed(clientMsgId: ids[2], error: "payload_too_large", permanent: true)
        #expect(try store.outboxCount() == 0)
        #expect(try store.requeueConnectionFailures() == 2)
        #expect(try store.pendingOutbox(docId: doc).map(\.clientMsgId) == [ids[0], ids[1]])
        #expect(try store.failedOutbox().first?.reason == "payload_too_large")
    }

    /// Diagnostics name what waits, for how long, and the last error.
    @Test func diagnosticsShowWhatWaits() async throws {
        let server = FakeSyncServer()
        let held = EntityID.make()
        let key = self.key
        let a = try device("A", server: server, keyFor: { $0.docId == held ? nil : key })
        try a.store.ensureDocument(docId: held, kind: .note, notebookId: "nb")
        try a.store.appendLocalUpdate(docId: held, update: Data([1]), origin: .local, now: Date().addingTimeInterval(-60))
        await a.start()
        #expect(try await eventually { (await a.diagnostics()).connectionsOpened == 1 })
        let d = await a.diagnostics()
        #expect(d.pending.map(\.docId) == [held])
        #expect((d.oldestPendingAge() ?? 0) >= 59)
        #expect(d.waiting[held] == .key)
        await a.stop()
    }
}

/// «синхронизация» only after 3 s of waiting work, held without flicker.
@Suite struct SyncActivityGateTests {
    func status(pending: Int = 0, since: Date? = nil, catchingUp: Int = 0, catchingSince: Date? = nil,
                connection: SyncConnectionState = .connected(userId: "u")) -> SyncStatus {
        var s = SyncStatus(connection: connection, pending: pending, catchingUp: catchingUp)
        s.oldestPendingAt = since
        s.catchingUpSince = catchingSince
        return s
    }

    @Test func shortWorkNeverShows() {
        var gate = SyncActivityGate()
        let t0 = Date()
        do { let v = gate.update(status(pending: 1, since: t0), now: t0); #expect(!v) }
        do { let v = gate.update(status(pending: 1, since: t0), now: t0 + 2.9); #expect(!v) }
        do { let v = gate.update(status(), now: t0 + 3.1); #expect(!v) }
        #expect(gate.nextChange(after: t0 + 3.1) == nil)
    }

    @Test func longWorkShowsAfterThreeSecondsAndHoldsWithoutFlicker() {
        var gate = SyncActivityGate()
        let t0 = Date()
        do { let v = gate.update(status(catchingUp: 50, catchingSince: t0), now: t0 + 1); #expect(!v) }
        #expect(gate.nextChange(after: t0 + 1) == t0 + 3)
        do { let v = gate.update(status(catchingUp: 50, catchingSince: t0), now: t0 + 3); #expect(v) }
        // Done a moment later: still on (minimum time on, then the hold).
        do { let v = gate.update(status(), now: t0 + 3.2); #expect(v) }
        // New work within the hold: no blink.
        do { let v = gate.update(status(pending: 1, since: t0 + 3.5), now: t0 + 3.6); #expect(v) }
        do { let v = gate.update(status(), now: t0 + 4.0); #expect(v) }
        do { let v = gate.update(status(), now: t0 + 4.9); #expect(v) }
        do { let v = gate.update(status(), now: t0 + 5.1); #expect(!v) }
    }

    @Test func aReconnectAloneIsNotSyncing() {
        var gate = SyncActivityGate()
        let t0 = Date()
        do { let v = gate.update(status(connection: .connecting), now: t0 + 10); #expect(!v) }
        do { let v = gate.update(status(pending: 2, since: t0, connection: .connecting), now: t0 + 10); #expect(v) }
    }
}
