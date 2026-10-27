import Foundation

/// Sharing notebooks and notes with other accounts (D-54, crypto.md §10, api.md «Совместный
/// доступ по аккаунтам»). The server never sees a key: the owner wraps it for each member with
/// the two accounts' box keys; access changes rotate it.
extension AccountService {
    var signedInUserId: String {
        get async throws {
            guard let id = await api.currentSession?.userId else { throw SharingError.notSignedIn }
            return id
        }
    }

    // MARK: Account key pair (crypto.md §10.1)

    /// Loads this account's box key pair, or creates and publishes it (accounts from before
    /// D-54, `PUT /me/box-key` once). The secret key must match the published public key.
    /// Returns the public key. Called on sign-up and sign-in; safe to call again.
    @discardableResult
    public func ensureBoxKeyPair() async throws -> Data {
        let userId = try await signedInUserId
        guard let master = try keys.masterKey() else { throw SharingError.notSignedIn }
        if let record = try await api.boxKey() {
            let secretKey = try DSCrypto.unwrapBoxSecretKey(record.wrappedSecretKey.data, masterKey: master, userId: userId, publicKey: record.publicKey.data)
            try keys.setBoxSecretKey(secretKey)
            return record.publicKey.data
        }
        let pair = try DSCrypto.newBoxKeyPair()
        let wrapped = try DSCrypto.wrapBoxSecretKey(pair.secretKey, masterKey: master, userId: userId)
        do {
            try await api.putBoxKey(BoxKeyRecord(publicKey: pair.publicKey, wrappedSecretKey: wrapped))
        } catch APIError.server(409, _, _) {
            // Another device published one first: use that.
            guard let record = try await api.boxKey() else { throw SharingError.noBoxKey }
            let secretKey = try DSCrypto.unwrapBoxSecretKey(record.wrappedSecretKey.data, masterKey: master, userId: userId, publicKey: record.publicKey.data)
            try keys.setBoxSecretKey(secretKey)
            return record.publicKey.data
        }
        try keys.setBoxSecretKey(pair.secretKey)
        return pair.publicKey
    }

    // MARK: Owner

    /// Invites `email` to a notebook or note this account owns. The answer is the same whether
    /// or not an account has this email. Returns the invitation id (for the
    /// `https://<web-host>/invite/<id>` link).
    @discardableResult
    public func invite(_ email: String, role: MemberRole, to target: SharingTarget) async throws -> String {
        let id = EntityID.make()
        try await api.invite(CreateInvitationRequest(invitationId: id, target: target, email: email, role: role))
        return id
    }

    /// The owner's current key of a shared notebook and its version.
    public func ownerKey(notebookId: String) throws -> (key: Data, version: Int) {
        guard let key = try keys.notebookKey(notebookId) else { throw AccountError.missingKey(notebookId) }
        return (key, keys.notebookKeyVersion(notebookId))
    }

    /// The owner's current key of a note (from its `NoteMeta`) and its version.
    public func ownerKey(note meta: NoteMeta, notebookId: String) throws -> (key: Data, version: Int) {
        (try keys.noteKey(meta, notebookId: notebookId), meta.keyVersion)
    }

    /// Gives the current key to members who accepted and wait for it (`awaiting_key`), wrapped
    /// for each with this account's and the member's box keys (crypto.md §10.2). A member whose
    /// account was created after the invitation gets it only once the owner confirmed it
    /// (`confirmed`, D-54); those are returned for the «… зарегистрировалась — открыть
    /// доступ?» prompt. Call when online and after an invitation is accepted.
    @discardableResult
    public func grantPendingKeys(to target: SharingTarget, key: Data, version: Int, confirmed: Set<String> = []) async throws -> [Member] {
        let me = try await signedInUserId
        guard let secretKey = try keys.boxSecretKey() else { throw SharingError.noBoxKey }
        var needConfirmation: [Member] = []
        for member in try await api.members(of: target) where member.status == .awaitingKey && member.userId != me {
            if member.accountCreatedAfterInvite, !confirmed.contains(member.userId) {
                needConfirmation.append(member)
                continue
            }
            let publicKey = try await api.publicKey(userId: member.userId)
            let ref = MemberKeyRef(kind: target.kind, targetId: target.id, version: version, fromUserId: me, toUserId: member.userId)
            let wrapped = try DSCrypto.wrapKeyForMember(key, ownerSecretKey: secretKey, memberPublicKey: publicKey, ref: ref)
            do {
                try await api.putMemberKey(PutMemberKeyRequest(version: version, wrappedKey: wrapped), userId: member.userId, in: target)
            } catch APIError.server(409, _, _) {
                throw SharingError.versionMismatch(local: version, server: -1)
            }
        }
        return needConfirmation
    }

