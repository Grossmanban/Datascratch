import Foundation
import Testing
@testable import DSEditorModel
import DSInk

/// ProseMirror JSON (as in the test vectors) → our blocks, ids kept.
private func node(json: [String: Any]) -> BlockNode {
    let type = json["type"] as! String
    var attrs: [String: JSONValue] = [:]
    var id = UUIDv7.generate()
    for (k, v) in json["attrs"] as? [String: Any] ?? [:] {
        if k == "blockId", let s = v as? String { id = s; continue }
        if !(v is NSNull) { attrs[k] = value(v) }
    }
    let content = json["content"] as? [[String: Any]] ?? []
    if NodeType.textblocks.contains(type) {
        return BlockNode(id: id, type: type, attrs: attrs, inline: content.map(inline(json:)))
    }
    return BlockNode(id: id, type: type, attrs: attrs, children: content.map(node(json:)))
}

private func inline(json: [String: Any]) -> InlineElement {
    var marks = MarkSet.empty
    for m in json["marks"] as? [[String: Any]] ?? [] {
        marks.set(m["type"] as! String, value(m["attrs"] ?? [String: Any]()))
    }
    let type = json["type"] as! String
    if type == "text" { return .text(json["text"] as! String, marks) }
    var attrs: [String: JSONValue] = [:]
    for (k, v) in json["attrs"] as? [String: Any] ?? [:] where !(v is NSNull) { attrs[k] = value(v) }
    return .atom(InlineAtom(type: type, attrs: attrs), marks)
}

private func value(_ v: Any) -> JSONValue {
    switch v {
    case let s as String: return .string(s)
    case let b as Bool where type(of: v) == type(of: true): return .bool(b)
    case let n as NSNumber: return .number(n.doubleValue)
    case let d as [String: Any]: return .object(d.mapValues(value))
    case let a as [Any]: return .array(a.map(value))
    default: return .null
    }
}

/// Blocks without generated ids and task ids, for comparing two imports.
private func plain(_ b: BlockNode) -> BlockNode {
    var attrs = b.attrs
    attrs["taskId"] = nil
    return BlockNode(id: "", type: b.type, attrs: attrs, inline: b.inline, children: b.children.map(plain))
}

@MainActor
struct MarkdownExportTests {
    nonisolated static let agentsVector = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("packages/test-vectors/vectors/agents/create-note.json")

