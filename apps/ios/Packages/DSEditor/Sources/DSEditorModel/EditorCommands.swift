import DSInk
import Foundation

/// Block kinds a paragraph can be turned into (toolbar, Markdown shortcuts, keyboard).
public enum BlockKind: Hashable, Sendable {
    case paragraph
    case heading(Int)
    case bulletList
    case orderedList(start: Int)
    case taskList(done: Bool)
    case blockquote
    case codeBlock(language: String?)
    case callout(tone: String)
}

/// Structural editing over an `EditorDocument`, with ProseMirror-like behaviour and stroke
/// re-anchoring. All positions are document positions; the view maps them to text offsets via `Projection`.
@MainActor
public struct EditorCommands {
    public let document: EditorDocument

    public init(document: EditorDocument) { self.document = document }

    public var projection: Projection { Projection.build(document.blocks) }

    // MARK: - Typing

    /// Plain typing inside one textblock (the text view already shows it).
    public func typeText(_ text: String, marks: MarkSet, at pos: TextPosition, replacing length: Int = 0) {
        document.transact(origin: .textInput) {
            if length > 0 { document.deleteText(block: pos.block, range: pos.offset..<(pos.offset + length)) }
            document.insertText(text, marks: marks, block: pos.block, at: pos.offset)
        }
    }

    /// Replaces a range of the flattened text, handling newlines and cross-paragraph ranges.
    /// - Returns: caret position after the inserted text.
    @discardableResult
    public func replace(_ range: Range<Int>, with text: String, marks: MarkSet = .empty) -> TextPosition? {
        let p = projection
        guard !p.paragraphs.isEmpty else { return nil }
        var caret: TextPosition?
        document.stopCapturing()
        document.transact {
            caret = deleteRange(range, in: p)
            let pieces = text.components(separatedBy: "\n")
            for (i, piece) in pieces.enumerated() {
                guard let c = caret else { break }
                if i > 0 { caret = splitParagraph(at: c) }
                guard let c2 = caret, !piece.isEmpty else { continue }
                if document.block(c2.block)?.isTextblock == true {
                    document.insertText(piece, marks: marks, block: c2.block, at: c2.offset)
                    caret = TextPosition(block: c2.block, offset: c2.offset + piece.utf16.count)
                }
            }
        }
        document.stopCapturing()
        return caret
    }

    /// Deletes a flattened range; returns where the caret lands.
    @discardableResult
    func deleteRange(_ range: Range<Int>, in p: Projection) -> TextPosition? {
        let (si, so) = p.position(at: range.lowerBound)
        let (ei, eo) = p.position(at: range.upperBound)
        let first = p.paragraphs[si], last = p.paragraphs[ei]
        if si == ei {
            if first.kind.isText {
                if eo > so { document.deleteText(block: first.blockId, range: so..<eo) }
                return TextPosition(block: first.blockId, offset: so)
            }
            if eo > so {
                return replaceAtomWithParagraph(first.blockId)
            }
            return neighbourCaret(p, index: si)
        }
        // Paragraphs fully inside the range.
        for k in (si + 1)..<ei { deleteBlockPruning(p.paragraphs[k].blockId) }
        let firstText = first.kind.isText, lastText = last.kind.isText
        if firstText, so < first.length { document.deleteText(block: first.blockId, range: so..<first.length) }
        if lastText, eo > 0 { document.deleteText(block: last.blockId, range: 0..<eo) }
        if !firstText, so == 0 { deleteBlockPruning(first.blockId) }
        if !lastText, eo == 1 { deleteBlockPruning(last.blockId) }
        if firstText, lastText {
            merge(last.blockId, into: first.blockId)
            return TextPosition(block: first.blockId, offset: so)
        }
        if firstText { return TextPosition(block: first.blockId, offset: so) }
        if lastText { return TextPosition(block: last.blockId, offset: 0) }
        return neighbourCaret(projection, index: min(si, projection.paragraphs.count - 1))
    }

    private func neighbourCaret(_ p: Projection, index: Int) -> TextPosition? {
        for i in stride(from: index, through: 0, by: -1) where p.paragraphs[i].kind.isText {
            return TextPosition(block: p.paragraphs[i].blockId, offset: p.paragraphs[i].length)
        }
        for i in index..<p.paragraphs.count where p.paragraphs[i].kind.isText {
            return TextPosition(block: p.paragraphs[i].blockId, offset: 0)
        }
        return nil
    }

