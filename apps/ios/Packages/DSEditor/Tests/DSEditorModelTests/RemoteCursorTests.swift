import DSEditorModel
import Foundation
import Testing

/// Co-authors' carets (`spec/04-editor.md`, «Каретки соавторов»): the web's awareness cursor,
/// sanitized, placed by Yjs relative positions.
@MainActor
@Suite struct RemoteCursorTests {
    /// A web-style awareness state with a caret at `offset` of `block` (`Y.relativePositionToJSON`).
    func state(_ doc: EditorDocument, block: BlockID, offset: Int, head: Int? = nil, name: String = "Анна",
               color: String = "#D2453B", account: String? = nil) throws -> String {
        func json(_ o: Int) throws -> [String: Any] {
            let encoded = try #require(doc.anchor(block: block, offset: o))
            let (item, assoc) = try #require(RelativePositionCodec.decode(encoded))
            return ["type": ["client": 1, "clock": 0], "tname": NSNull(), "item": ["client": item.client, "clock": item.clock], "assoc": assoc]
        }
        var user: [String: Any] = ["name": name, "color": color]
        if let account { user["account"] = account }
        let object: [String: Any] = ["user": user, "cursor": ["anchor": try json(offset), "head": try json(head ?? offset)]]
        return String(decoding: try JSONSerialization.data(withJSONObject: object), as: UTF8.self)
    }

    @Test func jsonPositionsEncodeLikeYjs() {
        let item = RelativePositionCodec.encode(json: ["item": ["client": 300, "clock": 7], "assoc": 0])
        #expect(item == RelativePositionCodec.encode(item: ItemID(client: 300, clock: 7)))
        #expect(item.flatMap(RelativePositionCodec.decode)?.item == ItemID(client: 300, clock: 7))
        // `{ tname: "content", assoc: -1 }`: varUint(1) varString varInt(-1).
        #expect(RelativePositionCodec.encode(json: ["tname": "content", "assoc": -1]) == Data([1, 7] + Array("content".utf8) + [0x41]))
        #expect(RelativePositionCodec.encode(json: ["type": ["client": 5, "clock": 9]]) == Data([2, 5, 9, 0]))
        #expect(RelativePositionCodec.encode(json: ["item": ["client": -1, "clock": 0]]) == nil)
        #expect(RelativePositionCodec.encode(json: ["assoc": 0]) == nil)
        #expect(RelativePositionCodec.encode(json: "x") == nil)
        // The end of a nested text (`{ type }`, assoc 0) is resolved through its start.
        #expect(RelativePositionCodec.nestedTypeStart(of: Data([2, 5, 9, 0])) == Data([2, 5, 9, 0x41]))
        #expect(RelativePositionCodec.nestedTypeStart(of: Data([2, 5, 9, 0x41])) == nil)
        #expect(RelativePositionCodec.nestedTypeStart(of: Data([0, 5, 9, 0])) == nil)
    }

    @Test func positionsGoBackToTheWebsJSON() throws {
        for data in [RelativePositionCodec.encode(item: ItemID(client: 4242, clock: 18)), Data([2, 5, 9, 0]), Data([2, 5, 9, 0x41]),
                     Data([1, 7] + Array("content".utf8) + [0])] {
            let json = try #require(RelativePositionCodec.json(data))
            #expect(RelativePositionCodec.encode(json: json) == data)
        }
        #expect(RelativePositionCodec.json(Data([7])) == nil)
        #expect(RelativePositionCodec.settingAssoc(Data([2, 5, 9, 0x41]), 0) == Data([2, 5, 9, 0]))
        let cursor = try #require(RelativePositionCodec.cursorJSON(anchor: Data([2, 5, 9, 0]), head: RelativePositionCodec.encode(item: ItemID(client: 1, clock: 2))))
        #expect(cursor == #"{"anchor":{"assoc":0,"type":{"client":5,"clock":9}},"head":{"assoc":0,"item":{"client":1,"clock":2}}}"#)
    }

