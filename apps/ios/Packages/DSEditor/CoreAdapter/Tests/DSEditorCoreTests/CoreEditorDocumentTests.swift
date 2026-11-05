import DSCore
import DSEditorCore
import DSEditorModel
import DSInk
import Foundation
import Testing

@MainActor
func makeCoreDoc(_ text: String = "Hello brave new world") throws -> (CoreEditorDocument, BlockID) {
    let note = NoteDocument(noteId: UUIDv7.generate())
    try note.initialize(title: "T")
    let doc = CoreEditorDocument(note: note)
    let para = doc.blocks[1].id
    doc.insertText(text, marks: .empty, block: para, at: 0)
    doc.stopCapturing()
    return (doc, para)
}

@MainActor
@Suite struct CoreEditorDocumentTests {
    @Test func readsAndWritesText() throws {
        let (doc, b) = try makeCoreDoc("abcdef")
        #expect(doc.flatText(of: b) == "abcdef")
        doc.setMark(MarkName.bold, value: MarkSet.plain, block: b, range: 1..<3)
        #expect(doc.inline(of: b, range: 1..<3).first?.marks.contains(MarkName.bold) == true)
        doc.insertAtom(.tag("x"), marks: .empty, block: b, at: 6)
        #expect(doc.textLength(of: b) == 7)
        doc.deleteText(block: b, range: 0..<1)
        #expect(doc.flatText(of: b) == "bcdef\u{FFFC}")
    }

    @Test func anchorsAreYjsPositionsAndDetectDeletion() throws {
        let (doc, b) = try makeCoreDoc()
        let anchor = try #require(doc.anchor(block: b, offset: 6))
        #expect(RelativePositionCodec.decode(anchor) != nil)
        doc.insertText("Oh, ", marks: .empty, block: b, at: 0)
        #expect(doc.resolveAnchor(anchor) == TextPosition(block: b, offset: 10))
        doc.stopCapturing()
        doc.deleteText(block: b, range: 10..<16)
        #expect(doc.resolveAnchor(anchor) == nil)
        doc.undo()
        #expect(doc.resolveAnchor(anchor) == TextPosition(block: b, offset: 10))
    }

    @Test func strokesRoundTrip() throws {
        let (doc, b) = try makeCoreDoc()
        let s = DSInk.Stroke(tool: .marker, color: "ink.red", width: 3, anchorKind: .text, anchors: [doc.anchor(block: b, offset: 0)!],
                             points: [StrokePoint(a: 0, x: 0.1, y: 0.2, pressure: 0.5, t: 1)], hint: .underline)
        doc.addStroke(s)
        let back = try #require(doc.stroke(s.id))
        #expect(back.points == s.points)
        #expect(back.anchors == s.anchors)
        #expect(back.tool == .marker)
        doc.removeStroke(s.id)
        #expect(doc.strokes.isEmpty)
    }

    @Test func splitKeepsInkThroughCommands() throws {
        let (doc, b) = try makeCoreDoc()
        let anchors = [12, 13, 14].map { doc.anchor(block: b, offset: $0)! }
        let s = DSInk.Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text, anchors: anchors,
                             points: (0..<3).map { StrokePoint(a: Float($0), x: 0, y: 0.1) })
        doc.addStroke(s)
        let caret = try #require(EditorCommands(document: doc).splitParagraph(at: TextPosition(block: b, offset: 12)))
        #expect(doc.flatText(of: b) == "Hello brave ")
        #expect(doc.flatText(of: caret.block) == "new world")
        let moved = try #require(doc.strokes.first)
        #expect(moved.anchors.map { doc.resolveAnchor($0) } == [0, 1, 2].map { TextPosition(block: caret.block, offset: $0) })
    }

    @Test func blockKindsAndProjection() throws {
        let (doc, b) = try makeCoreDoc("Item")
        EditorCommands(document: doc).setBlockKind(.taskList(done: false), at: TextPosition(block: b, offset: 0))
        let p = Projection.build(doc.blocks)
        if case .task = p.paragraphs[1].context.marker {} else { Issue.record("expected a task") }
        #expect(p.paragraphs[1].blockId == b)
    }

    @Test func observersGetChanges() throws {
        let (doc, b) = try makeCoreDoc()
        var count = 0
        let token = doc.observe { _ in count += 1 }
        doc.insertText("x", marks: .empty, block: b, at: 0)
        #expect(count == 1)
        token.cancel()
    }
}

