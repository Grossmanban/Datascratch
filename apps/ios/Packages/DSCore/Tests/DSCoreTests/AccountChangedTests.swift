import Testing
import Foundation
@testable import DSCore

/// D-62 sync of shared spaces on iOS: `account_changed`, documents waiting for a key or for
/// access (2026-11-08: invitations only after a restart, «waiting for key» that never ended).
@Suite(.serialized) struct AccountChangedTests {
    func device(_ name: String, server: FakeSyncServer, key: @escaping @Sendable (DocumentRecord) -> Data?) -> SyncEngine {
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        config.maxBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        return SyncEngine(store: try! LocalStore.inMemory(), client: client, keyFor: key, register: { await server.register($0.docId) })
    }

    @Test func accountChangedDecodesTolerantly() throws {
        func decode(_ json: String) -> ServerMessage? { SyncFrame.decode(json) }
        #expect(decode(#"{"type":"account_changed","what":["invitations","keys"]}"#) == .accountChanged([.invitations, .keys]))
        // Names a newer server may add are dropped; no list means «something changed».
        #expect(decode(#"{"type":"account_changed","what":["spaces","colours"]}"#) == .accountChanged([.spaces]))
        // A list is required (at most 8); unknown names can leave it empty: «something».
        #expect(decode(#"{"type":"account_changed","what":["future_thing"]}"#) == .accountChanged([]))
        #expect(decode(#"{"type":"account_changed"}"#) == nil)
        #expect(SyncFrame.parse(#"{"type":"account_changed"}"#) == .broken)
        // Round trip through the encoder.
        let all = ServerMessage.accountChanged(Set(AccountChange.allCases))
        #expect(decode(String(decoding: try JSONEncoder.sync.encode(all), as: UTF8.self)) == all)
        // An unknown type is not a message: the client skips it.
        #expect(decode(#"{"type":"presence_v2","x":1}"#) == nil)
        #expect(SyncFrame.parse(#"{"type":"presence_v2","x":1}"#) == .ignored(type: "presence_v2"))
    }

    /// An unknown frame does not break the connection, and `account_changed` reaches the app.
    @Test func unknownFramesAreSkippedAndAccountChangedReachesTheApp() async throws {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        let b = device("B", server: server) { _ in key }
        let seen = Locked<[Set<AccountChange>]>([])
        await b.setAccountChangedHandler { what in seen.withLock { $0.append(what) } }
        await b.start()
        #expect(try await eventually { await b.client.isConnected })
        let hellos = await server.helloCount()
        await server.sendRaw(#"{"type":"something_new","what":"?"}"#, to: "B")
        // Only names this client does not know: nothing reaches the app.
        await server.sendRaw(#"{"type":"account_changed","what":["future_thing"]}"#, to: "B")
        await server.send(.accountChanged([.invitations]), to: "B")
        #expect(try await eventually { seen.withLock { $0 } == [[.invitations]] })
        #expect(await b.client.isConnected)
        #expect(await server.helloCount() == hellos)
        await b.stop()
    }

    /// A local edit made before the note's key is on this device is held with a reason, the app
    /// is asked for keys at once, and the edit goes out as soon as the key is learned.
    @Test func heldEditGoesOutRightAfterTheKeyIsLearned() async throws {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        let hasKey = Locked(false)
        let b = device("B", server: server) { _ in hasKey.withLock { $0 } ? key : nil }
        let asked = Locked<[Set<String>]>([])
        await b.setKeysMissingHandler { ids in asked.withLock { $0.append(ids) } }
        await b.start()
        #expect(try await eventually { await b.client.isConnected })
        let note = NoteDocument(noteId: EntityID.make())
        try await b.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "Written before the key")
        // Held, with a reason; the app was asked for the key right away, not on a poll.
        #expect(try await eventually(timeout: .seconds(2)) { asked.withLock { $0.first } == [note.noteId] })
        let held = await b.status()
        #expect(held.held > 0 && held.pending == 0)
        #expect(held.waiting[note.noteId] == .key)
        #expect(await server.docs[note.noteId] == nil)

        hasKey.withLock { $0 = true }
        await b.noteKeysLearned()
        #expect(try await eventually { (try? b.store.outboxCount()) == 0 })
        #expect(await server.docs[note.noteId]?.isEmpty == false)
        let after = await b.status()
        #expect(after.held == 0 && after.waiting.isEmpty)
        await b.stop()
    }

    /// A document the server refused (a space joined a moment later) opens on `account_changed`,
    /// on the same connection.
    @Test func refusedDocumentOpensAfterAccountChangedWithoutReconnecting() async throws {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        let a = device("A", server: server) { _ in key }
        let b = device("B", server: server) { _ in key }
        await a.start()
        await b.start()
        let docId = EntityID.make()
        let original = NotebookDocument(notebookId: docId)
        try await a.open(original.crdt, notebookId: docId)
        try original.putFolder(Folder(id: "f", parentId: nil, name: "Shared", order: 1))
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })

        await server.deny(docId, to: "B")
        let copy = NotebookDocument(notebookId: docId)
        try await b.open(copy.crdt, notebookId: docId)
        #expect(try await eventually { await b.status().waiting[docId] == .access })
        #expect(copy.folders().isEmpty)
        let hellos = await server.helloCount()

        await server.allow(docId, to: "B")
        await server.send(.accountChanged([.spaces]), to: "B")
        #expect(try await eventually { copy.folder(id: "f")?.name == "Shared" })
        #expect(await b.status().waiting.isEmpty)
        #expect(await server.helloCount() == hellos)
        await a.stop()
        await b.stop()
    }

    /// The same through `noteKeysLearned` (the app learned the space's keys): refused documents
    /// are asked for again.
    @Test func refusedDocumentOpensAfterKeysAreLearned() async throws {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        let a = device("A", server: server) { _ in key }
        let b = device("B", server: server) { _ in key }
        await a.start()
        await b.start()
        let docId = EntityID.make()
        let original = NotebookDocument(notebookId: docId)
        try await a.open(original.crdt, notebookId: docId)
        try original.putFolder(Folder(id: "f", parentId: nil, name: "Later", order: 1))
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        await server.deny(docId, to: "B")
        let copy = NotebookDocument(notebookId: docId)
        try await b.open(copy.crdt, notebookId: docId)
        #expect(try await eventually { await b.status().waiting[docId] == .access })
        await server.allow(docId, to: "B")
        await b.noteKeysLearned()
        #expect(try await eventually { copy.folder(id: "f")?.name == "Later" })
        await a.stop()
        await b.stop()
    }

    /// A note made together with its index entry: the entry (which carries the note's key)
    /// reaches the server first, whatever the order of the edits.
    @Test func indexEntriesGoOutBeforeTheirNotes() async throws {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        let a = device("A", server: server) { _ in key }
        let nbId = EntityID.make()
        let notebook = NotebookDocument(notebookId: nbId)
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(notebook.crdt, notebookId: nbId)
        try await a.open(note.crdt, notebookId: nbId)
        // Offline: the note is edited first, then its index entry is written.
        try note.initialize(title: "New")
        try notebook.putFolder(Folder(id: "f", parentId: nil, name: "Index", order: 1))
        await a.start()
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        let pushes = await server.received.compactMap { m -> String? in if case .push(let id, _, _) = m { return id } else { return nil } }
        let firstNote = try #require(pushes.firstIndex(of: note.noteId))
        let firstIndex = try #require(pushes.firstIndex(of: nbId))
        #expect(firstIndex < firstNote)
        await a.stop()
    }

    /// Protocol 2 with an older server: `protocol_mismatch` on hello 2, the client says 1 next
    /// and connects; not shown as a failure.
    @Test func olderServerGetsProtocolOne() async throws {
        let server = FakeSyncServer()
        await server.setMaxProtocol(1)
        let key = DSCrypto.newKey()
        let b = device("B", server: server) { _ in key }
        await b.start()
        #expect(try await eventually { await b.client.isConnected })
        #expect(await server.helloVersions.prefix(2) == [2, 1])
        #expect(await b.client.protocolVersion == 1)
        #expect(await b.client.consecutiveFailures == 0)
        await b.stop()
    }

    @Test func currentServerSpeaksProtocolTwo() async throws {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        let b = device("B", server: server) { _ in key }
        await b.start()
        #expect(try await eventually { await b.client.isConnected })
        #expect(await server.helloVersions == [2])
        #expect(await b.client.protocolVersion == 2)
        await b.stop()
    }
}