    private func replaceAtomWithParagraph(_ atom: BlockID) -> TextPosition? {
        guard let loc = document.location(of: atom) else { return nil }
        let para = BlockNode.paragraph()
        document.insertBlock(para, parent: loc.parent, at: loc.index)
        document.deleteBlock(atom)
        return TextPosition(block: para.id, offset: 0)
    }

    // MARK: - Enter

    /// Splits the paragraph at `pos` like pressing Return.
    @discardableResult
    public func splitParagraph(at pos: TextPosition) -> TextPosition? {
        guard let node = document.block(pos.block), node.isTextblock else { return nil }
        let p = projection
        guard let idx = p.indexByBlock[pos.block] else { return nil }
        let ctx = p.paragraphs[idx].context
        let len = node.textLength
        let off = min(pos.offset, len)
        var result: TextPosition?
        document.transact {
            if node.type == NodeType.codeBlock {
                document.insertText("\n", marks: .empty, block: pos.block, at: off)
                result = TextPosition(block: pos.block, offset: off + 1)
                return
            }
            if let item = ctx.itemBlockId, isFirstChild(pos.block, of: item) {
                if len == 0 {
                    result = liftItem(item).map { TextPosition(block: $0, offset: 0) }
                    return
                }
                guard let itemNode = document.block(item), let loc = document.location(of: item) else { return }
                var newItem = BlockNode(type: itemNode.type, children: [.paragraph()])
                if itemNode.type == NodeType.taskItem {
                    newItem.attrs = ["taskId": .string(UUIDv7.generate()), "state": "open", "scheduled": .null,
                                     "deadline": .null, "completedAt": .null]
                }
                if off == 0 {
                    // Return at the start: the empty item goes before, text and its anchors stay put.
                    document.insertBlock(newItem, parent: loc.parent, at: loc.index)
                    result = TextPosition(block: pos.block, offset: 0)
                } else {
                    document.insertBlock(newItem, parent: loc.parent, at: loc.index + 1)
                    let target = newItem.children[0].id
                    moveTail(of: pos.block, from: off, to: target)
                    result = TextPosition(block: target, offset: 0)
                }
                return
            }
            if len == 0, let container = ctx.containers.last, ctx.itemBlockId != container,
               isLastChild(pos.block, of: container) {
                // Empty last line of a quote/callout: leave the container.
                result = moveOut(pos.block, after: container).map { TextPosition(block: $0, offset: 0) }
                return
            }
            guard let loc = document.location(of: pos.block) else { return }
            if off == 0, len > 0, node.type != NodeType.title {
                document.insertBlock(BlockNode(type: node.type, attrs: node.attrs), parent: loc.parent, at: loc.index)
                result = TextPosition(block: pos.block, offset: 0)
                return
            }
            let newType: BlockNode
            if node.type == NodeType.title || (node.type == NodeType.heading && off == len) {
                newType = .paragraph()
            } else {
                newType = BlockNode(type: node.type, attrs: node.attrs)
            }
            document.insertBlock(newType, parent: loc.parent, at: loc.index + 1)
            moveTail(of: pos.block, from: off, to: newType.id)
            result = TextPosition(block: newType.id, offset: 0)
        }
        return result
    }

    // MARK: - Backspace at paragraph start

    /// Backspace at offset 0 of a paragraph.
    @discardableResult
    public func joinBackward(at pos: TextPosition) -> TextPosition? {
        let p = projection
        guard let idx = p.indexByBlock[pos.block], let node = document.block(pos.block) else { return nil }
        let ctx = p.paragraphs[idx].context
        var result: TextPosition? = pos
        document.stopCapturing()
        document.transact {
            if let item = ctx.itemBlockId, isFirstChild(pos.block, of: item) {
                if ctx.listDepth > 1 {
                    _ = outdentItem(item)
                } else {
                    _ = liftItem(item)
                }
                result = TextPosition(block: pos.block, offset: 0)
                return
            }
            if node.type == NodeType.heading || node.type == NodeType.codeBlock {
                convertTextblock(pos.block, to: NodeType.paragraph, attrs: [:])
                return
            }
            if let container = ctx.containers.last, ctx.itemBlockId != container, isFirstChild(pos.block, of: container) {
                _ = moveOut(pos.block, before: container)
                return
            }
            guard idx > 0 else { return }
            let prev = p.paragraphs[idx - 1]
            if !prev.kind.isText {
                deleteBlockPruning(prev.blockId)
                return
            }
            if node.textLength == 0 {
                deleteBlockPruning(pos.block)
                result = TextPosition(block: prev.blockId, offset: prev.length)
                return
            }
            merge(pos.block, into: prev.blockId)
            result = TextPosition(block: prev.blockId, offset: prev.length)
        }
        document.stopCapturing()
        return result
    }