    /// The agents' read_note Markdown of the create_note vector, from our blocks: the same dialect
    /// as `packages/agents/src/doc/markdown-export.ts`, block markers included.
    @Test(.enabled(if: FileManager.default.fileExists(atPath: agentsVector.path)))
    func matchesTheAgentsExport() throws {
        let file = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: Self.agentsVector)) as? [String: Any])
        let expected = try #require((file["createNote"] as? [String: Any])?["expected"] as? [String: Any])
        let content = try #require(expected["content"] as? [String: Any])
        let markdown = try #require(expected["markdown"] as? String)
        let blocks = (content["content"] as? [[String: Any]] ?? []).map(node(json:))
        let ours = MarkdownExport.markdown(blocks, options: .init(blockIds: true))
        let a = ours.components(separatedBy: "\n"), b = markdown.components(separatedBy: "\n")
        for (i, (x, y)) in zip(a, b).enumerated() where x != y {
            Issue.record("line \(i + 1): \(x)\n≠\n\(y)")
        }
        #expect(a.count == b.count, "\(ours)")
    }

    /// Export → import gives the same blocks (the vector's Markdown and the details below).
    @Test(.enabled(if: FileManager.default.fileExists(atPath: agentsVector.path)))
    func roundTripsThroughMarkdown() throws {
        let file = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: Self.agentsVector)) as? [String: Any])
        let md = try #require((file["input"] as? [String: Any])?["markdown"] as? String)
        let link: (String) -> String? = { $0 == "План запуска" ? "0192f3c4-0000-7000-8000-00000000a001" : nil }
        let first = MarkdownImport.blocks(md, options: .init(resolveNoteLink: link)).blocks
        let again = MarkdownImport.blocks(MarkdownExport.markdown(first), options: .init(resolveNoteLink: link)).blocks
        #expect(again.map(plain) == first.map(plain))
    }

    @Test func roundTripsDetails() {
        let blocks: [BlockNode] = [
            .heading("План", level: 2),
            .paragraph([.text("Цена 5 * 3, a_b_c, #нетег, [скобки] и ", .empty),
                        .text("жирный", MarkSet([MarkName.bold: MarkSet.plain])),
                        .text(" ", .empty),
                        .text("ссылка", MarkSet([MarkName.link: .object(["href": .string("https://example.com")])])),
                        .atom(.hardBreak, .empty), .text("вторая строка", .empty)]),
            .paragraph("- не список"),
            .paragraph("1. не номер"),
            .bulletList(["раз", "два"]),
            .taskList([.taskItem("сделать", state: "done", deadline: "2026-11-10")]),
            .callout("Важно", tone: "warning", emoji: "⚠️"),
            .code("let a = `x`", language: "swift"),
            .math("E = mc^2"),
            .rule(),
        ]
        let md = MarkdownExport.markdown(blocks)
        #expect(md.hasPrefix("## План\n\nЦена 5 \\* 3, a_b_c, \\#нетег, \\[скобки\\] и **жирный** [ссылка](https://example.com)\\\nвторая строка"), "\(md)")
        let back = MarkdownImport.blocks(md).blocks
        #expect(back.map(plain) == blocks.map(plain), "\(md)")
    }

    // MARK: Commands

    private func doc() -> (InMemoryEditorDocument, EditorCommands) {
        let doc = InMemoryEditorDocument(blocks: [.title("Заметка"), .paragraph("Первый абзац"), .bulletList(["раз", "два"]), .paragraph("Конец")])
        return (doc, EditorCommands(document: doc))
    }

    @Test func selectionAndDocumentAsMarkdown() {
        let (doc, cmd) = doc()
        let p = Projection.build(doc.blocks)
        // From «абзац» in the first paragraph to «ра» in the first item.
        let from = p.starts[1] + "Первый ".utf16.count
        let to = p.starts[2] + 2
        #expect(cmd.markdown(in: from..<to) == "абзац\n\n- ра\n")
        #expect(cmd.markdown(in: from..<from) == nil)
        #expect(cmd.documentMarkdown == "Первый абзац\n\n- раз\n- два\n\nКонец\n")
    }

    /// Dictated text without a line break goes into the paragraph at the caret (one undo step,
    /// the caret after it); a dictated «1. …» is not a list.
    @Test func dictationGoesInline() {
        let (doc, cmd) = doc()
        let at = Projection.build(doc.blocks).starts[1] + "Первый".utf16.count
        let caret = cmd.insertMarkdown(" **новый**", replacing: at..<at)
        #expect(doc.blocks[1].plainText == "Первый новый абзац")
        #expect(doc.blocks[1].inline?.contains(.text("новый", MarkSet([MarkName.bold: MarkSet.plain]))) == true)
        #expect(caret == TextPosition(block: doc.blocks[1].id, offset: "Первый новый".utf16.count))
        let end = Projection.build(doc.blocks).starts[4] + "Конец".utf16.count
        cmd.insertMarkdown(" 1. молоко", replacing: end..<end)
        #expect(doc.blocks.last?.plainText == "Конец 1. молоко")
        doc.undo()
        #expect(doc.blocks.last?.plainText == "Конец")
        doc.undo()
        #expect(doc.blocks[1].plainText == "Первый абзац", "each dictation is one undo step")
    }

    @Test func dictationWithBlocks() {
        let (doc, cmd) = doc()
        let end = Projection.build(doc.blocks).starts[4] + "Конец".utf16.count
        cmd.insertMarkdown("\n## Итог\n- купить", replacing: end..<end)
        #expect(doc.blocks.map(\.type) == ["title", "paragraph", "bulletList", "paragraph", "heading", "bulletList"])
    }

    /// A suggestion over the selection carries the voice agentEdit mark; one undo step.
    @Test func suggestionReplacesTheSelection() {
        let (doc, cmd) = doc()
        let p = Projection.build(doc.blocks)
        let range = p.starts[1]..<(p.starts[1] + "Первый".utf16.count)
        let at = Date(timeIntervalSince1970: 1_800_000_000)
        cmd.replaceWithSuggestion("Второй", scope: .selection, selection: range, at: at)
        #expect(doc.blocks[1].plainText == "Второй абзац")
        let marks = doc.blocks[1].inline?.first?.marks
        #expect(marks?[MarkName.agentEdit] == .object(["agentId": .string("voice"), "at": .string("2027-01-15T08:00:00.000Z")]))
        #expect(AgentEdits.hasEdits(in: doc))
        doc.undo()
        #expect(doc.blocks[1].plainText == "Первый абзац")
        #expect(!AgentEdits.hasEdits(in: doc))
    }

    /// A suggestion for the whole note replaces its body (the title stays), all marked; one undo.
    @Test func suggestionReplacesTheDocument() {
        let (doc, cmd) = doc()
        let caret = cmd.replaceWithSuggestion("Новый текст\n\n- один", scope: .document, selection: 0..<0)
        #expect(doc.blocks.map(\.type) == ["title", "paragraph", "bulletList"])
        #expect(doc.blocks[0].plainText == "Заметка")
        #expect(AgentEdits.blocks(in: doc).count == 2)
        #expect(caret == TextPosition(block: doc.blocks[2].children[0].children[0].id, offset: "один".utf16.count))
        doc.undo()
        #expect(doc.blocks.map(\.plainText) == ["Заметка", "Первый абзац", "раз\nдва", "Конец"])
    }

    /// «Оформить» with a title: the body and the title in one undo step, both marked.
    @Test func suggestionReplacesTheTitleToo() {
        let (doc, cmd) = doc()
        cmd.replaceWithSuggestion("Новый текст", scope: .document, selection: 0..<0, title: "План\nзапуска")
        #expect(doc.blocks.map(\.plainText) == ["План запуска", "Новый текст"])
        #expect(doc.blocks[0].type == NodeType.title)
        #expect(doc.blocks[0].inline?.first?.marks[MarkName.agentEdit] != nil)
        doc.undo()
        #expect(doc.blocks.map(\.plainText) == ["Заметка", "Первый абзац", "раз\nдва", "Конец"], "one undo restores body and title")
        // Over a selection as well.
        let p = Projection.build(doc.blocks)
        cmd.replaceWithSuggestion("Второй", scope: .selection, selection: p.starts[1]..<(p.starts[1] + "Первый".utf16.count), title: "Итог")
        #expect(doc.blocks.map(\.plainText) == ["Итог", "Второй абзац", "раз\nдва", "Конец"])
        doc.undo()
        #expect(doc.blocks.map(\.plainText) == ["Заметка", "Первый абзац", "раз\nдва", "Конец"])
    }
}
