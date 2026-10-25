import Foundation
#if canImport(Darwin)
import Darwin
#endif
import Testing
@testable import DSCore

/// Performance targets of docs/spec/11-nfr.md. Run with `DS_BENCH=1 swift test --filter Benchmark`
/// (in xcodebuild: `TEST_RUNNER_DS_BENCH=1`). Timings are printed; the limits are the spec's.
@Suite(.serialized, .enabled(if: ProcessInfo.processInfo.environment["DS_BENCH"] != nil, "set DS_BENCH=1"))
struct BenchmarkTests {
    static func measure<T>(_ label: String, _ body: () async throws -> T) async rethrows -> (T, Duration) {
        let clock = ContinuousClock()
        let start = clock.now
        let value = try await body()
        let elapsed = clock.now - start
        print("BENCH \(label): \(elapsed)")
        return (value, elapsed)
    }

    /// Memory the process uses: `phys_footprint` on Apple platforms (what jetsam counts),
    /// resident set size on Linux.
    static func memoryFootprint() -> Int {
        #if canImport(Darwin)
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let kr = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count) }
        }
        return kr == KERN_SUCCESS ? Int(info.phys_footprint) : 0
        #else
        let status = (try? String(contentsOfFile: "/proc/self/status", encoding: .utf8)) ?? ""
        let line = status.split(separator: "\n").first { $0.hasPrefix("VmRSS:") } ?? ""
        return (Int(line.split(separator: " ").dropFirst().first ?? "") ?? 0) * 1024
        #endif
    }

    static func reportMemory(_ label: String, since base: Int) {
        let mb = Double(memoryFootprint() - base) / 1_048_576
        print("BENCH memory \(label): \(String(format: "%.1f", mb)) MB")
    }

    /// A typical note: title + a few paragraphs (~150 words) + a task.
    static func sampleNote(_ i: Int) throws -> Data {
        let note = NoteDocument(noteId: EntityID.make())
        try note.initialize(title: "Note \(i)", origin: .local)
        let words = (0..<150).map { "word\(($0 * 7 + i) % 997)" }.joined(separator: " ")
        try note.appendBlocks([.paragraph(words), .container(BlockType.taskList, [.taskItem("Task \(i)")])], origin: .local)
        return try note.crdt.encodeStateAsUpdate()
    }

    /// First sync of 10 000 notes without attachments: ≤ 1 min (spec/11).
    @Test func firstSyncOf10kNotes() async throws {
        let count = Int(ProcessInfo.processInfo.environment["DS_BENCH_NOTES"] ?? "10000")!
        let key = DSCrypto.newKey()
        let server = FakeSyncServer()
        // Server state as another device left it: one encrypted update per note.
        let template = try Self.sampleNote(0)
        var ids: [String] = []
        for _ in 0..<count {
            let id = EntityID.make()
            ids.append(id)
            await server.register(id)
            await server.seed(docId: id, payload: try DSCrypto.seal(template, key: key, ad: CryptoAD.doc(id)))
        }

        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        defer { try? FileManager.default.removeItem(at: dir) }
        let store = try LocalStore(url: dir.appendingPathComponent("db.sqlite"))
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "new", clientVersion: "bench")
        config.minBackoff = .milliseconds(10)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let engine = SyncEngine(store: store, client: client, keyFor: { _ in key }, register: nil)
        // The new device learned the note ids from the notebook document.
        let allIds = ids
        try await store.db.write { db in
            for id in allIds {
                var r = DocumentRecord(docId: id, kind: .note, notebookId: "nb")
                r.registered = true
                try r.insert(db)
            }
        }

        // Baseline: the fake server already holds every encrypted note (test-only memory).
        let base = Self.memoryFootprint()
        let (_, sync) = try await Self.measure("first sync of \(count) notes (subscribe, decrypt, store)") {
            await engine.start()
            while try await store.db.read({ try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM documents WHERE lastSeq > 0") ?? 0 }) < count {
                try await Task.sleep(for: .milliseconds(20))
            }
        }
        // Building the local indexes (search, tasks) is part of a usable first sync.
        let (_, indexing) = try await Self.measure("index \(count) notes (load, derive, FTS)") {
            var batch: [(derived: NoteDerivedData, notebookId: String?)] = []
            for id in ids {
                let note = NoteDocument(noteId: id)
                try note.crdt.applyUpdates(try store.updates(docId: id), origin: .storage)
                batch.append((try note.derived(), "nb"))
                if batch.count == 500 { try store.index(batch); batch.removeAll() }
            }
            try store.index(batch)
        }
        // Only open documents are live; the rest is in SQLite.
        Self.reportMemory("after first sync + indexing of \(count) notes (no live documents)", since: base)
        let opened = NoteDocument(noteId: ids[0])
        try await engine.open(opened.crdt, notebookId: "nb")
        Self.reportMemory("with one note open", since: base)
        await engine.close(docId: ids[0])
        // For comparison: what keeping every note as a live document would cost.
        var all: [NoteDocument] = []
        all.reserveCapacity(count)
        for id in ids {
            let note = NoteDocument(noteId: id)
            try note.crdt.applyUpdates(try store.updates(docId: id), origin: .storage)
            all.append(note)
        }
        Self.reportMemory("if all \(count) notes were live documents", since: base)
        all.removeAll()
        await engine.stop()
        #expect(try store.search("word5").count > 0)
        #expect(sync + indexing < .seconds(60))
    }

    /// Opening a note of 10 000 words: ≤ 300 ms (spec/11).
    @Test func openNoteOf10kWords() async throws {
        let source = NoteDocument(noteId: EntityID.make())
        try source.initialize(title: "Long")
        var blocks: [Block] = []
        for p in 0..<500 {
            blocks.append(.paragraph((0..<20).map { "w\(p)x\($0)" }.joined(separator: " ")))
        }
        try source.appendBlocks(blocks)
        let state = try source.crdt.encodeStateAsUpdate()

        let (_, elapsed) = try await Self.measure("open note of 10 000 words (apply + blocks)") {
            let note = NoteDocument(noteId: source.noteId)
            try note.crdt.applyUpdate(state, origin: .storage)
            return try note.blocks().count
        }
        #expect(elapsed < .milliseconds(300))
    }

    /// Cold start: open the database, load the account and a notebook with 10 000 notes,
    /// list them: ≤ 1 s (spec/11).
    @Test func coldStart() async throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("db.sqlite")
        let notebookId = EntityID.make()
        do {
            let store = try LocalStore(url: url)
            try store.ensureDocument(docId: notebookId, kind: .notebook, notebookId: notebookId)
            let nb = NotebookDocument(notebookId: notebookId)
            try nb.initialize()
            for i in 0..<10_000 {
                try nb.putNote(NoteMeta(title: "Note \(i)", wrappedKey: "AQ", order: Double(i)))
            }
            try store.appendRemoteUpdates(docId: notebookId, items: [(1, try nb.crdt.encodeStateAsUpdate())])
        }
        _ = try await Self.measure("  part: open db + read updates") { try LocalStore(url: url).updates(docId: notebookId) }
        let updates = try LocalStore(url: url).updates(docId: notebookId)
        let nb2 = NotebookDocument(notebookId: notebookId)
        _ = try await Self.measure("  part: apply notebook update") { try nb2.crdt.applyUpdates(updates, origin: .storage) }
        _ = try await Self.measure("  part: mapValue(notes) via FFI") { nb2.crdt.mapValue("notes") }
        _ = try await Self.measure("  part: notes() typed") { nb2.notes().count }
        let (count, elapsed) = try await Self.measure("cold start (open db, load notebook with 10 000 notes, list)") {
            let store = try LocalStore(url: url)
            let nb = NotebookDocument(notebookId: notebookId)
            try nb.crdt.applyUpdates(try store.updates(docId: notebookId), origin: .storage)
            return nb.notes().count
        }
        #expect(count == 10_000)
        #expect(elapsed < .seconds(1))
    }
}

extension FakeSyncServer {
    func seed(docId: String, payload: Data) {
        let seq = (nextSeq[docId] ?? 0) + 1
        nextSeq[docId] = seq
        docs[docId, default: []].append(Stored(seq: seq, payload: payload, deviceId: "other"))
    }
}
