#if canImport(DSCore)
import DSCore
import Foundation
import os

/// Server side of the library (set by `ServerConnection` when an account on a server
/// is signed in): notebooks must exist on the server, documents go to the sync engine.
protocol CoreLibraryRemote: AnyObject {
    func notebookCreated(id: String, mode: NotebookMode, wrappedKey: Data, key: Data)
    func notebookModeChanged(id: String, mode: NotebookMode, key: Data?)
    func notebookDeleted(id: String)
    /// A document was deleted locally; the sync engine forgets it and stops sending it.
    func documentDeleted(_ docId: String)
    /// A note moved to another notebook locally; the server is told (`PATCH /docs/:id`).
    func noteMoved(_ noteId: String, toNotebook notebookId: String)
    /// A document was opened; from now on the sync engine persists and sends its updates.
    func documentOpened(_ crdt: CRDTDocument, notebookId: String?)
    /// The account lists notebooks whose keys this device does not hold.
    func notebookKeysMissing()
}

/// `NoteMeta.wrappedKey` by note id, readable from the sync engine's actor.
nonisolated final class WrappedKeyIndex: @unchecked Sendable {
    private let lock = NSLock()
    private var keys: [String: (notebookId: String, wrapped: String)] = [:]

    func set(noteId: String, notebookId: String, wrapped: String) {
        lock.withLock { keys[noteId] = (notebookId, wrapped) }
    }

    func wrapped(noteId: String, notebookId: String) -> String? {
        lock.withLock { keys[noteId].flatMap { $0.notebookId == notebookId ? $0.wrapped : nil } }
    }
}

/// The library stored the way the contracts describe it: one Yjs `account`
/// document, a `notebook` document per notebook and a `note` document per note
/// (Yrs via DSCore), every update persisted in DSCore's `LocalStore` together
/// with the outbox for sync. Keys follow crypto.md: notebook keys wrapped by the
/// master key, note keys wrapped by the notebook key (`KeyRing`).
///
/// The UI keeps working on `LibrarySnapshot`; this backend turns snapshot diffs
/// into document transactions and rebuilds the snapshot from the documents.
/// Values without a place in the contract yet (build 1 gradient covers, the active space,
/// local version history) live in a small local overlay.
final class CoreLibrary: LibraryBackend {
    nonisolated private static let log = Logger(subsystem: "com.datascratch.app", category: "CoreLibrary")
    private static let accountDocKey = "app.accountDocId"
    private static let carriedMergeKey = "app.carriedLibraryMergePending"
    private static let pendingMovesKey = "app.pendingDocMoves"

