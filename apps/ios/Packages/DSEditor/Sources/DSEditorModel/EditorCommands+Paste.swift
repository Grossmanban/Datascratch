import Foundation

extension EditorCommands {
    /// Inserts pasted blocks over a flattened range as one undo step (`spec/04-editor.md`,
    /// «Вставка»): a leading paragraph's text continues the text before the caret, a trailing
    /// paragraph's text runs into the text after it, and the other blocks go in between, in the
    /// caret's container (a list item, a quote). In the title, a code block or a table cell only
    /// the plain text is inserted (in the title on one line).
    /// - Returns: the caret after the inserted content.
    @discardableResult
    public func insertFragment(_ blocks: [BlockNode], replacing range: Range<Int>) -> TextPosition? {
        let p = projection
        guard !p.paragraphs.isEmpty, !blocks.isEmpty else { return nil }
        var caret: TextPosition?
        document.stopCapturing()
        document.transact {
            caret = deleteRange(range, in: p)
            guard let c = caret, let node = document.block(c.block) else { return }
            if node.type == NodeType.title || node.type == NodeType.codeBlock || isInTableCell(c.block) {
                var text = blocks.map(\.plainText).joined(separator: "\n")
                if node.type == NodeType.title {
                    // The title is one line: line breaks become spaces (as on the web).
                    text = text.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }
                        .filter { !$0.isEmpty }.joined(separator: " ")
                }
                if isInTableCell(c.block) { text = text.replacingOccurrences(of: "\n", with: " ") }
                document.insertText(text, marks: .empty, block: c.block, at: c.offset)
                caret = TextPosition(block: c.block, offset: c.offset + text.utf16.count)
                return
            }
            guard let loc = document.location(of: c.block) else { return }
            guard node.isTextblock else {
                // Next to an object (an image): the blocks go after it.
                for (k, b) in blocks.enumerated() { document.insertBlock(b, parent: loc.parent, at: loc.index + 1 + k) }
                caret = endCaret(after: blocks.last!, parent: loc.parent)
                return
            }
            var rest = blocks[...]
            var pos = c
            var merged = false
            if let first = rest.first, first.type == NodeType.paragraph {
                pos = insertInline(first.inline ?? [], block: c.block, at: c.offset)
                rest = rest.dropFirst()
                merged = true
            }
            guard !rest.isEmpty else {
                caret = pos
                return
            }
            // The text after the caret moves to the end of the pasted content.
            let length = document.textLength(of: c.block)
            let tail = pos.offset < length ? document.inline(of: c.block, range: pos.offset..<length) : []
            if !tail.isEmpty { document.deleteText(block: c.block, range: pos.offset..<length) }
            var middle = Array(rest)
            var closing: BlockNode?
            if let last = middle.last, last.type == NodeType.paragraph {
                closing = last
                middle.removeLast()
            }
            var index = loc.index + 1
            for b in middle {
                document.insertBlock(b, parent: loc.parent, at: index)
                index += 1
            }
            if closing != nil || !tail.isEmpty {
                // A heading split in two keeps its level for the text after the caret.
                let carriesKind = closing == nil && node.type == NodeType.heading
                let lead = closing?.inline ?? []
                let block = BlockNode(type: carriesKind ? node.type : NodeType.paragraph, attrs: carriesKind ? node.attrs : [:],
                                      inline: MarkdownInlineParser.merged(lead + tail))
                document.insertBlock(block, parent: loc.parent, at: index)
                caret = TextPosition(block: block.id, offset: lead.reduce(0) { $0 + $1.length })
            } else {
                caret = endCaret(after: middle.last!, parent: loc.parent)
            }
            // An empty paragraph the paste started in is not left above the pasted blocks.
            if !merged, node.type == NodeType.paragraph, document.textLength(of: c.block) == 0 {
                deleteBlockPruning(c.block)
            }
        }
        document.stopCapturing()
        return caret
    }

    /// Inline content inserted at a position; returns the position after it.
    private func insertInline(_ inline: [InlineElement], block: BlockID, at offset: Int) -> TextPosition {
        var off = offset
        for el in inline {
            switch el {
            case .text(let t, let m):
                document.insertText(t, marks: m, block: block, at: off)
                off += t.utf16.count
            case .atom(let a, let m):
                document.insertAtom(a, marks: m, block: block, at: off)
                off += 1
            }
        }
        return TextPosition(block: block, offset: off)
    }

    /// The end of the last text in an inserted block, or a new empty paragraph after it when it
    /// holds no text (an image, a rule).
    private func endCaret(after block: BlockNode, parent: BlockID?) -> TextPosition? {
        func lastText(_ b: BlockNode) -> BlockNode? {
            if b.isTextblock { return b }
            if NodeType.atoms.contains(b.type) { return nil }
            for child in b.children.reversed() { if let t = lastText(child) { return t } }
            return nil
        }
        if let t = lastText(block), let current = document.block(t.id) {
            return TextPosition(block: t.id, offset: current.textLength)
        }
        guard let loc = document.location(of: block.id) else { return nil }
        let para = BlockNode.paragraph()
        document.insertBlock(para, parent: loc.parent, at: loc.index + 1)
        return TextPosition(block: para.id, offset: 0)
    }

    private func isInTableCell(_ block: BlockID) -> Bool {
        var current = document.location(of: block)?.parent
        while let id = current {
            if let t = document.block(id)?.type, t == NodeType.tableCell || t == NodeType.tableHeader { return true }
            current = document.location(of: id)?.parent
        }
        return false
    }
}
