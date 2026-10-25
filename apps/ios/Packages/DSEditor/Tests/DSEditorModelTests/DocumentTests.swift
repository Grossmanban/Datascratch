import DSEditorModel
import DSInk
import Foundation
import Testing

@MainActor
func makeDoc(_ text: String = "Hello brave new world") -> (InMemoryEditorDocument, BlockID) {
    let p = BlockNode.paragraph(text)
    let doc = InMemoryEditorDocument(blocks: [.title("T"), p], clientID: 7)
    doc.captureTimeout = 0
    return (doc, p.id)
}

@MainActor
@Suite struct RelativePositionTests {
    @Test func yjsCompatibleEncoding() {
        // Yjs: encodeRelativePosition(createRelativePositionFromTypeIndex(..)) for item {client: 1, clock: 2}, assoc 0.
        #expect([UInt8](RelativePositionCodec.encode(item: ItemID(client: 1, clock: 2))) == [0, 1, 2, 0])
        // Multi-byte varUint and negative assoc.
        let data = RelativePositionCodec.encode(item: ItemID(client: 300, clock: 128), assoc: -1)
        #expect([UInt8](data) == [0, 0xAC, 0x02, 0x80, 0x01, 0x41])
        let decoded = RelativePositionCodec.decode(data)
        #expect(decoded?.item == ItemID(client: 300, clock: 128))
        #expect(decoded?.assoc == -1)
        #expect(RelativePositionCodec.decode(Data([1, 3, 0x61, 0x62, 0x63, 0])) == nil)
    }

    @Test func anchorFollowsInsertions() {
        let (doc, b) = makeDoc()
        let anchor = doc.anchor(block: b, offset: 6)!   // "b" of "brave"
        doc.insertText("Oh, ", marks: .empty, block: b, at: 0)
        #expect(doc.resolveAnchor(anchor) == TextPosition(block: b, offset: 10))
        doc.deleteText(block: b, range: 0..<2)
        #expect(doc.resolveAnchor(anchor) == TextPosition(block: b, offset: 8))
    }

    @Test func deletedAnchorResolvesToNilAndUndoRestores() {
        let (doc, b) = makeDoc()
        let anchor = doc.anchor(block: b, offset: 7)!
        doc.stopCapturing()
        doc.deleteText(block: b, range: 6..<12)
        #expect(doc.resolveAnchor(anchor) == nil)
        doc.undo()
        #expect(doc.resolveAnchor(anchor) == TextPosition(block: b, offset: 7))
        doc.redo()
        #expect(doc.resolveAnchor(anchor) == nil)
    }

    @Test func anchorInDeletedBlockIsNil() {
        let (doc, b) = makeDoc()
        let anchor = doc.anchor(block: b, offset: 0)!
        doc.deleteBlock(b)
        #expect(doc.resolveAnchor(anchor) == nil)
        doc.undo()
        #expect(doc.resolveAnchor(anchor) != nil)
    }
}

@MainActor
@Suite struct DocumentModelTests {
    @Test func textAndMarks() {
        let (doc, b) = makeDoc("abcdef")
        doc.setMark(MarkName.bold, value: true, block: b, range: 1..<3)
        let runs = doc.inline(of: b, range: nil)
        #expect(runs == [.text("a", .empty), .text("bc", MarkSet([MarkName.bold: .bool(true)])), .text("def", .empty)])
        doc.insertAtom(.tag("x"), marks: .empty, block: b, at: 6)
        #expect(doc.textLength(of: b) == 7)
        #expect(doc.flatText(of: b) == "abcdef\u{FFFC}")
    }

    @Test func undoGroupsByCaptureTimeout() {
        let (doc, b) = makeDoc("")
        var t = Date(timeIntervalSince1970: 0)
        doc.now = { t }
        doc.captureTimeout = 0.5
        doc.insertText("a", marks: .empty, block: b, at: 0)
        t += 0.1
        doc.insertText("b", marks: .empty, block: b, at: 1)
        t += 1
        doc.insertText("c", marks: .empty, block: b, at: 2)
        doc.undo()
        #expect(doc.flatText(of: b) == "ab")
        doc.undo()
        #expect(doc.flatText(of: b) == "")
        #expect(!doc.canUndo)
    }

    @Test func strokesUndoTogetherWithText() {
        let (doc, b) = makeDoc()
        let s = Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text,
                       anchors: [doc.anchor(block: b, offset: 0)!], points: [StrokePoint(a: 0, x: 0, y: 0)])
        doc.stopCapturing()
        doc.transact {
            doc.addStroke(s)
            doc.insertText("!", marks: .empty, block: b, at: 0)
        }
        #expect(doc.strokes.count == 1)
        doc.undo()
        #expect(doc.strokes.isEmpty)
        #expect(doc.flatText(of: b) == "Hello brave new world")
        doc.redo()
        #expect(doc.stroke(s.id) == s)
    }

    @Test func observersGetChanges() {
        let (doc, b) = makeDoc()
        var changes: [DocumentChange] = []
        let token = doc.observe { changes.append($0) }
        doc.insertText("x", marks: .empty, block: b, at: 0)
        doc.transact(origin: .textInput) { doc.deleteText(block: b, range: 0..<1) }
        #expect(changes.count == 2)
        #expect(changes[0].textBlocks == [b])
        #expect(changes[1].origin == .textInput)
        token.cancel()
        doc.insertText("y", marks: .empty, block: b, at: 0)
        #expect(changes.count == 2)
    }

    @Test func persistenceKeepsAnchorsAndTombstones() throws {
        let (doc, b) = makeDoc()
        let anchor = doc.anchor(block: b, offset: 6)!
        let s = Stroke(tool: .marker, color: "#FF0000", width: 3, anchorKind: .text, anchors: [anchor],
                       points: [StrokePoint(a: 0, x: 0.1, y: 0.2, pressure: 0.5)])
        doc.addStroke(s)
        doc.deleteText(block: b, range: 0..<6)
        let data = try doc.fileData()
        let loaded = try InMemoryEditorDocument(fileData: data)
        #expect(loaded.resolveAnchor(anchor) == TextPosition(block: b, offset: 0))
        #expect(loaded.strokes == [s])
        #expect(loaded.blocks == doc.blocks)
        // New items after reload must not collide with old ids.
        loaded.insertText("Z", marks: .empty, block: b, at: 0)
        #expect(loaded.resolveAnchor(anchor) == TextPosition(block: b, offset: 1))
    }
}