    /// Notes moved to another notebook whose `PATCH /docs/:id` has not been answered yet
    /// (note id → notebook id), kept in the store so that a move made offline is sent later.
    var pendingMoves: [String: String] {
        get {
            guard let json = try? store.string(Self.pendingMovesKey), let data = json.data(using: .utf8) else { return [:] }
            return (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
        }
        set {
            let json = newValue.isEmpty ? nil : (try? JSONEncoder().encode(newValue)).map { String(decoding: $0, as: UTF8.self) }
            try? store.setString(json, for: Self.pendingMovesKey)
        }
    }

    /// The server took the move (or will learn the notebook at registration).
    func moveDelivered(_ noteId: String, toNotebook notebookId: String) {
        guard pendingMoves[noteId] == notebookId else { return }
        pendingMoves[noteId] = nil
    }

    /// The device library was carried in and `LibraryStore.mergeCarriedDuplicates` has not run
    /// yet (kept in the store so that a launch cut short still merges next time).
    var needsCarriedMerge: Bool {
        get { (try? store.string(Self.carriedMergeKey)) == "1" }
        set { try? store.setString(newValue ? "1" : nil, for: Self.carriedMergeKey) }
    }
    private static let overlayKey = "app.overlay"

    let store: LocalStore
    let keys: KeyRing
    /// Where keys and the server session are kept (Keychain on devices).
    let secrets: any SecretStore
    private(set) var account: AccountDocument
    private var notebookDocs: [String: NotebookDocument] = [:]
    private var noteDocs: [String: NoteDocument] = [:]
    private var subscriptions: [String: CRDTSubscription] = [:]
    private var remoteSubscriptions: [String: CRDTSubscription] = [:]
    private var reloadTask: Task<Void, Never>?
    let wrappedKeys = WrappedKeyIndex()
    /// While set, the sync engine stores and sends document updates (instead of `observe`).
    weak var remote: (any CoreLibraryRemote)? {
        didSet {
            guard remote != nil else { return }
            subscriptions.removeAll()
            remote?.documentOpened(account.crdt, notebookId: nil)
            for (id, doc) in notebookDocs { remote?.documentOpened(doc.crdt, notebookId: id) }
            for (id, doc) in noteDocs { remote?.documentOpened(doc.crdt, notebookId: notebookIdOfNote[id]) }
        }
    }
    private var notebookIdOfNote: [String: String] = [:]
    /// Notes whose documents are open (their keys are known).
    var knownNoteIds: [String] { Array(notebookIdOfNote.keys) }
    private var overlay: Overlay
    var onExternalChange: ((LibrarySnapshot) -> Void)?

    /// Local-only values (no field for them in the documents yet).
    nonisolated struct Overlay: Codable {
        var activeSpaceId: String?
        var covers: [String: Backdrop] = [:]
        var versions: [String: [NoteVersion]] = [:]
    }

    /// Opens (or creates) the library in `directory`.
    init(store: LocalStore, keys: KeyRing, secrets: any SecretStore = InMemorySecretStore()) throws {
        self.store = store
        self.keys = keys
        self.secrets = secrets
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
        remoteSubscriptions[accountId] = observeRemote(account.crdt)
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
        let secrets = try secretStore()
        return try CoreLibrary(store: store, keys: KeyRing(store: secrets), secrets: secrets)
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
        let secrets = InMemorySecretStore()
        return try CoreLibrary(store: LocalStore.inMemory(), keys: KeyRing(store: secrets), secrets: secrets)
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
        attach(crdt, notebookId: id)
        if isNew { try doc.initialize() }
        notebookDocs[id] = doc
        remote?.documentOpened(crdt, notebookId: id)
        return doc
    }

    func noteDocument(_ id: String, notebookId: String) throws -> NoteDocument {
        if let doc = noteDocs[id] { return doc }
        let isNew = try store.document(id) == nil
        let crdt = try Self.open(.note, docId: id, notebookId: notebookId, store: store)
        let doc = NoteDocument(crdt)
        attach(crdt, notebookId: notebookId)
        if isNew { try doc.initialize() }
        noteDocs[id] = doc
        notebookIdOfNote[id] = notebookId
        remote?.documentOpened(crdt, notebookId: notebookId)
        return doc
    }

    private func attach(_ crdt: CRDTDocument, notebookId: String?) {
        if remote == nil { subscriptions[crdt.docId] = observe(crdt, notebookId: notebookId) }
        remoteSubscriptions[crdt.docId] = observeRemote(crdt)
    }

    /// Changes from other devices (applied by the sync engine) refresh the snapshot.
    private func observeRemote(_ crdt: CRDTDocument) -> CRDTSubscription {
        crdt.observeUpdates { _, origin in
            guard origin == .remote else { return }
            Task { @MainActor in self.scheduleReload() }
        }
    }

    private func scheduleReload() {
        reloadTask?.cancel()
        reloadTask = Task {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            onExternalChange?(loadSnapshot())
            if !notebooksWithoutKey.isEmpty { remote?.notebookKeysMissing() }
        }
    }

    /// Switches to the account document of a server account (after sign-in / sign-up).
    /// A notebook made on this device before signing in: its key wrapped by the account's master
    /// key, for `POST /notebooks` before its documents are registered (crypto.md §3).
    nonisolated struct CarriedNotebook: Sendable {
        var id: String
        var mode: DSCore.NotebookMode
        var wrappedKey: Data
        var key: Data
    }

    /// Switches to the signed-in account's document and carries in the library made on this
    /// device before signing in (`carryDeviceLibraries`). Returns the notebooks to create on the
    /// server before their documents are registered.
    @discardableResult
    func adoptAccount(docId: String, isNew: Bool) throws -> [CarriedNotebook] {
        if docId != account.accountDocId {
            notebookDocs.removeAll()
            noteDocs.removeAll()
            subscriptions.removeAll()
            remoteSubscriptions.removeAll()
            account = AccountDocument(try Self.open(.account, docId: docId, notebookId: nil, store: store))
            attach(account.crdt, notebookId: nil)
            if isNew, account.crdt.stateVector().count <= 1 { try account.initialize() }
            try store.setString(docId, for: Self.accountDocKey)
        }
        let carried = try carryDeviceLibraries()
        remote?.documentOpened(account.crdt, notebookId: nil)
        for ref in account.notebooks() { _ = try? notebookDocument(ref.id) }
        onExternalChange?(loadSnapshot())
        return carried
    }

    /// Account documents of this device that never reached the server (the «On this device»
    /// library, also one left behind by an earlier sign-in): their spaces, notebooks, starred and
    /// daily notebook move into the current account so nothing vanishes; the notebooks' keys are
    /// re-wrapped by the account's master key. Merges by id, so running it again is harmless.
    /// The device-only account documents are removed afterwards (they never go to the server).
    func carryDeviceLibraries() throws -> [CarriedNotebook] {
        let orphans = try store.documents(kind: .account).filter { !$0.registered && $0.docId != account.accountDocId }
        guard !orphans.isEmpty else { return [] }
        needsCarriedMerge = true
        let master = try keys.masterKey()
        var carried: [CarriedNotebook] = []
        for record in orphans {
            let local = AccountDocument(try Self.open(.account, docId: record.docId, notebookId: nil, store: store))
            // A device library with nothing but untouched first-run content is not carried: it
            // would add a second «Personal»/«Work» to an account that has its own (prod 2026-10-26).
            if holdsOnlyFirstRunContent(local) {
                for ref in local.notebooks() where account.notebook(id: ref.id) == nil {
                    let notebook = NotebookDocument(try Self.open(.notebook, docId: ref.id, notebookId: ref.id, store: store))
                    for meta in notebook.notes(includeTrashed: true) { try store.deleteDocument(meta.id) }
                    try store.deleteDocument(ref.id)
                    notebookDocs[ref.id] = nil
                }
                try store.deleteDocument(record.docId)
                continue
            }
            let haveSpaces = Set(account.spaces().map(\.id))
            for space in local.spaces() where !haveSpaces.contains(space.id) { try account.putSpace(space) }
            let haveNotebooks = Set(account.notebooks().map(\.id))
            for ref in local.notebooks() where !haveNotebooks.contains(ref.id) {
                try account.putNotebook(ref)
                guard let master, let key = try keys.notebookKey(ref.id) else { continue }
                let wrapped = try DSCrypto.wrapKey(key, with: master, ad: CryptoAD.notebookKey(ref.id))
                carried.append(CarriedNotebook(id: ref.id, mode: ref.mode, wrappedKey: wrapped, key: key))
            }
            let haveStarred = Set(account.starred())
            for item in local.starred() where !haveStarred.contains(item) { try account.star(item) }
            if account.dailyNotebookId == nil, let daily = local.dailyNotebookId {
                try account.setSetting("dailyNotebookId", .string(value: daily))
            }
            try store.deleteDocument(record.docId)
        }
        return carried
    }

    var lockedNotebookIds: Set<String> { Set(notebooksWithoutKey) }

    /// Notebooks of the account whose key this device does not hold (made on another device
    /// after this one signed in): their documents can't be read or written until it arrives.
    var notebooksWithoutKey: [String] {
        account.notebooks().map(\.id).filter { (try? keys.notebookKey($0)) ?? nil == nil }
    }

    /// Notes whose key no device can unwrap any more (wrapped by a notebook key an earlier build
    /// invented, lost at sign-out) but whose content this device still holds: they get a new
    /// note key wrapped by the notebook's canonical key. Call after
    /// `AccountService.reconcileNotebookKeys` and `rewrapNoteKeys`; each returned note needs
    /// `SyncEngine.rekey` so its state goes up sealed with the new key.
    @discardableResult
    func healUnreadableNotes() -> [String] {
        var healed: [String] = []
        for ref in account.notebooks() where keys.isNotebookKeyVerified(ref.id) {
            guard let key = (try? keys.notebookKey(ref.id)) ?? nil, let notebook = try? notebookDocument(ref.id) else { continue }
            for meta in notebook.notes(includeTrashed: true) {
                if let wrapped = DSCore.Base64URL.decode(meta.wrappedKey),
                   (try? DSCrypto.unwrapKey(wrapped, with: key, ad: CryptoAD.noteKey(meta.id))) != nil { continue }
                guard let updates = try? store.updates(docId: meta.id), !updates.isEmpty,
                      let wrapped = try? keys.createNoteKey(noteId: meta.id, notebookId: ref.id).wrappedKey else { continue }
                try? notebook.updateNote(id: meta.id, ["wrappedKey": .string(value: wrapped)])
                wrappedKeys.set(noteId: meta.id, notebookId: ref.id, wrapped: wrapped)
                _ = try? noteDocument(meta.id, notebookId: ref.id)
                CoreLibrary.log.error("note \(meta.id, privacy: .public) re-keyed: its key was wrapped by a key the server does not know")
                healed.append(meta.id)
            }
        }
        return healed
    }

    private static let rekeyedNotebooksKey = "repair.notebookStates.v1"

    /// Once per device (build 12): every notebook with a canonical key, for `SyncEngine.rekey` —
    /// what an earlier build sealed with an invented key goes up again readable from this
    /// device's copy. Empty after the first call.
    func takeOneTimeNotebookRekey() -> [String] {
        guard (try? store.string(Self.rekeyedNotebooksKey)) ?? nil == nil else { return [] }
        let ids = account.notebooks().map(\.id).filter(keys.isNotebookKeyVerified)
        guard !ids.isEmpty else { return [] }
        try? store.setString("done", for: Self.rekeyedNotebooksKey)
        return ids
    }

    /// Keys changed (fetched or replaced): the UI re-reads what is readable and writable.
    func notebookKeysChanged() {
        onExternalChange?(loadSnapshot())
    }

    /// Only what first-run seeding writes: no folders, untouched welcome notes, empty Inboxes.
    private func holdsOnlyFirstRunContent(_ local: AccountDocument) -> Bool {
        guard local.spaces().allSatisfy({ LibraryStore.firstRunKey($0.name).hasPrefix("first-run.") }),
              local.notebooks().allSatisfy({ LibraryStore.firstRunKey($0.name) == "first-run.notes" }) else { return false }
        for ref in local.notebooks() {
            guard let notebook = try? NotebookDocument(Self.open(.notebook, docId: ref.id, notebookId: ref.id, store: store)),
                  notebook.folders().isEmpty else { return false }
            for meta in notebook.notes(includeTrashed: true) {
                guard let note = try? NoteDocument(Self.open(.note, docId: meta.id, notebookId: ref.id, store: store)) else { return false }
                let body = NoteBodyCodec.body(from: (try? note.blocks()) ?? [])
                switch meta.kind {
                case .inbox: if body.blocks.contains(where: { !$0.text.isEmpty }) { return false }
                case .note: if meta.isTrashed || !LibraryStore.isFirstRunWelcome(title: meta.title, body: body) { return false }
                case .daily: return false
                }
            }
        }
        return true
    }

    /// Changes waiting to be sent plus notebooks not yet on the server (spec/07, sign-out).
    var unsentChangeCount: Int { (try? store.unsentChangeCount()) ?? 0 }

    /// Removes everything this device holds — documents, keys, pending work — and starts over
    /// with an empty device library (spec/07: «Delete data from this device», and signing in to a
    /// different account after this device was signed out).
    func wipeLocalData() throws {
        notebookDocs.removeAll()
        noteDocs.removeAll()
        subscriptions.removeAll()
        remoteSubscriptions.removeAll()
        notebookIdOfNote.removeAll()
        for record in try store.documents() { try store.deleteDocument(record.docId) }
        pendingMoves = [:]
        needsCarriedMerge = false
        overlay = Overlay()
        try store.setValue(nil, for: Self.overlayKey)
        try keys.clear()
        try keys.setMasterKey(DSCrypto.newKey())
        let accountId = DSCore.EntityID.make()
        account = AccountDocument(try Self.open(.account, docId: accountId, notebookId: nil, store: store))
        subscriptions[accountId] = observe(account.crdt, notebookId: nil)
        remoteSubscriptions[accountId] = observeRemote(account.crdt)
        try account.initialize()
        try store.setString(accountId, for: Self.accountDocKey)
        onExternalChange?(loadSnapshot())
    }

    /// What `POST /notebooks` needs for a notebook of the account whose key this device holds
    /// (one carried in while offline never reached the server).
    func serverNotebook(_ id: String) -> CarriedNotebook? {
        guard let ref = account.notebook(id: id), let master = try? keys.masterKey(),
              let key = try? keys.notebookKey(id),
              let wrapped = try? DSCrypto.wrapKey(key, with: master, ad: CryptoAD.notebookKey(id)) else { return nil }
        return CarriedNotebook(id: id, mode: ref.mode, wrappedKey: wrapped, key: key)
    }

    /// The key a share link carries: the note key or the notebook key (crypto.md §7).
    func shareKey(for target: ShareTarget) throws -> Data? {
        switch target.kind {
        case .notebook:
            return try keys.notebookKey(target.id)
        case .note:
            guard let notebookId = notebookIdOfNote[target.id],
                  let wrapped = wrappedKeys.wrapped(noteId: target.id, notebookId: notebookId) else { return nil }
            return try keys.noteKey(noteId: target.id, wrappedKey: wrapped, notebookId: notebookId)
        }
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
        wrappedKeys.set(noteId: meta.id, notebookId: notebookId, wrapped: meta.wrappedKey)
        guard let note = try? noteDocument(meta.id, notebookId: notebookId) else { return nil }
        let body = NoteBodyCodec.body(from: (try? note.blocks()) ?? [])
        var item = NoteMeta(id: meta.id, notebookId: notebookId, folderId: meta.folderId, parentNoteId: meta.parentNoteId,
                            title: meta.title, kind: NoteKind(rawValue: meta.kind.rawValue) ?? .note,
                            dailyDate: meta.dailyDate, tags: meta.tags, icon: meta.icon,
                            cover: overlay.covers[meta.id],
                            coverImage: note.meta().cover.map { NoteCover(attachmentId: $0.attachmentId, offsetY: $0.offsetY) },
                            coverThumb: meta.coverThumb, backdrop: Self.backdrop(note.meta().backdrop),
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
                let (key, wrapped) = try keys.createNotebookKey(notebookId: notebook.id)
                remote?.notebookCreated(id: notebook.id, mode: notebook.mode, wrappedKey: wrapped, key: key)
            } else if let previous = before[notebook.id], previous.mode != notebook.mode {
                let key = try keys.notebookKey(notebook.id)
                remote?.notebookModeChanged(id: notebook.id, mode: notebook.mode, key: notebook.mode == .agent ? key : nil)
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
            remote?.notebookDeleted(id: notebook.id)
            for note in old.notes where note.notebookId == notebook.id {
                noteDocs[note.id] = nil
                subscriptions[note.id] = nil
                try store.deleteDocument(note.id)
                remote?.documentDeleted(note.id)
            }
            notebookDocs[notebook.id] = nil
            subscriptions[notebook.id] = nil
            try store.deleteDocument(notebook.id)
            remote?.documentDeleted(notebook.id)
        }
    }

    /// `meta.name/icon/space` of the notebook document (agents cannot read the account document).
    /// Name, icon, colour and space copied into the notebook document for agents and the server
    /// (document-model §3); no write when nothing changed.
    private func writeNotebookMeta(_ notebook: Notebook, in snapshot: LibrarySnapshot) throws {
        let space = snapshot.spaces.first { $0.id == notebook.spaceId }
        try notebookDocument(notebook.id).setMetaCopy(.init(
            name: notebook.name, icon: notebook.icon, color: notebook.color.rawValue,
            spaceId: notebook.spaceId, spaceName: space?.name ?? "", spaceIcon: space?.icon))
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
            remote?.documentDeleted(meta.id)
        }
    }