/// Co-authors' carets over the real Yjs document (`spec/04-editor.md`, «Каретки соавторов»):
/// every kind of position y-prosemirror sends maps to a place in the text.
@MainActor
@Suite struct RemoteCursorCoreTests {
    @Test func characterPositionFollowsLocalEdits() throws {
        let (doc, b) = try makeCoreDoc()
        // y-prosemirror inside text: the character at the caret (`createRelativePositionFromTypeIndex(text, 6)`).
        let pos = try doc.note.crdt.relativePosition(at: [1, 0], index: 6)
        #expect(doc.resolveCursor(pos) == TextPosition(block: b, offset: 6))
        doc.insertText("Oh, ", marks: .empty, block: b, at: 0)
        #expect(doc.resolveCursor(pos) == TextPosition(block: b, offset: 10), "insertion before moves the caret")
        doc.insertText("!", marks: .empty, block: b, at: doc.textLength(of: b))
        #expect(doc.resolveCursor(pos) == TextPosition(block: b, offset: 10), "insertion after does not")
        // The character under the caret deleted: the caret stays where it was (unlike a stroke anchor).
        doc.deleteText(block: b, range: 10..<11)
        #expect(doc.resolveAnchor(pos) == nil)
        #expect(doc.resolveCursor(pos) == TextPosition(block: b, offset: 10))
    }

    @Test func endOfTextEmptyBlockAndBetweenBlocks() throws {
        let (doc, b) = try makeCoreDoc("abc")
        // The end of a text, as Yjs encodes it for y-prosemirror: the text node itself with assoc 0
        // (Yrs only produces the assoc -1 form, so the last byte is flipped).
        var end = try doc.note.crdt.relativePosition(at: [1, 0], index: 0, assoc: -1)
        try #require(end.first == 2 && end.last == 0x41, "a type position")
        end[end.count - 1] = 0
        #expect(doc.resolveCursor(end) == TextPosition(block: b, offset: 3))
        doc.insertText("de", marks: .empty, block: b, at: 3)
        #expect(doc.resolveCursor(end) == TextPosition(block: b, offset: 5), "typing at the end keeps the caret at the end")
        // An empty paragraph: the paragraph element itself (Yrs gives that position for assoc -1).
        let empty = BlockNode.paragraph()
        doc.insertBlock(empty, parent: nil, at: 2)
        let inEmpty = try doc.note.crdt.relativePosition(at: [2], index: 0, assoc: -1)
        #expect(doc.resolveCursor(inEmpty) == TextPosition(block: empty.id, offset: 0))
        // Between top-level blocks (the root fragment): before child 2 is the start of the empty paragraph.
        let between = try doc.note.crdt.relativePosition(at: [], index: 2)
        #expect(doc.resolveCursor(between) == TextPosition(block: empty.id, offset: 0))
        #expect(doc.resolveCursor(Data([9, 9])) == nil, "undecodable")
    }

    @Test func awarenessJSONResolvesThroughTheModel() throws {
        let (doc, b) = try makeCoreDoc("Hello brave new world")
        let encoded = try doc.note.crdt.relativePosition(at: [1, 0], index: 6)
        let (item, _) = try #require(RelativePositionCodec.decode(encoded))
        let json = """
        {"user":{"name":"Анна","color":"#D2453B"},"cursor":{"anchor":{"item":{"client":\(item.client),"clock":\(item.clock)},"assoc":0},"head":{"tname":"content","assoc":0}}}
        """
        let c = try #require(RemoteCursor.parse(client: 3, json: json))
        let p = Projection.build(doc.blocks)
        let r = try #require(c.resolve(in: doc, projection: p))
        #expect(r.anchor == p.offset(block: b, offset: 6))
        #expect(r.head == p.offset(block: b, offset: 21), "the end of the note (the root, assoc 0)")
    }
}