    // MARK: - Block types

    /// Turns the paragraph at `pos` (with its list item, if any) into another kind of block.
    @discardableResult
    public func setBlockKind(_ kind: BlockKind, at pos: TextPosition) -> TextPosition {
        document.stopCapturing()
        document.transact {
            var p = projection
            guard var idx = p.indexByBlock[pos.block] else { return }
            // Unwrap from list items and quotes first.
            while let item = p.paragraphs[idx].context.itemBlockId {
                if case .taskList = kind, let n = document.block(item), n.type == NodeType.taskItem { break }
                if case .bulletList = kind, isIn(item, listType: NodeType.bulletList) { break }
                if case .orderedList = kind, isIn(item, listType: NodeType.orderedList) { break }
                guard liftItem(item) != nil else { break }
                p = projection
                guard let i = p.indexByBlock[pos.block] else { return }
                idx = i
            }
            if p.paragraphs[idx].context.itemBlockId != nil { return }
            if let container = p.paragraphs[idx].context.containers.last {
                let isQuote = document.block(container)?.type == NodeType.blockquote
                if case .blockquote = kind, isQuote { return }
                _ = moveOut(pos.block, after: container, splitting: true)
            }
            switch kind {
            case .paragraph:
                convertTextblock(pos.block, to: NodeType.paragraph, attrs: [:])
            case .heading(let level):
                convertTextblock(pos.block, to: NodeType.heading, attrs: ["level": .number(Double(level))])
            case .codeBlock(let language):
                convertTextblock(pos.block, to: NodeType.codeBlock, attrs: ["language": language.map { .string($0) } ?? .null])
            case .bulletList:
                wrapInList(pos.block, listType: NodeType.bulletList, itemType: NodeType.listItem, itemAttrs: [:], listAttrs: [:])
            case .orderedList(let start):
                wrapInList(pos.block, listType: NodeType.orderedList, itemType: NodeType.listItem, itemAttrs: [:],
                           listAttrs: ["start": .number(Double(start))])
            case .taskList(let done):
                wrapInList(pos.block, listType: NodeType.taskList, itemType: NodeType.taskItem,
                           itemAttrs: ["taskId": .string(UUIDv7.generate()), "state": .string(done ? "done" : "open"),
                                       "scheduled": .null, "deadline": .null,
                                       "completedAt": done ? .string(Self.isoNow()) : .null],
                           listAttrs: [:])
            case .blockquote:
                wrap(pos.block, in: BlockNode(type: NodeType.blockquote))
            case .callout(let tone):
                wrap(pos.block, in: BlockNode(type: NodeType.callout, attrs: ["tone": .string(tone), "emoji": .null]))
            }
        }
        document.stopCapturing()
        return pos
    }

    // MARK: - Lists

    /// Tab: nest the item under its previous sibling.
    @discardableResult
    public func indentItem(_ item: BlockID) -> Bool {
        guard let loc = document.location(of: item), loc.index > 0, let listId = loc.parent,
              let list = document.block(listId) else { return false }
        let prevItem = list.children[loc.index - 1]
        guard let itemNode = document.block(item) else { return false }
        var ok = false
        document.stopCapturing()
        document.transact {
            let re = StrokeReanchoring(document: document, blocks: textblockIds(itemNode))
            document.deleteBlock(item)
            if let lastChild = prevItem.children.last, lastChild.type == list.type {
                document.insertBlock(itemNode, parent: lastChild.id, at: lastChild.children.count)
            } else {
                let nested = BlockNode(type: list.type, attrs: list.type == NodeType.orderedList ? ["start": 1] : [:], children: [itemNode])
                document.insertBlock(nested, parent: prevItem.id, at: prevItem.children.count)
            }
            re.apply(to: document, map: { $0 })
            ok = true
        }
        document.stopCapturing()
        return ok
    }

