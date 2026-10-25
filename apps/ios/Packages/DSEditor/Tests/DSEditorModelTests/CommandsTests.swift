import DSEditorModel
import DSInk
import Foundation
import Testing

@MainActor
func textStroke(_ doc: EditorDocument, block: BlockID, offsets: [Int]) -> Stroke {
    let anchors = offsets.map { doc.anchor(block: block, offset: $0)! }
    let s = Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text, anchors: anchors,
                   points: offsets.indices.map { StrokePoint(a: Float($0), x: 0.1, y: 0.2) })
    doc.addStroke(s)
    return s
}

@MainActor
func resolved(_ doc: EditorDocument, _ s: Stroke) -> [TextPosition?] { s.anchors.map { doc.resolveAnchor($0) } }

@MainActor
@Suite struct CommandsTests {
    @Test func projectionMapsOffsets() {
        let doc = InMemoryEditorDocument(blocks: [.title("Ab"), .paragraph("cde"), .math("x"), .bulletList(["f", "gh"])])
        let p = Projection.build(doc.blocks)
        #expect(p.text == "Ab\ncde\n\u{FFFC}\nf\ngh")
        #expect(p.paragraphs.count == 5)
        #expect(p.position(at: 4) == (1, 1))
        #expect(p.position(at: 6) == (1, 3))
        #expect(p.paragraphs[3].context.marker == .bullet)
        #expect(p.paragraphs[4].context.listDepth == 1)
        #expect(p.length == p.text.utf16.count)
    }

