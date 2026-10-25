import Foundation

/// Current document format version (document-model.md §6).
public let currentFormatVersion = 1

/// Note content: blocks (`content`), meta, strokes, comments (document-model.md §4).
///
/// Reads are snapshots; writes go through `CRDTDocument.transact` with origin `.local` by
/// default (undoable). Block paths are child-index paths in `content` (`[0]` = title).
public final class NoteDocument: Sendable {
    public let crdt: CRDTDocument

    public var noteId: String { crdt.docId }

    public init(noteId: String, clientId: UInt64? = nil) {
        crdt = CRDTDocument(kind: .note, docId: noteId, clientId: clientId)
    }

    public init(_ crdt: CRDTDocument) {
        precondition(crdt.kind == .note)
        self.crdt = crdt
    }

    /// Fills an empty document with the minimal valid content: `meta.formatVersion`, a title
    /// and one empty paragraph.
    public func initialize(title: String = "", origin: TransactionOrigin = .system) throws {
        try crdt.transact(origin: origin) { txn in
            txn.set("meta", key: "formatVersion", .number(value: Double(currentFormatVersion)))
            txn.insertNodes([Block.title(title).xml, Block.paragraph("").xml], into: [], at: 0)
        }
    }

    // MARK: Format version

    public var formatVersion: Int { crdt.mapValue("meta", ["formatVersion"])?.intValue ?? currentFormatVersion }

    /// A newer format than this client understands: open read-only (R-03).
    public var isReadOnly: Bool { formatVersion > currentFormatVersion }

    // MARK: Blocks

    /// Top-level blocks (snapshot).
    public func blocks() throws -> [Block] {
        try crdt.xmlChildren().compactMap(Block.init(xml:))
    }

    public func block(at path: [UInt32]) throws -> Block? {
        Block(xml: try crdt.xmlNode(at: path))
    }

    /// Title text (first block if it is `title`).
    public func title() throws -> String {
        guard let first = try crdt.xmlChildren().first, first.elementName == BlockType.title else { return "" }
        return first.textContent
    }

    /// Child-index path of the block with `blockId`.
    public func path(ofBlock blockId: String) throws -> [UInt32]? {
        func search(_ nodes: [XmlNode], prefix: [UInt32]) -> [UInt32]? {
            for (i, node) in nodes.enumerated() {
                let path = prefix + [UInt32(i)]
                if node.attributes["blockId"]?.stringValue == blockId { return path }
                if let found = search(node.children, prefix: path) { return found }
            }
            return nil
        }
        return search(try crdt.xmlChildren(), prefix: [])
    }

    /// Inserts blocks into the container at `parent` (`[]` = top level) at `index`.
    public func insertBlocks(_ blocks: [Block], into parent: [UInt32] = [], at index: UInt32, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { txn in
            txn.insertNodes(blocks.map(\.xml), into: parent, at: index)
        }
    }

    /// Appends blocks at the end of the top level.
    public func appendBlocks(_ blocks: [Block], origin: TransactionOrigin = .local) throws {
        let count = UInt32(try crdt.xmlChildren().count)
        try insertBlocks(blocks, at: count, origin: origin)
    }

    public func deleteBlock(at path: [UInt32], origin: TransactionOrigin = .local) throws {
        guard let index = path.last else { return }
        try crdt.transact(origin: origin) { txn in
            txn.deleteNodes(in: Array(path.dropLast()), at: index)
        }
    }

    /// Replaces the block at `path` with `block` (delete + insert; the CRDT has no move).
    public func replaceBlock(at path: [UInt32], with block: Block, origin: TransactionOrigin = .local) throws {
        guard let index = path.last else { return }
        let parent = Array(path.dropLast())
        try crdt.transact(origin: origin) { txn in
            txn.deleteNodes(in: parent, at: index)
            txn.insertNodes([block.xml], into: parent, at: index)
        }
    }

    /// Moves a block: delete at `from`, insert a copy at `to` (paths in the tree *before* the
    /// move; `to` is adjusted when both share a parent).
    public func moveBlock(from: [UInt32], to parent: [UInt32], at index: UInt32, origin: TransactionOrigin = .local) throws {
        guard let block = try block(at: from), let fromIndex = from.last else { return }
        let fromParent = Array(from.dropLast())
        var target = index
        if fromParent == parent && fromIndex < index { target -= 1 }
        try crdt.transact(origin: origin) { txn in
            txn.deleteNodes(in: fromParent, at: fromIndex)
            txn.insertNodes([block.xml], into: parent, at: target)
        }
    }

