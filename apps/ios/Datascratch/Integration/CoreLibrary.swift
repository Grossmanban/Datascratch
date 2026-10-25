#if canImport(DSCore)
import DSCore
import Foundation
import os

/// The library stored the way the contracts describe it: one Yjs `account`
/// document, a `notebook` document per notebook and a `note` document per note
/// (Yrs via DSCore), every update persisted in DSCore's `LocalStore` together
/// with the outbox for sync. Keys follow crypto.md: notebook keys wrapped by the
/// master key, note keys wrapped by the notebook key (`KeyRing`).
///
/// The UI keeps working on `LibrarySnapshot`; this backend turns snapshot diffs
/// into document transactions and rebuilds the snapshot from the documents.
/// Values without a place in the contract yet (gradient covers, the active space,
/// local version history) live in a small local overlay.
final class CoreLibrary: LibraryBackend {
    nonisolated private static let log = Logger(subsystem: "com.datascratch.app", category: "CoreLibrary")
    private static let accountDocKey = "app.accountDocId"
    private static let overlayKey = "app.overlay"

    let store: LocalStore
    let keys: KeyRing
    private(set) var account: AccountDocument
    private var notebookDocs: [String: NotebookDocument] = [:]
    private var noteDocs: [String: NoteDocument] = [:]
    private var subscriptions: [String: CRDTSubscription] = [:]
    private var overlay: Overlay
    var onExternalChange: ((LibrarySnapshot) -> Void)?

    /// Local-only values (no field for them in the documents yet).
    nonisolated struct Overlay: Codable {
        var activeSpaceId: String?
        var covers: [String: Backdrop] = [:]
        var versions: [String: [NoteVersion]] = [:]
    }

