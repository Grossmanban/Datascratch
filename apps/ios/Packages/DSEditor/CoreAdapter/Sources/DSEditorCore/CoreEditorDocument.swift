import DSCore
import DSEditorModel
import DSInk
import Foundation

/// `EditorDocument` over a DSCore `NoteDocument` (Yrs, y-prosemirror layout).
///
/// Reads come from a snapshot of `content` that is rebuilt lazily after any change; writes go
/// straight to the CRDT. Offsets are UTF-16 with inline nodes counting as one, as in DSCore.
/// Undo/redo use the Yrs undo manager of the note (`NoteDocument.undo()` also re-anchors strokes
/// restored by undo, `strokes.md` §4.1). Remote updates arrive through `observeDeep` and are
/// reported with origin `.remote`.
@MainActor
public final class CoreEditorDocument: EditorDocument {
    public let note: NoteDocument

    private var snapshot: Snapshot?
    private var strokeCache: [DSInk.Stroke]?
    private var observers: [UUID: @MainActor (DocumentChange) -> Void] = [:]
    private var txDepth = 0
    private var txOrigin: ChangeOrigin = .local
    private var txChange = DocumentChange(origin: .local)
    private var subscriptions: [CRDTSubscription] = []
    /// Set while this object writes, so its own transactions are not reported twice as remote.
    private var writing = 0
    /// Errors from the CRDT are not expected in normal use; the last one is kept for diagnostics.
    public private(set) var lastError: (any Error)?

    public init(note: NoteDocument, enableUndo: Bool = true) {
        self.note = note
        if enableUndo { try? note.crdt.enableUndo() }
        observeRemote()
    }

    // MARK: Snapshot

    struct Snapshot {
        var blocks: [BlockNode]
        var paths: [BlockID: [UInt32]]
        var nodes: [BlockID: BlockNode]
        var parents: [BlockID: (parent: BlockID?, index: Int)]
        /// Block id by path (for resolving relative positions).
        var byPath: [[UInt32]: BlockID]
    }

    private func current() -> Snapshot {
        if let s = snapshot { return s }
        var paths: [BlockID: [UInt32]] = [:]
        var nodes: [BlockID: BlockNode] = [:]
        var parents: [BlockID: (parent: BlockID?, index: Int)] = [:]
        var byPath: [[UInt32]: BlockID] = [:]
        func convert(_ b: Block, path: [UInt32], parent: BlockID?, index: Int) -> BlockNode {
            let id = b.blockId ?? "path:" + path.map(String.init).joined(separator: ".")
            var attrs: [String: JSONValue] = [:]
            for (k, v) in b.attrs where k != "blockId" { attrs[k] = Self.json(v) }
            var node = BlockNode(id: id, type: b.type, attrs: attrs, inline: nil, children: [])
            if b.isTextBlock || !b.inline.isEmpty {
                node.inline = b.inline.map(Self.inline)
            } else {
                node.inline = NodeType.textblocks.contains(b.type) ? [] : nil
                node.children = b.children.enumerated().map { i, c in convert(c, path: path + [UInt32(i)], parent: id, index: i) }
            }
            paths[id] = path
            nodes[id] = node
            parents[id] = (parent, index)
            byPath[path] = id
            return node
        }
        let top = ((try? note.blocks()) ?? []).enumerated().map { i, b in convert(b, path: [UInt32(i)], parent: nil, index: i) }
        let s = Snapshot(blocks: top, paths: paths, nodes: nodes, parents: parents, byPath: byPath)
        snapshot = s
        return s
    }

    private func invalidate() {
        snapshot = nil
        strokeCache = nil
    }

    // MARK: Structure

    public var blocks: [BlockNode] { current().blocks }
    public func block(_ id: BlockID) -> BlockNode? { current().nodes[id] }

    public func location(of id: BlockID) -> (parent: BlockID?, index: Int)? { current().parents[id] }

    public func insertBlock(_ node: BlockNode, parent: BlockID?, at index: Int) {
        let parentPath = parent.flatMap { current().paths[$0] } ?? []
        if parent != nil, current().paths[parent!] == nil { return }
        write(structure: true) { try note.insertBlocks([Self.block(node)], into: parentPath, at: UInt32(index), origin: $0) }
    }

    public func deleteBlock(_ id: BlockID) {
        guard let path = current().paths[id] else { return }
        write(structure: true) { try note.deleteBlock(at: path, origin: $0) }
    }