    /// Sets (or removes with `.null`) block attributes.
    public func setBlockAttributes(_ attrs: [String: YValue], at path: [UInt32], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { txn in
            for (k, v) in attrs.sorted(by: { $0.key < $1.key }) {
                if v.isNull { txn.removeAttribute(k, at: path) } else { txn.setAttribute(k, v, at: path) }
            }
        }
    }

    // MARK: Inline text

    /// Where a UTF-16 offset inside a text block falls among its XML children.
    public struct InlineLocation: Hashable, Sendable {
        /// Path of the `XmlText` child (nil when the offset falls on an inline node / the block
        /// has no text node there yet).
        public var textPath: [UInt32]?
        /// Offset inside that text node.
        public var offset: UInt32
        /// Index among the block's XML children where a new child would go.
        public var childIndex: UInt32
    }

    /// Maps a block-level UTF-16 offset (inline nodes count as 1) to an XML location.
    public func locate(offset: Int, inBlock path: [UInt32]) throws -> InlineLocation {
        let children = try crdt.xmlChildren(at: path)
        var remaining = offset
        for (i, child) in children.enumerated() {
            let length: Int
            switch child {
            case .text(let chunks): length = chunks.reduce(0) { $0 + ($1.embed == nil ? $1.text.utf16.count : 1) }
            case .element: length = 1
            }
            if case .text = child, remaining <= length {
                return InlineLocation(textPath: path + [UInt32(i)], offset: UInt32(remaining), childIndex: UInt32(i))
            }
            if remaining < length {
                return InlineLocation(textPath: nil, offset: 0, childIndex: UInt32(i))
            }
            remaining -= length
        }
        return InlineLocation(textPath: nil, offset: 0, childIndex: UInt32(children.count))
    }

    /// Inserts text into a text block at a block-level UTF-16 offset, creating an `XmlText`
    /// child when needed.
    public func insertText(_ text: String, marks: [Mark] = [], at offset: Int, inBlock path: [UInt32], origin: TransactionOrigin = .local) throws {
        let loc = try locate(offset: offset, inBlock: path)
        try crdt.transact(origin: origin) { txn in
            if let textPath = loc.textPath {
                txn.insertText(text, marks: marks.attributes, at: loc.offset, in: textPath)
            } else {
                txn.insertNodes([.text(chunks: [TextChunk(text: text, embed: nil, attributes: marks.attributes)])], into: path, at: loc.childIndex)
            }
        }
    }

    /// Deletes a block-level UTF-16 range (may span text runs and inline nodes).
    public func deleteText(range: Range<Int>, inBlock path: [UInt32], origin: TransactionOrigin = .local) throws {
        try editRuns(range: range, inBlock: path, origin: origin) { txn, piece in
            switch piece {
            case .text(let textPath, let start, let length):
                txn.deleteText(at: start, length: length, in: textPath)
            case .node(let parent, let index):
                txn.deleteNodes(in: parent, at: index)
            }
        }
    }

    /// Adds (`value` non-nil) or removes marks over a block-level UTF-16 range.
    public func format(range: Range<Int>, set marks: [Mark] = [], remove removed: [String] = [], inBlock path: [UInt32], origin: TransactionOrigin = .local) throws {
        var attrs = marks.attributes
        for name in removed { attrs[name] = .null }
        try editRuns(range: range, inBlock: path, origin: origin) { txn, piece in
            if case .text(let textPath, let start, let length) = piece {
                txn.format(at: start, length: length, marks: attrs, in: textPath)
            }
        }
    }