    @Test func orderedListNumbers() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .orderedList(["a", "b", "c"])])
        let p = Projection.build(doc.blocks)
        #expect(p.paragraphs.compactMap(\.context.marker) == [.ordered(1), .ordered(2), .ordered(3)])
    }

    @Test func splitKeepsStrokesOnMovedText() {
        let (doc, b) = makeDoc("Hello brave new world")
        let s = textStroke(doc, block: b, offsets: [12, 13, 14])   // "new"
        let cmd = EditorCommands(document: doc)
        let caret = cmd.splitParagraph(at: TextPosition(block: b, offset: 12))!
        #expect(doc.flatText(of: b) == "Hello brave ")
        #expect(doc.flatText(of: caret.block) == "new world")
        let replaced = doc.stroke(s.id)!
        #expect(resolved(doc, replaced) == [0, 1, 2].map { TextPosition(block: caret.block, offset: $0) })
        #expect(replaced.points == s.points)
        #expect(doc.strokes.count == 1)
        // Undo brings back the original stroke on the original characters.
        doc.undo()
        #expect(doc.flatText(of: b) == "Hello brave new world")
        #expect(resolved(doc, doc.stroke(s.id)!) == [12, 13, 14].map { TextPosition(block: b, offset: $0) })
        #expect(doc.strokes.count == 1)
    }

    @Test func splitAtStartKeepsAnchorsUntouched() {
        let (doc, b) = makeDoc("abc")
        let s = textStroke(doc, block: b, offsets: [0, 1])
        let cmd = EditorCommands(document: doc)
        let caret = cmd.splitParagraph(at: TextPosition(block: b, offset: 0))!
        #expect(caret == TextPosition(block: b, offset: 0))
        #expect(doc.stroke(s.id) != nil)
        #expect(Projection.build(doc.blocks).text == "T\n\nabc")
    }

    @Test func joinBackwardMergesAndReanchors() {
        let a = BlockNode.paragraph("abc"), b = BlockNode.paragraph("def")
        let doc = InMemoryEditorDocument(blocks: [.title(""), a, b])
        let s = textStroke(doc, block: b.id, offsets: [1])
        let margin = Stroke(tool: .pen, color: "ink.blue", width: 2, anchorKind: .block, blockId: b.id,
                            points: [StrokePoint(x: 1.1, y: 0)])
        doc.addStroke(margin)
        let caret = EditorCommands(document: doc).joinBackward(at: TextPosition(block: b.id, offset: 0))
        #expect(caret == TextPosition(block: a.id, offset: 3))
        #expect(doc.flatText(of: a.id) == "abcdef")
        #expect(doc.block(b.id) == nil)
        let moved = doc.stroke(s.id)!
        #expect(resolved(doc, moved) == [TextPosition(block: a.id, offset: 4)])
        #expect(doc.strokes.first { $0.anchorKind == .block }?.blockId == a.id)
    }

    @Test func crossParagraphReplace() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("abc"), .paragraph("def"), .paragraph("ghi")])
        let cmd = EditorCommands(document: doc)
        // Delete from "b" to "h": "abc\ndef\nghi" → "a" + "hi"... offsets: title(0) \n abc(1..4) \n def(5..8) \n ghi(9..12)
        let caret = cmd.replace(2..<10, with: "X")
        #expect(Projection.build(doc.blocks).text == "\naXhi")
        #expect(caret?.offset == 2)
    }

    @Test func newlineInReplaceSplits() {
        let (doc, b) = makeDoc("abcd")
        let cmd = EditorCommands(document: doc)
        let start = Projection.build(doc.blocks).offset(block: b, offset: 2)!
        cmd.replace(start..<start, with: "1\n2")
        #expect(Projection.build(doc.blocks).text == "T\nab1\n2cd")
    }

    @Test func listEnterCreatesItemAndEmptyEnterLifts() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .bulletList(["one"])])
        let cmd = EditorCommands(document: doc)
        let first = Projection.build(doc.blocks).paragraphs[1].blockId
        let c1 = cmd.splitParagraph(at: TextPosition(block: first, offset: 3))!
        var p = Projection.build(doc.blocks)
        #expect(p.paragraphs.count == 3)
        #expect(p.paragraphs[2].context.marker == .bullet)
        let c2 = cmd.splitParagraph(at: c1)!
        p = Projection.build(doc.blocks)
        #expect(p.paragraphs[2].context.marker == nil)
        #expect(p.paragraphs[2].context.listDepth == 0)
        #expect(c2.block == p.paragraphs[2].blockId)
    }

    @Test func indentAndOutdent() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .bulletList(["a", "b"])])
        let cmd = EditorCommands(document: doc)
        var p = Projection.build(doc.blocks)
        let bText = p.paragraphs[2].blockId
        let s = textStroke(doc, block: bText, offsets: [0])
        let item = p.paragraphs[2].context.itemBlockId!
        #expect(cmd.indentItem(item))
        p = Projection.build(doc.blocks)
        #expect(p.paragraphs[2].context.listDepth == 2)
        let moved = doc.stroke(s.id)!
        #expect(resolved(doc, moved) == [TextPosition(block: bText, offset: 0)])
        #expect(cmd.outdentItem(item))
        p = Projection.build(doc.blocks)
        #expect(p.paragraphs[2].context.listDepth == 1)
        #expect(resolved(doc, doc.strokes.first!) == [TextPosition(block: bText, offset: 0)])
    }

    @Test func setBlockKindRoundTrips() {
        let (doc, b) = makeDoc("Item")
        let s = textStroke(doc, block: b, offsets: [0, 3])
        let cmd = EditorCommands(document: doc)
        cmd.setBlockKind(.taskList(done: false), at: TextPosition(block: b, offset: 0))
        var p = Projection.build(doc.blocks)
        #expect(p.paragraphs[1].blockId == b)
        if case .task(let state, _, _) = p.paragraphs[1].context.marker { #expect(state == "open") } else { Issue.record("no task marker") }
        cmd.setBlockKind(.heading(2), at: TextPosition(block: b, offset: 0))
        p = Projection.build(doc.blocks)
        #expect(p.paragraphs[1].kind == .text(NodeType.heading))
        #expect(p.paragraphs[1].context.itemBlockId == nil)
        #expect(resolved(doc, doc.strokes.first!) == [0, 3].map { TextPosition(block: b, offset: $0) })
        _ = s
    }

    @Test func toggleTask() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .taskList([.taskItem("x")])])
        let item = Projection.build(doc.blocks).paragraphs[1].context.itemBlockId!
        let cmd = EditorCommands(document: doc)
        cmd.toggleTask(item)
        #expect(doc.block(item)?.attrs["state"] == "done")
        #expect(doc.block(item)?.attrs["completedAt"]?.stringValue != nil)
        cmd.toggleTask(item)
        #expect(doc.block(item)?.attrs["state"] == "open")
    }

    @Test func toggleMarkAcrossParagraphs() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("abc"), .paragraph("def")])
        let cmd = EditorCommands(document: doc)
        cmd.toggleMark(MarkName.bold, range: 2..<6)
        #expect(cmd.marks(at: 2..<6).contains(MarkName.bold))
        cmd.toggleMark(MarkName.bold, range: 2..<6)
        #expect(!cmd.marks(at: 2..<6).contains(MarkName.bold))
    }

    @Test func insertBlockAddsTrailingParagraph() {
        let (doc, b) = makeDoc("x")
        let caret = EditorCommands(document: doc).insertBlock(.math("a^2"), after: TextPosition(block: b, offset: 1))!
        let p = Projection.build(doc.blocks)
        #expect(p.paragraphs.map(\.kind.type) == [NodeType.title, NodeType.paragraph, NodeType.mathBlock, NodeType.paragraph])
        #expect(caret.block == p.paragraphs[3].blockId)
    }
}

