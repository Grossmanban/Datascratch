import Foundation

/// Shared spaces (D-62, crypto.md §11, api.md «Общие пространства»). A space key sits between
/// the account keys and the keys of the space's notebooks: the owner keeps it under the master
/// key, members get it wrapped like any shared key (§10.2), and every notebook key of the space
/// is wrapped by it — so one grant gives a member every notebook, including later ones.
extension AccountService {
    public func spaceTarget(_ spaceId: String) -> SharingTarget { SharingTarget(kind: .space, id: spaceId) }

    /// The current space key and version on this device (owner or member).
    public func ownerKey(spaceId: String) throws -> (key: Data, version: Int) {
        guard let key = try keys.spaceKey(spaceId) else { throw SharingError.noSpaceKey(spaceId: spaceId) }
        return (key, keys.spaceKeyVersion(spaceId))
    }

    // MARK: Owner: make a space shared

    /// Makes one of this account's spaces shared (owner, api.md `POST /spaces`): a new space key
    /// under the master key, the space document (its name, icon and colour from the account's
    /// `Space`; its notebooks moved there from the account document, each notebook key now
    /// under the space key), `Space.shared = true`. Returns the space document (open it in the
    /// sync engine: it is registered on its first sync). A notebook with its own members (D-54)
    /// cannot move in (`409`): it stays a personal notebook and is returned in `kept`.
    public func shareSpace(_ spaceId: String, in account: AccountDocument) async throws -> (document: SpaceDocument, kept: [String]) {
        guard let space = account.spaces().first(where: { $0.id == spaceId }) else { throw DocumentError.notFound("space \(spaceId)") }
        guard let master = try keys.masterKey() else { throw SharingError.notSignedIn }
        if try keys.spaceKey(spaceId) == nil {
            let key = DSCrypto.newKey()
            let wrapped = try DSCrypto.wrapKey(key, with: master, ad: CryptoAD.targetKey(.space, spaceId, version: 1))
            do {
                _ = try await api.createSharedSpace(id: spaceId, wrappedKey: wrapped)
                try keys.adoptSpaceKey(key, version: 1, olderKeys: [], spaceId: spaceId)
            } catch APIError.server(409, _, _) {
                // Shared already (another device of the owner): its key is on the server.
                try await adoptOwnerSpaceKey(spaceId)
            }
        }
        try store.ensureDocument(docId: spaceId, kind: .space, notebookId: nil)
        let document = SpaceDocument(spaceId: spaceId)
        if document.name.isEmpty { try document.initialize(from: space) }
        var kept: [String] = []
        for ref in account.notebooks(inSpace: spaceId) {
            do {
                try await moveNotebookIntoSpace(ref.id, space: document, account: account)
            } catch APIError.server(409, _, _) {
                kept.append(ref.id)
            }
        }
        try account.updateSpace(id: spaceId, ["shared": .bool(value: true)])
        return (document, kept)
    }

    /// The owner moves a personal notebook into a shared space (crypto.md §11.3): its current key
    /// wrapped by the space key replaces the master-key wrap. Members then see its whole history.
    public func moveNotebookIntoSpace(_ notebookId: String, space: SpaceDocument, account: AccountDocument) async throws {
        let spaceId = space.spaceId
        let (spaceKey, _) = try ownerKey(spaceId: spaceId)
        let (key, version) = try ownerKey(notebookId: notebookId)
        let wrapped = try DSCrypto.wrapKey(key, with: spaceKey, ad: CryptoAD.spaceNotebookKey(spaceId: spaceId, notebookId: notebookId, version: version))
        try await api.moveNotebookIntoSpace(SpaceNotebookKeyRequest(version: version, spaceWrappedKey: wrapped), notebookId: notebookId, spaceId: spaceId)
        try keys.addSpaceNotebookKey(spaceWrapped: wrapped, spaceId: spaceId, notebookId: notebookId, version: version, chain: [])
        if let ref = account.notebook(id: notebookId) {
            var moved = ref
            moved.spaceId = spaceId
            try space.putNotebook(moved)
            try account.deleteNotebook(id: notebookId)
        }
    }