    /// Inserts an inline node (`noteLink`, `tag`, `hardBreak`) at a block-level offset,
    /// splitting the text run.
    public func insertInlineNode(name: String, attrs: [String: YValue], at offset: Int, inBlock path: [UInt32], origin: TransactionOrigin = .local) throws {
        let children = try crdt.xmlChildren(at: path)
        let loc = try locate(offset: offset, inBlock: path)
        let node = XmlNode.element(name: name, attributes: attrs.filter { !$0.value.isNull }, children: [])
        try crdt.transact(origin: origin) { txn in
            guard let textPath = loc.textPath, case .text(let chunks) = children[Int(loc.childIndex)] else {
                txn.insertNodes([node], into: path, at: loc.childIndex)
                return
            }
            let total = chunks.reduce(0) { $0 + ($1.embed == nil ? $1.text.utf16.count : 1) }
            if loc.offset == 0 {
                txn.insertNodes([node], into: path, at: loc.childIndex)
            } else if Int(loc.offset) >= total {
                txn.insertNodes([node], into: path, at: loc.childIndex + 1)
            } else {
                // Split: move the tail of the run into a new XmlText after the node.
                let tail = NoteDocument.slice(chunks, from: Int(loc.offset))
                txn.deleteText(at: loc.offset, length: UInt32(total) - loc.offset, in: textPath)
                txn.insertNodes([node, .text(chunks: tail)], into: path, at: loc.childIndex + 1)
            }
        }
    }

    private enum RunPiece {
        case text(path: [UInt32], start: UInt32, length: UInt32)
        case node(parent: [UInt32], index: UInt32)
    }

    /// Calls `body` for each XML piece intersecting `range`, last piece first so that
    /// deletions keep earlier indices valid.
    private func editRuns(range: Range<Int>, inBlock path: [UInt32], origin: TransactionOrigin, _ body: (inout CRDTTransaction, RunPiece) -> Void) throws {
        let children = try crdt.xmlChildren(at: path)
        var pieces: [RunPiece] = []
        var position = 0
        for (i, child) in children.enumerated() {
            let length: Int
            switch child {
            case .text(let chunks): length = chunks.reduce(0) { $0 + ($1.embed == nil ? $1.text.utf16.count : 1) }
            case .element: length = 1
            }
            let start = max(range.lowerBound, position)
            let end = min(range.upperBound, position + length)
            if start < end {
                switch child {
                case .text: pieces.append(.text(path: path + [UInt32(i)], start: UInt32(start - position), length: UInt32(end - start)))
                case .element: pieces.append(.node(parent: path, index: UInt32(i)))
                }
            }
            position += length
        }
        guard !pieces.isEmpty else { return }
        try crdt.transact(origin: origin) { txn in
            for piece in pieces.reversed() { body(&txn, piece) }
        }
    }

    static func slice(_ chunks: [TextChunk], from offset: Int) -> [TextChunk] {
        var out: [TextChunk] = []
        var pos = 0
        for c in chunks {
            let len = c.embed == nil ? c.text.utf16.count : 1
            if pos + len <= offset { pos += len; continue }
            if pos >= offset || c.embed != nil {
                out.append(c)
            } else {
                let utf16 = Array(c.text.utf16)
                let tail = String(decoding: utf16[(offset - pos)...], as: UTF16.self)
                out.append(TextChunk(text: tail, embed: nil, attributes: c.attributes))
            }
            pos += len
        }
        return out
    }

    // MARK: Tasks

    /// Updates a task by `taskId` (state, dates). Setting `.done` stamps `completedAt`.
    public func updateTask(taskId: String, state: TaskState? = nil, scheduled: String?? = nil, deadline: String?? = nil,
                           now: Date = Date(), origin: TransactionOrigin = .local) throws {
        guard let path = try path(where: { $0.elementName == BlockType.taskItem && $0.attributes["taskId"]?.stringValue == taskId }) else {
            throw DocumentError.notFound("task \(taskId)")
        }
        var attrs: [String: YValue] = [:]
        if let state {
            attrs["state"] = .string(value: state.rawValue)
            attrs["completedAt"] = state == .done ? .string(value: DSDate.iso(now)) : .null
        }
        if let scheduled { attrs["scheduled"] = .optionalString(scheduled) }
        if let deadline { attrs["deadline"] = .optionalString(deadline) }
        try crdt.transact(origin: origin) { txn in
            for (k, v) in attrs.sorted(by: { $0.key < $1.key }) { txn.setAttribute(k, v, at: path) }
        }
    }

