import DSCore
import DSEditorCore
import DSEditorModel
import Foundation
import Testing

/// Agent-built notes survive opening and editing on iOS unchanged (the web editor once dropped
/// agent-created code blocks on its first edit). The fixture is built exactly like
/// `packages/agents/src/doc/build.ts`: y-prosemirror elements, `blockId` on every block, absent
/// attributes for nulls, the `agentEdit` mark on all inserted text (code included).
@MainActor
@Suite struct AgentRoundTripTests {
    static let agentMark: [String: YValue] = [
        "agentEdit": .object(entries: ["agentId": .string(value: "agent-1"), "at": .string(value: "2026-10-26T10:00:00.000Z")]),
    ]

    static var nextId = 0
    static func id() -> YValue {
        nextId += 1
        return .string(value: String(format: "0192f3c4-0000-7000-8000-%012d", 900 + nextId))
    }

    static func text(_ s: String, _ marks: [String: YValue] = [:]) -> XmlNode {
        .text(chunks: [TextChunk(text: s, embed: nil, attributes: marks.merging(agentMark) { a, _ in a })])
    }

    static func el(_ name: String, _ attrs: [String: YValue] = [:], _ children: [XmlNode] = []) -> XmlNode {
        .element(name: name, attributes: attrs.merging(["blockId": id()]) { a, _ in a }, children: children)
    }

    static func para(_ s: String, _ marks: [String: YValue] = [:]) -> XmlNode { el("paragraph", [:], s.isEmpty ? [] : [text(s, marks)]) }

    static func cell(_ name: String, _ s: String) -> XmlNode {
        el(name, ["colspan": .number(value: 1), "rowspan": .number(value: 1)], [para(s)])
    }

    /// The note from the user's report: code with and without a language, a table, inline math as
    /// text, a callout and nested lists.
    static func agentNote() throws -> NoteDocument {
        let note = NoteDocument(noteId: "0192f3c4-0000-7000-8000-000000000900")
        let nodes: [XmlNode] = [
            el("title", [:], [text("Тест форматирования")]),
            para("Обычный абзац с **жирным**.", ["bold": .object(entries: [:])]),
            el("codeBlock", ["language": .string(value: "python")], [text("def hello():\n    print(\"hi\")\n")]),
            el("codeBlock", ["language": .string(value: "typescript")], [text("const x: number = 1;")]),
            el("codeBlock", [:], [text("plain text block\nsecond line")]),
            // Not valid for the editor's schema, kept as is (document-model.md: never delete or
            // rewrite on open): a mark inside code, an unknown attribute, an unknown node.
            el("codeBlock", ["language": .string(value: "swift"), "futureAttr": .string(value: "x")],
               [text("let ", ["bold": .object(entries: [:])]), text("y = 2")]),
            el("futureBlock", ["kind": .string(value: "chart")], [para("inside an unknown block")]),
            el("paragraph", ["futureAttr": .number(value: 3)], [text("абзац с неизвестным атрибутом")]),
            el("table", [:], [
                el("tableRow", [:], [cell("tableHeader", "Слева"), cell("tableHeader", "По центру"), cell("tableHeader", "Справа")]),
                el("tableRow", [:], [cell("tableCell", "a"), cell("tableCell", "b"), cell("tableCell", "c")]),
            ]),
            para("Формула в строке: $E = mc^2$ и $\\int_0^1 x\\,dx$."),
            el("callout", ["tone": .string(value: "info")], [para("Выноска от агента")]),
            el("bulletList", [:], [
                el("listItem", [:], [para("Первый"), el("bulletList", [:], [el("listItem", [:], [para("Вложенный")])])]),
                el("listItem", [:], [para("Второй")]),
            ]),
            el("orderedList", ["start": .number(value: 1)], [el("listItem", [:], [para("Раз")])]),
            para("Последний абзац"),
        ]
        try note.crdt.transact(origin: .remote) { $0.insertNodes(nodes, into: [], at: 0) }
        return note
    }

