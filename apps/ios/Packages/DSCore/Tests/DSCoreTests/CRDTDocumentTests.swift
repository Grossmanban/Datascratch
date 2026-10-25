import Foundation
import Testing
@testable import DSCore

struct Fixture {
    static func data(_ name: String) throws -> Data {
        let url = try #require(Bundle.module.url(forResource: name, withExtension: nil, subdirectory: "Fixtures"))
        return try Data(contentsOf: url)
    }

    static func json(_ name: String) throws -> [String: Any] {
        try #require(JSONSerialization.jsonObject(with: data(name)) as? [String: Any])
    }
}

@Suite struct CRDTDocumentTests {
    @Test func readsDocumentWrittenByYjs() throws {
        let fixture = try Fixture.json("yjs-note.json")
        let update = try #require(Base64URL.decode(fixture["update"] as! String))
        let doc = CRDTDocument(kind: .note, docId: "n1")
        try doc.applyUpdate(update)

        let blocks = try doc.xmlChildren()
        #expect(blocks.map(\.elementName) == ["title", "paragraph", "heading", "taskList"])
        #expect(blocks[0].textContent == "Заметка 😀")
        #expect(blocks[2].attributes["level"] == 2)
        #expect(doc.mapValue("meta", ["formatVersion"]) == 1)
        #expect(doc.mapValue("strokes", ["s1", "points"]) == .bytes(value: Data([0, 0, 128, 63])))

        for rp in fixture["relativePositions"] as! [[String: Any]] {
            let path = (rp["path"] as! [Int]).map(UInt32.init)
            let index = UInt32(rp["index"] as! Int)
            let encoded = try #require(Base64URL.decode(rp["encoded"] as! String))
            #expect(try doc.resolve(relativePositions: [encoded]) == [ResolvedIndex(path: path, index: index, deleted: false)])
            #expect(try doc.relativePosition(at: path, index: index, assoc: Int32(rp["assoc"] as! Int)) == encoded)
        }
    }

    @Test func syncsTwoDocumentsAndUndoesLocalEdits() throws {
        let a = CRDTDocument(kind: .note, docId: "n1")
        let b = CRDTDocument(kind: .note, docId: "n1")
        try a.enableUndo()
        let outgoing = Locked<[Data]>([])
        let sub = a.observeUpdates { update, origin in
            if origin.isOutgoing { outgoing.withLock { $0.append(update) } }
        }
        try a.transact { txn in
            txn.insertNodes([.element(name: "paragraph", attributes: ["blockId": "b1"], children: [.text(chunks: [TextChunk(text: "Hi", embed: nil, attributes: [:])])])], into: [], at: 0)
        }
        a.stopCapturing()
        try a.transact { txn in txn.insertText(" there", marks: ["bold": .emptyObject], at: 2, in: [0, 0]) }
        a.undo()
        for u in outgoing.withLock({ $0 }) { try b.applyUpdate(u) }
        #expect(try b.xmlChildren().first?.textContent == "Hi")
        #expect(outgoing.withLock { $0.count } == 3)
        sub.cancel()
    }
}