    /// Wraps `key` for the active members of `target` (rotation, api.md): members still
    /// waiting for a key get the new version through `grantPendingKeys` — after the owner's
    /// confirmation where needed — never through a rotation.
    func memberKeys(for target: SharingTarget, key: Data, version: Int) async throws -> [MemberKey] {
        let me = try await signedInUserId
        guard let secretKey = try keys.boxSecretKey() else { throw SharingError.noBoxKey }
        var result: [MemberKey] = []
        for member in try await api.members(of: target) where member.userId != me && member.status == .active {
            let publicKey = try await api.publicKey(userId: member.userId)
            let ref = MemberKeyRef(kind: target.kind, targetId: target.id, version: version, fromUserId: me, toUserId: member.userId)
            result.append(MemberKey(userId: member.userId, wrappedKey: try DSCrypto.wrapKeyForMember(key, ownerSecretKey: secretKey, memberPublicKey: publicKey, ref: ref)))
        }
        return result
    }

    static func rotationMarker(_ kind: ShareTargetKind, _ id: String) -> String { "sharing.rotated.\(kind.rawValue).\(id)" }

    /// Changes a shared notebook's key after someone lost access (crypto.md §10.3, steps 1–2):
    /// a new key `v+1` for the owner, every member and the chain in one `rotate` request, then a
    /// new key for every note, written to the index (it syncs with the new notebook key). Call
    /// `finishNotebookRotation` once the index is acknowledged. `agentMode`: the notebook is in
    /// agent mode (the server gets the new key, crypto.md §8).
    public func rotateNotebookKey(_ notebook: NotebookDocument, agentMode: Bool = false) async throws {
        let id = notebook.notebookId
        let target = SharingTarget(kind: .notebook, id: id)
        guard let master = try keys.masterKey() else { throw SharingError.notSignedIn }
        try await adoptServerNotebookKey(id)
        let (oldKey, version) = try ownerKey(notebookId: id)
        let newKey = DSCrypto.newKey()
        let next = version + 1
        let request = RotateKeyRequest(
            version: next,
            ownerWrappedKey: try DSCrypto.wrapKey(newKey, with: master, ad: CryptoAD.targetKey(.notebook, id, version: next)),
            previousKeyWrap: try DSCrypto.wrapPreviousKey(oldKey, with: newKey, kind: .notebook, targetId: id, version: next),
            memberKeys: try await memberKeys(for: target, key: newKey, version: next),
            notebookKey: agentMode ? newKey : nil)
        try await api.rotateKey(request, of: target)
        try keys.adoptNotebookKey(newKey, version: next, olderKeys: [oldKey], notebookId: id)
        try store.setString(String(next), for: Self.rotationMarker(.notebook, id))
        try rekeyNotes(in: notebook)
    }

    /// Takes the server's notebook key when it is newer than this device's (a rotation made on
    /// another device, or one interrupted after `rotate` succeeded).
    func adoptServerNotebookKey(_ notebookId: String) async throws {
        let state = try await api.notebookKeyState(id: notebookId)
        let serverVersion = state.version ?? 1
        let haveKey = try keys.notebookKey(notebookId) != nil
        guard serverVersion > keys.notebookKeyVersion(notebookId) || !haveKey else { return }
        try keys.addNotebookKey(wrapped: state.wrappedKey.data, notebookId: notebookId, version: serverVersion, chain: state.keyChain?.map(\.data) ?? [])
    }