    private func createNote(_ meta: NoteMeta, body: NoteBody, resolve: NoteBodyCodec.LinkResolver) throws {
        let notebook = try notebookDocument(meta.notebookId)
        // Never invent a key for a notebook that exists (new notebooks got theirs in
        // persistNotebooks): one the server does not know seals the notebook for good.
        guard try keys.notebookKey(meta.notebookId) != nil else { throw DSCore.AccountError.missingKey(meta.notebookId) }
        let (_, wrapped) = try keys.createNoteKey(noteId: meta.id, notebookId: meta.notebookId)
        wrappedKeys.set(noteId: meta.id, notebookId: meta.notebookId, wrapped: wrapped)
        let doc = try noteDocument(meta.id, notebookId: meta.notebookId)
        try notebook.putNote(coreMeta(meta, wrappedKey: wrapped))
        try write(body: body, title: meta.title, previous: nil, to: doc, resolve: resolve)
        try writeStyle(meta, doc: doc)
        if meta.coverImage != nil { try writeCover(meta, doc: doc) }
    }

    /// A note moved to another notebook: its key is re-wrapped by the new notebook key.
    private func moveNote(_ meta: NoteMeta, from oldNotebookId: String) throws {
        let source = try notebookDocument(oldNotebookId)
        guard let oldMeta = source.note(id: meta.id) else { return }
        let noteKey = try keys.noteKey(noteId: meta.id, wrappedKey: oldMeta.wrappedKey, notebookId: oldNotebookId)
        guard let targetKey = try keys.notebookKey(meta.notebookId) else { throw DSCore.AccountError.missingKey(meta.notebookId) }
        let wrapped = try DSCrypto.wrapKey(noteKey, with: targetKey, ad: CryptoAD.noteKey(meta.id))
        try source.purgeNote(id: meta.id)
        let encoded = DSCore.Base64URL.encode(wrapped)
        wrappedKeys.set(noteId: meta.id, notebookId: meta.notebookId, wrapped: encoded)
        notebookIdOfNote[meta.id] = meta.notebookId
        try notebookDocument(meta.notebookId).putNote(coreMeta(meta, wrappedKey: encoded))
        _ = try store.ensureDocument(docId: meta.id, kind: .note, notebookId: meta.notebookId)
        // The record follows the note (registration, search, tasks), and the server is told.
        try store.setNotebook(meta.id, notebookId: meta.notebookId)
        pendingMoves[meta.id] = meta.notebookId
        remote?.noteMoved(meta.id, toNotebook: meta.notebookId)
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
        if meta.coverThumb != previous.coverThumb { fields["coverThumb"] = .optionalString(meta.coverThumb) }
        if !fields.isEmpty {
            try notebookDocument(meta.notebookId).updateNote(id: meta.id, fields)
        }
        if meta.style != previous.style || meta.backdrop != previous.backdrop {
            try writeStyle(meta, doc: doc)
        }
        if meta.coverImage != previous.coverImage {
            try writeCover(meta, doc: doc)
        }
    }

    private func writeCover(_ meta: NoteMeta, doc: NoteDocument) throws {
        try doc.setCover(meta.coverImage.map { NoteMetaContent.Cover(attachmentId: $0.attachmentId, offsetY: $0.offsetY) })
    }

    private func writeStyle(_ meta: NoteMeta, doc: NoteDocument) throws {
        try doc.setStyle(NoteMetaContent.Style(font: meta.style.font.rawValue, width: meta.style.width.rawValue,
                                               paper: meta.style.paper.rawValue))
        try doc.setBackdrop(meta.backdrop == .none ? nil : NoteMetaContent.Backdrop(kind: .gradient, value: meta.backdrop.rawValue))
    }

    private func coreMeta(_ meta: NoteMeta, wrappedKey: String) -> DSCore.NoteMeta {
        DSCore.NoteMeta(id: meta.id, folderId: meta.folderId, parentNoteId: meta.parentNoteId, title: meta.title,
                        kind: DSCore.NoteKind(rawValue: meta.kind.rawValue) ?? .note, dailyDate: meta.dailyDate,
                        tags: meta.tags, icon: meta.icon, coverThumb: meta.coverThumb, wrappedKey: wrappedKey,
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
