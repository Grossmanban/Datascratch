import Foundation
@_exported import YrsFFI

/// Kind of a Yjs document (document-model.md §1).
public enum DocKind: String, Codable, Sendable, CaseIterable {
    case account
    case notebook
    case note

    /// Root shared types of this kind of document.
    public var roots: [RootDef] {
        switch self {
        case .account:
            return [
                RootDef(name: "meta", kind: .map),
                RootDef(name: "spaces", kind: .map),
                RootDef(name: "notebooks", kind: .map),
                RootDef(name: "settings", kind: .map),
                RootDef(name: "starred", kind: .array),
                RootDef(name: "tabs", kind: .array),
            ]
        case .notebook:
            return [
                RootDef(name: "meta", kind: .map),
                RootDef(name: "folders", kind: .map),
                RootDef(name: "notes", kind: .map),
                RootDef(name: "tags", kind: .map),
            ]
        case .note:
            return [
                RootDef(name: "content", kind: .xmlFragment),
                RootDef(name: "meta", kind: .map),
                RootDef(name: "strokes", kind: .map),
                RootDef(name: "comments", kind: .map),
            ]
        }
    }
}

/// Origin of a transaction. Decides undo capture and what gets sent to the server.
public enum TransactionOrigin: Hashable, Sendable, CustomStringConvertible {
    /// A user edit on this device: undoable, pushed to the server.
    case local
    /// A programmatic change on this device (migrations, derived fields): pushed, not undoable.
    case system
    /// Undo/redo performed by the undo manager: pushed.
    case undo
    /// An update received from the server: neither undoable nor pushed back.
    case remote
    /// Loading from local storage: neither undoable nor pushed.
    case storage
    case other(String)

    public init(_ raw: String?) {
        switch raw {
        case "local": self = .local
        case "system": self = .system
        case "undo": self = .undo
        case "remote": self = .remote
        case "storage": self = .storage
        case let s?: self = .other(s)
        case nil: self = .other("")
        }
    }

    public var description: String {
        switch self {
        case .local: "local"
        case .system: "system"
        case .undo: "undo"
        case .remote: "remote"
        case .storage: "storage"
        case .other(let s): s
        }
    }

    /// Whether updates of this origin must be sent to the server.
    public var isOutgoing: Bool {
        switch self {
        case .local, .system, .undo: true
        case .remote, .storage, .other: false
        }
    }
}

/// Cancels an observation when cancelled or deallocated.
public final class CRDTSubscription: Sendable {
    private let raw: YSubscription

    init(_ raw: YSubscription) { self.raw = raw }

    public func cancel() { raw.cancel() }

    deinit { raw.cancel() }
}

/// A Yjs document backed by Yrs.
///
/// Thread-safe. Observer callbacks run synchronously inside the transaction that triggered
/// them, on the calling thread: they must not read or write this document (copy what you need
/// and hop to another task/queue).
public final class CRDTDocument: Sendable {
    public let kind: DocKind
    public let docId: String
    /// Low-level Yrs document. Prefer the typed wrappers (`NoteDocument` etc.).
    public let raw: YDocument

    /// - Parameter clientId: Yjs client id; random 32-bit when nil (a new id per session,
    ///   as Yjs does).
    public init(kind: DocKind, docId: String, clientId: UInt64? = nil) {
        self.kind = kind
        self.docId = docId
        self.raw = YDocument(clientId: clientId, roots: kind.roots)
    }

    public var clientId: UInt64 { raw.clientId() }

    // MARK: Updates

    public func stateVector() -> Data { raw.stateVector() }

    /// Full state, or the difference since `stateVector`.
    public func encodeStateAsUpdate(since stateVector: Data? = nil) throws -> Data {
        try raw.encodeStateAsUpdate(stateVector: stateVector)
    }

    public func applyUpdate(_ update: Data, origin: TransactionOrigin = .remote) throws {
        try raw.applyUpdate(update: update, origin: origin.description)
    }

    public func applyUpdates(_ updates: [Data], origin: TransactionOrigin) throws {
        guard !updates.isEmpty else { return }
        try raw.applyUpdates(updates: updates, origin: origin.description)
    }

    // MARK: Writes

    /// Runs `body` to collect operations and applies them in one transaction.
    public func transact(origin: TransactionOrigin = .local, _ body: (inout CRDTTransaction) throws -> Void) throws {
        var txn = CRDTTransaction()
        try body(&txn)
        guard !txn.ops.isEmpty else { return }
        try raw.apply(ops: txn.ops, origin: origin.description)
    }

    // MARK: Reads

    public func mapValue(_ root: String, _ path: [String] = []) -> YValue? {
        (try? raw.mapGet(root: root, path: path)) ?? nil
    }

