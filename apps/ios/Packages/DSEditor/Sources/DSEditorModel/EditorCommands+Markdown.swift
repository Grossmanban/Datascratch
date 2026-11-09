import Foundation

/// Markdown in and out of the editor for voice (D-65, `spec/04-editor.md`, «Голос»): the selection
/// or the whole note as Markdown in the agents' dialect, dictated Markdown inserted at the caret,
/// and a suggestion that replaces the selection or the note marked as an agent edit.
extension EditorCommands {
    /// What a suggestion replaces.
    public enum SuggestionScope: Sendable {
        case selection
        case document
    }

    /// Agent id that voice suggestions carry in their `agentEdit` mark (the banner says «Голос»).
    public static let voiceAgentId = "voice"

    /// The blocks a flattened range covers, cut to it: text paragraphs keep only the selected
    /// part, objects (an image, a table) come whole when the range covers them, containers (lists,
    /// quotes) keep what is left inside them.
    public func blocks(in range: Range<Int>) -> [BlockNode] {
        let p = projection
        func prune(_ nodes: [BlockNode]) -> [BlockNode] {
            nodes.compactMap { node in
                if let i = p.indexByBlock[node.id] {
                    let start = p.starts[i], length = p.paragraphs[i].length
                    guard p.paragraphs[i].kind.isText, node.inline != nil else {
                        return range.contains(start) ? node : nil
                    }
                    if length == 0 { return range.contains(start) ? node : nil }
                    let lo = max(range.lowerBound, start), hi = min(range.upperBound, start + length)
                    guard lo < hi else { return nil }
                    var cut = node
                    cut.inline = Self.slice(node.inline ?? [], (lo - start)..<(hi - start))
                    return cut
                }
                let kids = prune(node.children)
                guard !kids.isEmpty else { return nil }
                var cut = node
                cut.children = kids
                return cut
            }
        }
        return prune(document.blocks)
    }

    /// The Markdown of a flattened range (nil when it covers nothing).
    public func markdown(in range: Range<Int>) -> String? {
        guard !range.isEmpty else { return nil }
        let blocks = blocks(in: range)
        guard !blocks.isEmpty else { return nil }
        // A selection inside the title is its text (the export leaves the title out).
        if blocks.count == 1, blocks[0].type == NodeType.title {
            return MarkdownExport.inline(blocks[0].inline ?? []) + "\n"
        }
        return MarkdownExport.markdown(blocks)
    }

    /// The note's body (after the title) as Markdown.
    public var documentMarkdown: String { MarkdownExport.markdown(document.blocks) }

    /// Dictated Markdown inserted over a flattened range as one undo step; text without a line
    /// break goes into the current paragraph as is (a dictated «1. молоко» is not a list).
    /// - Returns: the caret after the inserted text.
    @discardableResult
    public func insertMarkdown(_ markdown: String, replacing range: Range<Int>, marks: MarkSet = .empty,
                               resolveNoteLink: ((String) -> String?)? = nil) -> TextPosition? {
        let blocks = Self.dictationBlocks(markdown, resolveNoteLink: resolveNoteLink)
        guard !blocks.isEmpty else { return nil }
        return insertFragment(marks.isEmpty ? blocks : blocks.map { Self.adding(marks, to: $0) }, replacing: range)
    }

    /// Replaces the selection, or the note's body (the title stays), with a suggestion: the new
    /// text carries the `agentEdit` mark (D-10) until the person accepts it; one undo step.
    /// A `title` replaces the note's title in the same step, marked the same way («Оформить»), so
    /// undo or «Отклонить» brings the old title back with the body.
    @discardableResult
    public func replaceWithSuggestion(_ markdown: String, scope: SuggestionScope, selection: Range<Int>,
                                      title: String? = nil,
                                      agentId: String = EditorCommands.voiceAgentId, at date: Date = Date(),
                                      resolveNoteLink: ((String) -> String?)? = nil) -> TextPosition? {
        guard !document.isReadOnly else { return nil }
        let mark = MarkSet([MarkName.agentEdit: .object(["agentId": .string(agentId),
                                                          "at": .string(Self.isoDate(date))])])
        // The body first (its offsets are taken before the title changes), then the title with no
        // capture stop in between: one undo step.
        let caret = replaceBody(markdown, scope: scope, selection: selection, mark: mark, resolveNoteLink: resolveNoteLink)
        if let title, caret != nil {
            document.transact { replaceTitle(title, marks: mark) }
        }
        document.stopCapturing()
        return caret
    }

    private func replaceBody(_ markdown: String, scope: SuggestionScope, selection: Range<Int>, mark: MarkSet,
                             resolveNoteLink: ((String) -> String?)?) -> TextPosition? {
        switch scope {
        case .selection:
            return insertMarkdown(markdown, replacing: selection, marks: mark, resolveNoteLink: resolveNoteLink)
        case .document:
            let blocks = MarkdownImport.blocks(markdown, options: .init(resolveNoteLink: resolveNoteLink)).blocks
                .map { Self.adding(mark, to: $0) }
            guard !blocks.isEmpty else { return nil }
            var caret: TextPosition?
            document.stopCapturing()
            document.transact {
                let top = document.blocks
                // Everything after the title goes; the suggestion takes its place.
                let keep = top.first?.type == NodeType.title ? 1 : 0
                for b in top.dropFirst(keep).reversed() { document.deleteBlock(b.id) }
                for (k, b) in blocks.enumerated() { document.insertBlock(b, parent: nil, at: keep + k) }
                if let last = blocks.last {
                    caret = Self.lastTextPosition(in: last, document: document)
                }
            }
            return caret
        }
    }

