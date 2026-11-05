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
}
