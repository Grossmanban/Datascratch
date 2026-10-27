import Foundation
import Testing
@testable import DSCore

/// Changes from another device reach a note that is open here while the app keeps running
/// (no restart): over a live connection, after it died silently, and after its key arrived late.
@Suite(.serialized) struct LiveSyncTests {
    let key = DSCrypto.newKey()

    func device(_ name: String, server: FakeSyncServer, ping: Duration = .seconds(25), keyFor: SyncEngine.KeyLookup? = nil,
                minBackoff: Duration = .milliseconds(10)) throws -> SyncEngine {
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
        config.minBackoff = minBackoff
        config.maxBackoff = max(minBackoff, .milliseconds(50))
        config.pingInterval = ping
        config.pongTimeout = .milliseconds(200)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = self.key
        return SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: keyFor ?? { _ in key },
                          register: { record in await server.register(record.docId) })
    }

    /// A and B have the note open and caught up; returns both documents.
    func openShared(_ a: SyncEngine, _ b: SyncEngine) async throws -> (NoteDocument, NoteDocument) {
        let docId = EntityID.make()
        let noteA = NoteDocument(noteId: docId)
        try await a.open(noteA.crdt, notebookId: "nb")
        try noteA.initialize(title: "Shared")
        try noteA.insertText("v1", at: 0, inBlock: [1])
        let noteB = NoteDocument(noteId: docId)
        try await b.open(noteB.crdt, notebookId: "nb")
        #expect(try await eventually { (try? noteB.block(at: [1])?.text) == "v1" })
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        return (noteA, noteB)
    }

    @Test func remoteChangeReachesOpenNoteWithinOneSecond() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        let b = try device("B", server: server)
        await a.start()
        await b.start()
        let (noteA, noteB) = try await openShared(a, b)
        // The app refreshes its UI from remote-origin updates of the open document.
        let remoteUpdates = Locked(0)
        let sub = noteB.crdt.observeUpdates { _, origin in if origin == .remote { remoteUpdates.withLock { $0 += 1 } } }

        for round in 1...3 {
            let start = ContinuousClock.now
            try noteA.insertText(" r\(round)", at: 2 + 3 * (round - 1), inBlock: [1])
            #expect(try await eventually(timeout: .seconds(1)) { (try? noteB.block(at: [1])?.text)?.hasSuffix("r\(round)") == true })
            #expect(ContinuousClock.now - start < .seconds(1))
        }
        #expect(remoteUpdates.withLock { $0 } >= 3)
        _ = sub
        await a.stop()
        await b.stop()
    }

    @Test func silentlyDeadConnectionIsReplacedByTheHeartbeat() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        let b = try device("B", server: server, ping: .milliseconds(300))
        await a.start()
        await b.start()
        let (noteA, noteB) = try await openShared(a, b)

        await server.killSilently(deviceId: "B")
        try noteA.insertText(" while B was dead", at: 2, inBlock: [1])
        // Ping 300 ms + pong timeout 200 ms, then reconnect and catch up from lastSeq.
        #expect(try await eventually(timeout: .seconds(3)) { (try? noteB.block(at: [1])?.text) == "v1 while B was dead" })
        await a.stop()
        await b.stop()
    }

    @Test func checkConnectionOnForegroundReplacesADeadConnectionAtOnce() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        let b = try device("B", server: server)   // next ping only in 25 s
        await a.start()
        await b.start()
        let (noteA, noteB) = try await openShared(a, b)

        await server.killSilently(deviceId: "B")
        try noteA.insertText(" after sleep", at: 2, inBlock: [1])
        try await Task.sleep(for: .milliseconds(100))
        #expect((try? noteB.block(at: [1])?.text) == "v1")
        await b.client.checkConnection()
        #expect(try await eventually(timeout: .seconds(2)) { (try? noteB.block(at: [1])?.text) == "v1 after sleep" })

        // A live connection passes the check and stays.
        let connections = await server.connections(deviceId: "B")
        await b.client.checkConnection()
        try await Task.sleep(for: .milliseconds(300))
        #expect(await server.connections(deviceId: "B") == connections)
        await a.stop()
        await b.stop()
    }

    @Test func reconnectNowDoesNotWaitForTheBackoff() async throws {
        let server = FakeSyncServer()
        let b = try device("B", server: server, minBackoff: .seconds(30))
        await server.setAccepting(false)
        await b.start()
        #expect(try await eventually { if case .waiting = await b.client.state { true } else { false } })
        await server.setAccepting(true)
        await b.client.reconnectNow()
        #expect(try await eventually(timeout: .seconds(2)) { await b.client.isConnected })
        await b.stop()
    }

    @Test func noteWhoseKeyArrivesAfterTheIndexUpdateStillSyncs() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        let key = self.key
        // B learns note keys a moment after the notebook index changed (the app reads them
        // when it reloads its snapshot, 250 ms after remote changes).
        let noteKeyKnown = Locked(false)
        let b = try device("B", server: server, keyFor: { record in
            record.kind == .note && !noteKeyKnown.withLock({ $0 }) ? nil : key
        })
        await a.start()
        await b.start()

        let notebook = NotebookDocument(notebookId: EntityID.make())
        try await a.open(notebook.crdt, notebookId: notebook.crdt.docId)
        try notebook.initialize()
        try notebook.putFolder(Folder(parentId: nil, name: "F1", order: 1))
        let docId = EntityID.make()
        let noteA = NoteDocument(noteId: docId)
        try await a.open(noteA.crdt, notebookId: notebook.crdt.docId)
        try noteA.initialize(title: "Late key")
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })

        let notebookB = NotebookDocument(notebookId: notebook.crdt.docId)
        try await b.open(notebookB.crdt, notebookId: notebook.crdt.docId)
        let noteB = NoteDocument(noteId: docId)
        try await b.open(noteB.crdt, notebookId: notebook.crdt.docId)
        #expect(try await eventually { notebookB.folders().map(\.name) == ["F1"] })
        try await Task.sleep(for: .milliseconds(100))
        #expect((try? noteB.title()) != "Late key")

        // The index changes (a new NoteMeta); the key becomes known only afterwards.
        try notebook.putFolder(Folder(parentId: nil, name: "F2", order: 2))
        #expect(try await eventually { notebookB.folders().count == 2 })
        try await Task.sleep(for: .milliseconds(250))
        noteKeyKnown.withLock { $0 = true }
        #expect(try await eventually(timeout: .seconds(3)) { (try? noteB.title()) == "Late key" })
        await a.stop()
        await b.stop()
    }

    /// sync-protocol §7: `rate_limited` with `retryAfterMs` — no reconnect sooner (the quick
    /// handshake retries would otherwise come within ~0.3 s).
    @Test func rateLimitedHandshakeWaitsRetryAfter() async throws {
        let server = FakeSyncServer()
        await server.setRateLimitNextHello(700)
        let b = try device("B", server: server)
        await b.start()
        #expect(try await eventually(timeout: .seconds(5)) { await b.client.isConnected })
        let hellos = await server.hellos
        #expect(hellos.count == 2)
        #expect(hellos[1] - hellos[0] >= .milliseconds(700))
        await b.stop()
    }
}
