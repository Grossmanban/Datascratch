import Foundation

/// The document of a shared space (D-62, document-model.md §2.2): name, icon, colour and its
/// notebooks for every member; `docId` = spaceId, encrypted with the space key. The owner and
/// editors write it, viewers only read (the server refuses their pushes).
public final class SpaceDocument: Sendable {
    public let crdt: CRDTDocument

    public var spaceId: String { crdt.docId }

    public init(spaceId: String, clientId: UInt64? = nil) {
        crdt = CRDTDocument(kind: .space, docId: spaceId, clientId: clientId)
    }

    public init(_ crdt: CRDTDocument) {
        precondition(crdt.kind == .space)
        self.crdt = crdt
    }

    /// `meta` of a new shared space; its name, icon and colour come from the owner's `Space`.
    public func initialize(from space: Space, origin: TransactionOrigin = .system) throws {
        try crdt.transact(origin: origin) { txn in
            txn.set("meta", key: "formatVersion", .number(value: Double(currentFormatVersion)))
            txn.set("meta", key: "spaceId", .string(value: spaceId))
            txn.set("meta", key: "name", .string(value: space.name))
            txn.set("meta", key: "icon", .optionalString(space.icon))
            txn.set("meta", key: "color", .optionalString(space.color))
        }
    }

    public var formatVersion: Int { crdt.mapValue("meta", ["formatVersion"])?.intValue ?? currentFormatVersion }
    public var name: String { crdt.mapValue("meta", ["name"])?.stringValue ?? "" }
    public var icon: String? { crdt.mapValue("meta", ["icon"])?.stringValue }
    public var color: String? { crdt.mapValue("meta", ["color"])?.stringValue }

    /// Name, icon or colour (`name`, `icon`, `color`).
    public func setMeta(_ fields: [String: YValue], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { txn in
            for (k, v) in fields.sorted(by: { $0.key < $1.key }) { txn.set("meta", key: k, v) }
        }
    }

    // MARK: Notebooks

    /// The space's notebooks, `spaceId` filled in (it is not stored: it is this space). A
    /// notebook missing from `GET /spaces/:id/notebooks` (deleted, moved out) is not shown even
    /// if its record stayed — pass `onServer` to filter.
    public func notebooks(onServer: Set<String>? = nil) -> [NotebookRef] {
        crdt.mapKeys("notebooks").compactMap(notebook(id:))
            .filter { onServer?.contains($0.id) ?? true }
            .sorted { ($0.order, $0.id) < ($1.order, $1.id) }
    }

    public func notebook(id: String) -> NotebookRef? {
        guard var f = crdt.mapValue("notebooks", [id])?.entries else { return nil }
        f["spaceId"] = .string(value: spaceId)
        return NotebookRef(id: id, fields: f)
    }

    public func putNotebook(_ ref: NotebookRef, origin: TransactionOrigin = .local) throws {
        var f = ref.fields
        f["spaceId"] = nil
        try crdt.transact(origin: origin) { $0.set("notebooks", key: ref.id, .sharedMap(entries: f)) }
    }

    public func updateNotebook(id: String, _ fields: [String: YValue], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.update("notebooks", id: id, fields.filter { $0.key != "spaceId" }) }
    }

    public func deleteNotebook(id: String, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.delete("notebooks", key: id) }
    }
}
