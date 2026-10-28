import DSEditorModel
import DSInk
import Foundation
import Testing

/// Read-only mode (`spec/04-editor.md`, «Только чтение»; D-54 viewer role, R-03 newer format):
/// nothing the editor does can change the note; changes from elsewhere still show.
@MainActor
@Suite struct ReadOnlyTests {
    /// A note with a bit of everything, wrapped for the editor.
    func makeNote(locked: Bool = true) -> (base: InMemoryEditorDocument, doc: ReadOnlyDocument) {
        let base = InMemoryEditorDocument(blocks: [
            .title("Заметка"),
            .paragraph("первый абзац"),
            .taskList([.taskItem("задача")]),
            .bulletList(["пункт"]),
            EditorCommands.table(rows: 2, columns: 2, header: ["a", "b"]),
            .paragraph("последний"),
        ])
        return (base, ReadOnlyDocument(base, locked: locked))
    }

    func snapshot(_ d: EditorDocument) -> String {
        "\(d.blocks)|\(d.strokes.map(\.id))|\(d.style)"
    }

    @Test func unlockedPassesEverythingThrough() {
        let (base, doc) = makeNote(locked: false)
        let p = EditorCommands(document: doc).projection
        EditorCommands(document: doc).typeText("!", marks: .empty, at: TextPosition(block: p.paragraphs[1].blockId, offset: 0))
        #expect(base.flatText(of: p.paragraphs[1].blockId) == "!первый абзац")
        #expect(doc.canUndo)
        doc.undo()
        #expect(base.flatText(of: p.paragraphs[1].blockId) == "первый абзац")
    }

    @Test func everyCommandIsRejected() {
        let (base, doc) = makeNote()
        let before = snapshot(base)
        let cmd = EditorCommands(document: doc)
        let p = cmd.projection
        let para = p.paragraphs[1].blockId
        let pos = TextPosition(block: para, offset: 3)
        let item = p.paragraphs.first { $0.context.itemBlockId != nil }!.context.itemBlockId!
        let table = base.blocks.first { $0.type == NodeType.table }!.id
        let start = p.starts[1]

        cmd.typeText("x", marks: .empty, at: pos)
        #expect(cmd.replace(start..<(start + 2), with: "y") == nil)
        #expect(cmd.splitParagraph(at: pos) == nil)
        #expect(cmd.joinBackward(at: TextPosition(block: para, offset: 0)) == nil)
        #expect(cmd.setBlockKind(.heading(1), at: pos) == pos)
        #expect(!cmd.indentItem(item))
        #expect(!cmd.outdentItem(item))
        cmd.toggleMark(MarkName.bold, range: start..<(start + 4))
        cmd.setMark(MarkName.highlight, value: .string("yellow"), range: start..<(start + 4))
        cmd.toggleTask(item)
        cmd.setTaskDates(item, scheduled: "2026-11-01", deadline: nil)
        #expect(cmd.insertBlock(.paragraph("новый"), after: pos) == nil)
        #expect(cmd.insertInlineAtom(InlineAtom.tag("тег"), at: pos) == pos)
        cmd.setTableCell(table, row: 1, column: 0, text: "x")
        cmd.addTableRow(table)
        cmd.addTableColumn(table)
        #expect(cmd.insertFragment([.paragraph("вставка"), .heading("h", level: 2)], replacing: start..<start) == nil)
        #expect(!cmd.repairTitles())
        #expect(MarkdownShortcuts(commands: cmd).handleSpace(at: pos) == nil)

        #expect(snapshot(base) == before, "the note is unchanged")
    }

    @Test func directWritesStrokesStyleAndUndoAreRejected() {
        let (base, doc) = makeNote(locked: false)
        let para = base.blocks[1].id
        // An edit and a stroke from before the switch: undo must not take them back either.
        EditorCommands(document: doc).typeText("ab", marks: .empty, at: TextPosition(block: para, offset: 0))
        let stroke = textStroke(doc, block: para, offsets: [0, 1])
        #expect(doc.canUndo)
        doc.isLocked = true
        let before = snapshot(base)

        doc.transact {
            doc.insertText("x", marks: .empty, block: para, at: 0)
            doc.deleteText(block: para, range: 0..<1)
            doc.setMark(MarkName.bold, value: MarkSet.plain, block: para, range: 0..<2)
            doc.insertAtom(InlineAtom.tag("t"), marks: .empty, block: para, at: 0)
            doc.setAttributes(para, ["x": .string("y")])
            doc.insertBlock(.paragraph("p"), parent: nil, at: 1)
            doc.deleteBlock(para)
        }
        doc.addStroke(Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text,
                             anchors: [doc.anchor(block: para, offset: 0)!], points: [StrokePoint(a: 0, x: 0, y: 0)]))
        doc.removeStroke(stroke.id)
        doc.setStrokeAnchors(stroke.id, [])
        var style = doc.style
        style.paper = .grid
        doc.setStyle(style)
        AgentEdits.acceptAll(in: doc)
        #expect(!doc.canUndo && !doc.canRedo)
        doc.undo()
        doc.redo()

        #expect(snapshot(base) == before, "the note is unchanged")
        #expect(doc.rejectedWrites >= 12)
        // Unlocked again, the edits made before can be undone as usual.
        doc.isLocked = false
        #expect(doc.canUndo)
    }

    @Test func changesFromElsewhereStillArrive() {
        let (base, doc) = makeNote()
        var seen = 0
        let token = doc.observe { _ in seen += 1 }
        let para = base.blocks[1].id
        base.transact(origin: .remote) { base.insertText("чужое ", marks: .empty, block: para, at: 0) }
        #expect(doc.flatText(of: para) == "чужое первый абзац")
        #expect(seen == 1)
        token.cancel()
    }

    @Test func aNewerFormatIsReadOnlyEvenUnlocked() {
        // The base reports read-only itself, as a Yrs note in a newer format does.
        let base = InMemoryEditorDocument(blocks: [.title("t"), .paragraph("текст")])
        let doc = ReadOnlyDocument(ReadOnlyDocument(base, locked: true))
        #expect(doc.isReadOnly)
        let para = base.blocks[1].id
        EditorCommands(document: doc).typeText("x", marks: .empty, at: TextPosition(block: para, offset: 0))
        doc.insertText("y", marks: .empty, block: para, at: 0)
        #expect(base.flatText(of: para) == "текст")
    }
}