@MainActor
@Suite struct MarkdownTests {
    func typed(_ text: String) -> (InMemoryEditorDocument, BlockID, MarkdownShortcuts) {
        let (doc, b) = makeDoc(text)
        return (doc, b, MarkdownShortcuts(commands: EditorCommands(document: doc)))
    }

    @Test func headingShortcut() {
        let (doc, b, md) = typed("## ")
        #expect(md.handleSpace(at: TextPosition(block: b, offset: 3)) != nil)
        #expect(doc.block(b)?.type == NodeType.heading)
        #expect(doc.block(b)?.attrs["level"] == 2)
        #expect(doc.flatText(of: b) == "")
    }

    @Test func listShortcuts() {
        for (marker, expected) in [("- ", ListMarker.bullet), ("1. ", .ordered(1)), ("3. ", .ordered(3))] {
            let (doc, b, md) = typed(marker + "text")
            #expect(md.handleSpace(at: TextPosition(block: b, offset: marker.count)) != nil)
            let p = Projection.build(doc.blocks)
            #expect(p.paragraphs[1].context.marker == expected)
            #expect(doc.flatText(of: b) == "text")
        }
        let (doc, b, md) = typed("[] ")
        _ = md.handleSpace(at: TextPosition(block: b, offset: 3))
        if case .task = Projection.build(doc.blocks).paragraphs[1].context.marker {} else { Issue.record("no task") }
    }

    @Test func noShortcutMidText() {
        let (_, b, md) = typed("a - ")
        #expect(md.handleSpace(at: TextPosition(block: b, offset: 4)) == nil)
    }

    @Test func inlineBoldKeepsAnchors() {
        let (doc, b, md) = typed("say **hi**")
        let anchor = doc.anchor(block: b, offset: 6)!   // "h"
        let caret = md.handleInline(at: TextPosition(block: b, offset: 10))
        #expect(caret == TextPosition(block: b, offset: 6))
        #expect(doc.flatText(of: b) == "say hi")
        #expect(doc.inline(of: b, range: 4..<6).first?.marks.contains(MarkName.bold) == true)
        #expect(doc.resolveAnchor(anchor) == TextPosition(block: b, offset: 4))
    }

    @Test func inlineItalicAndCode() {
        let (doc, b, md) = typed("an *it*")
        _ = md.handleInline(at: TextPosition(block: b, offset: 7))
        #expect(doc.flatText(of: b) == "an it")
        let (doc2, b2, md2) = typed("x `y`")
        _ = md2.handleInline(at: TextPosition(block: b2, offset: 5))
        #expect(doc2.inline(of: b2, range: 2..<3).first?.marks.contains(MarkName.code) == true)
    }

    @Test func ruleOnReturn() {
        let (doc, b, md) = typed("---")
        #expect(md.handleReturn(at: TextPosition(block: b, offset: 3)) != nil)
        #expect(doc.allBlocks.contains { $0.type == NodeType.horizontalRule })
    }

    @Test func noteLinkShortcut() {
        let (doc, b, md) = typed("see [[Идеи]]")
        let caret = md.handleNoteLink(at: TextPosition(block: b, offset: 12)) { $0 == "Идеи" ? "n1" : nil }
        #expect(caret == TextPosition(block: b, offset: 5))
        #expect(doc.inline(of: b, range: nil).last == .atom(.noteLink(noteId: "n1", label: "Идеи"), .empty))
        let (_, b2, md2) = typed("[[x]]")
        #expect(md2.handleNoteLink(at: TextPosition(block: b2, offset: 5)) { _ in nil } == nil)
    }

    @Test func tagShortcut() {
        let (doc, b, md) = typed("idea #pen/proto ")
        let caret = md.handleTag(at: TextPosition(block: b, offset: 16))
        #expect(caret == TextPosition(block: b, offset: 7))
        #expect(doc.inline(of: b, range: nil) == [.text("idea ", .empty), .atom(.tag("pen/proto"), .empty), .text(" ", .empty)])
        let (_, b2, md2) = typed("issue #12 ")
        #expect(md2.handleTag(at: TextPosition(block: b2, offset: 10)) == nil)
        let (_, b3, md3) = typed("a#b ")
        #expect(md3.handleTag(at: TextPosition(block: b3, offset: 4)) == nil)
    }
}
