import Foundation
import Testing
@testable import DSCore

/// A WebSocket with network latency: every frame arrives `oneWay` after it was sent, in order,
/// without blocking the sender (frames are pipelined like on a real connection).
final class LatencyConnection: WebSocketConnection, @unchecked Sendable {
    let inner: any WebSocketConnection
    let oneWay: Duration
    private let outgoing: AsyncStream<(ContinuousClock.Instant, String)>.Continuation
    private let incoming: AsyncStream<String>
    private let incomingContinuation: AsyncStream<String>.Continuation

    init(_ inner: any WebSocketConnection, oneWay: Duration) {
        self.inner = inner
        self.oneWay = oneWay
        let (outStream, outContinuation) = AsyncStream<(ContinuousClock.Instant, String)>.makeStream()
        outgoing = outContinuation
        (incoming, incomingContinuation) = AsyncStream<String>.makeStream()
        let delay = oneWay
        Task {
            for await (sentAt, text) in outStream {
                try? await Task.sleep(until: sentAt + delay)
                try? await inner.send(text)
            }
        }
        let (arrivals, arrivalsContinuation) = AsyncStream<(ContinuousClock.Instant, String)>.makeStream()
        Task {
            while let text = try? await inner.receive() { arrivalsContinuation.yield((.now, text)) }
            arrivalsContinuation.finish()
        }
        let deliver = incomingContinuation
        Task {
            for await (at, text) in arrivals {
                try? await Task.sleep(until: at + delay)
                deliver.yield(text)
            }
            deliver.finish()
        }
    }

    func send(_ text: String) async throws { outgoing.yield((.now, text)) }

    func receive() async throws -> String {
        for await text in incoming { return text }
        throw SyncClientError.closed
    }

    func sendPing() async throws {}

    func close() {
        inner.close()
        outgoing.finish()
    }
}

struct LatencyFactory: WebSocketFactory {
    let server: FakeSyncServer
    let oneWay: Duration
    func connect(to url: URL) async throws -> any WebSocketConnection {
        try await Task.sleep(for: oneWay * 2) // handshake
        return LatencyConnection(try await server.connect(), oneWay: oneWay)
    }
}

/// Where sync time goes for a small account (the owner's: account + 3 notebooks + notes of
/// ~25 KB) over a connection with latency. Run with `DS_BENCH=1`; the thresholds of the
/// non-benchmark variant are generous for CI.
@Suite(.serialized) struct SyncPerfTests {
    struct Library {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        var accountId = EntityID.make()
        var notebooks: [String] = []
        var notes: [String: [String]] = [:]
    }

    /// Server state as other devices left it: an account listing the notebooks, notebook
    /// indexes listing the notes, notes of ~25 KB.
    static func makeLibrary(notebooks: Int, notesPerNotebook: Int, noteBytes: Int) async throws -> Library {
        var lib = Library()
        func seed(_ doc: CRDTDocument) async throws {
            await lib.server.register(doc.docId)
            await lib.server.seed(docId: doc.docId, payload: try DSCrypto.seal(try doc.encodeStateAsUpdate(), key: lib.key, ad: CryptoAD.doc(doc.docId)))
        }
        let account = AccountDocument(accountDocId: lib.accountId)
        try account.initialize()
        let space = Space(name: "S", order: 1)
        try account.putSpace(space)
        let words = String(repeating: "word ", count: noteBytes / 5)
        for n in 0..<notebooks {
            let nb = NotebookDocument(notebookId: EntityID.make())
            try nb.initialize()
            lib.notebooks.append(nb.notebookId)
            try account.putNotebook(NotebookRef(id: nb.notebookId, spaceId: space.id, name: "NB \(n)", order: Double(n)))
            for i in 0..<notesPerNotebook {
                let note = NoteDocument(noteId: EntityID.make())
                try note.initialize(title: "Note \(i)")
                try note.appendBlocks([.paragraph(words)])
                try await seed(note.crdt)
                lib.notes[nb.notebookId, default: []].append(note.noteId)
                try nb.putNote(NoteMeta(id: note.noteId, title: "Note \(i)", wrappedKey: "AQ", order: Double(i)))
            }
            try await seed(nb.crdt)
        }
        try await seed(account.crdt)
        return lib
    }

