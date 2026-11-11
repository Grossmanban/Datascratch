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

    /// The app loads notes from the store and then opens them in the engine. Build 46 stored
    /// that content again as a local update: the whole state of every note queued at every
    /// launch (565 messages on the owner's phone). Reopening queues nothing now.
    @Test func openingANoteLoadedFromTheStoreQueuesNothing() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "t")
        try note.insertText("текст", at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        await a.close(docId: note.noteId)
        // Closing makes the leave snapshot (spec/06); wait until it is acknowledged.
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        let sent = await server.received.count

        // As CoreLibrary does: load from the store, then hand it to the engine.
        let loaded = NoteDocument(noteId: note.noteId)
        try loaded.crdt.applyUpdates(try a.store.updates(docId: note.noteId), origin: .storage)
        try await a.open(loaded.crdt, notebookId: "nb")
        #expect(try a.store.outboxCount() == 0)
        try await Task.sleep(for: .milliseconds(50))
        let pushes = await server.received.dropFirst(sent).filter { if case .push = $0 { return true } else { return false } }
        #expect(pushes.isEmpty)
        // A note made before opening still goes out.
        let fresh = NoteDocument(noteId: EntityID.make())
        try fresh.initialize(title: "до открытия")
        try await a.open(fresh.crdt, notebookId: "nb")
        #expect(try await eventually { await server.docs[fresh.noteId]?.isEmpty == false })
        await a.stop()
    }

    /// Whole-state pushes queued by build 46 (one per note per launch; over 2 MiB for big notes,
    /// which failed at once): the server has all of it, so they leave the queue unsent. A big
    /// push with new content still goes, trimmed to what the server lacks.
    @Test func bigPushesAreTrimmedToWhatTheServerLacks() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "ТЗ")
        let big = String(repeating: "Доработка по ТЗ, пункт за пунктом. ", count: 2_000)
        try note.insertText(big, at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        let onServer = await server.docs[note.noteId]?.count ?? 0
        await a.stop()

        // What build 46 left in the queue: the whole state again, twice.
        let whole = try note.crdt.encodeStateAsUpdate()
        #expect(whole.count > SyncEngine.trimPushesOver)
        try a.store.appendLocalUpdate(docId: note.noteId, update: whole, origin: .system)
        try a.store.appendLocalUpdate(docId: note.noteId, update: whole, origin: .system)
        await a.start()
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        #expect(await server.docs[note.noteId]?.count == onServer)
        #expect(await a.diagnostics().events.filter { $0.kind == .pushTrimmed && $0.docId == note.noteId }.count == 2)

        // New big content: sent.
        let more = String(repeating: "Новый раздел. ", count: 4_000)
        try note.insertText(more, at: 0, inBlock: [1])
        #expect(try await eventually { (await server.docs[note.noteId]?.count ?? 0) == onServer + 1 })
        await a.stop()
    }

    // MARK: No data loss from trimming (coordinator's conditions, 2026-11-11)

    /// A note with content the server has (acknowledged), for the checks below.
    func noteOnServer(_ a: SyncEngine, _ server: FakeSyncServer, text: String) async throws -> NoteDocument {
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "t")
        try note.insertText(text, at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        return note
    }

    /// What a fresh device gets for `docId` from the server.
    func fetched(_ docId: String, from server: FakeSyncServer) async throws -> NoteDocument {
        let fresh = try device("fresh-\(UUID().uuidString.prefix(6))", server: server)
        await fresh.start()
        let copy = NoteDocument(noteId: docId)
        try await fresh.open(copy.crdt, notebookId: "nb")
        _ = try await eventually { (try? fresh.store.document(docId)?.lastSeq ?? 0) ?? 0 > 0 && (try? copy.block(at: [1])) != nil }
        try await Task.sleep(for: .milliseconds(100))
        await fresh.stop()
        return copy
    }

    /// (1) A big push that inserts nothing new but deletes what the server still has is not
    /// dropped: its deletion reaches the server.
    @Test func aBigPushWithANewDeletionIsSent() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        let text = String(repeating: "Абзац ТЗ. ", count: 5_000)
        let note = try await noteOnServer(a, server, text: text)
        await a.stop()
        // The whole state with a deletion made outside the engine (nothing queued it).
        let copy = NoteDocument(noteId: note.noteId)
        try copy.crdt.applyUpdates(try a.store.updates(docId: note.noteId), origin: .storage)
        try copy.deleteText(range: 0..<10, inBlock: [1])
        let whole = try copy.crdt.encodeStateAsUpdate()
        #expect(whole.count > SyncEngine.trimPushesOver)
        try a.store.appendLocalUpdate(docId: note.noteId, update: whole, origin: .system)
        await a.start()
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        let pushes = await server.received.filter { if case .push(let id, _, _) = $0 { return id == note.noteId } else { return false } }
        #expect(pushes.count == 3) // initialize, the text, the deletion
        let onServer = try await fetched(note.noteId, from: server)
        #expect(try onServer.block(at: [1])?.text == String(text.dropFirst(10)))
        await a.stop()
    }

    /// (2) Nothing known of the server for the document (never acknowledged): nothing is
    /// dropped, the push goes as it is.
    @Test func withoutTheServersStateNothingIsDropped() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        let note = NoteDocument(noteId: EntityID.make())
        try note.initialize(title: "офлайн")
        try note.insertText(String(repeating: "много текста ", count: 4_000), at: 0, inBlock: [1])
        let whole = try note.crdt.encodeStateAsUpdate()
        #expect(whole.count > SyncEngine.trimPushesOver)
        try a.store.ensureDocument(docId: note.noteId, kind: .note, notebookId: "nb")
        // Twice, as build 46 queued it: the server must get the content (duplicates are harmless).
        try a.store.appendLocalUpdate(docId: note.noteId, update: whole, origin: .system)
        try a.store.appendLocalUpdate(docId: note.noteId, update: whole, origin: .system)
        #expect(try a.store.serverStateVector(docId: note.noteId) == nil)
        await a.start()
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        let onServer = try await fetched(note.noteId, from: server)
        #expect(try onServer.block(at: [1])?.text == (try note.block(at: [1])?.text))
        await a.stop()
    }

    /// (3) A big change (a huge paste, 3 MiB) is an ordinary push since protocol 3's limits
    /// (16 MiB, §5): it gets its own seq and a fresh device catches up from it.
    @Test func aBigChangeIsAnOrdinaryPush() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        let note = try await noteOnServer(a, server, text: "начало")
        let before = await server.docs[note.noteId]?.count ?? 0
        let huge = String(repeating: "x", count: 3 * 1024 * 1024)
        try note.insertText(huge, at: 0, inBlock: [1])
        #expect(try await eventually(timeout: .seconds(20)) { (try? a.store.outboxCount()) == 0 })
        #expect(await server.docs[note.noteId]?.count == before + 1)
        #expect(await server.snapshots[note.noteId] == nil)
        let onServer = try await fetched(note.noteId, from: server)
        #expect(try onServer.block(at: [1])?.text == huge + "начало")
        await a.stop()
    }

    /// (3') A server that still refuses updates over 2 MiB (`payload_too_large`): the change goes
    /// as a snapshot instead, never left failed; the server forwards the snapshot, so a device
    /// that is online gets it at once, and a fresh one catches up from it.
    @Test func anOlderServerGetsABigChangeAsASnapshot() async throws {
        let server = FakeSyncServer()
        await server.setMaxPushBytes(2 * 1024 * 1024 + 64)
        let a = try device("A", server: server)
        let b = try device("B", server: server)
        await a.start()
        let note = try await noteOnServer(a, server, text: "начало")
        await b.start()
        let watching = NoteDocument(noteId: note.noteId)
        try await b.open(watching.crdt, notebookId: "nb")
        #expect(try await eventually { (try? watching.block(at: [1])?.text) == "начало" })

        let huge = String(repeating: "x", count: 2 * 1024 * 1024 + 100_000)
        try note.insertText(huge, at: 0, inBlock: [1])
        #expect(try await eventually(timeout: .seconds(20)) {
            await server.snapshots[note.noteId] != nil && (try? a.store.outboxCount()) == 0
        })
        #expect(try a.store.failedOutbox().isEmpty)
        #expect(try await eventually(timeout: .seconds(20)) { (try? watching.block(at: [1])?.text) == huge + "начало" })
        let onServer = try await fetched(note.noteId, from: server)
        #expect(try onServer.block(at: [1])?.text == huge + "начало")
        await a.stop()
        await b.stop()
    }

    /// (4) The owner's phone: a note made offline («Баги дс») and 565 whole-state pushes of
    /// notes the server has. After reconnect the new note is on the server and the 565 cost no
    /// pushes at all.
    @Test func anOfflineNoteAnd565PseudoPushes() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        var notes: [NoteDocument] = []
        for i in 0..<113 { notes.append(try await noteOnServer(a, server, text: "заметка \(i)")) }
        await a.stop()
        for note in notes {
            let whole = try note.crdt.encodeStateAsUpdate()
            for _ in 0..<5 { try a.store.appendLocalUpdate(docId: note.noteId, update: whole, origin: .system) }
        }
        #expect(try a.store.outboxCount() == 565)
        let offline = NoteDocument(noteId: EntityID.make())
        try offline.initialize(title: "Баги дс")
        try offline.insertText("продиктовано без сети", at: 0, inBlock: [1])
        try a.store.ensureDocument(docId: offline.noteId, kind: .note, notebookId: "nb")
        try a.store.appendLocalUpdate(docId: offline.noteId, update: try offline.crdt.encodeStateAsUpdate(), origin: .local)

        let before = await server.received.count
        await a.start()
        let drained = try await eventually(timeout: .seconds(10)) { (try? a.store.outboxCount()) == 0 }
        if !drained {
            let d = await a.diagnostics()
            print("DEBUG565 outbox=\((try? a.store.outboxCount()) ?? -1) live=\(d.live) catching=\(d.catchingUp) queued=\(d.queuedSubscriptions) cursors=\(await server.resumeCursors) events=\(d.events.suffix(8).map { "\($0.kind) \($0.detail)" })")
        }
        #expect(drained)
        let after = await server.received.dropFirst(before)
        let ids = Set(notes.map(\.noteId))
        let pseudo = after.filter { if case .push(let id, _, _) = $0 { return ids.contains(id) } else { return false } }
        #expect(pseudo.isEmpty)
        #expect(try a.store.failedOutbox().isEmpty)
        let onServer = try await fetched(offline.noteId, from: server)
        #expect(try onServer.title() == "Баги дс")
        #expect(try onServer.block(at: [1])?.text == "продиктовано без сети")
        await a.stop()
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
        #expect(d.events.contains { $0.kind == .connected })
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
