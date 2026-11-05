import Testing
import Foundation
@testable import DSCore

/// One document used from several threads at once (build 35 crashed 1.1 s after launch: the
/// sync engine registered its update observer while the UI was reading the same document).
/// Yrs registers observers and undo managers with a non-blocking lock attempt and panicked when
/// another thread had a transaction open; the panic surfaced as a failed `try!` in the
/// generated bindings. Every call into a document is now serialized per document.
@Suite struct CRDTConcurrencyTests {
    @Test func readsWritesObserversAndUndoFromSeveralThreads() throws {
        let doc = CRDTDocument(kind: .note, docId: EntityID.make())
        let note = NoteDocument(doc)
        try note.initialize(title: "Race")
        let rounds = 400
        // A Rust panic inside a throwing call arrives as an error; in a non-throwing one it
        // stops the process (the build 35 crash). Neither may happen.
        let errors = Locked<[String]>([])
        @Sendable func run(_ body: () throws -> Void) {
            do { try body() } catch { errors.withLock { $0.append("\(error)") } }
        }
        DispatchQueue.concurrentPerform(iterations: 5) { role in
            for i in 0..<rounds {
                switch role {
                case 0:
                    run { try doc.transact(origin: .local) { $0.set("meta", key: "title", .string(value: "t\(i)")) } }
                case 1:
                    run {
                        _ = doc.mapJSON("meta")
                        _ = try doc.xmlChildren()
                        _ = doc.stateVector()
                    }
                case 2:
                    let sub = doc.observeUpdates { _, _ in }
                    sub.cancel()
                case 3:
                    run { try doc.observeDeep("meta") { _, _ in }.cancel() }
                default:
                    run {
                        try doc.enableUndo()
                        _ = try doc.encodeStateAsUpdate()
                    }
                }
            }
        }
        #expect(errors.withLock { $0 }.isEmpty)
        #expect(doc.mapJSON("meta")?["title"] as? String == "t\(rounds - 1)")
    }

    /// What the owner did on build 35 ("quick actions right after launch"): notes opened and
    /// closed one after another by the sync engine (observer attached and detached) while the
    /// UI thread keeps reading and editing them and remote edits arrive.
    @Test func fastNoteSwitchingWhileSyncing() async throws {
        let server = FakeSyncServer()
        let key = DSCrypto.newKey()
        func device(_ name: String) throws -> SyncEngine {
            var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
            config.minBackoff = .milliseconds(10)
            let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
            return SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in key }, register: { await server.register($0.docId) })
        }
        let a = try device("A"), b = try device("B")
        await a.start()
        await b.start()
        let ids = (0..<5).map { _ in EntityID.make() }
        var remote: [NoteDocument] = []
        for id in ids {
            let n = NoteDocument(noteId: id)
            try await a.open(n.crdt, notebookId: "nb")
            try n.initialize(title: "Note")
            remote.append(n)
        }
        let local = ids.map { NoteDocument(noteId: $0) }
        let stop = Locked(false)
        let errors = Locked<[String]>([])
        // The UI: reads every note and types into them, on its own thread.
        let ui = Thread {
            var i = 0
            while !stop.withLock({ $0 }) {
                for n in local {
                    do {
                        let blocks = try n.blocks()
                        _ = try n.title()
                        // Types only once the note's content has arrived.
                        if i % 7 == 0, blocks.count > 1 { try n.insertText("u", at: 0, inBlock: [1]) }
                    } catch DocumentError.notFound {
                    } catch { errors.withLock { $0.append("\(error)") } }
                }
                i += 1
                // A frame's worth of work at most; the gate is fair either way.
                Thread.sleep(forTimeInterval: 0.001)
            }
        }
        ui.start()
        for round in 0..<60 {
            let n = local[round % local.count]
            try await b.open(n.crdt, notebookId: "nb")
            try remote[round % remote.count].insertText("r", at: 0, inBlock: [1])
            await b.close(docId: n.noteId)
        }
        stop.withLock { $0 = true }
        while !ui.isFinished { try await Task.sleep(for: .milliseconds(5)) }
        #expect(errors.withLock { $0 }.isEmpty)
        await a.stop()
        await b.stop()
    }
}