    /// The owner moves a notebook out of a shared space into one of its personal spaces
    /// (crypto.md §11.3): a new notebook key under the master key in one `move-out` request,
    /// then the notes get new keys (`rekeyNotes`); call `finishNotebookRotation` once the index
    /// is acknowledged, as for any rotation. `agentMode`: the server gets the new key (§8).
    public func moveNotebookOutOfSpace(_ notebook: NotebookDocument, space: SpaceDocument, to personalSpaceId: String,
                                       account: AccountDocument, agentMode: Bool = false) async throws {
        let id = notebook.notebookId
        guard let master = try keys.masterKey() else { throw SharingError.notSignedIn }
        let (oldKey, version) = try ownerKey(notebookId: id)
        let newKey = DSCrypto.newKey()
        let next = version + 1
        try await api.moveNotebookOutOfSpace(MoveOutRequest(
            version: next,
            ownerWrappedKey: try DSCrypto.wrapKey(newKey, with: master, ad: CryptoAD.targetKey(.notebook, id, version: next)),
            previousKeyWrap: try DSCrypto.wrapPreviousKey(oldKey, with: newKey, kind: .notebook, targetId: id, version: next),
            notebookKey: agentMode ? newKey : nil), notebookId: id, spaceId: space.spaceId)
        try keys.adoptNotebookKey(newKey, version: next, olderKeys: [oldKey], notebookId: id)
        try keys.forgetNotebookSpace(id)
        recordKeyVersion(SharingTarget(kind: .notebook, id: id), next)
        if var ref = space.notebook(id: id) {
            ref.spaceId = personalSpaceId
            try account.putNotebook(ref)
            try space.deleteNotebook(id: id)
        }
        try rekeyNotes(in: notebook)
    }

    // MARK: Notebooks of a shared space

    /// A notebook in a shared space (owner or editor, crypto.md §11.2): key version 1 under the
    /// space key, `POST /notebooks` with `spaceId`, the index registered, the `NotebookRef` in
    /// the space document. The notebook belongs to the space's owner.
    public func createNotebook(name: String, in space: SpaceDocument, mode: NotebookMode = .private, icon: String? = nil, color: String? = nil,
                               order: Double) async throws -> NotebookDocument {
        let spaceId = space.spaceId
        let (spaceKey, _) = try ownerKey(spaceId: spaceId)
        let id = EntityID.make()
        let key = DSCrypto.newKey()
        let wrapped = try DSCrypto.wrapKey(key, with: spaceKey, ad: CryptoAD.spaceNotebookKey(spaceId: spaceId, notebookId: id, version: 1))
        _ = try await api.createNotebook(id: id, mode: mode, wrappedKey: wrapped, notebookKey: mode == .agent ? key : nil, spaceId: spaceId)
        try keys.addSpaceNotebookKey(spaceWrapped: wrapped, spaceId: spaceId, notebookId: id, version: 1, chain: [])
        keys.markNotebookKeyVerified(id)
        try await api.registerDoc(docId: id, kind: .notebook, notebookId: id)
        try store.ensureDocument(docId: id, kind: .notebook, notebookId: id)
        try store.setRegistered(id)
        let notebook = NotebookDocument(notebookId: id)
        try notebook.initialize()
        let ref = NotebookRef(id: id, spaceId: spaceId, name: name, icon: icon, color: color, order: order, mode: mode)
        try space.putNotebook(ref)
        try refreshNotebookMeta(notebook, in: space)
        return notebook
    }

    /// `meta` copy of a notebook of a shared space: names from the space document.
    public nonisolated func refreshNotebookMeta(_ notebook: NotebookDocument, in space: SpaceDocument) throws {
        guard let ref = space.notebook(id: notebook.notebookId) else { return }
        try notebook.setMetaCopy(.init(ref, space: Space(id: space.spaceId, name: space.name, icon: space.icon, color: space.color, order: 0, shared: true)))
    }