    /// Opens (or creates) the library in `directory`.
    init(store: LocalStore, keys: KeyRing) throws {
        self.store = store
        self.keys = keys
        if try keys.masterKey() == nil {
            // Local-only account until a server is connected: a device master key.
            try keys.setMasterKey(DSCrypto.newKey())
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        overlay = (try? store.value(Self.overlayKey)).flatMap { $0 }.flatMap { try? decoder.decode(Overlay.self, from: $0) } ?? Overlay()

        // Subscribe before initializing: a Yjs update depends on the client's earlier ones,
        // so the very first (initialization) update must be stored too.
        let existingId = try store.string(Self.accountDocKey)
        let accountId = existingId ?? DSCore.EntityID.make()
        account = AccountDocument(try Self.open(.account, docId: accountId, notebookId: nil, store: store))
        subscriptions[accountId] = observe(account.crdt, notebookId: nil)
        if existingId == nil {
            try account.initialize()
            try store.setString(accountId, for: Self.accountDocKey)
        }
        for ref in account.notebooks() {
            _ = try? notebookDocument(ref.id)
        }
    }

    static func open(directory: URL) throws -> CoreLibrary {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let store = try LocalStore(url: directory.appendingPathComponent("library.sqlite"))
        return try CoreLibrary(store: store, keys: KeyRing(store: secretStore()))
    }

    /// The Keychain; on an unsigned simulator build (CI) the Keychain is unavailable
    /// (errSecMissingEntitlement), so keys stay in memory there. Local documents do not
    /// depend on them — keys only encrypt what goes to the server.
    private static func secretStore() throws -> any SecretStore {
        let keychain = KeychainSecretStore(service: "com.datascratch.app.keys")
        do {
            _ = try keychain.data(for: "probe")
            return keychain
        } catch {
            #if targetEnvironment(simulator)
            log.notice("Keychain unavailable on this simulator build; keys kept in memory")
            return InMemorySecretStore()
            #else
            throw error
            #endif
        }
    }

    static func inMemory() throws -> CoreLibrary {
        try CoreLibrary(store: LocalStore.inMemory(), keys: KeyRing(store: InMemorySecretStore()))
    }

    // MARK: - Documents

    /// A document with all stored updates applied, persisting its future local updates.
    private static func open(_ kind: DocKind, docId: String, notebookId: String?, store: LocalStore) throws -> CRDTDocument {
        let crdt = CRDTDocument(kind: kind, docId: docId)
        _ = try store.ensureDocument(docId: docId, kind: kind, notebookId: notebookId)
        let updates = try store.updates(docId: docId)
        if !updates.isEmpty { try crdt.applyUpdates(updates, origin: .storage) }
        return crdt
    }

    private func observe(_ crdt: CRDTDocument, notebookId: String?) -> CRDTSubscription {
        let store = self.store
        let docId = crdt.docId
        return crdt.observeUpdates { update, origin in
            // Runs inside the transaction: only touch the database here.
            guard origin.isOutgoing else { return }
            do {
                try store.appendLocalUpdate(docId: docId, update: update, origin: origin)
            } catch {
                CoreLibrary.log.error("persisting update of \(docId, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    func notebookDocument(_ id: String) throws -> NotebookDocument {
        if let doc = notebookDocs[id] { return doc }
        let isNew = try store.document(id) == nil
        let crdt = try Self.open(.notebook, docId: id, notebookId: id, store: store)
        let doc = NotebookDocument(crdt)
        subscriptions[id] = observe(crdt, notebookId: id)
        if isNew { try doc.initialize() }
        notebookDocs[id] = doc
        return doc
    }

    func noteDocument(_ id: String, notebookId: String) throws -> NoteDocument {
        if let doc = noteDocs[id] { return doc }
        let isNew = try store.document(id) == nil
        let crdt = try Self.open(.note, docId: id, notebookId: notebookId, store: store)
        let doc = NoteDocument(crdt)
        subscriptions[id] = observe(crdt, notebookId: notebookId)
        if isNew { try doc.initialize() }
        noteDocs[id] = doc
        return doc
    }

    // MARK: - Snapshot

    func loadSnapshot() -> LibrarySnapshot {
        var snapshot = LibrarySnapshot()
        snapshot.spaces = account.spaces().map { space in
            Space(id: space.id, name: space.name, icon: space.icon ?? "square.stack",
                  color: space.color.flatMap(Tint.init(rawValue:)) ?? .blue, order: space.order,
                  createdAt: DSCore.DSDate.parseISO(space.createdAt) ?? Date())
        }
        let refs = account.notebooks()
        snapshot.notebooks = refs.map { ref in
            Notebook(id: ref.id, spaceId: ref.spaceId, name: ref.name, icon: ref.icon ?? "book.closed",
                     color: ref.color.flatMap(Tint.init(rawValue:)) ?? .blue, order: ref.order,
                     mode: ref.mode == .agent ? .agent : .private,
                     createdAt: DSCore.DSDate.parseISO(ref.createdAt) ?? Date())
        }
        for ref in refs {
            guard let doc = try? notebookDocument(ref.id) else { continue }
            snapshot.folders += doc.folders().map { folder in
                Folder(id: folder.id, notebookId: ref.id, parentId: folder.parentId, name: folder.name,
                       icon: folder.icon ?? "folder", color: folder.color.flatMap(Tint.init(rawValue:)) ?? .gray,
                       order: folder.order, createdAt: DSCore.DSDate.parseISO(folder.createdAt) ?? Date())
            }
            for meta in doc.notes(includeTrashed: true) {
                guard let pair = snapshotNote(meta, notebookId: ref.id) else { continue }
                snapshot.notes.append(pair.0)
                snapshot.bodies[meta.id] = pair.1
            }
            for props in doc.tagProperties() {
                if let color = props.color.flatMap(Tint.init(rawValue:)) { snapshot.tagColors[props.id] = color }
            }
        }
        snapshot.starred = account.starred().map { StarRef(kind: StarRef.Kind(rawValue: $0.kind.rawValue) ?? .note, id: $0.id) }
        snapshot.tabs = account.tabs()
        snapshot.dailyNotebookId = account.dailyNotebookId
        snapshot.activeSpaceId = overlay.activeSpaceId
        snapshot.versions = overlay.versions
        return snapshot
    }

    private func snapshotNote(_ meta: DSCore.NoteMeta, notebookId: String) -> (NoteMeta, NoteBody)? {
        guard let note = try? noteDocument(meta.id, notebookId: notebookId) else { return nil }
        let body = NoteBodyCodec.body(from: (try? note.blocks()) ?? [])
        var item = NoteMeta(id: meta.id, notebookId: notebookId, folderId: meta.folderId, parentNoteId: meta.parentNoteId,
                            title: meta.title, kind: NoteKind(rawValue: meta.kind.rawValue) ?? .note,
                            dailyDate: meta.dailyDate, tags: meta.tags, icon: meta.icon,
                            cover: overlay.covers[meta.id], backdrop: Self.backdrop(note.meta().backdrop),
                            style: Self.style(note.meta().style), snippet: "",
                            createdAt: DSCore.DSDate.parseISO(meta.createdAt) ?? Date(),
                            updatedAt: DSCore.DSDate.parseISO(meta.updatedAt) ?? Date(),
                            trashedAt: meta.trashedAt.flatMap(DSCore.DSDate.parseISO), order: meta.order)
        LibraryStore.refreshDerived(&item, body: body)
        return (item, body)
    }

    /// After the native editor changed a note: copies title/tags into the notebook
    /// document (`syncDerived`), updates the local index and returns the fresh values.
    func refreshNote(_ noteId: String, notebookId: String) -> (NoteMeta, NoteBody)? {
        guard let notebook = try? notebookDocument(notebookId), let note = try? noteDocument(noteId, notebookId: notebookId)
        else { return nil }
        if let derived = try? note.derived() {
            try? notebook.syncDerived(derived)
            try? store.index(derived, notebookId: notebookId)
        }
        guard let meta = notebook.note(id: noteId) else { return nil }
        return snapshotNote(meta, notebookId: notebookId)
    }

    // MARK: - Writing

    func persist(from old: LibrarySnapshot, to new: LibrarySnapshot) {
        do {
            try persistSpaces(old, new)
            try persistNotebooks(old, new)
            try persistFolders(old, new)
            try persistNotes(old, new)
            try persistAccountLists(old, new)
            try persistOverlay(old, new)
        } catch {
            Self.log.error("persist failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    private func persistSpaces(_ old: LibrarySnapshot, _ new: LibrarySnapshot) throws {
        guard old.spaces != new.spaces else { return }
        let before = Dictionary(old.spaces.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        for space in new.spaces where before[space.id] != space {
            try account.putSpace(DSCore.Space(id: space.id, name: space.name, icon: space.icon, color: space.color.rawValue,
                                              order: space.order, createdAt: DSCore.DSDate.iso(space.createdAt)))
        }
        let ids = Set(new.spaces.map(\.id))
        for space in old.spaces where !ids.contains(space.id) {
            try account.deleteSpace(id: space.id)
        }
        // Agents read the space of a notebook from the notebook document.
        for notebook in new.notebooks where before[notebook.spaceId] != new.spaces.first(where: { $0.id == notebook.spaceId }) {
            try writeNotebookMeta(notebook, in: new)
        }
    }

    private func persistNotebooks(_ old: LibrarySnapshot, _ new: LibrarySnapshot) throws {
        guard old.notebooks != new.notebooks else { return }
        let before = Dictionary(old.notebooks.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        for notebook in new.notebooks where before[notebook.id] != notebook {
            if before[notebook.id] == nil, try keys.notebookKey(notebook.id) == nil {
                _ = try keys.createNotebookKey(notebookId: notebook.id)
            }
            _ = try notebookDocument(notebook.id)
            try account.putNotebook(NotebookRef(id: notebook.id, spaceId: notebook.spaceId, name: notebook.name,
                                                icon: notebook.icon, color: notebook.color.rawValue, order: notebook.order,
                                                mode: notebook.mode == .agent ? .agent : .private,
                                                createdAt: DSCore.DSDate.iso(notebook.createdAt)))
            try writeNotebookMeta(notebook, in: new)
        }
        let ids = Set(new.notebooks.map(\.id))
        for notebook in old.notebooks where !ids.contains(notebook.id) {
            try account.deleteNotebook(id: notebook.id)
            for note in old.notes where note.notebookId == notebook.id {
                noteDocs[note.id] = nil
                subscriptions[note.id] = nil
                try store.deleteDocument(note.id)
            }
            notebookDocs[notebook.id] = nil
            subscriptions[notebook.id] = nil
            try store.deleteDocument(notebook.id)
        }
    }

    /// `meta.name/icon/space` of the notebook document (agents cannot read the account document).
    private func writeNotebookMeta(_ notebook: Notebook, in snapshot: LibrarySnapshot) throws {
        let doc = try notebookDocument(notebook.id)
        let space = snapshot.spaces.first { $0.id == notebook.spaceId }
        try doc.crdt.transact(origin: .local) { txn in
            txn.set("meta", key: "name", .string(value: notebook.name))
            txn.set("meta", key: "icon", .string(value: notebook.icon))
            txn.set("meta", key: "space", .object(entries: [
                "id": .string(value: notebook.spaceId),
                "name": .string(value: space?.name ?? ""),
                "icon": .optionalString(space?.icon),
            ]))
        }
    }

    private func persistFolders(_ old: LibrarySnapshot, _ new: LibrarySnapshot) throws {
        guard old.folders != new.folders else { return }
        let before = Dictionary(old.folders.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        for folder in new.folders where before[folder.id] != folder {
            try notebookDocument(folder.notebookId).putFolder(
                DSCore.Folder(id: folder.id, parentId: folder.parentId, name: folder.name, icon: folder.icon,
                              color: folder.color.rawValue, order: folder.order, createdAt: DSCore.DSDate.iso(folder.createdAt)))
        }
        let ids = Set(new.folders.map(\.id))
        for folder in old.folders where !ids.contains(folder.id) && new.notebooks.contains(where: { $0.id == folder.notebookId }) {
            // Removes the record only; LibraryStore already moved or trashed its notes.
            try notebookDocument(folder.notebookId).crdt.transact(origin: .local) { $0.delete("folders", key: folder.id) }
        }
    }

    private func persistNotes(_ old: LibrarySnapshot, _ new: LibrarySnapshot) throws {
        guard old.notes != new.notes || old.bodies != new.bodies else { return }
        let before = Dictionary(old.notes.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let titles = Dictionary(new.notes.filter { !$0.isTrashed }.map { ($0.title.lowercased(), $0.id) },
                                uniquingKeysWith: { a, _ in a })
        let resolve: NoteBodyCodec.LinkResolver = { titles[$0.lowercased()] }

        for meta in new.notes {
            let previous = before[meta.id]
            let body = new.bodies[meta.id] ?? .empty
            if previous == nil {
                try createNote(meta, body: body, resolve: resolve)
                continue
            }
            guard let previous else { continue }
            if previous.notebookId != meta.notebookId {
                try moveNote(meta, from: previous.notebookId)
            }
            let doc = try noteDocument(meta.id, notebookId: meta.notebookId)
            if previous != meta {
                try updateMeta(meta, previous: previous, doc: doc)
            }
            if old.bodies[meta.id] != body || previous.title != meta.title {
                try write(body: body, title: meta.title, previous: old.bodies[meta.id], to: doc, resolve: resolve)
            }
        }
        let ids = Set(new.notes.map(\.id))
        for meta in old.notes where !ids.contains(meta.id) {
            if new.notebooks.contains(where: { $0.id == meta.notebookId }) {
                try notebookDocument(meta.notebookId).purgeNote(id: meta.id)
            }
            noteDocs[meta.id] = nil
            subscriptions[meta.id] = nil
            try store.deleteDocument(meta.id)
        }
    }

    private func createNote(_ meta: NoteMeta, body: NoteBody, resolve: NoteBodyCodec.LinkResolver) throws {
        let notebook = try notebookDocument(meta.notebookId)
        if try keys.notebookKey(meta.notebookId) == nil { _ = try keys.createNotebookKey(notebookId: meta.notebookId) }
        let (_, wrapped) = try keys.createNoteKey(noteId: meta.id, notebookId: meta.notebookId)
        let doc = try noteDocument(meta.id, notebookId: meta.notebookId)
        try notebook.putNote(coreMeta(meta, wrappedKey: wrapped))
        try write(body: body, title: meta.title, previous: nil, to: doc, resolve: resolve)
        try writeStyle(meta, doc: doc)
    }

    /// A note moved to another notebook: its key is re-wrapped by the new notebook key.
    private func moveNote(_ meta: NoteMeta, from oldNotebookId: String) throws {
        let source = try notebookDocument(oldNotebookId)
        guard let oldMeta = source.note(id: meta.id) else { return }
        let noteKey = try keys.noteKey(noteId: meta.id, wrappedKey: oldMeta.wrappedKey, notebookId: oldNotebookId)
        if try keys.notebookKey(meta.notebookId) == nil { _ = try keys.createNotebookKey(notebookId: meta.notebookId) }
        guard let targetKey = try keys.notebookKey(meta.notebookId) else { return }
        let wrapped = try DSCrypto.wrapKey(noteKey, with: targetKey, ad: CryptoAD.noteKey(meta.id))
        try source.purgeNote(id: meta.id)
        try notebookDocument(meta.notebookId).putNote(coreMeta(meta, wrappedKey: DSCore.Base64URL.encode(wrapped)))
        _ = try store.ensureDocument(docId: meta.id, kind: .note, notebookId: meta.notebookId)
    }

    private func updateMeta(_ meta: NoteMeta, previous: NoteMeta, doc: NoteDocument) throws {
        var fields: [String: YValue] = [:]
        if meta.title != previous.title { fields["title"] = .string(value: meta.title) }
        if meta.folderId != previous.folderId { fields["folderId"] = .optionalString(meta.folderId) }
        if meta.tags != previous.tags { fields["tags"] = .list(items: meta.tags.map { .string(value: $0) }) }
        if meta.icon != previous.icon { fields["icon"] = .optionalString(meta.icon) }
        if meta.trashedAt != previous.trashedAt { fields["trashedAt"] = .optionalString(meta.trashedAt.map(DSCore.DSDate.iso)) }
        if meta.order != previous.order { fields["order"] = .number(value: meta.order) }
        if meta.updatedAt != previous.updatedAt { fields["updatedAt"] = .string(value: DSCore.DSDate.iso(meta.updatedAt)) }
        if !fields.isEmpty {
            try notebookDocument(meta.notebookId).updateNote(id: meta.id, fields)
        }
        if meta.style != previous.style || meta.backdrop != previous.backdrop {
            try writeStyle(meta, doc: doc)
        }
    }

    private func writeStyle(_ meta: NoteMeta, doc: NoteDocument) throws {
        try doc.setStyle(NoteMetaContent.Style(font: meta.style.font.rawValue, width: meta.style.width.rawValue,
                                               paper: meta.style.paper.rawValue))
        try doc.setBackdrop(meta.backdrop == .none ? nil : NoteMetaContent.Backdrop(kind: .gradient, value: meta.backdrop.rawValue))
    }

    private func coreMeta(_ meta: NoteMeta, wrappedKey: String) -> DSCore.NoteMeta {
        DSCore.NoteMeta(id: meta.id, folderId: meta.folderId, parentNoteId: meta.parentNoteId, title: meta.title,
                        kind: DSCore.NoteKind(rawValue: meta.kind.rawValue) ?? .note, dailyDate: meta.dailyDate,
                        tags: meta.tags, icon: meta.icon, coverThumb: nil, wrappedKey: wrappedKey,
                        createdAt: DSCore.DSDate.iso(meta.createdAt), updatedAt: DSCore.DSDate.iso(meta.updatedAt),
                        trashedAt: meta.trashedAt.map(DSCore.DSDate.iso), order: meta.order)
    }

    /// Writes the title and the body as targeted edits by `blockId`, so blocks the
    /// stand-in editor does not understand (code, formulas, marks from other clients)
    /// are never rewritten. Only a document made purely of representable blocks may be
    /// rewritten as a whole (reordering in the stand-in editor).
    private func write(body: NoteBody, title: String, previous: NoteBody?, to doc: NoteDocument,
                       resolve: NoteBodyCodec.LinkResolver) throws {
        let current = try doc.blocks()
        if let titleIndex = current.firstIndex(where: { $0.type == BlockType.title }) {
            if current[titleIndex].text != title {
                var block = current[titleIndex]
                block.inline = title.isEmpty ? [] : [.text(title, marks: [])]
                try doc.replaceBlock(at: [UInt32(titleIndex)], with: block)
            }
        } else {
            try doc.insertBlocks([.title(title)], at: 0)
        }

        let old = previous ?? NoteBodyCodec.body(from: current)
        guard old != body else { return }
        let oldIds = old.blocks.map(\.id)
        let newIds = body.blocks.map(\.id)
        let oldById = Dictionary(old.blocks.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })

        // 1. Removed blocks.
        for id in oldIds where !newIds.contains(id) {
            if let path = try doc.path(ofBlock: id) { try doc.deleteBlock(at: path) }
        }
        try removeEmptyContainers(doc)

        let kept = newIds.filter { oldById[$0] != nil }
        let keptOrderUnchanged = kept == oldIds.filter { newIds.contains($0) }
        let kindsUnchanged = kept.allSatisfy { id in body.blocks.first { $0.id == id }?.kind == oldById[id]?.kind }
        guard keptOrderUnchanged, kindsUnchanged else {
            try rewriteIfRepresentable(doc, body: body, resolve: resolve)
            return
        }

        // 2. Changed blocks in place.
        for block in body.blocks {
            guard let before = oldById[block.id], before != block, let path = try doc.path(ofBlock: block.id) else { continue }
            if before.text == block.text, let task = block.task, before.task != nil {
                try doc.updateTask(taskId: task.taskId, state: DSCore.TaskState(rawValue: task.state.rawValue),
                                   scheduled: .some(task.scheduled), deadline: .some(task.deadline))
            } else {
                try doc.replaceBlock(at: path, with: NoteBodyCodec.item(for: block, resolveLink: resolve))
            }
        }

        // 3. New blocks: inserted after their predecessor (into the same list when possible).
        for (index, block) in body.blocks.enumerated() where oldById[block.id] == nil {
            try insert(block, after: index > 0 ? body.blocks[index - 1] : nil, in: doc, resolve: resolve)
        }
    }

    private func insert(_ block: NoteBlock, after previous: NoteBlock?, in doc: NoteDocument,
                        resolve: NoteBodyCodec.LinkResolver) throws {
        let isItem = block.kind == .bullet || block.kind == .task
        if let previous, let path = try doc.path(ofBlock: previous.id), let last = path.last {
            if isItem, previous.kind == block.kind, path.count >= 2 {
                // Next item of the same list.
                try doc.insertBlocks([NoteBodyCodec.item(for: block, resolveLink: resolve)],
                                     into: Array(path.dropLast()), at: last + 1)
                return
            }
            let topIndex = path[0]
            try doc.insertBlocks(NoteBodyCodec.blocks(from: NoteBody(blocks: [block]), resolveLink: resolve),
                                 at: topIndex + 1)
            return
        }
        // First block: right after the title.
        let titleOffset: UInt32 = (try doc.blocks().first?.type == BlockType.title) ? 1 : 0
        try doc.insertBlocks(NoteBodyCodec.blocks(from: NoteBody(blocks: [block]), resolveLink: resolve), at: titleOffset)
    }

    /// Lists left without items after deletions are removed.
    private func removeEmptyContainers(_ doc: NoteDocument) throws {
        let containers: Set<String> = [BlockType.bulletList, BlockType.taskList, BlockType.orderedList]
        for (index, block) in try doc.blocks().enumerated().reversed()
        where containers.contains(block.type) && block.children.isEmpty {
            try doc.deleteBlock(at: [UInt32(index)])
        }
    }

    /// Full rewrite, only when every body block is one the stand-in editor represents.
    private func rewriteIfRepresentable(_ doc: NoteDocument, body: NoteBody, resolve: NoteBodyCodec.LinkResolver) throws {
        let current = try doc.blocks()
        guard current.allSatisfy({ $0.type == BlockType.title || NoteBodyCodec.isRepresentable($0) }) else {
            Self.log.notice("skipped rewriting \(doc.noteId, privacy: .public): it has blocks the stand-in editor cannot show")
            return
        }
        for (index, block) in current.enumerated().reversed() where block.type != BlockType.title {
            try doc.deleteBlock(at: [UInt32(index)])
        }
        try doc.appendBlocks(NoteBodyCodec.blocks(from: body, resolveLink: resolve))
    }

    private func persistAccountLists(_ old: LibrarySnapshot, _ new: LibrarySnapshot) throws {
        if old.starred != new.starred {
            for ref in new.starred where !old.starred.contains(ref) {
                try account.star(StarredItem(kind: StarredItem.Kind(rawValue: ref.kind.rawValue) ?? .note, id: ref.id))
            }
            for ref in old.starred where !new.starred.contains(ref) {
                try account.unstar(StarredItem(kind: StarredItem.Kind(rawValue: ref.kind.rawValue) ?? .note, id: ref.id))
            }
        }
        if old.tabs != new.tabs {
            for id in new.tabs where !old.tabs.contains(id) { try account.openTab(noteId: id) }
            for id in old.tabs where !new.tabs.contains(id) { try account.closeTab(noteId: id) }
        }
        if old.dailyNotebookId != new.dailyNotebookId {
            try account.setSetting("dailyNotebookId", .optionalString(new.dailyNotebookId))
        }
        if old.tagColors != new.tagColors {
            let changed = Set(old.tagColors.keys).union(new.tagColors.keys).filter { old.tagColors[$0] != new.tagColors[$0] }
            for notebook in new.notebooks {
                let doc = try notebookDocument(notebook.id)
                for tag in changed {
                    try doc.setTagProperties(TagProperties(name: tag, color: new.tagColors[tag]?.rawValue))
                }
            }
        }
    }

    private func persistOverlay(_ old: LibrarySnapshot, _ new: LibrarySnapshot) throws {
        var next = overlay
        next.activeSpaceId = new.activeSpaceId
        next.versions = new.versions
        next.covers = Dictionary(uniqueKeysWithValues: new.notes.compactMap { note in note.cover.map { (note.id, $0) } })
        guard next.activeSpaceId != overlay.activeSpaceId || next.versions != overlay.versions || next.covers != overlay.covers
        else { return }
        overlay = next
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        try store.setValue(try encoder.encode(next), for: Self.overlayKey)
    }

    /// One-time move of the JSON library written by earlier builds into the documents.
    static func importLegacy(from legacy: LibraryPersistence, into core: CoreLibrary) {
        guard let snapshot = legacy.load(), core.account.spaces().isEmpty, !snapshot.spaces.isEmpty else { return }
        core.persist(from: LibrarySnapshot(), to: snapshot)
        legacy.erase()
    }

    // MARK: - Mapping helpers

    private static func style(_ style: NoteMetaContent.Style) -> NoteStyle {
        NoteStyle(font: NoteStyle.Font(rawValue: style.font) ?? .serif,
                  width: NoteStyle.Width(rawValue: style.width) ?? .normal,
                  paper: NoteStyle.Paper(rawValue: style.paper) ?? .plain)
    }

    private static func backdrop(_ backdrop: NoteMetaContent.Backdrop?) -> Backdrop {
        guard let backdrop, backdrop.kind == .gradient else { return .none }
        return Backdrop(rawValue: backdrop.value) ?? .none
    }
}
#endif