    static func json(_ value: Any) -> String {
        let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
        return String(decoding: data, as: UTF8.self)
    }

    /// Top-level blocks of `content` as canonical JSON strings, by blockId.
    static func blocks(_ note: NoteDocument) throws -> [(id: String, json: String)] {
        let content = try note.contentJSON()
        return (content["content"] as? [[String: Any]] ?? []).map { b in
            ((b["attrs"] as? [String: Any])?["blockId"] as? String ?? "", json(b))
        }
    }

    @Test func openingWritesNothing() throws {
        let note = try Self.agentNote()
        let before = try note.crdt.encodeStateAsUpdate()
        let doc = CoreEditorDocument(note: note)
        _ = doc.blocks
        _ = Projection.build(doc.blocks)
        #expect(try note.crdt.encodeStateAsUpdate() == before, "opening an agent note must not write to it")
    }

    @Test func editingOneParagraphKeepsEveryOtherBlock() throws {
        let note = try Self.agentNote()
        let before = try Self.blocks(note)
        let doc = CoreEditorDocument(note: note)
        let cmd = EditorCommands(document: doc)
        let first = doc.blocks[1]
        cmd.typeText(" Правка на iPhone.", marks: .empty, at: TextPosition(block: first.id, offset: doc.textLength(of: first.id)))
        let after = try Self.blocks(note)
        #expect(after.map(\.id) == before.map(\.id), "no block is added, removed or reordered")
        for (b, a) in zip(before, after) where b.id != first.id {
            #expect(a.json == b.json, "block \(b.id) changed: \(b.json) → \(a.json)")
        }
        #expect(doc.flatText(of: first.id).hasSuffix("Правка на iPhone."))
    }

    /// Editing next to schema-invalid nodes leaves them byte-identical (and opening wrote nothing).
    @Test func invalidNodesSurviveEditsElsewhere() throws {
        let note = try Self.agentNote()
        let before = try Self.blocks(note)
        let doc = CoreEditorDocument(note: note)
        let cmd = EditorCommands(document: doc)
        let last = try #require(doc.blocks.last)
        cmd.typeText("!", marks: .empty, at: TextPosition(block: last.id, offset: doc.textLength(of: last.id)))
        _ = cmd.splitParagraph(at: TextPosition(block: last.id, offset: 0))
        let after = try Self.blocks(note)
        let changed = Set(after.map(\.id)).symmetricDifference(before.map(\.id))
        #expect(changed.count == 1, "only the new paragraph from the split appears")
        let afterById = Dictionary(after.map { ($0.id, $0.json) }, uniquingKeysWith: { a, _ in a })
        for b in before where b.id != last.id {
            #expect(afterById[b.id] == b.json, "block \(b.id) changed")
        }
        #expect(after.contains { $0.json.contains("futureBlock") }, "the unknown node is kept")
        #expect(after.contains { $0.json.contains("futureAttr") }, "unknown attributes are kept")
        #expect(after.contains { $0.json.contains("\"bold\"") && $0.json.contains("codeBlock") }, "bold inside code is kept")
    }

    @Test func codeBlocksKeepLanguageAndTextWhenEdited() throws {
        let note = try Self.agentNote()
        let before = try Self.blocks(note)
        let doc = CoreEditorDocument(note: note)
        let cmd = EditorCommands(document: doc)
        let code = try #require(doc.blocks.first { $0.type == NodeType.codeBlock && $0.attrs["language"]?.stringValue == "python" })
        let plain = try #require(doc.blocks.first { $0.type == NodeType.codeBlock && $0.attrs["language"] == nil })
        #expect(doc.flatText(of: plain.id) == "plain text block\nsecond line")
        cmd.typeText("# comment\n", marks: .empty, at: TextPosition(block: code.id, offset: 0))
        let after = try Self.blocks(note)
        #expect(after.map(\.id) == before.map(\.id))
        for (b, a) in zip(before, after) where b.id != code.id {
            #expect(a.json == b.json, "block \(b.id) changed: \(b.json) → \(a.json)")
        }
        let edited = try #require(doc.block(code.id))
        #expect(edited.type == NodeType.codeBlock)
        #expect(edited.attrs["language"]?.stringValue == "python")
        #expect(doc.flatText(of: code.id) == "# comment\ndef hello():\n    print(\"hi\")\n")
    }