    private func path(where predicate: (XmlNode) -> Bool) throws -> [UInt32]? {
        func search(_ nodes: [XmlNode], prefix: [UInt32]) -> [UInt32]? {
            for (i, node) in nodes.enumerated() {
                let p = prefix + [UInt32(i)]
                if predicate(node) { return p }
                if let found = search(node.children, prefix: p) { return found }
            }
            return nil
        }
        return search(try crdt.xmlChildren(), prefix: [])
    }

    // MARK: Meta

    public func meta() -> NoteMetaContent {
        NoteMetaContent(entries: crdt.mapValue("meta")?.entries ?? [:])
    }

    public func setStyle(_ style: NoteMetaContent.Style, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.set("meta", key: "style", style.value) }
    }

    public func setCover(_ cover: NoteMetaContent.Cover?, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.set("meta", key: "cover", cover?.value ?? .null) }
    }

    public func setBackdrop(_ backdrop: NoteMetaContent.Backdrop?, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.set("meta", key: "backdrop", backdrop?.yValue ?? .null) }
    }

    // MARK: Strokes

    public func strokes() -> [Stroke] {
        guard let map = crdt.mapValue("strokes")?.entries else { return [] }
        return map.compactMap { id, value in value.entries.flatMap { Stroke(id: id, fields: $0) } }
            .sorted { ($0.createdAt, $0.id) < ($1.createdAt, $1.id) }
    }

    public func stroke(id: String) -> Stroke? {
        crdt.mapValue("strokes", [id])?.entries.flatMap { Stroke(id: id, fields: $0) }
    }

    /// Adds finished strokes (each a nested `Y.Map`).
    public func addStrokes(_ strokes: [Stroke], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { txn in
            for s in strokes { txn.set("strokes", key: s.id, .sharedMap(entries: s.fields)) }
        }
    }

    /// Stroke eraser: removes whole strokes.
    public func removeStrokes(ids: [String], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { txn in
            for id in ids { txn.delete("strokes", key: id) }
        }
    }

    /// Pixel eraser: replaces a stroke by its remaining pieces in one transaction.
    public func replaceStroke(id: String, with pieces: [Stroke], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { txn in
            txn.delete("strokes", key: id)
            for s in pieces { txn.set("strokes", key: s.id, .sharedMap(entries: s.fields)) }
        }
    }

    public func setStrokeHidden(id: String, _ hidden: Bool, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.set("strokes", [id], key: "hidden", .bool(value: hidden)) }
    }

    // MARK: Undo (with stroke anchor rebasing, strokes.md §4.1)

    /// Undoes the last local step and rebases stroke anchors restored by it, so that other
    /// devices see the marks on the restored text too. Prefer this over `crdt.undo()`.
    @discardableResult
    public func undo() throws -> Bool {
        guard crdt.undo() else { return false }
        try rebaseRestoredAnchors()
        return true
    }

    @discardableResult
    public func redo() throws -> Bool {
        guard crdt.redo() else { return false }
        try rebaseRestoredAnchors()
        return true
    }

    /// Rewrites `anchors` of text strokes whose anchors point at text restored by undo/redo.
    /// Runs as a non-undoable outgoing transaction right after the undo step.
    public func rebaseRestoredAnchors() throws {
        var changes: [(id: String, anchors: [Data])] = []
        for stroke in strokes() where stroke.anchorKind == .text && !stroke.anchors.isEmpty {
            let rebased = try crdt.rebase(relativePositions: stroke.anchors)
            guard rebased.contains(where: { $0 != nil }) else { continue }
            changes.append((stroke.id, zip(stroke.anchors, rebased).map { $1 ?? $0 }))
        }
        guard !changes.isEmpty else { return }
        try crdt.transact(origin: .undo) { txn in
            for c in changes {
                txn.set("strokes", [c.id], key: "anchors", .list(items: c.anchors.map { .bytes(value: $0) }))
            }
        }
    }

    /// Text strokes whose anchors are all deleted (drawn nowhere; D-35, strokes.md §4.2).
    public func orphanedStrokeIds() throws -> Set<String> {
        var out = Set<String>()
        for stroke in strokes() where stroke.anchorKind == .text {
            let resolved = try crdt.resolve(relativePositions: stroke.anchors)
            if resolved.allSatisfy({ $0 == nil || $0!.deleted }) { out.insert(stroke.id) }
        }
        return out
    }

    /// Before building a snapshot: deletes strokes whose anchors are all deleted and that have
    /// been orphaned (or, if unknown, created) more than `days` ago (strokes.md §4.2).
    /// Returns the removed ids.
    @discardableResult
    public func purgeOrphanedStrokes(orphanedAt: (String) -> Date?, now: Date = Date(), days: Int = 30) throws -> [String] {
        let orphaned = try orphanedStrokeIds()
        let limit = now.addingTimeInterval(-Double(days) * 86_400)
        let expired = strokes().filter { s in
            guard orphaned.contains(s.id) else { return false }
            let since = orphanedAt(s.id) ?? Date(timeIntervalSince1970: s.createdAt / 1000)
            return since < limit
        }.map(\.id)
        if !expired.isEmpty { try removeStrokes(ids: expired, origin: .system) }
        return expired
    }

    // MARK: Version restore (strokes.md §4.1)

    /// Restores `content` and `strokes` of a version (decrypted state from
    /// `GET /docs/:id/versions/:seq`) as a new local edit. Stroke anchors are remapped through
    /// absolute positions: anchor in the version → same path/index in the restored text → new
    /// relative position. Anchors deleted in the version stay as they are (orphans). Meta and
    /// comments are kept.
    public func restoreVersion(state: Data, origin: TransactionOrigin = .local) throws {
        let old = NoteDocument(noteId: noteId)
        try old.crdt.applyUpdate(state, origin: .storage)
        let oldBlocks = try old.blocks()
        let oldStrokes = old.strokes()
        var resolvedAnchors: [String: [ResolvedIndex?]] = [:]
        for s in oldStrokes where s.anchorKind == .text {
            resolvedAnchors[s.id] = try old.crdt.resolve(relativePositions: s.anchors)
        }

        let count = UInt32(try crdt.xmlChildren().count)
        let currentStrokeIds = crdt.mapKeys("strokes")
        try crdt.transact(origin: origin) { txn in
            if count > 0 { txn.deleteNodes(in: [], at: 0, count: count) }
            txn.insertNodes(oldBlocks.map(\.xml), into: [], at: 0)
            for id in currentStrokeIds { txn.delete("strokes", key: id) }
        }
        // Same tree shape as the version, so paths and indices carry over.
        var restored: [Stroke] = []
        for var s in oldStrokes {
            if let resolved = resolvedAnchors[s.id] {
                s.anchors = try zip(s.anchors, resolved).map { original, r in
                    guard let r, !r.deleted else { return original }
                    return try crdt.relativePosition(at: r.path, index: r.index)
                }
            }
            restored.append(s)
        }
        try addStrokes(restored, origin: origin)
    }

    // MARK: Comments

    public func comments() -> [Comment] {
        guard let map = crdt.mapValue("comments")?.entries else { return [] }
        return map.compactMap { id, value in value.entries.flatMap { Comment(id: id, fields: $0) } }
            .sorted { ($0.createdAt, $0.id) < ($1.createdAt, $1.id) }
    }

    public func addComment(_ comment: Comment, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.set("comments", key: comment.id, .sharedMap(entries: comment.fields)) }
    }

    public func resolveComment(id: String, at date: Date? = Date(), origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.set("comments", [id], key: "resolvedAt", .optionalString(date.map(DSDate.iso))) }
    }

    public func deleteComment(id: String, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.delete("comments", key: id) }
    }

    // MARK: Derived data

    /// Tasks, links, tags and plain text of this note (document-model.md §5).
    public func derived() throws -> NoteDerivedData {
        NoteDerivedData(noteId: noteId, blocks: try blocks())
    }
}

