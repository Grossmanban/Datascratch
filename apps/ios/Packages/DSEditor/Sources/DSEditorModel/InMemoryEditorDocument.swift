import DSInk
import Foundation

/// Reference `EditorDocument`: an in-memory tree with Yjs-like item semantics.
///
/// Every inserted UTF-16 unit / inline atom becomes an item with a unique `ItemID`; deletion only
/// marks it deleted (a tombstone), so anchors to deleted characters can be detected (D-35) and undo
/// brings them back with the same identity. Changing structure (moving text between blocks, changing
/// a node type) creates new items — exactly like y-prosemirror does over Yjs — so the editor's
/// commands must re-anchor strokes in those cases (`StrokeReanchoring`).
@MainActor
public final class InMemoryEditorDocument: EditorDocument {
    // MARK: Internal model

    final class Node {
        var type: String
        var blockId: String
        var attrs: [String: JSONValue]
        var children: [Node] = []
        var items: [Item]?
        var deleted = false
        weak var parent: Node?
        // Caches, rebuilt lazily after changes.
        var cachedOffsets: [ItemID: Int]?
        var cachedLength: Int?

        init(type: String, blockId: String, attrs: [String: JSONValue], items: [Item]?) {
            self.type = type
            self.blockId = blockId
            self.attrs = attrs
            self.items = items
        }

        var liveChildren: [Node] { children.filter { !$0.deleted } }

        var isLive: Bool {
            var n: Node? = self
            while let c = n {
                if c.deleted { return false }
                n = c.parent
            }
            return true
        }

        func invalidate() {
            cachedOffsets = nil
            cachedLength = nil
        }

        var offsets: [ItemID: Int] {
            if let c = cachedOffsets { return c }
            var map: [ItemID: Int] = [:]
            var o = 0
            for it in items ?? [] where !it.deleted {
                map[it.id] = o
                o += 1
            }
            cachedOffsets = map
            cachedLength = o
            return map
        }

        var length: Int {
            if let l = cachedLength { return l }
            _ = offsets
            return cachedLength ?? 0
        }

        /// Index in `items` of the n-th live item, or `items.count` for the end.
        func rawIndex(ofLive n: Int) -> Int {
            guard let items else { return 0 }
            var seen = 0
            for (i, it) in items.enumerated() where !it.deleted {
                if seen == n { return i }
                seen += 1
            }
            return items.count
        }
    }

    enum Unit: Hashable, Codable {
        case char(UInt16)
        case atom(InlineAtom)
    }

    struct Item {
        var id: ItemID
        var unit: Unit
        var marks: MarkSet
        var deleted = false
    }

    enum Op {
        case insertItems([ItemID])
        case deleteItems([ItemID])
        case marks([(ItemID, MarkSet, MarkSet)])
        case insertNode(Node)
        case deleteNode(Node)
        case attrs(Node, old: [String: JSONValue], new: [String: JSONValue])
        case addStroke(Stroke)
        case removeStroke(Stroke)
        case style(old: DocumentStyle, new: DocumentStyle)
    }

    struct UndoStep {
        var ops: [Op]
        var time: Date
    }

    let root = Node(type: "doc", blockId: "", attrs: [:], items: nil)
    private(set) var clientID: UInt32
    private var clock: UInt32 = 0
    private var itemOwner: [ItemID: Node] = [:]
    private var nodesByBlockId: [String: [Node]] = [:]
    private var strokeOrder: [String] = []
    private var strokeMap: [String: Stroke] = [:]
    private var currentStyle = DocumentStyle()

    private var undoStack: [UndoStep] = []
    private var redoStack: [UndoStep] = []
    private var captureStopped = true
    /// Consecutive local changes within this window merge into one undo step (as Yjs `captureTimeout`).
    public var captureTimeout: TimeInterval = 0.5
    /// Clock used for undo grouping; replaceable in tests.
    public var now: () -> Date = { Date() }

    private var txDepth = 0
    private var txOrigin: ChangeOrigin = .local
    private var txOps: [Op] = []
    private var txChange = DocumentChange(origin: .local)
    private var observers: [UUID: @MainActor (DocumentChange) -> Void] = [:]