    /// Shift-Tab: move the item one level out.
    @discardableResult
    public func outdentItem(_ item: BlockID) -> Bool {
        guard let loc = document.location(of: item), let listId = loc.parent,
              let listLoc = document.location(of: listId), let parentItem = listLoc.parent,
              let parentNode = document.block(parentItem), NodeType.items.contains(parentNode.type),
              let parentLoc = document.location(of: parentItem), let itemNode = document.block(item) else {
            return liftItem(item) != nil
        }
        document.transact {
            let re = StrokeReanchoring(document: document, blocks: textblockIds(itemNode))
            document.deleteBlock(item)
            if document.block(listId)?.children.isEmpty == true { document.deleteBlock(listId) }
            document.insertBlock(itemNode, parent: parentLoc.parent, at: parentLoc.index + 1)
            re.apply(to: document, map: { $0 })
        }
        return true
    }

    /// Moves an item's content out of its list (splitting the list). Returns the first textblock id.
    @discardableResult
    func liftItem(_ item: BlockID) -> BlockID? {
        guard let itemNode = document.block(item), let loc = document.location(of: item), let listId = loc.parent,
              let list = document.block(listId), let listLoc = document.location(of: listId) else { return nil }
        var first: BlockID?
        document.transact {
            let after = Array(list.children[(loc.index + 1)...])
            var moved = textblockIds(itemNode)
            for a in after { moved.formUnion(textblockIds(a)) }
            let re = StrokeReanchoring(document: document, blocks: moved)
            for a in after { document.deleteBlock(a.id) }
            document.deleteBlock(item)
            var at = listLoc.index + 1
            for child in itemNode.children {
                document.insertBlock(child, parent: listLoc.parent, at: at)
                at += 1
            }
            if !after.isEmpty {
                var rest = BlockNode(type: list.type, attrs: list.attrs, children: after)
                if list.type == NodeType.orderedList {
                    let start = Int(list.attrs["start"]?.numberValue ?? 1) + loc.index + 1
                    rest.attrs["start"] = .number(Double(start))
                }
                document.insertBlock(rest, parent: listLoc.parent, at: at)
            }
            if document.block(listId)?.children.isEmpty == true { document.deleteBlock(listId) }
            re.apply(to: document, map: { $0 })
            first = itemNode.children.first(where: \.isTextblock)?.id
        }
        return first
    }

    // MARK: - Marks

    /// Toggles a mark over a flattened range (removes it if the whole range already has it).
    public func toggleMark(_ name: String, value: JSONValue = true, range: Range<Int>) {
        guard !range.isEmpty else { return }
        let p = projection
        let segments = textSegments(range, in: p)
        let all = segments.allSatisfy { seg in
            document.inline(of: seg.block, range: seg.range).allSatisfy { $0.marks.contains(name) }
        }
        document.stopCapturing()
        document.transact {
            for seg in segments {
                document.setMark(name, value: all ? nil : value, block: seg.block, range: seg.range)
            }
        }
        document.stopCapturing()
    }

    public func setMark(_ name: String, value: JSONValue?, range: Range<Int>) {
        let segments = textSegments(range, in: projection)
        document.transact {
            for seg in segments { document.setMark(name, value: value, block: seg.block, range: seg.range) }
        }
    }

    /// Marks common to the whole range (or at the caret: of the character before it).
    public func marks(at range: Range<Int>) -> MarkSet {
        let p = projection
        if range.isEmpty {
            let (i, o) = p.position(at: range.lowerBound)
            guard p.paragraphs.indices.contains(i), p.paragraphs[i].kind.isText, o > 0 else { return .empty }
            return document.inline(of: p.paragraphs[i].blockId, range: (o - 1)..<o).first?.marks ?? .empty
        }
        var common: MarkSet?
        for seg in textSegments(range, in: p) {
            for el in document.inline(of: seg.block, range: seg.range) {
                if let c = common {
                    common = MarkSet(c.values.filter { el.marks[$0.key] == $0.value })
                } else {
                    common = el.marks
                }
            }
        }
        return common ?? .empty
    }

    struct Segment {
        var block: BlockID
        var range: Range<Int>
    }

    func textSegments(_ range: Range<Int>, in p: Projection) -> [Segment] {
        let (si, so) = p.position(at: range.lowerBound)
        let (ei, eo) = p.position(at: range.upperBound)
        var out: [Segment] = []
        for i in si...ei where p.paragraphs[i].kind.isText {
            let lo = i == si ? so : 0
            let hi = i == ei ? eo : p.paragraphs[i].length
            if hi > lo { out.append(Segment(block: p.paragraphs[i].blockId, range: lo..<hi)) }
        }
        return out
    }

    // MARK: - Tasks