    /// The agent's title block keeps its id and text through opening and editing elsewhere, and
    /// the note's title (NoteMeta.title is derived from it) does not change.
    @Test func agentTitleIsAdoptedNotReplaced() throws {
        let note = try Self.agentNote()
        let titleBefore = try note.title()
        let titleId = try #require(try Self.blocks(note).first?.id)
        let before = try note.crdt.encodeStateAsUpdate()
        let doc = CoreEditorDocument(note: note)
        _ = Projection.build(doc.blocks)
        #expect(try note.crdt.encodeStateAsUpdate() == before, "opening writes nothing")
        let cmd = EditorCommands(document: doc)
        let last = try #require(doc.blocks.last)
        cmd.typeText("!", marks: .empty, at: TextPosition(block: last.id, offset: doc.textLength(of: last.id)))
        let after = try Self.blocks(note)
        #expect(after.first?.id == titleId, "the title block is the agent's, not a new one")
        #expect(try note.title() == titleBefore)
        #expect(after.filter { $0.json.contains("\"type\":\"title\"") }.count == 1, "no second title is added")
    }

    /// Two titles (an empty one from a client that initialized the note before it synced, merged
    /// with the agent's): the editor opens it without writing and removes neither.
    @Test func twoMergedTitlesAreOpenedWithoutWrites() throws {
        let note = try Self.agentNote()
        let stray = NoteDocument(noteId: note.noteId)
        try stray.initialize()
        try note.crdt.applyUpdate(try stray.crdt.encodeStateAsUpdate())
        let before = try note.crdt.encodeStateAsUpdate()
        let ids = try Self.blocks(note).map(\.id)
        let doc = CoreEditorDocument(note: note)
        _ = Projection.build(doc.blocks)
        #expect(try note.crdt.encodeStateAsUpdate() == before, "opening writes nothing")
        #expect(try Self.blocks(note).map(\.id) == ids, "no block is removed or replaced")
    }

    /// The shared reference note (every node and mark of document-model.md §4.2) survives an edit.
    @Test(.enabled(if: FileManager.default.fileExists(atPath: Self.vector.path)))
    func referenceNoteSurvivesAnEdit() throws {
        let file = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: Self.vector)) as? [String: Any])
        let note = NoteDocument(noteId: file["noteId"] as! String)
        var b64 = (file["update"] as! String).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64 += "=" }
        try note.crdt.applyUpdate(try #require(Data(base64Encoded: b64)))
        let before = try Self.blocks(note)
        let doc = CoreEditorDocument(note: note)
        let cmd = EditorCommands(document: doc)
        let para = try #require(doc.blocks.first { $0.type == NodeType.paragraph })
        cmd.typeText("!", marks: .empty, at: TextPosition(block: para.id, offset: 0))
        let after = try Self.blocks(note)
        #expect(after.map(\.id) == before.map(\.id))
        for (b, a) in zip(before, after) where b.id != para.id {
            #expect(a.json == b.json, "block \(b.id) changed: \(b.json) → \(a.json)")
        }
    }

    nonisolated static let vector = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // DSEditorCoreTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // CoreAdapter
        .deletingLastPathComponent() // DSEditor
        .deletingLastPathComponent() // Packages
        .deletingLastPathComponent() // ios
        .deletingLastPathComponent() // apps
        .appendingPathComponent("packages/test-vectors/vectors/document/note.json")
}