    // MARK: Init

    public init(blocks: [BlockNode] = [.title(""), .paragraph()], clientID: UInt32 = UInt32.random(in: 1...UInt32.max)) {
        self.clientID = clientID
        for (i, b) in blocks.enumerated() {
            let n = makeNode(b)
            n.parent = root
            root.children.insert(n, at: i)
        }
    }

    // MARK: Structure

    public var blocks: [BlockNode] { root.liveChildren.map(snapshot) }

    public func block(_ id: BlockID) -> BlockNode? { liveNode(id).map(snapshot) }

    public func location(of id: BlockID) -> (parent: BlockID?, index: Int)? {
        guard let n = liveNode(id), let p = n.parent else { return nil }
        guard let idx = p.liveChildren.firstIndex(where: { $0 === n }) else { return nil }
        return (p === root ? nil : p.blockId, idx)
    }

    public func insertBlock(_ node: BlockNode, parent: BlockID?, at index: Int) {
        guard let p = parent.map({ liveNode($0) }) ?? root else { return }
        let n = makeNode(node)
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            let live = p.liveChildren
            let raw: Int
            if index < live.count, let r = p.children.firstIndex(where: { $0 === live[index] }) {
                raw = r
            } else {
                raw = p.children.count
            }
            n.parent = p
            p.children.insert(n, at: raw)
            record(.insertNode(n))
            txChange.structureChanged = true
        }
    }

    public func deleteBlock(_ id: BlockID) {
        guard let n = liveNode(id) else { return }
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            n.deleted = true
            record(.deleteNode(n))
            txChange.structureChanged = true
        }
    }

    public func setAttributes(_ id: BlockID, _ attrs: [String: JSONValue?]) {
        guard let n = liveNode(id) else { return }
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            let old = n.attrs
            for (k, v) in attrs {
                if k == "blockId" { continue }
                if let v { n.attrs[k] = v } else { n.attrs.removeValue(forKey: k) }
            }
            record(.attrs(n, old: old, new: n.attrs))
            txChange.structureChanged = true
        }
    }

    // MARK: Inline content

    public func textLength(of block: BlockID) -> Int { liveNode(block)?.length ?? 0 }

    public func inline(of block: BlockID, range: Range<Int>?) -> [InlineElement] {
        guard let n = liveNode(block), let items = n.items else { return [] }
        let live = items.filter { !$0.deleted }
        let r = range.map { max(0, $0.lowerBound)..<min(live.count, $0.upperBound) } ?? 0..<live.count
        guard !r.isEmpty else { return [] }
        return Self.runs(Array(live[r]))
    }

    public func insertText(_ text: String, marks: MarkSet, block: BlockID, at offset: Int) {
        let units = Array(text.utf16)
        guard !units.isEmpty else { return }
        insertUnits(units.map { .char($0) }, marks: marks, block: block, at: offset)
    }

    public func insertAtom(_ atom: InlineAtom, marks: MarkSet, block: BlockID, at offset: Int) {
        insertUnits([.atom(atom)], marks: marks, block: block, at: offset)
    }

    public func deleteText(block: BlockID, range: Range<Int>) {
        guard let n = liveNode(block), var items = n.items, !range.isEmpty else { return }
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            var ids: [ItemID] = []
            var seen = 0
            for i in items.indices where !items[i].deleted {
                if range.contains(seen) {
                    items[i].deleted = true
                    ids.append(items[i].id)
                }
                seen += 1
                if seen >= range.upperBound { break }
            }
            n.items = items
            n.invalidate()
            record(.deleteItems(ids))
            txChange.textBlocks.insert(n.blockId)
        }
    }

    public func setMark(_ name: String, value: JSONValue?, block: BlockID, range: Range<Int>) {
        guard let n = liveNode(block), var items = n.items, !range.isEmpty else { return }
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            var changes: [(ItemID, MarkSet, MarkSet)] = []
            var seen = 0
            for i in items.indices where !items[i].deleted {
                if range.contains(seen) {
                    let old = items[i].marks
                    let new = old.setting(name, value)
                    if old != new {
                        items[i].marks = new
                        changes.append((items[i].id, old, new))
                    }
                }
                seen += 1
                if seen >= range.upperBound { break }
            }
            n.items = items
            record(.marks(changes))
            txChange.textBlocks.insert(n.blockId)
        }
    }

    // MARK: Positions

    public func anchor(block: BlockID, offset: Int) -> Data? {
        guard let n = liveNode(block), let items = n.items else { return nil }
        let raw = n.rawIndex(ofLive: offset)
        guard raw < items.count else { return nil }
        return RelativePositionCodec.encode(item: items[raw].id, assoc: 0)
    }

    public func resolveAnchor(_ anchor: Data) -> TextPosition? {
        guard let (id, _) = RelativePositionCodec.decode(anchor), let owner = itemOwner[id], owner.isLive,
              let offset = owner.offsets[id] else { return nil }
        return TextPosition(block: owner.blockId, offset: offset)
    }

    // MARK: Strokes

    public var strokes: [Stroke] { strokeOrder.compactMap { strokeMap[$0] } }
    public func stroke(_ id: String) -> Stroke? { strokeMap[id] }

    public func addStroke(_ stroke: Stroke) {
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            putStroke(stroke)
            record(.addStroke(stroke))
            txChange.strokesAdded.insert(stroke.id)
        }
    }

    public func removeStroke(_ id: String) {
        guard let s = strokeMap[id] else { return }
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            dropStroke(id)
            record(.removeStroke(s))
            txChange.strokesRemoved.insert(id)
        }
    }

    // MARK: Meta

    public var style: DocumentStyle { currentStyle }

    public func setStyle(_ style: DocumentStyle) {
        guard style != currentStyle else { return }
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            record(.style(old: currentStyle, new: style))
            currentStyle = style
            txChange.styleChanged = true
        }
    }

    // MARK: Transactions

    public func transact(origin: ChangeOrigin, _ body: () -> Void) {
        if txDepth == 0 {
            txOrigin = origin
            txOps = []
            txChange = DocumentChange(origin: origin)
        }
        txDepth += 1
        body()
        txDepth -= 1
        guard txDepth == 0 else { return }
        let ops = txOps
        let change = txChange
        txOps = []
        if !ops.isEmpty, origin == .local || origin == .textInput {
            let t = now()
            if !captureStopped, var last = undoStack.last, t.timeIntervalSince(last.time) < captureTimeout {
                last.ops += ops
                last.time = t
                undoStack[undoStack.count - 1] = last
            } else {
                undoStack.append(UndoStep(ops: ops, time: t))
            }
            captureStopped = false
            redoStack.removeAll()
        }
        if !change.isEmpty {
            for handler in observers.values { handler(change) }
        }
    }

    public var canUndo: Bool { !undoStack.isEmpty }
    public var canRedo: Bool { !redoStack.isEmpty }

    public func undo() {
        guard let step = undoStack.popLast() else { return }
        transact(origin: .undo) {
            for op in step.ops.reversed() { apply(op, inverse: true) }
        }
        redoStack.append(step)
        captureStopped = true
    }

    public func redo() {
        guard let step = redoStack.popLast() else { return }
        transact(origin: .redo) {
            for op in step.ops { apply(op, inverse: false) }
        }
        undoStack.append(step)
        captureStopped = true
    }

    public func stopCapturing() { captureStopped = true }

    public func observe(_ handler: @escaping @MainActor (DocumentChange) -> Void) -> ObservationToken {
        let key = UUID()
        observers[key] = handler
        return ObservationToken { [weak self] in
            MainActor.assumeIsolated { _ = self?.observers.removeValue(forKey: key) }
        }
    }

    // MARK: - Private

    private func record(_ op: Op) { txOps.append(op) }

    private func nextID() -> ItemID {
        defer { clock &+= 1 }
        return ItemID(client: clientID, clock: clock)
    }

    private func liveNode(_ id: BlockID) -> Node? {
        nodesByBlockId[id]?.last(where: { $0.isLive })
    }

    private func register(_ n: Node, recursive: Bool) {
        nodesByBlockId[n.blockId, default: []].append(n)
        for it in n.items ?? [] { itemOwner[it.id] = n }
        if recursive { for c in n.children { register(c, recursive: true) } }
    }

    private func makeNode(_ b: BlockNode) -> Node {
        var items: [Item]?
        if let inline = b.inline {
            items = []
            for el in inline {
                switch el {
                case .text(let s, let m):
                    for u in s.utf16 { items!.append(Item(id: nextID(), unit: .char(u), marks: m)) }
                case .atom(let a, let m):
                    items!.append(Item(id: nextID(), unit: .atom(a), marks: m))
                }
            }
        }
        let n = Node(type: b.type, blockId: b.id, attrs: b.attrs, items: items)
        for c in b.children {
            let cn = makeNode(c)
            cn.parent = n
            n.children.append(cn)
        }
        register(n, recursive: false)
        return n
    }

    private func snapshot(_ n: Node) -> BlockNode {
        var b = BlockNode(id: n.blockId, type: n.type, attrs: n.attrs, inline: nil, children: n.liveChildren.map(snapshot))
        if let items = n.items { b.inline = Self.runs(items.filter { !$0.deleted }) } else { b.inline = nil }
        return b
    }

    static func runs(_ items: [Item]) -> [InlineElement] {
        var out: [InlineElement] = []
        var buffer: [UInt16] = []
        var bufferMarks = MarkSet.empty
        func flush() {
            if !buffer.isEmpty { out.append(.text(String(decoding: buffer, as: UTF16.self), bufferMarks)) }
            buffer = []
        }
        for it in items {
            switch it.unit {
            case .char(let u):
                if !buffer.isEmpty, bufferMarks != it.marks { flush() }
                bufferMarks = it.marks
                buffer.append(u)
            case .atom(let a):
                flush()
                out.append(.atom(a, it.marks))
            }
        }
        flush()
        return out
    }

    private func insertUnits(_ units: [Unit], marks: MarkSet, block: BlockID, at offset: Int) {
        guard let n = liveNode(block), n.items != nil else { return }
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            let raw = n.rawIndex(ofLive: max(0, min(offset, n.length)))
            let newItems = units.map { Item(id: nextID(), unit: $0, marks: marks) }
            n.items!.insert(contentsOf: newItems, at: raw)
            for it in newItems { itemOwner[it.id] = n }
            n.invalidate()
            record(.insertItems(newItems.map(\.id)))
            txChange.textBlocks.insert(n.blockId)
        }
    }

    private func setDeleted(_ ids: [ItemID], _ deleted: Bool) {
        var touched: [ObjectIdentifier: Node] = [:]
        let set = Set(ids)
        for id in ids { if let n = itemOwner[id] { touched[ObjectIdentifier(n)] = n } }
        for n in touched.values {
            for i in n.items!.indices where set.contains(n.items![i].id) { n.items![i].deleted = deleted }
            n.invalidate()
            txChange.textBlocks.insert(n.blockId)
        }
    }

    private func putStroke(_ s: Stroke) {
        if strokeMap[s.id] == nil { strokeOrder.append(s.id) }
        strokeMap[s.id] = s
    }

    private func dropStroke(_ id: String) {
        strokeMap.removeValue(forKey: id)
        strokeOrder.removeAll { $0 == id }
    }

    private func apply(_ op: Op, inverse: Bool) {
        switch op {
        case .insertItems(let ids):
            setDeleted(ids, inverse)
        case .deleteItems(let ids):
            setDeleted(ids, !inverse)
        case .marks(let changes):
            for (id, old, new) in changes {
                guard let n = itemOwner[id], let i = n.items?.firstIndex(where: { $0.id == id }) else { continue }
                n.items![i].marks = inverse ? old : new
                txChange.textBlocks.insert(n.blockId)
            }
        case .insertNode(let n):
            n.deleted = inverse
            txChange.structureChanged = true
        case .deleteNode(let n):
            n.deleted = !inverse
            txChange.structureChanged = true
        case .attrs(let n, let old, let new):
            n.attrs = inverse ? old : new
            txChange.structureChanged = true
        case .addStroke(let s):
            if inverse {
                dropStroke(s.id)
                txChange.strokesRemoved.insert(s.id)
            } else {
                putStroke(s)
                txChange.strokesAdded.insert(s.id)
            }
        case .removeStroke(let s):
            if inverse {
                putStroke(s)
                txChange.strokesAdded.insert(s.id)
            } else {
                dropStroke(s.id)
                txChange.strokesRemoved.insert(s.id)
            }
        case .style(let old, let new):
            currentStyle = inverse ? old : new
            txChange.styleChanged = true
        }
    }
}