    /// Takes the keys of the space's notebooks (`GET /spaces/:id/notebooks`, under the space key)
    /// and registers their indexes for syncing — never a notebook key older than this account
    /// has used. Notes are registered from the indexes, as for any notebook. Returns the
    /// notebooks on the server (a `NotebookRef` not among them is not shown).
    @discardableResult
    public func loadSpaceNotebookKeys(_ spaceId: String) async throws -> [SpaceNotebook] {
        let notebooks = try await api.spaceNotebooks(id: spaceId)
        for nb in notebooks {
            let target = SharingTarget(kind: .notebook, id: nb.notebookId)
            guard nb.version >= knownKeyVersion(target) else { continue }
            let haveCurrent = try keys.notebookKey(nb.notebookId) != nil && keys.notebookKeyVersion(nb.notebookId) == nb.version
                && keys.spaceOfNotebook(nb.notebookId) == spaceId
            if !haveCurrent {
                try keys.addSpaceNotebookKey(spaceWrapped: nb.spaceWrappedKey.data, spaceId: spaceId, notebookId: nb.notebookId,
                                             version: nb.version, chain: nb.keyChain.map(\.data))
            }
            recordKeyVersion(target, nb.version)
            try store.ensureDocument(docId: nb.notebookId, kind: .notebook, notebookId: nb.notebookId)
        }
        return notebooks
    }

    /// The owner's space key from the server (another device of the owner made the space shared
    /// or rotated it) — never an older version than this account has used.
    func adoptOwnerSpaceKey(_ spaceId: String) async throws {
        let state = try await api.spaceKeyState(id: spaceId)
        let target = spaceTarget(spaceId)
        let haveKey = try keys.spaceKey(spaceId) != nil
        guard state.version > keys.spaceKeyVersion(spaceId) || !haveKey else { return }
        let known = knownKeyVersion(target)
        guard state.version >= known else { throw SharingError.olderKey(version: state.version, known: known) }
        try keys.addSpaceKey(wrapped: state.wrappedKey.data, spaceId: spaceId, version: state.version, chain: state.keyChain.map(\.data))
        recordKeyVersion(target, state.version)
    }

    /// On start: the shared spaces of this account — owned ones (key from `GET /spaces/:id/key`)
    /// and ones it is a member of with a key (from «Shared with me») — get their notebook keys,
    /// and the space documents are registered for syncing. Returns the spaces.
    @discardableResult
    public func refreshSharedSpaces() async throws -> [SharedSpace] {
        let me = try await signedInUserId
        let spaces = try await api.sharedSpaces()
        for space in spaces {
            if space.ownerUserId == me { try await adoptOwnerSpaceKey(space.id) }
            guard try keys.spaceKey(space.id) != nil else { continue }
            try store.ensureDocument(docId: space.id, kind: .space, notebookId: nil)
            try await loadSpaceNotebookKeys(space.id)
        }
        return spaces
    }

    /// A member's placement of the shared spaces it has (`sharedSpaces` of the account
    /// document): new ones added after the existing, ones no longer in «Shared with me» removed.
    /// Returns the removed space ids (the app also drops their tabs, starred items and local data).
    @discardableResult
    public nonisolated func placeSharedSpaces(_ items: [SharedItem], in account: AccountDocument) throws -> [String] {
        let current = Set(items.filter { $0.target.kind == .space }.map(\.target.id))
        let placed = account.sharedSpaces()
        var order = (placed.map(\.order).max() ?? 0)
        for id in current where !placed.contains(where: { $0.id == id }) {
            order += 1
            try account.putSharedSpace(SharedSpaceRef(id: id, order: order))
        }
        let removed = placed.map(\.id).filter { !current.contains($0) }
        for id in removed { try account.removeSharedSpace(id: id) }
        return removed
    }

    // MARK: Owner: space key rotation (crypto.md §11.4)