    /// Step 2: every note still wrapped under an earlier notebook key gets a new note key
    /// (`keyVersion + 1`, chain link), wrapped under the current notebook key. Returns how many.
    @discardableResult
    public func rekeyNotes(in notebook: NotebookDocument) throws -> Int {
        let id = notebook.notebookId
        guard let nbKey = try keys.notebookKey(id) else { throw AccountError.missingKey(id) }
        var count = 0
        for meta in notebook.notes(includeTrashed: true) {
            guard let wrapped = Base64URL.decode(meta.wrappedKey),
                  (try? DSCrypto.unwrapKey(wrapped, with: nbKey, ad: meta.wrappedKeyAD)) == nil,
                  let oldKey = try? keys.noteKey(meta, notebookId: id) else { continue }
            let newKey = DSCrypto.newKey()
            let next = meta.keyVersion + 1
            let link = try DSCrypto.wrapPreviousKey(oldKey, with: newKey, kind: .note, targetId: meta.id, version: next)
            let newWrapped = try DSCrypto.wrapKey(newKey, with: nbKey, ad: CryptoAD.targetKey(.note, meta.id, version: next))
            try notebook.updateNote(id: meta.id, [
                "wrappedKey": .string(value: Base64URL.encode(newWrapped)),
                "keyVersion": .number(value: Double(next)),
                "keyChain": .list(items: ([Base64URL.encode(link)] + meta.keyChain).map { .string(value: $0) }),
            ])
            count += 1
        }
        return count
    }

    /// Step 3: once every note has its new key and the index is acknowledged (nothing of it
    /// waits in the outbox), clears `keyRotationPending`. Returns false while not yet.
    @discardableResult
    public func finishNotebookRotation(_ notebook: NotebookDocument) async throws -> Bool {
        let id = notebook.notebookId
        guard let nbKey = try keys.notebookKey(id) else { throw AccountError.missingKey(id) }
        let allRekeyed = notebook.notes(includeTrashed: true).allSatisfy { meta in
            Base64URL.decode(meta.wrappedKey).map { (try? DSCrypto.unwrapKey($0, with: nbKey, ad: meta.wrappedKeyAD)) != nil } ?? true
        }
        guard allRekeyed, try store.pendingOutbox(docId: id).isEmpty else { return false }
        try await api.rotationDone(notebookId: id)
        try store.setString(nil, for: Self.rotationMarker(.notebook, id))
        return true
    }

    /// On start, for each notebook this account shares: a pending rotation (someone left or was
    /// removed) is done or finished — `rotate` if it was not made yet, otherwise the notes still
    /// on old keys get theirs. Returns notebooks whose rotation waits for the index to sync
    /// (`finishNotebookRotation` after that).
    public func resumeNotebookRotation(_ notebook: NotebookDocument, agentMode: Bool = false) async throws -> Bool {
        let id = notebook.notebookId
        let state = try await api.notebookKeyState(id: id)
        guard state.keyRotationPending == true else { return false }
        try await adoptServerNotebookKey(id)
        let rotatedTo = try store.string(Self.rotationMarker(.notebook, id)).flatMap(Int.init)
        if rotatedTo != (state.version ?? 1) {
            // Pending since an access change, not rotated yet (from this device's view).
            try await rotateNotebookKey(notebook, agentMode: agentMode)
        } else {
            try rekeyNotes(in: notebook)
        }
        return true
    }