    /// The app's path on a fresh device: open the account, then the notebooks it lists, then
    /// the notes their indexes list (every document opened live, like CoreLibrary does).
    /// Returns (account, indexes, all notes) times from start.
    static func freshSync(_ lib: Library, oneWay: Duration, restLatency: Duration, label: String) async throws -> (Duration, Duration, Duration, Int) {
        let registrations = Locked(0)
        let server = lib.server
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "fresh", clientVersion: "bench")
        config.minBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: LatencyFactory(server: server, oneWay: oneWay)) { .user(accessToken: "t") }
        let key = lib.key
        let engine = SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in key }, register: { record in
            registrations.withLock { $0 += 1 }
            try await Task.sleep(for: restLatency)
            await server.register(record.docId)
        })
        let clock = ContinuousClock()
        let start = clock.now
        await engine.start()
        let account = AccountDocument(accountDocId: lib.accountId)
        try await engine.open(account.crdt, notebookId: nil)
        while account.notebooks().count < lib.notebooks.count { try await Task.sleep(for: .milliseconds(5)) }
        let tAccount = clock.now - start

        var notebookDocs: [NotebookDocument] = []
        for id in lib.notebooks {
            let nb = NotebookDocument(notebookId: id)
            notebookDocs.append(nb)
            let crdt = nb.crdt
            Task { try? await engine.open(crdt, notebookId: id) }
        }
        var openedNotes: [NoteDocument] = []
        var opened = Set<String>()
        var tIndexes: Duration?
        let total = lib.notes.values.map(\.count).reduce(0, +)
        while openedNotes.count < total || !openedNotes.allSatisfy({ (try? $0.title()) != nil && (try? $0.title()) != "" }) {
            for nb in notebookDocs {
                for meta in nb.notes() where !opened.contains(meta.id) {
                    opened.insert(meta.id)
                    let note = NoteDocument(noteId: meta.id)
                    openedNotes.append(note)
                    // Like CoreLibrary → ServerConnection.documentOpened: one Task per document.
                    let crdt = note.crdt
                    let nbId = nb.notebookId
                    Task { try? await engine.open(crdt, notebookId: nbId) }
                }
            }
            if tIndexes == nil, opened.count == total { tIndexes = clock.now - start }
            try await Task.sleep(for: .milliseconds(5))
            if clock.now - start > .seconds(120) { break }
        }
        let tNotes = clock.now - start
        await engine.stop()
        print("BENCH \(label): account \(tAccount), indexes \(tIndexes ?? .zero), all \(total) notes \(tNotes), registrations \(registrations.withLock { $0 })")
        return (tAccount, tIndexes ?? tNotes, tNotes, registrations.withLock { $0 })
    }

    /// What the app's `CoreLibrary.loadSnapshot` does after every remote change: every note's
    /// blocks and meta, plus the notebook indexes.
    @Test(.enabled(if: ProcessInfo.processInfo.environment["DS_BENCH"] != nil))
    func benchFullLibraryReread() async throws {
        let words = String(repeating: "word ", count: 5_000)
        var notes: [NoteDocument] = []
        for i in 0..<51 {
            let note = NoteDocument(noteId: EntityID.make())
            try note.initialize(title: "Note \(i)")
            try note.appendBlocks([.paragraph(words)])
            notes.append(note)
        }
        let clock = ContinuousClock()
        let start = clock.now
        for note in notes { _ = try note.blocks(); _ = note.meta() }
        print("BENCH full library re-read (51 notes x 25 KB: blocks + meta): \(clock.now - start)")
        let start2 = clock.now
        for note in notes { _ = try note.title() }
        print("BENCH titles only (51 notes): \(clock.now - start2)")
    }

    /// The device knows every document (from the indexes) but has not registered them — they
    /// were made on other devices — and connects: the time until all are caught up.
    static func reconnectWithKnownDocs(_ lib: Library, oneWay: Duration, restLatency: Duration, label: String) async throws -> Duration {
        let registrations = Locked(0)
        let server = lib.server
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "known", clientVersion: "bench")
        config.minBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: LatencyFactory(server: server, oneWay: oneWay)) { .user(accessToken: "t") }
        let key = lib.key
        let store = try LocalStore.inMemory()
        try store.ensureDocument(docId: lib.accountId, kind: .account, notebookId: nil)
        for nb in lib.notebooks {
            try store.ensureDocument(docId: nb, kind: .notebook, notebookId: nb)
            for n in lib.notes[nb] ?? [] { try store.ensureDocument(docId: n, kind: .note, notebookId: nb) }
        }
        let engine = SyncEngine(store: store, client: client, keyFor: { _ in key }, register: { record in
            registrations.withLock { $0 += 1 }
            try await Task.sleep(for: restLatency)
            await server.register(record.docId)
        })
        let total = 1 + lib.notebooks.count + lib.notes.values.map(\.count).reduce(0, +)
        let clock = ContinuousClock()
        let start = clock.now
        await engine.start()
        while try await store.db.read({ try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM documents WHERE lastSeq > 0") ?? 0 }) < total {
            try await Task.sleep(for: .milliseconds(5))
            if clock.now - start > .seconds(120) { break }
        }
        let elapsed = clock.now - start
        await engine.stop()
        print("BENCH \(label): \(total) documents caught up in \(elapsed), registrations \(registrations.withLock { $0 })")
        return elapsed
    }

    /// spec targets with generous CI margins (RTT 100 ms): a fresh sync of 51 notes of 25 KB
    /// well under 10 s, known documents caught up after connecting without any `POST /docs`,
    /// and the focused (open) note caught up before the rest of a large library.
    @Test func syncSpeedTargets() async throws {
        let lib = try await Self.makeLibrary(notebooks: 3, notesPerNotebook: 17, noteBytes: 25_000)
        let (_, _, all, registrations) = try await Self.freshSync(lib, oneWay: .milliseconds(50), restLatency: .milliseconds(100), label: "fresh sync")
        #expect(all < .seconds(10))
        #expect(registrations == 0)
        let lib2 = try await Self.makeLibrary(notebooks: 3, notesPerNotebook: 17, noteBytes: 25_000)
        #expect(try await Self.reconnectWithKnownDocs(lib2, oneWay: .milliseconds(50), restLatency: .milliseconds(100), label: "known docs") < .seconds(5))
    }

    @Test func focusedNoteIsCaughtUpFirst() async throws {
        let lib = try await Self.makeLibrary(notebooks: 2, notesPerNotebook: 60, noteBytes: 5_000)
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "focus", clientVersion: "test")
        config.minBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: LatencyFactory(server: lib.server, oneWay: .milliseconds(20))) { .user(accessToken: "t") }
        let store = try LocalStore.inMemory()
        let caughtUp = Locked<[String]>([])
        let key = lib.key
        let engine = SyncEngine(store: store, client: client, keyFor: { _ in key }, register: nil)
        await engine.setTraceHandler { event in
            if case .caughtUp(let id) = event { caughtUp.withLock { $0.append(id) } }
        }
        try store.ensureDocument(docId: lib.accountId, kind: .account, notebookId: nil)
        var notes: [String] = []
        for nb in lib.notebooks {
            try store.ensureDocument(docId: nb, kind: .notebook, notebookId: nb)
            for n in lib.notes[nb] ?? [] { try store.ensureDocument(docId: n, kind: .note, notebookId: nb); notes.append(n) }
        }
        let open = notes[notes.count - 7]
        await engine.focus(open)
        await engine.start()
        #expect(try await eventually(timeout: .seconds(20)) { caughtUp.withLock { $0.count } == 1 + lib.notebooks.count + notes.count })
        let order = caughtUp.withLock { $0 }
        // Account and indexes first, then the open note, before every other note.
        #expect(order.firstIndex(of: open)! <= 1 + lib.notebooks.count)
        await engine.stop()
    }

    @Test(.enabled(if: ProcessInfo.processInfo.environment["DS_BENCH"] != nil))
    func benchReconnectKnownDocs() async throws {
        let lib = try await Self.makeLibrary(notebooks: 3, notesPerNotebook: 17, noteBytes: 25_000)
        _ = try await Self.reconnectWithKnownDocs(lib, oneWay: .milliseconds(50), restLatency: .milliseconds(100), label: "connect with 55 known, unregistered docs, RTT 100 ms")
    }

    @Test(.enabled(if: ProcessInfo.processInfo.environment["DS_BENCH"] != nil))
    func benchFreshSync() async throws {
        let lib = try await Self.makeLibrary(notebooks: 3, notesPerNotebook: 17, noteBytes: 25_000)
        _ = try await Self.freshSync(lib, oneWay: .milliseconds(50), restLatency: .milliseconds(100), label: "fresh sync, 3 notebooks + 51 notes x 25 KB, RTT 100 ms")
        let lib2 = try await Self.makeLibrary(notebooks: 3, notesPerNotebook: 17, noteBytes: 25_000)
        _ = try await Self.freshSync(lib2, oneWay: .milliseconds(50), restLatency: .zero, label: "same, registration free")
        let lib3 = try await Self.makeLibrary(notebooks: 3, notesPerNotebook: 17, noteBytes: 25_000)
        _ = try await Self.freshSync(lib3, oneWay: .zero, restLatency: .zero, label: "same, no latency at all")
    }
}