    /// The text of the note's title paragraph ("" without one).
    public var title: String {
        document.blocks.first(where: { $0.type == NodeType.title })?.plainText ?? ""
    }

    /// Sets the note's title («Заменить название»): one line, its own undo step.
    public func setTitle(_ text: String) {
        guard !document.isReadOnly else { return }
        document.stopCapturing()
        document.transact { replaceTitle(text, marks: .empty) }
        document.stopCapturing()
    }

    /// The note's title becomes `text` (one line; a note without a title gets one at the top).
    private func replaceTitle(_ text: String, marks: MarkSet) {
        let line = text.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }.joined(separator: " ")
        guard let title = document.blocks.first(where: { $0.type == NodeType.title }) else {
            guard !line.isEmpty else { return }
            document.insertBlock(Self.adding(marks, to: .title(line)), parent: nil, at: 0)
            return
        }
        let length = document.textLength(of: title.id)
        if length > 0 { document.deleteText(block: title.id, range: 0..<length) }
        if !line.isEmpty { document.insertText(line, marks: marks, block: title.id, at: 0) }
    }

    // MARK: - Helpers

    static func dictationBlocks(_ markdown: String, resolveNoteLink: ((String) -> String?)?) -> [BlockNode] {
        let text = markdown.replacingOccurrences(of: "\r\n", with: "\n")
        let trimmed = text.trimmingCharacters(in: .newlines)
        guard !trimmed.isEmpty else { return [] }
        let options = MarkdownImport.Options(resolveNoteLink: resolveNoteLink)
        if !trimmed.contains("\n") {
            // One line: inline Markdown into the current paragraph; the spaces around it stay (the
            // host joins dictated phrases with them).
            let lead = String(trimmed.prefix { $0 == " " }), trail = String(trimmed.reversed().prefix { $0 == " " })
            let core = trimmed.trimmingCharacters(in: .whitespaces)
            guard !core.isEmpty else { return [.paragraph(trimmed)] }
            let parsed = MarkdownImport.blocks(core, options: options).blocks
            guard parsed.count == 1, parsed[0].type == NodeType.paragraph else { return [.paragraph(trimmed)] }
            var inline = parsed[0].inline ?? []
            if !lead.isEmpty { inline.insert(.text(lead, .empty), at: 0) }
            if !trail.isEmpty { inline.append(.text(trail, .empty)) }
            return [BlockNode(type: NodeType.paragraph, inline: MarkdownInlineParser.merged(inline))]
        }
        return MarkdownImport.blocks(text, options: options).blocks
    }

    /// `marks` added to every run of inline content in a block and its children.
    static func adding(_ marks: MarkSet, to block: BlockNode) -> BlockNode {
        var b = block
        if let inline = b.inline {
            b.inline = inline.map { el in
                var m = el.marks
                for name in marks.names { m.set(name, marks[name]) }
                switch el {
                case .text(let t, _): return .text(t, m)
                case .atom(let a, _): return .atom(a, m)
                }
            }
        }
        b.children = b.children.map { adding(marks, to: $0) }
        return b
    }

    /// The part of inline content in a UTF-16 range.
    static func slice(_ inline: [InlineElement], _ r: Range<Int>) -> [InlineElement] {
        var out: [InlineElement] = []
        var offset = 0
        for el in inline {
            let end = offset + el.length
            defer { offset = end }
            let lo = max(r.lowerBound, offset), hi = min(r.upperBound, end)
            guard lo < hi else { continue }
            switch el {
            case .text(let t, let m):
                let units = Array(t.utf16)
                out.append(.text(String(decoding: units[(lo - offset)..<(hi - offset)], as: UTF16.self), m))
            case .atom:
                out.append(el)
            }
        }
        return out
    }

    private static func lastTextPosition(in block: BlockNode, document: EditorDocument) -> TextPosition? {
        func lastText(_ b: BlockNode) -> BlockNode? {
            if b.isTextblock { return b }
            for c in b.children.reversed() { if let t = lastText(c) { return t } }
            return nil
        }
        guard let t = lastText(block) else { return nil }
        return TextPosition(block: t.id, offset: document.textLength(of: t.id))
    }

    static func isoDate(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: date)
    }
}

extension EditorCommands {
    /// A tap below the text, then typing (`spec/04-editor.md`, «Касание под текстом»): `count`
    /// empty paragraphs at the end of the note, `text` typed into the last of them, one undo step.
    /// Blocks before them do not move, so drawings anchored below the last paragraph stay put.
    /// - Returns: the caret after the typed text.
    @discardableResult
    public func appendParagraphs(_ count: Int, typing text: String, marks: MarkSet = .empty) -> TextPosition? {
        guard !document.isReadOnly, count > 0 else { return nil }
        var caret: TextPosition?
        document.stopCapturing()
        document.transact {
            var last: BlockNode?
            for _ in 0..<count {
                let p = BlockNode.paragraph()
                document.insertBlock(p, parent: nil, at: document.blocks.count)
                last = p
            }
            guard let last else { return }
            if !text.isEmpty { document.insertText(text, marks: marks, block: last.id, at: 0) }
            caret = TextPosition(block: last.id, offset: text.utf16.count)
        }
        document.stopCapturing()
        return caret
    }
}