// MARK: - Persistence

extension InMemoryEditorDocument {
    struct FileNode: Codable {
        var type: String
        var blockId: String
        var attrs: [String: JSONValue]
        var deleted: Bool
        var items: [FileItem]?
        var children: [FileNode]
    }

    struct FileItem: Codable {
        var client: UInt32
        var clock: UInt32
        var unit: Unit
        var marks: MarkSet
        var deleted: Bool
    }

    struct FileStroke: Codable {
        var id: String
        var v: Int
        var tool: InkTool
        var color: String
        var width: Double
        var opacity: Double
        var anchorKind: AnchorKind
        var blockId: String?
        var anchors: [Data]
        var points: Data
        var hint: StrokeHint
        var author: StrokeAuthor
        var createdAt: Double
        var hidden: Bool
    }

    struct File: Codable {
        var format: String
        var clientID: UInt32
        var clock: UInt32
        var style: DocumentStyle
        var content: [FileNode]
        var strokes: [FileStroke]
    }

    /// Serializes the whole state, including deleted items, so anchors survive a reload.
    public func fileData() throws -> Data {
        func encodeNode(_ n: Node) -> FileNode {
            FileNode(type: n.type, blockId: n.blockId, attrs: n.attrs, deleted: n.deleted,
                     items: n.items?.map { FileItem(client: $0.id.client, clock: $0.id.clock, unit: $0.unit, marks: $0.marks, deleted: $0.deleted) },
                     children: n.children.map(encodeNode))
        }
        let file = File(
            format: "datascratch-editor-demo/1", clientID: clientID, clock: clock, style: currentStyle,
            content: root.children.map(encodeNode),
            strokes: strokes.map {
                FileStroke(id: $0.id, v: $0.v, tool: $0.tool, color: $0.color, width: $0.width, opacity: $0.opacity,
                           anchorKind: $0.anchorKind, blockId: $0.blockId, anchors: $0.anchors,
                           points: StrokePointCodec.encode($0.points), hint: $0.hint, author: $0.author,
                           createdAt: $0.createdAt, hidden: $0.hidden)
            })
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        return try enc.encode(file)
    }

    public convenience init(fileData: Data) throws {
        let file = try JSONDecoder().decode(File.self, from: fileData)
        self.init(blocks: [], clientID: file.clientID)
        clock = file.clock
        currentStyle = file.style
        func decodeNode(_ f: FileNode) -> Node {
            let n = Node(type: f.type, blockId: f.blockId, attrs: f.attrs,
                         items: f.items?.map { Item(id: ItemID(client: $0.client, clock: $0.clock), unit: $0.unit, marks: $0.marks, deleted: $0.deleted) })
            n.deleted = f.deleted
            for c in f.children {
                let cn = decodeNode(c)
                cn.parent = n
                n.children.append(cn)
            }
            return n
        }
        for f in file.content {
            let n = decodeNode(f)
            n.parent = root
            root.children.append(n)
            register(n, recursive: true)
        }
        for s in file.strokes {
            putStroke(Stroke(id: s.id, v: s.v, tool: s.tool, color: s.color, width: s.width, opacity: s.opacity,
                             anchorKind: s.anchorKind, blockId: s.blockId, anchors: s.anchors,
                             points: try StrokePointCodec.decode(s.points), hint: s.hint, author: s.author,
                             createdAt: s.createdAt, hidden: s.hidden))
        }
    }
}
