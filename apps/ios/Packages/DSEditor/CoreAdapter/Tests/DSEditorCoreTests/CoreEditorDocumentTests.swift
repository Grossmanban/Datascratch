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