public enum DocumentError: Error, Equatable {
    case notFound(String)
    case readOnly
}

/// `meta` of a note (document-model.md §4.3).
public struct NoteMetaContent: Hashable, Sendable {
    public struct Style: Hashable, Sendable {
        public var font: String = "sans"
        public var width: String = "normal"
        public var paper: String = "plain"
        public var textColor: String?

        public init(font: String = "sans", width: String = "normal", paper: String = "plain", textColor: String? = nil) {
            self.font = font
            self.width = width
            self.paper = paper
            self.textColor = textColor
        }

        var value: YValue {
            .object(entries: ["font": .string(value: font), "width": .string(value: width), "paper": .string(value: paper), "textColor": .optionalString(textColor)])
        }
    }

    public struct Cover: Hashable, Sendable {
        public var attachmentId: String
        public var offsetY: Double

        public init(attachmentId: String, offsetY: Double = 0.5) {
            self.attachmentId = attachmentId
            self.offsetY = offsetY
        }

        var value: YValue { .object(entries: ["attachmentId": .string(value: attachmentId), "offsetY": .number(value: offsetY)]) }
    }

    public struct Backdrop: Hashable, Sendable {
        public enum Kind: String, Sendable { case color, gradient }
        public var kind: Kind
        public var value: String

        public init(kind: Kind, value: String) {
            self.kind = kind
            self.value = value
        }