    public func toggleTask(_ item: BlockID) {
        guard let node = document.block(item), node.type == NodeType.taskItem else { return }
        let done = node.attrs["state"]?.stringValue == "done"
        document.stopCapturing()
        document.setAttributes(item, ["state": .string(done ? "open" : "done"),
                                      "completedAt": done ? .null : .string(Self.isoNow())])
        document.stopCapturing()
    }

    public func setTaskDates(_ item: BlockID, scheduled: String?, deadline: String?) {
        document.setAttributes(item, ["scheduled": scheduled.map { .string($0) } ?? .null,
                                      "deadline": deadline.map { .string($0) } ?? .null])
    }

    // MARK: - Inserting blocks

    /// Inserts a block after the paragraph at `pos` (replacing it when it is an empty plain paragraph).
    /// Keeps an editable paragraph after the block. Returns the caret position after the insert.
    @discardableResult
    public func insertBlock(_ node: BlockNode, after pos: TextPosition) -> TextPosition? {
        guard let loc = document.location(of: pos.block), let current = document.block(pos.block) else { return nil }
        var caret: TextPosition?
        document.stopCapturing()
        document.transact {
            let replaceEmpty = current.type == NodeType.paragraph && current.textLength == 0 && loc.parent == nil
            document.insertBlock(node, parent: loc.parent, at: loc.index + 1)
            if replaceEmpty { document.deleteBlock(pos.block) }
            guard let newLoc = document.location(of: node.id) else { return }
            let siblings = newLoc.parent.flatMap { document.block($0)?.children } ?? document.blocks
            if newLoc.index + 1 < siblings.count, siblings[newLoc.index + 1].isTextblock {
                caret = TextPosition(block: siblings[newLoc.index + 1].id, offset: 0)
            } else if node.isTextblock {
                caret = TextPosition(block: node.id, offset: 0)
            } else {
                let para = BlockNode.paragraph()
                document.insertBlock(para, parent: newLoc.parent, at: newLoc.index + 1)
                caret = TextPosition(block: para.id, offset: 0)
            }
        }
        document.stopCapturing()
        return caret
    }

    public func insertInlineAtom(_ atom: InlineAtom, at pos: TextPosition, marks: MarkSet = .empty) -> TextPosition {
        document.stopCapturing()
        document.insertAtom(atom, marks: marks, block: pos.block, at: pos.offset)
        document.stopCapturing()
        return TextPosition(block: pos.block, offset: pos.offset + 1)
    }

    // MARK: - Helpers

    func textblockIds(_ node: BlockNode) -> Set<BlockID> {
        var out: Set<BlockID> = []
        if node.isTextblock { out.insert(node.id) }
        for c in node.children { out.formUnion(textblockIds(c)) }
        return out
    }

    func isFirstChild(_ block: BlockID, of parent: BlockID) -> Bool {
        document.block(parent)?.children.first?.id == block
    }

    func isLastChild(_ block: BlockID, of parent: BlockID) -> Bool {
        document.block(parent)?.children.last?.id == block
    }

    func isIn(_ item: BlockID, listType: String) -> Bool {
        guard let list = document.location(of: item)?.parent else { return false }
        return document.block(list)?.type == listType
    }

    /// Moves `[from, end)` of a textblock to the start of another textblock, keeping its strokes.
    func moveTail(of block: BlockID, from off: Int, to target: BlockID) {
        let len = document.textLength(of: block)
        guard off < len else { return }
        let re = StrokeReanchoring(document: document, blocks: [block])
        let runs = document.inline(of: block, range: off..<len)
        document.deleteText(block: block, range: off..<len)
        insert(runs, into: target, at: 0)
        re.apply(to: document, map: { pos in
            pos.block == block && pos.offset >= off ? TextPosition(block: target, offset: pos.offset - off) : nil
        })
    }

    /// Appends the content of `source` to `target` and removes `source`.
    func merge(_ source: BlockID, into target: BlockID) {
        let targetLen = document.textLength(of: target)
        let re = StrokeReanchoring(document: document, blocks: [source])
        let runs = document.inline(of: source, range: nil)
        insert(runs, into: target, at: targetLen)
        deleteBlockPruning(source)
        re.apply(to: document, map: { pos in
            pos.block == source ? TextPosition(block: target, offset: targetLen + pos.offset) : nil
        }, mapBlock: { $0 == source ? target : nil })
    }

    func insert(_ runs: [InlineElement], into block: BlockID, at offset: Int) {
        var o = offset
        for r in runs {
            switch r {
            case .text(let s, let m): document.insertText(s, marks: m, block: block, at: o)
            case .atom(let a, let m): document.insertAtom(a, marks: m, block: block, at: o)
            }
            o += r.length
        }
    }

