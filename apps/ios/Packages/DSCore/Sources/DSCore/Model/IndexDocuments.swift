import Foundation

/// The `notebook` document: folders, note metadata, tag properties (document-model.md §3).
public final class NotebookDocument: Sendable {
    public let crdt: CRDTDocument

    public var notebookId: String { crdt.docId }

    public init(notebookId: String, clientId: UInt64? = nil) {
        crdt = CRDTDocument(kind: .notebook, docId: notebookId, clientId: clientId)
    }

    public init(_ crdt: CRDTDocument) {
        precondition(crdt.kind == .notebook)
        self.crdt = crdt
    }

    public func initialize(origin: TransactionOrigin = .system) throws {
        try crdt.transact(origin: origin) { txn in
            txn.set("meta", key: "formatVersion", .number(value: Double(currentFormatVersion)))
            txn.set("meta", key: "notebookId", .string(value: notebookId))
        }
    }

    public var formatVersion: Int { crdt.mapValue("meta", ["formatVersion"])?.intValue ?? currentFormatVersion }

    /// `meta.name/icon/color/space`: copy of the notebook's and its space's names from the
    /// account document, which the server (and agents) cannot read (document-model.md §3).
    public struct MetaCopy: Hashable, Sendable {
        public var name: String
        public var icon: String?
        /// Colour token, as in `NotebookRef.color`.
        public var color: String?
        public var spaceId: String
        public var spaceName: String
        public var spaceIcon: String?

        public init(name: String, icon: String?, color: String?, spaceId: String, spaceName: String, spaceIcon: String?) {
            self.name = name
            self.icon = icon
            self.color = color
            self.spaceId = spaceId
            self.spaceName = spaceName
            self.spaceIcon = spaceIcon
        }

        /// From the account document's records.
        public init(_ notebook: NotebookRef, space: Space?) {
            self.init(name: notebook.name, icon: notebook.icon, color: notebook.color, spaceId: notebook.spaceId,
                      spaceName: space?.name ?? "", spaceIcon: space?.icon)
        }
    }

    public var metaCopy: MetaCopy? {
        guard let name = crdt.mapValue("meta", ["name"])?.stringValue else { return nil }
        let space = crdt.mapValue("meta", ["space"])
        return MetaCopy(name: name, icon: crdt.mapValue("meta", ["icon"])?.stringValue, color: crdt.mapValue("meta", ["color"])?.stringValue,
                        spaceId: space?["id"]?.stringValue ?? "", spaceName: space?["name"]?.stringValue ?? "", spaceIcon: space?["icon"]?.stringValue)
    }

    /// Writes the copy; unchanged values are not written again. Call on create, rename,
    /// icon/colour change, switching to «для агентов» and renaming the space.
    public func setMetaCopy(_ copy: MetaCopy, origin: TransactionOrigin = .local) throws {
        guard metaCopy != copy else { return }
        try crdt.transact(origin: origin) { txn in
            txn.set("meta", key: "name", .string(value: copy.name))
            txn.set("meta", key: "icon", .optionalString(copy.icon))
            txn.set("meta", key: "color", .optionalString(copy.color))
            txn.set("meta", key: "space", .object(entries: [
                "id": .string(value: copy.spaceId), "name": .string(value: copy.spaceName), "icon": .optionalString(copy.spaceIcon),
            ]))
        }
    }

    // MARK: Folders

    public func folders() -> [Folder] { crdt.records("folders", as: Folder.self).sorted { ($0.order, $0.id) < ($1.order, $1.id) } }

    public func folder(id: String) -> Folder? { crdt.record("folders", id: id) }

    public func children(ofFolder parentId: String?) -> [Folder] { folders().filter { $0.parentId == parentId } }