    public func setAttributes(_ id: BlockID, _ attrs: [String: JSONValue?]) {
        guard let path = current().paths[id] else { return }
        var values: [String: YValue] = [:]
        for (k, v) in attrs where k != "blockId" { values[k] = v.map(Self.yvalue) ?? .null }
        write(structure: true) { try note.setBlockAttributes(values, at: path, origin: $0) }
    }

    // MARK: Inline content

    public func textLength(of block: BlockID) -> Int { current().nodes[block]?.textLength ?? 0 }

    public func inline(of block: BlockID, range: Range<Int>?) -> [InlineElement] {
        guard let inline = current().nodes[block]?.inline else { return [] }
        guard let range else { return inline }
        var out: [InlineElement] = []
        var o = 0
        for el in inline {
            let len = el.length
            let lo = max(range.lowerBound, o), hi = min(range.upperBound, o + len)
            if lo < hi {
                switch el {
                case .text(let s, let m):
                    let u = Array(s.utf16)
                    out.append(.text(String(decoding: u[(lo - o)..<(hi - o)], as: UTF16.self), m))
                case .atom:
                    out.append(el)
                }
            }
            o += len
        }
        return out
    }

    public func insertText(_ text: String, marks: MarkSet, block: BlockID, at offset: Int) {
        guard !text.isEmpty, let path = current().paths[block] else { return }
        write(block: block) { try note.insertText(text, marks: Self.marks(marks), at: offset, inBlock: path, origin: $0) }
    }

    public func insertAtom(_ atom: InlineAtom, marks: MarkSet, block: BlockID, at offset: Int) {
        guard let path = current().paths[block] else { return }
        var attrs: [String: YValue] = [:]
        for (k, v) in atom.attrs { attrs[k] = Self.yvalue(v) }
        write(block: block) { try note.insertInlineNode(name: atom.type, attrs: attrs, at: offset, inBlock: path, origin: $0) }
    }

    public func deleteText(block: BlockID, range: Range<Int>) {
        guard !range.isEmpty, let path = current().paths[block] else { return }
        write(block: block) { try note.deleteText(range: range, inBlock: path, origin: $0) }
    }

    public func setMark(_ name: String, value: JSONValue?, block: BlockID, range: Range<Int>) {
        guard !range.isEmpty, let path = current().paths[block] else { return }
        let set = value.map { [Self.mark(name, $0)] } ?? []
        write(block: block) { try note.format(range: range, set: set, remove: value == nil ? [name] : [], inBlock: path, origin: $0) }
    }

    // MARK: Positions

    public func anchor(block: BlockID, offset: Int) -> Data? {
        guard let path = current().paths[block], let children = try? note.crdt.xmlChildren(at: path) else { return nil }
        var remaining = offset
        for (i, child) in children.enumerated() {
            switch child {
            case .text(let chunks):
                let len = chunks.reduce(0) { $0 + ($1.embed == nil ? $1.text.utf16.count : 1) }
                if remaining < len {
                    return try? note.crdt.relativePosition(at: path + [UInt32(i)], index: UInt32(remaining), assoc: 0)
                }
                remaining -= len
            case .element:
                // Inline nodes (tags, links) carry no text anchor.
                if remaining == 0 { return nil }
                remaining -= 1
            }
        }
        return nil
    }

    public func resolveAnchor(_ anchor: Data) -> TextPosition? {
        guard let resolved = try? note.crdt.resolve(relativePositions: [anchor]).first, let r = resolved, !r.deleted,
              let textIndex = r.path.last else { return nil }
        let blockPath = Array(r.path.dropLast())
        guard let block = current().byPath[blockPath], let children = try? note.crdt.xmlChildren(at: blockPath) else { return nil }
        var offset = 0
        for child in children.prefix(Int(textIndex)) {
            switch child {
            case .text(let chunks): offset += chunks.reduce(0) { $0 + ($1.embed == nil ? $1.text.utf16.count : 1) }
            case .element: offset += 1
            }
        }
        return TextPosition(block: block, offset: offset + Int(r.index))
    }

    // MARK: Strokes

    public var strokes: [DSInk.Stroke] {
        if let s = strokeCache { return s }
        let s = note.strokes().sorted { $0.createdAt < $1.createdAt }.map(Self.stroke)
        strokeCache = s
        return s
    }

    public func stroke(_ id: String) -> DSInk.Stroke? { note.stroke(id: id).map(Self.stroke) }