    /// Deletes a block and any containers left empty by it.
    func deleteBlockPruning(_ id: BlockID) {
        var parent = document.location(of: id)?.parent
        document.deleteBlock(id)
        while let p = parent, let node = document.block(p), node.children.isEmpty {
            parent = document.location(of: p)?.parent
            document.deleteBlock(p)
        }
    }

    /// Re-creates a textblock as another type with the same blockId and content.
    func convertTextblock(_ id: BlockID, to type: String, attrs: [String: JSONValue]) {
        guard let node = document.block(id), let loc = document.location(of: id) else { return }
        if node.type == type, node.attrs == attrs { return }
        let re = StrokeReanchoring(document: document, blocks: [id])
        var inline = node.inline ?? []
        if type == NodeType.codeBlock {
            inline = inline.compactMap { el in
                if case .text(let s, _) = el { return .text(s, .empty) }
                return nil
            }
        }
        let replacement = BlockNode(id: id, type: type, attrs: attrs, inline: inline)
        document.deleteBlock(id)
        document.insertBlock(replacement, parent: loc.parent, at: loc.index)
        re.apply(to: document, map: { $0 })
    }

    func wrapInList(_ id: BlockID, listType: String, itemType: String, itemAttrs: [String: JSONValue],
                    listAttrs: [String: JSONValue]) {
        guard var node = document.block(id), let loc = document.location(of: id) else { return }
        if node.type != NodeType.paragraph { node = BlockNode(id: id, type: NodeType.paragraph, inline: node.inline) }
        let re = StrokeReanchoring(document: document, blocks: [id])
        let item = BlockNode(type: itemType, attrs: itemAttrs, children: [node])
        let siblings = loc.parent.flatMap { document.block($0)?.children } ?? document.blocks
        document.deleteBlock(id)
        if loc.index > 0, siblings[loc.index - 1].type == listType {
            let prev = siblings[loc.index - 1]
            document.insertBlock(item, parent: prev.id, at: prev.children.count)
        } else {
            document.insertBlock(BlockNode(type: listType, attrs: listAttrs, children: [item]), parent: loc.parent, at: loc.index)
        }
        re.apply(to: document, map: { $0 })
    }

    func wrap(_ id: BlockID, in container: BlockNode) {
        guard let node = document.block(id), let loc = document.location(of: id) else { return }
        let re = StrokeReanchoring(document: document, blocks: [id])
        var c = container
        c.children = [node.type == NodeType.title ? BlockNode(id: id, type: NodeType.paragraph, inline: node.inline) : node]
        document.deleteBlock(id)
        document.insertBlock(c, parent: loc.parent, at: loc.index)
        re.apply(to: document, map: { $0 })
    }

    /// Moves a block out of its container to right after it (splitting the container when the
    /// block is in the middle and `splitting` is set).
    func moveOut(_ id: BlockID, after container: BlockID, splitting: Bool = false) -> BlockID? {
        guard let node = document.block(id), let loc = document.location(of: id),
              let cont = document.block(container), let cloc = document.location(of: container) else { return nil }
        let after = Array(cont.children[(loc.index + 1)...])
        var moved = textblockIds(node)
        for a in after { moved.formUnion(textblockIds(a)) }
        let re = StrokeReanchoring(document: document, blocks: moved)
        document.deleteBlock(id)
        var at = cloc.index + 1
        document.insertBlock(node, parent: cloc.parent, at: at)
        at += 1
        if splitting, !after.isEmpty {
            for a in after { document.deleteBlock(a.id) }
            document.insertBlock(BlockNode(type: cont.type, attrs: cont.attrs, children: after), parent: cloc.parent, at: at)
        }
        if document.block(container)?.children.isEmpty == true { document.deleteBlock(container) }
        re.apply(to: document, map: { $0 })
        return id
    }

    func moveOut(_ id: BlockID, before container: BlockID) -> BlockID? {
        guard let node = document.block(id), let cloc = document.location(of: container) else { return nil }
        let re = StrokeReanchoring(document: document, blocks: textblockIds(node))
        document.deleteBlock(id)
        document.insertBlock(node, parent: cloc.parent, at: cloc.index)
        if document.block(container)?.children.isEmpty == true { document.deleteBlock(container) }
        re.apply(to: document, map: { $0 })
        return id
    }

    static func isoNow() -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: Date())
    }
}