    public func putFolder(_ folder: Folder, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.put("folders", folder) }
    }

    public func updateFolder(id: String, _ fields: [String: YValue], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.update("folders", id: id, fields) }
    }

    /// Deletes a folder; its notes and subfolders move to the folder's parent.
    public func deleteFolder(id: String, origin: TransactionOrigin = .local) throws {
        guard let folder = folder(id: id) else { return }
        let subfolders = folders().filter { $0.parentId == id }
        let notes = notes().filter { $0.folderId == id }
        try crdt.transact(origin: origin) { txn in
            for f in subfolders { txn.update("folders", id: f.id, ["parentId": .optionalString(folder.parentId)]) }
            for n in notes { txn.update("notes", id: n.id, ["folderId": .optionalString(folder.parentId)]) }
            txn.delete("folders", key: id)
        }
    }

    // MARK: Notes

    public func notes(includeTrashed: Bool = false) -> [NoteMeta] {
        crdt.records("notes", as: NoteMeta.self)
            .filter { includeTrashed || !$0.isTrashed }
            .sorted { ($0.order, $0.id) < ($1.order, $1.id) }
    }

    public func note(id: String) -> NoteMeta? { crdt.record("notes", id: id) }

    public func notes(inFolder folderId: String?) -> [NoteMeta] { notes().filter { $0.folderId == folderId && $0.parentNoteId == nil } }

    public func trashed() -> [NoteMeta] { notes(includeTrashed: true).filter(\.isTrashed) }

    /// The daily note for `day` (`YYYY-MM-DD`), if any.
    public func dailyNote(for day: String) -> NoteMeta? { notes().first { $0.kind == .daily && $0.dailyDate == day } }

    public var inbox: NoteMeta? { notes().first { $0.kind == .inbox } }

    public func putNote(_ meta: NoteMeta, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.put("notes", meta) }
    }

    /// Updates single fields of a note (e.g. `["title": "…", "updatedAt": "…"]`).
    public func updateNote(id: String, _ fields: [String: YValue], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.update("notes", id: id, fields) }
    }

    /// Copies the note's derived title/tags into its meta (done by the editor after edits).
    public func syncDerived(_ derived: NoteDerivedData, now: Date = Date(), origin: TransactionOrigin = .system) throws {
        guard let meta = note(id: derived.noteId) else { return }
        var fields: [String: YValue] = [:]
        if meta.title != derived.title { fields["title"] = .string(value: derived.title) }
        if meta.tags != derived.tags { fields["tags"] = .list(items: derived.tags.map { .string(value: $0) }) }
        guard !fields.isEmpty else { return }
        fields["updatedAt"] = .string(value: DSDate.iso(now))
        try updateNote(id: derived.noteId, fields, origin: origin)
    }

    public func trashNote(id: String, at date: Date = Date(), origin: TransactionOrigin = .local) throws {
        try updateNote(id: id, ["trashedAt": .string(value: DSDate.iso(date))], origin: origin)
    }

    public func restoreNote(id: String, origin: TransactionOrigin = .local) throws {
        try updateNote(id: id, ["trashedAt": .null], origin: origin)
    }

    /// «Понятно» on the «Создано агентом» strip (D-45): `createdByAgent = null`, the strip goes
    /// away on every device.
    public func clearCreatedByAgent(noteId: String, origin: TransactionOrigin = .local) throws {
        guard note(id: noteId)?.createdByAgent != nil else { return }
        try updateNote(id: noteId, ["createdByAgent": .null], origin: origin)
    }

    /// Removes the note's metadata for good (after the 30-day trash period).
    public func purgeNote(id: String, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.delete("notes", key: id) }
    }

    /// Notes trashed more than `days` ago.
    public func expiredTrash(now: Date = Date(), days: Int = 30) -> [NoteMeta] {
        trashed().filter { meta in
            guard let t = meta.trashedAt.flatMap(DSDate.parseISO) else { return false }
            return now.timeIntervalSince(t) > Double(days) * 86_400
        }
    }

    // MARK: Tags

    /// All tags used by notes, with counts.
    public func tagCounts() -> [String: Int] {
        var counts: [String: Int] = [:]
        for n in notes() { for t in n.tags { counts[t, default: 0] += 1 } }
        return counts
    }

    public func tagProperties() -> [TagProperties] { crdt.records("tags", as: TagProperties.self) }

    public func setTagProperties(_ props: TagProperties, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.put("tags", props) }
    }
}

/// The `account` document: spaces, notebook list, settings, favourites, tabs
/// (document-model.md §2).
public final class AccountDocument: Sendable {
    public let crdt: CRDTDocument

    public var accountDocId: String { crdt.docId }

    public init(accountDocId: String, clientId: UInt64? = nil) {
        crdt = CRDTDocument(kind: .account, docId: accountDocId, clientId: clientId)
    }

    public init(_ crdt: CRDTDocument) {
        precondition(crdt.kind == .account)
        self.crdt = crdt
    }