    public func addStroke(_ stroke: DSInk.Stroke) {
        write(strokesAdded: [stroke.id]) { try note.addStrokes([Self.coreStroke(stroke)], origin: $0) }
    }

    public func removeStroke(_ id: String) {
        write(strokesRemoved: [id]) { try note.removeStrokes(ids: [id], origin: $0) }
    }

    public func setStrokeAnchors(_ id: String, _ anchors: [Data]) {
        write(strokesAdded: [id]) { origin in
            try note.crdt.transact(origin: origin) { txn in
                txn.set("strokes", [id], key: "anchors", .list(items: anchors.map { .bytes(value: $0) }))
            }
        }
    }

    // MARK: Meta

    public var style: DocumentStyle {
        let s = note.meta().style
        return DocumentStyle(font: .init(rawValue: s.font) ?? .sans, width: .init(rawValue: s.width) ?? .normal,
                             paper: .init(rawValue: s.paper) ?? .plain, textColor: s.textColor)
    }

    public func setStyle(_ style: DocumentStyle) {
        let s = NoteMetaContent.Style(font: style.font.rawValue, width: style.width.rawValue, paper: style.paper.rawValue,
                                      textColor: style.textColor)
        write(style: true) { try note.setStyle(s, origin: $0) }
    }

    // MARK: Transactions

    public func transact(origin: ChangeOrigin, _ body: () -> Void) {
        if txDepth == 0 {
            txOrigin = origin
            txChange = DocumentChange(origin: origin)
        }
        txDepth += 1
        body()
        txDepth -= 1
        guard txDepth == 0 else { return }
        let change = txChange
        if !change.isEmpty { notify(change) }
    }

    public var canUndo: Bool { note.crdt.canUndo }
    public var canRedo: Bool { note.crdt.canRedo }

    public func undo() { history { try note.undo() } }
    public func redo() { history { try note.redo() } }

    public func stopCapturing() { note.crdt.stopCapturing() }

    public func observe(_ handler: @escaping @MainActor (DocumentChange) -> Void) -> ObservationToken {
        let key = UUID()
        observers[key] = handler
        return ObservationToken { [weak self] in
            MainActor.assumeIsolated { _ = self?.observers.removeValue(forKey: key) }
        }
    }

    // MARK: - Private

    private var coreOrigin: TransactionOrigin {
        switch txOrigin {
        case .local, .textInput: .local
        case .undo, .redo: .undo
        case .remote: .remote
        }
    }

    private func write(block: BlockID? = nil, structure: Bool = false, strokesAdded: Set<String> = [],
                       strokesRemoved: Set<String> = [], style: Bool = false, _ op: (TransactionOrigin) throws -> Void) {
        transact(origin: txDepth > 0 ? txOrigin : .local) {
            writing += 1
            defer { writing -= 1 }
            do {
                try op(coreOrigin)
            } catch {
                lastError = error
            }
            invalidate()
            if let block { txChange.textBlocks.insert(block) }
            if structure { txChange.structureChanged = true }
            txChange.strokesAdded.formUnion(strokesAdded)
            txChange.strokesRemoved.formUnion(strokesRemoved)
            if style { txChange.styleChanged = true }
        }
    }

    private func history(_ op: () throws -> Bool) {
        let before = Set(strokes.map(\.id))
        writing += 1
        let changed = (try? op()) ?? false
        writing -= 1
        guard changed else { return }
        invalidate()
        let after = Set(strokes.map(\.id))
        var change = DocumentChange(origin: .undo)
        change.structureChanged = true
        change.styleChanged = true
        change.strokesAdded = after.subtracting(before).union(after.intersection(before))
        change.strokesRemoved = before.subtracting(after)
        notify(change)
    }

    private func notify(_ change: DocumentChange) {
        for h in observers.values { h(change) }
    }

    private func observeRemote() {
        for root in ["content", "strokes", "meta"] {
            let sub = try? note.crdt.observeDeep(root) { [weak self] _, origin in
                // Runs inside the transaction on the writing thread: only hop to the main actor.
                guard origin == .remote || origin == .storage else { return }
                Task { @MainActor in self?.remoteChanged(root: root) }
            }
            if let sub { subscriptions.append(sub) }
        }
    }

    private func remoteChanged(root: String) {
        invalidate()
        var change = DocumentChange(origin: .remote)
        switch root {
        case "strokes": change.strokesAdded = Set(strokes.map(\.id))
        case "meta": change.styleChanged = true
        default: change.structureChanged = true
        }
        notify(change)
    }

    // MARK: Conversions