        var yValue: YValue { .object(entries: ["kind": .string(value: kind.rawValue), "value": .string(value: value)]) }
    }

    public var formatVersion: Int
    public var style: Style
    public var cover: Cover?
    public var backdrop: Backdrop?

    init(entries: [String: YValue]) {
        formatVersion = entries["formatVersion"]?.intValue ?? currentFormatVersion
        let s = entries["style"]
        style = Style(font: s?["font"]?.stringValue ?? "sans", width: s?["width"]?.stringValue ?? "normal",
                      paper: s?["paper"]?.stringValue ?? "plain", textColor: s?["textColor"]?.stringValue)
        if let c = entries["cover"], let id = c["attachmentId"]?.stringValue {
            cover = Cover(attachmentId: id, offsetY: c["offsetY"]?.doubleValue ?? 0.5)
        }
        if let b = entries["backdrop"], let kind = b["kind"]?.stringValue.flatMap(Backdrop.Kind.init(rawValue:)), let v = b["value"]?.stringValue {
            backdrop = Backdrop(kind: kind, value: v)
        }
    }
}

/// A comment (document-model.md §4.4).
public struct Comment: Hashable, Sendable, Identifiable {
    public var id: String
    public var blockId: String
    /// Encoded relative positions of the commented range, or nil for the whole block.
    public var anchor: (start: Data, end: Data)?
    public var author: Author
    public var text: String
    public var createdAt: String
    public var resolvedAt: String?

    public init(id: String = EntityID.make(), blockId: String, anchor: (start: Data, end: Data)? = nil, author: Author, text: String,
                createdAt: String = DSDate.iso(Date()), resolvedAt: String? = nil) {
        self.id = id
        self.blockId = blockId
        self.anchor = anchor
        self.author = author
        self.text = text
        self.createdAt = createdAt
        self.resolvedAt = resolvedAt
    }

    var fields: [String: YValue] {
        [
            "id": .string(value: id),
            "blockId": .string(value: blockId),
            "anchor": anchor.map { .object(entries: ["start": .string(value: Base64URL.encode($0.start)), "end": .string(value: Base64URL.encode($0.end))]) } ?? .null,
            "author": author.value,
            "text": .string(value: text),
            "createdAt": .string(value: createdAt),
            "resolvedAt": .optionalString(resolvedAt),
        ]
    }

    init?(id: String, fields f: [String: YValue]) {
        guard let blockId = f["blockId"]?.stringValue, let author = f["author"].flatMap(Author.init(value:)) else { return nil }
        self.id = id
        self.blockId = blockId
        if let a = f["anchor"], let s = a["start"]?.stringValue.flatMap { Base64URL.decode($0) }, let e = a["end"]?.stringValue.flatMap { Base64URL.decode($0) } {
            anchor = (s, e)
        }
        self.author = author
        text = f["text"]?.stringValue ?? ""
        createdAt = f["createdAt"]?.stringValue ?? ""
        resolvedAt = f["resolvedAt"]?.stringValue
    }

    public static func == (a: Comment, b: Comment) -> Bool {
        a.id == b.id && a.blockId == b.blockId && a.anchor?.start == b.anchor?.start && a.anchor?.end == b.anchor?.end
            && a.author == b.author && a.text == b.text && a.createdAt == b.createdAt && a.resolvedAt == b.resolvedAt
    }

    public func hash(into h: inout Hasher) {
        h.combine(id)
        h.combine(text)
        h.combine(resolvedAt)
    }
}