    /// This device's caret, sent as JSON and read back as a co-author's, lands on the same place.
    @Test func localCaretRoundTripsThroughJSON() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello brave new world")])
        let para = doc.blocks[1].id
        let a = try #require(doc.cursorPosition(block: para, offset: 6))
        let h = try #require(doc.cursorPosition(block: para, offset: 11))
        let cursor = try #require(RelativePositionCodec.cursorJSON(anchor: a, head: h))
        let state = ##"{"user":{"name":"iPad","color":"#2E5BDB"},"cursor":"## + cursor + "}"
        let c = try #require(RemoteCursor.parse(client: 9, json: state))
        let p = Projection.build(doc.blocks)
        let r = try #require(c.resolve(in: doc, projection: p))
        #expect(r.anchor == p.offset(block: para, offset: 6) && r.head == p.offset(block: para, offset: 11))
    }

    @Test func nameAndColourAreSanitizedLikeTheWeb() {
        #expect(RemoteCursor.sanitizedName("  Анна\u{202E}\u{0007} ") == "Анна")
        #expect(RemoteCursor.sanitizedName("\u{2066}\u{0001}") == "Гость")
        #expect(RemoteCursor.sanitizedName(String(repeating: "я", count: 100)).count == 64)
        #expect(RemoteCursor.sanitizedColor("#3E8E5A") == "#3E8E5A")
        #expect(RemoteCursor.sanitizedColor("#abc") == "#abc")
        #expect(RemoteCursor.sanitizedColor("red;background:url(x)") == RemoteCursor.defaultColor)
        #expect(RemoteCursor.sanitizedColor("#12") == RemoteCursor.defaultColor)
        #expect(RemoteCursor.sanitizedColor("#12345g") == RemoteCursor.defaultColor)
    }

    @Test func parsesTheWebsAwarenessStateAndSkipsOwnDevices() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello brave new world")])
        let para = doc.blocks[1].id
        let json = try state(doc, block: para, offset: 6, name: "\u{202E}Анна", color: "url(x)", account: "acc-2")
        let c = try #require(RemoteCursor.parse(client: 42, json: json))
        #expect(c.id == 42 && c.name == "Анна" && c.color == RemoteCursor.defaultColor && c.account == "acc-2")
        #expect(c.anchor == c.head)
        #expect(RemoteCursor.parse(client: 42, json: json, excludingAccount: "acc-2") == nil, "own other device")
        #expect(RemoteCursor.parse(client: 42, json: json, excludingAccount: "acc-1") != nil)
        #expect(RemoteCursor.parse(client: 1, json: ##"{"user":{"name":"Без курсора","color":"#2E5BDB"}}"##) == nil)
        #expect(RemoteCursor.parse(client: 1, json: "not json") == nil)
    }

    /// The caret stays on its character: text typed before it moves it, text after does not.
    @Test func caretFollowsItsCharacterThroughLocalEdits() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello brave new world")])
        let para = doc.blocks[1].id
        let c = try #require(RemoteCursor.parse(client: 7, json: try state(doc, block: para, offset: 6)))
        func caret() -> Int? { c.resolve(in: doc, projection: Projection.build(doc.blocks))?.head }
        let start = Projection.build(doc.blocks).offset(block: para, offset: 6)
        #expect(caret() == start)
        doc.transact { doc.insertText("Oh, ", marks: .empty, block: para, at: 0) }
        #expect(caret() == start.map { $0 + 4 }, "insertion before the caret moves it")
        doc.transact { doc.insertText("!!!", marks: .empty, block: para, at: doc.textLength(of: para)) }
        #expect(caret() == start.map { $0 + 4 }, "insertion after the caret does not")
        doc.transact { doc.insertBlock(.paragraph("Новый абзац"), parent: nil, at: 1) }
        #expect(caret() == Projection.build(doc.blocks).offset(block: para, offset: 10), "a block above shifts the flat offset")
    }

    @Test func selectionResolvesBothEnds() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello brave new world")])
        let para = doc.blocks[1].id
        let c = try #require(RemoteCursor.parse(client: 7, json: try state(doc, block: para, offset: 6, head: 11)))
        let p = Projection.build(doc.blocks)
        let r = try #require(c.resolve(in: doc, projection: p))
        #expect(r.anchor == p.offset(block: para, offset: 6))
        #expect(r.head == p.offset(block: para, offset: 11))
        // Through the editor's read-only gate too.
        #expect(c.resolve(in: ReadOnlyDocument(doc, locked: true), projection: p)?.head == r.head)
    }
}