    public func initialize(origin: TransactionOrigin = .system) throws {
        try crdt.transact(origin: origin) { $0.set("meta", key: "formatVersion", .number(value: Double(currentFormatVersion))) }
    }

    public var formatVersion: Int { crdt.mapValue("meta", ["formatVersion"])?.intValue ?? currentFormatVersion }

    // MARK: Spaces

    public func spaces() -> [Space] { crdt.records("spaces", as: Space.self).sorted { ($0.order, $0.id) < ($1.order, $1.id) } }

    public func putSpace(_ space: Space, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.put("spaces", space) }
    }

    public func updateSpace(id: String, _ fields: [String: YValue], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.update("spaces", id: id, fields) }
    }

    public func deleteSpace(id: String, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.delete("spaces", key: id) }
    }

    // MARK: Notebooks

    public func notebooks() -> [NotebookRef] { crdt.records("notebooks", as: NotebookRef.self).sorted { ($0.order, $0.id) < ($1.order, $1.id) } }

    public func notebooks(inSpace spaceId: String) -> [NotebookRef] { notebooks().filter { $0.spaceId == spaceId } }

    public func notebook(id: String) -> NotebookRef? { crdt.record("notebooks", id: id) }

    public func putNotebook(_ ref: NotebookRef, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.put("notebooks", ref) }
    }

    public func updateNotebook(id: String, _ fields: [String: YValue], origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.update("notebooks", id: id, fields) }
    }

    public func deleteNotebook(id: String, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.delete("notebooks", key: id) }
    }

    // MARK: Settings

    public func setting(_ key: String) -> YValue? { crdt.mapValue("settings", [key]) }

    public func setSetting(_ key: String, _ value: YValue, origin: TransactionOrigin = .local) throws {
        try crdt.transact(origin: origin) { $0.set("settings", key: key, value) }
    }

    /// Notebook holding daily notes and the inbox (`settings.dailyNotebookId`).
    public var dailyNotebookId: String? { setting("dailyNotebookId")?.stringValue }

    public var activeTab: String? { setting("activeTab")?.stringValue }

    /// The user confirmed they saved the current recovery key (`settings.recoveryKeyConfirmed`);
    /// reset to `false` when the key is rotated.
    public var recoveryKeyConfirmed: Bool { setting("recoveryKeyConfirmed")?.boolValue ?? false }

    public func setRecoveryKeyConfirmed(_ confirmed: Bool, origin: TransactionOrigin = .local) throws {
        try setSetting("recoveryKeyConfirmed", .bool(value: confirmed), origin: origin)
    }

    // MARK: Starred

    public func starred() -> [StarredItem] { crdt.arrayValues("starred").compactMap(StarredItem.init(value:)) }

    public func star(_ item: StarredItem, origin: TransactionOrigin = .local) throws {
        let current = starred()
        guard !current.contains(item) else { return }
        try crdt.transact(origin: origin) { $0.arrayInsert("starred", at: UInt32(current.count), [item.value]) }
    }

    public func unstar(_ item: StarredItem, origin: TransactionOrigin = .local) throws {
        let values = crdt.arrayValues("starred")
        let indices = values.enumerated().filter { StarredItem(value: $0.element) == item }.map(\.offset)
        try crdt.transact(origin: origin) { txn in
            for i in indices.reversed() { txn.arrayDelete("starred", at: UInt32(i), count: 1) }
        }
    }

    // MARK: Tabs

    public func tabs() -> [String] { crdt.arrayValues("tabs").compactMap { $0["noteId"]?.stringValue } }

    public func openTab(noteId: String, origin: TransactionOrigin = .local) throws {
        let current = tabs()
        try crdt.transact(origin: origin) { txn in
            if !current.contains(noteId) {
                txn.arrayInsert("tabs", at: UInt32(current.count), [.object(entries: ["noteId": .string(value: noteId)])])
            }
            txn.set("settings", key: "activeTab", .string(value: noteId))
        }
    }

    public func closeTab(noteId: String, origin: TransactionOrigin = .local) throws {
        let current = tabs()
        try crdt.transact(origin: origin) { txn in
            for (i, id) in current.enumerated().reversed() where id == noteId {
                txn.arrayDelete("tabs", at: UInt32(i), count: 1)
            }
            if activeTab == noteId {
                let remaining = current.filter { $0 != noteId }
                txn.set("settings", key: "activeTab", .optionalString(remaining.last))
            }
        }
    }
}