    /// A note shared on its own: new key `v+1` for the owner, members and chain in one request
    /// (it also clears `keyRotationPending`), then the new `NoteMeta` key fields in the owner's
    /// notebook index.
    public func rotateNoteKey(_ noteId: String, in notebook: NotebookDocument) async throws {
        guard var meta = notebook.note(id: noteId) else { throw DocumentError.notFound("note \(noteId)") }
        try await syncSharedNoteMeta(noteId, in: notebook)
        meta = notebook.note(id: noteId) ?? meta
        guard let nbKey = try keys.notebookKey(notebook.notebookId) else { throw AccountError.missingKey(notebook.notebookId) }
        let oldKey = try keys.noteKey(meta, notebookId: notebook.notebookId)
        let newKey = DSCrypto.newKey()
        let next = meta.keyVersion + 1
        let ownerWrapped = try DSCrypto.wrapKey(newKey, with: nbKey, ad: CryptoAD.targetKey(.note, noteId, version: next))
        let link = try DSCrypto.wrapPreviousKey(oldKey, with: newKey, kind: .note, targetId: noteId, version: next)
        let target = SharingTarget(kind: .note, id: noteId)
        try await api.rotateKey(RotateKeyRequest(version: next, ownerWrappedKey: ownerWrapped, previousKeyWrap: link,
                                                 memberKeys: try await memberKeys(for: target, key: newKey, version: next)), of: target)
        try notebook.updateNote(id: noteId, [
            "wrappedKey": .string(value: Base64URL.encode(ownerWrapped)),
            "keyVersion": .number(value: Double(next)),
            "keyChain": .list(items: ([Base64URL.encode(link)] + meta.keyChain).map { .string(value: $0) }),
        ])
    }

    /// The owner's `NoteMeta` of a note shared on its own catches up with the server's key (a
    /// rotation interrupted before the index was written, `GET /members/note/:id/key`).
    public func syncSharedNoteMeta(_ noteId: String, in notebook: NotebookDocument) async throws {
        guard let meta = notebook.note(id: noteId) else { return }
        let state = try await api.sharedNoteKey(noteId: noteId)
        guard state.version > meta.keyVersion else { return }
        try notebook.updateNote(id: noteId, [
            "wrappedKey": .string(value: Base64URL.encode(state.ownerWrappedKey.data)),
            "keyVersion": .number(value: Double(state.version)),
            "keyChain": .list(items: state.keyChain.map { .string(value: Base64URL.encode($0.data)) }),
        ])
    }

    // MARK: Member

    /// Accepts an invitation; takes the key if the owner already gave it and registers the
    /// shared documents for syncing.
    public func acceptInvitation(id: String) async throws -> SharedItem {
        let item = try await api.acceptInvitation(id: id)
        _ = try await adoptShared(item)
        return item
    }

    /// `GET /shared-with-me`: takes every key the owners have given (or changed) and registers
    /// the shared documents for syncing. Items without a key yet are returned too (the owner's
    /// client gives it when online); call again later. Returns the items.
    public func refreshSharedWithMe() async throws -> [SharedItem] {
        let items = try await api.sharedWithMe()
        for item in items { _ = try? await adoptShared(item) }
        return items
    }

    /// Whether the item's key is now on this device.
    func adoptShared(_ item: SharedItem) async throws -> Bool {
        let me = try await signedInUserId
        guard try keys.adoptSharedItem(item, memberUserId: me) else { return false }
        let notebookId = item.target.kind == .notebook ? item.target.id : nil
        for docId in item.docIds {
            if item.target.kind == .notebook, docId == item.target.id {
                try store.ensureDocument(docId: docId, kind: .notebook, notebookId: docId)
            } else {
                try store.ensureDocument(docId: docId, kind: .note, notebookId: notebookId)
            }
        }
        return true
    }

    /// Leaves a notebook or note shared with this account («Выйти»). Its documents stay on
    /// this device until the app removes them.
    public func leave(_ target: SharingTarget) async throws {
        try await api.removeMember(userId: try await signedInUserId, from: target)
        if target.kind == .note { try keys.forgetSharedNote(target.id) }
    }

    /// Safety code with another account (crypto.md §10.5, optional).
    public func safetyCode(with userId: String, publicKey: Data) async throws -> String {
        let me = try await signedInUserId
        guard let secretKey = try keys.boxSecretKey() else { throw SharingError.noBoxKey }
        return try DSCrypto.safetyCode((me, try DSCrypto.boxPublicKey(of: secretKey)), (userId, publicKey))
    }
}