    /// The (nested) map at `path` as parsed JSON (`Y.Map.toJSON()`): fast for large maps of
    /// records. Binary values appear as arrays of numbers.
    public func mapJSON(_ root: String, _ path: [String] = []) -> [String: Any]? {
        guard let json = (try? raw.mapJson(root: root, path: path)) ?? nil,
              let obj = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any] else { return nil }
        return obj
    }

    public func mapKeys(_ root: String, _ path: [String] = []) -> [String] {
        (try? raw.mapKeys(root: root, path: path)) ?? []
    }

    public func arrayValues(_ root: String) -> [YValue] {
        (try? raw.arrayGet(root: root)) ?? []
    }

    /// Children of the XML node at `path` in root `root` (the root itself for `[]`).
    public func xmlChildren(_ root: String = "content", at path: [UInt32] = []) throws -> [XmlNode] {
        try raw.xmlChildren(root: root, path: path)
    }

    public func xmlNode(_ root: String = "content", at path: [UInt32]) throws -> XmlNode {
        try raw.xmlNode(root: root, path: path)
    }

    // MARK: Relative positions

    /// `Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(...))` for the node at
    /// `path` (text node: UTF-16 index; element: child index).
    public func relativePosition(_ root: String = "content", at path: [UInt32], index: UInt32, assoc: Int32 = 0) throws -> Data {
        try raw.encodeRelativePosition(root: root, path: path, index: index, assoc: assoc)
    }

    /// Resolves encoded relative positions (nil for undecodable/foreign ones).
    public func resolve(_ root: String = "content", relativePositions: [Data]) throws -> [ResolvedIndex?] {
        try raw.resolveRelativePositions(root: root, positions: relativePositions)
    }

    /// New encodings for positions whose characters were restored by undo/redo on this
    /// instance (strokes.md §4.1); nil where nothing changes.
    public func rebase(_ root: String = "content", relativePositions: [Data]) throws -> [Data?] {
        try raw.rebaseRelativePositions(root: root, positions: relativePositions)
    }

    // MARK: Observation

    /// Every update produced by a transaction, with its origin (`doc.on('update')`).
    public func observeUpdates(_ handler: @escaping @Sendable (Data, TransactionOrigin) -> Void) -> CRDTSubscription {
        CRDTSubscription(raw.observeUpdates(observer: UpdateHandler(handler)))
    }

    /// Deep changes under one root (`type.observeDeep`).
    public func observeDeep(_ root: String, _ handler: @escaping @Sendable ([YEvent], TransactionOrigin) -> Void) throws -> CRDTSubscription {
        CRDTSubscription(try raw.observeDeep(root: root, observer: DeepHandler(handler)))
    }

    // MARK: Undo

    /// Enables undo/redo of `.local` transactions over `roots` (default: everything the user
    /// edits in a note — content, strokes, comments, meta).
    public func enableUndo(roots: [String]? = nil, captureTimeout: Duration = .milliseconds(500)) throws {
        let ms = UInt64(captureTimeout.components.seconds) * 1000 + UInt64(captureTimeout.components.attoseconds / 1_000_000_000_000_000)
        try raw.enableUndo(roots: roots ?? kind.roots.map(\.name), captureTimeoutMs: ms)
    }

    @discardableResult public func undo() -> Bool { raw.undo() }
    @discardableResult public func redo() -> Bool { raw.redo() }
    public var canUndo: Bool { raw.canUndo() }
    public var canRedo: Bool { raw.canRedo() }
    /// The next edit starts a new undo step.
    public func stopCapturing() { raw.stopCapturing() }
    public func clearUndo() { raw.clearUndo() }
}

private final class UpdateHandler: UpdateObserver, @unchecked Sendable {
    let handler: @Sendable (Data, TransactionOrigin) -> Void
    init(_ handler: @escaping @Sendable (Data, TransactionOrigin) -> Void) { self.handler = handler }
    func onUpdate(update: Data, origin: String?) { handler(update, TransactionOrigin(origin)) }
}

private final class DeepHandler: DeepObserver, @unchecked Sendable {
    let handler: @Sendable ([YEvent], TransactionOrigin) -> Void
    init(_ handler: @escaping @Sendable ([YEvent], TransactionOrigin) -> Void) { self.handler = handler }
    func onEvents(events: [YEvent], origin: String?) { handler(events, TransactionOrigin(origin)) }
}

/// Utility functions over encoded updates.
public enum CRDTUpdates {
    /// `Y.mergeUpdates`.
    public static func merge(_ updates: [Data]) throws -> Data { try mergeUpdates(updates: updates) }
    /// `Y.diffUpdate`.
    public static func diff(_ update: Data, stateVector: Data) throws -> Data { try diffUpdate(update: update, stateVector: stateVector) }
    /// `Y.encodeStateVectorFromUpdate`.
    public static func stateVector(of update: Data) throws -> Data { try stateVectorFromUpdate(update: update) }
}