    static func json(_ v: YValue) -> JSONValue {
        switch v {
        case .null, .undefined: return .null
        case .bool(let b): return .bool(b)
        case .number(let n): return .number(n)
        case .bigInt(let i): return .number(Double(i))
        case .string(let s): return .string(s)
        case .bytes(let d): return .string(d.base64EncodedString())
        case .list(let items), .sharedArray(let items): return .array(items.map(json))
        case .object(let e), .sharedMap(let e): return .object(e.mapValues(json))
        case .sharedText(let t): return .string(t)
        default: return .null
        }
    }

    static func yvalue(_ v: JSONValue) -> YValue {
        switch v {
        case .null: return .null
        case .bool(let b): return .bool(value: b)
        case .number(let n): return .number(value: n)
        case .string(let s): return .string(value: s)
        case .array(let a): return .list(items: a.map(yvalue))
        case .object(let o): return .object(entries: o.mapValues(yvalue))
        }
    }

    static func mark(_ name: String, _ value: JSONValue) -> Mark {
        var attrs: [String: YValue] = [:]
        if case .object(let o) = value { for (k, v) in o { attrs[k] = yvalue(v) } }
        return Mark(name, attrs)
    }

    static func marks(_ set: MarkSet) -> [Mark] {
        set.names.compactMap { name in set[name].map { mark(name, $0) } }
    }

    static func markSet(_ marks: [Mark]) -> MarkSet {
        var s = MarkSet.empty
        for m in marks { s.set(m.name, .object(m.attrs.mapValues(json))) }
        return s
    }

    static func inline(_ i: Inline) -> InlineElement {
        switch i {
        case .text(let s, let marks): return .text(s, markSet(marks))
        case .node(let name, let attrs): return .atom(InlineAtom(type: name, attrs: attrs.mapValues(json)), .empty)
        }
    }

    static func block(_ n: BlockNode) -> Block {
        var attrs: [String: YValue] = ["blockId": .string(value: n.id)]
        for (k, v) in n.attrs where v != .null { attrs[k] = yvalue(v) }
        var b = Block(type: n.type, attrs: attrs)
        if let inline = n.inline {
            b.inline = inline.map { el in
                switch el {
                case .text(let s, let m): return .text(s, marks: marks(m))
                case .atom(let a, _): return .node(name: a.type, attrs: a.attrs.mapValues(yvalue))
                }
            }
        } else {
            b.children = n.children.map(block)
        }
        return b
    }

    static func stroke(_ s: DSCore.Stroke) -> DSInk.Stroke {
        DSInk.Stroke(
            id: s.id, v: s.version, tool: InkTool(rawValue: s.tool.rawValue) ?? .pen, color: s.color, width: s.width,
            opacity: s.opacity, anchorKind: AnchorKind(rawValue: s.anchorKind.rawValue) ?? .text, blockId: s.blockId,
            anchors: s.anchors,
            points: s.points.map { StrokePoint(a: Float($0.anchor), x: $0.x, y: $0.y, pressure: $0.pressure, altitude: $0.altitude,
                                               azimuth: $0.azimuth, roll: $0.roll, t: $0.t) },
            hint: StrokeHint(rawValue: s.hint.rawValue) ?? .free,
            author: StrokeAuthor(kind: StrokeAuthor.Kind(rawValue: s.author.kind.rawValue) ?? .user, id: s.author.id),
            createdAt: s.createdAt, hidden: s.hidden)
    }

    static func coreStroke(_ s: DSInk.Stroke) -> DSCore.Stroke {
        DSCore.Stroke(
            id: s.id, tool: DSCore.Stroke.Tool(rawValue: s.tool.rawValue) ?? .pen, color: s.color, width: s.width,
            opacity: s.opacity, anchorKind: DSCore.Stroke.AnchorKind(rawValue: s.anchorKind.rawValue) ?? .text,
            blockId: s.blockId, anchors: s.anchors,
            points: s.points.map { DSCore.StrokePoint(anchor: Int($0.a), x: $0.x, y: $0.y, pressure: $0.pressure, altitude: $0.altitude,
                                                      azimuth: $0.azimuth, roll: $0.roll, t: $0.t) },
            hint: DSCore.Stroke.Hint(rawValue: s.hint.rawValue) ?? .free,
            author: Author(kind: Author.Kind(rawValue: s.author.kind.rawValue) ?? .user, id: s.author.id),
            createdAt: s.createdAt, hidden: s.hidden)
    }
}