    /// After a member left or was removed: a new space key `v+1` for the owner, the active members
    /// (known to the `TrustRecord`, or `confirmed`) and the chain, and for every notebook of the
    /// space a new key under it with its chain link (agent-mode notebooks: the key for the
    /// server) — one request. Then the notes of the given notebooks get new keys; call
    /// `finishSpaceRotation` once their indexes are acknowledged.
    public func rotateSpaceKey(_ spaceId: String, notebooks: [NotebookDocument], confirmed: [String: String] = [:]) async throws {
        guard let master = try keys.masterKey() else { throw SharingError.notSignedIn }
        try await adoptOwnerSpaceKey(spaceId)
        try await loadSpaceNotebookKeys(spaceId)
        let (oldSpaceKey, version) = try ownerKey(spaceId: spaceId)
        let newSpaceKey = DSCrypto.newKey()
        let next = version + 1
        let target = spaceTarget(spaceId)
        let members = try await memberKeys(for: target, key: newSpaceKey, version: next, confirmed: confirmed)
        var rotated: [(id: String, key: Data, version: Int, old: Data)] = []
        var entries: [RotateSpaceNotebook] = []
        for nb in try await api.spaceNotebooks(id: spaceId) {
            let (oldKey, nbVersion) = try ownerKey(notebookId: nb.notebookId)
            let newKey = DSCrypto.newKey()
            let nbNext = nbVersion + 1
            entries.append(RotateSpaceNotebook(
                notebookId: nb.notebookId, version: nbNext,
                spaceWrappedKey: try DSCrypto.wrapKey(newKey, with: newSpaceKey, ad: CryptoAD.spaceNotebookKey(spaceId: spaceId, notebookId: nb.notebookId, version: nbNext)),
                previousKeyWrap: try DSCrypto.wrapPreviousKey(oldKey, with: newKey, kind: .notebook, targetId: nb.notebookId, version: nbNext),
                notebookKey: nb.mode == .agent ? newKey : nil))
            rotated.append((nb.notebookId, newKey, nbNext, oldKey))
        }
        try await api.rotateSpaceKey(RotateSpaceRequest(
            version: next,
            ownerWrappedKey: try DSCrypto.wrapKey(newSpaceKey, with: master, ad: CryptoAD.targetKey(.space, spaceId, version: next)),
            previousKeyWrap: try DSCrypto.wrapPreviousKey(oldSpaceKey, with: newSpaceKey, kind: .space, targetId: spaceId, version: next),
            memberKeys: members.keys, notebooks: entries), spaceId: spaceId)
        try keys.adoptSpaceKey(newSpaceKey, version: next, olderKeys: [oldSpaceKey], spaceId: spaceId)
        recordRotation(target, version: next, publicKeys: members.publicKeys)
        for r in rotated {
            try keys.adoptNotebookKey(r.key, version: r.version, olderKeys: [r.old], notebookId: r.id)
            recordKeyVersion(SharingTarget(kind: .notebook, id: r.id), r.version)
        }
        for notebook in notebooks { try rekeyNotes(in: notebook) }
    }

    /// Step 3: once every note of every notebook of the space has its new key and the indexes
    /// are acknowledged, clears `keyRotationPending`. `notebooks`: all notebooks of the space.
    /// Returns false while not yet.
    @discardableResult
    public func finishSpaceRotation(_ spaceId: String, notebooks: [NotebookDocument]) async throws -> Bool {
        for notebook in notebooks {
            guard try notesNeedingNewKeys(in: notebook).isEmpty, try store.pendingOutbox(docId: notebook.notebookId).isEmpty else { return false }
        }
        try await api.spaceRotationDone(spaceId: spaceId)
        return true
    }

    /// On start, for each shared space this account owns: a pending rotation is made or
    /// finished from any of the owner's devices — `version == pendingSinceVersion`: `rotate`;
    /// higher: only the notes remain. Older servers: rotated if a note is still under an
    /// earlier notebook key. Returns whether a rotation is under way.
    public func resumeSpaceRotation(_ spaceId: String, notebooks: [NotebookDocument], confirmed: [String: String] = [:]) async throws -> Bool {
        let state = try await api.spaceKeyState(id: spaceId)
        guard state.keyRotationPending else { return false }
        try await adoptOwnerSpaceKey(spaceId)
        try await loadSpaceNotebookKeys(spaceId)
        let rotated: Bool
        if let since = state.pendingSinceVersion {
            rotated = state.version > since
        } else {
            rotated = try notebooks.contains { try !notesNeedingNewKeys(in: $0).isEmpty }
        }
        if rotated {
            for notebook in notebooks { try rekeyNotes(in: notebook) }
        } else {
            try await rotateSpaceKey(spaceId, notebooks: notebooks, confirmed: confirmed)
        }
        return true
    }
}
