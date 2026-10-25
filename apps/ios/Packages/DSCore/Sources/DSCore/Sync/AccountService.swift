import Foundation

public enum AccountError: Error, Equatable {
    case notSignedIn
    case missingKey(String)
}

/// High-level account flows over `APIClient`, `KeyRing` and the documents (D-34, crypto.md,
/// api.md): sign-up, sign-in, recovery, password change, sign-out, creating notebooks and
/// notes with their keys. Slow steps (Argon2id) run off the caller's actor.
public actor AccountService {
    public nonisolated let api: APIClient
    public nonisolated let keys: KeyRing
    public nonisolated let store: LocalStore

    public init(api: APIClient, keys: KeyRing, store: LocalStore) {
        self.api = api
        self.keys = keys
        self.store = store
    }

    // MARK: Sign-up / sign-in

    public struct SignupResult: Sendable {
        public var session: AuthSession
        /// Show once and ask the user to keep it (`DS1-…`).
        public var recoveryKeyText: String
        public var account: AccountDocument
    }

    /// Creates the account: keys, `POST /auth/signup`, an initialized account document.
    public func signup(email: String, password: String) async throws -> SignupResult {
        let userId = EntityID.make()
        let accountDocId = EntityID.make()
        let material = try await Task.detached { try SignupMaterial.make(password: password, userId: userId) }.value
        let session = try await api.signup(email: email, material: material, userId: userId, accountDocId: accountDocId)
        try keys.setMasterKey(material.masterKey)
        let account = AccountDocument(accountDocId: accountDocId)
        try account.initialize()
        try store.ensureDocument(docId: accountDocId, kind: .account, notebookId: nil)
        return SignupResult(session: session, recoveryKeyText: material.recoveryKeyText, account: account)
    }

    /// `prelogin` → Argon2id → `login` → unwraps and stores the master key.
    @discardableResult
    public func login(email: String, password: String, deviceName: String) async throws -> AuthSession {
        let pre = try await api.prelogin(email: email)
        let derived = try await Task.detached { try DSCrypto.deriveKeys(password: password, salt: pre.salt.data, params: pre.kdf) }.value
        let session = try await api.login(email: email, loginKey: derived.loginKey, deviceName: deviceName)
        try keys.unlock(wrappedMasterKey: session.wrappedMasterKeyPassword.data, passwordKey: derived.passwordKey, userId: session.userId)
        try store.ensureDocument(docId: session.accountDocId, kind: .account, notebookId: nil)
        return session
    }

    /// Forgot password: proves the recovery key, sets a new password; data is not re-encrypted.
    @discardableResult
    public func recover(email: String, recoveryKeyText: String, newPassword: String) async throws -> AuthSession {
        let recoveryKey = try RecoveryKeyFormat.parse(recoveryKeyText)
        let start = try await api.recoveryStart(email: email, recoveryLoginKey: try DSCrypto.recoveryLoginKey(recoveryKey))
        let master = try DSCrypto.unwrapKey(start.wrappedMasterKeyRecovery.data, with: recoveryKey, ad: CryptoAD.masterByRecovery(userId: start.userId))
        let material = try await Task.detached { try PasswordChangeMaterial.make(newPassword: newPassword, masterKey: master, userId: start.userId) }.value
        let session = try await api.recoveryFinish(recoveryToken: start.recoveryToken, material: material)
        try keys.setMasterKey(master)
        return session
    }

    public func changePassword(email: String, currentPassword: String, newPassword: String) async throws {
        guard let session = await api.currentSession, let master = try keys.masterKey() else { throw AccountError.notSignedIn }
        let pre = try await api.prelogin(email: email)
        let current = try await Task.detached { try DSCrypto.deriveKeys(password: currentPassword, salt: pre.salt.data, params: pre.kdf) }.value
        let material = try await Task.detached { try PasswordChangeMaterial.make(newPassword: newPassword, masterKey: master, userId: session.userId) }.value
        try await api.changePassword(currentLoginKey: current.loginKey, material: material)
    }

    /// Signs out and forgets all keys on this device.
    public func logout() async throws {
        try await api.logout()
        try keys.clear()
    }

    // MARK: Notebooks and notes

    /// Creates a notebook: key (wrapped by the master key), `POST /notebooks`, `POST /docs`,
    /// an initialized notebook document and its `NotebookRef` in the account document.
    public func createNotebook(name: String, spaceId: String, mode: NotebookMode = .private, icon: String? = nil, color: String? = nil,
                               order: Double, in account: AccountDocument) async throws -> NotebookDocument {
        let id = EntityID.make()
        let (key, wrapped) = try keys.createNotebookKey(notebookId: id)
        _ = try await api.createNotebook(id: id, mode: mode, wrappedKey: wrapped, notebookKey: mode == .agent ? key : nil)
        try await api.registerDoc(docId: id, kind: .notebook, notebookId: id)
        try store.ensureDocument(docId: id, kind: .notebook, notebookId: id)
        try store.setRegistered(id)
        let notebook = NotebookDocument(notebookId: id)
        try notebook.initialize()
        try account.putNotebook(NotebookRef(id: id, spaceId: spaceId, name: name, icon: icon, color: color, order: order, mode: mode))
        return notebook
    }

    /// Unwraps the keys of all notebooks of the account (after sign-in on a new device).
    public func loadNotebookKeys() async throws {
        for nb in try await api.notebooks() {
            try keys.addNotebookKey(wrapped: nb.wrappedKey.data, notebookId: nb.id)
        }
    }

    /// Switches a notebook between private and agent mode (crypto.md §8).
    public func setMode(_ mode: NotebookMode, notebookId: String, in account: AccountDocument) async throws {
        guard let key = try keys.notebookKey(notebookId) else { throw AccountError.missingKey(notebookId) }
        try await api.setNotebookMode(id: notebookId, mode: mode, notebookKey: mode == .agent ? key : nil)
        try account.updateNotebook(id: notebookId, ["mode": .string(value: mode.rawValue)])
    }

    /// Creates a note: note key wrapped by the notebook key, `NoteMeta` in the notebook
    /// document, an initialized note document. The note is registered on its first sync.
    public func createNote(in notebook: NotebookDocument, folderId: String? = nil, title: String = "", kind: NoteKind = .note,
                           dailyDate: String? = nil, order: Double = 0) throws -> NoteDocument {
        let id = EntityID.make()
        let (_, wrappedKey) = try keys.createNoteKey(noteId: id, notebookId: notebook.notebookId)
        let note = NoteDocument(noteId: id)
        try note.initialize(title: title)
        try notebook.putNote(NoteMeta(id: id, folderId: folderId, title: title, kind: kind, dailyDate: dailyDate, wrappedKey: wrappedKey, order: order))
        try store.ensureDocument(docId: id, kind: .note, notebookId: notebook.notebookId)
        return note
    }

    /// The daily note for `day` (`YYYY-MM-DD`) in the daily-notes notebook
    /// (`settings.dailyNotebookId`), created with the day as title if missing.
    public func dailyNote(for day: String, in notebook: NotebookDocument) throws -> (meta: NoteMeta, created: NoteDocument?) {
        if let meta = notebook.dailyNote(for: day) { return (meta, nil) }
        let note = try createNote(in: notebook, title: day, kind: .daily, dailyDate: day)
        return (notebook.note(id: note.noteId)!, note)
    }

    /// The notebook's «Входящие» (inbox) note, created if missing.
    public func inbox(in notebook: NotebookDocument, title: String = "Входящие") throws -> (meta: NoteMeta, created: NoteDocument?) {
        if let meta = notebook.inbox { return (meta, nil) }
        let note = try createNote(in: notebook, title: title, kind: .inbox)
        return (notebook.note(id: note.noteId)!, note)
    }
}

/// Share links `https://<web-host>/s/<shareId>#k=<base64url key>` (crypto.md §7).
public struct ShareLink: Hashable, Sendable {
    public var host: URL
    public var shareId: String
    /// noteKey for a note, notebookKey for a notebook.
    public var key: Data

    public init(host: URL, shareId: String, key: Data) {
        self.host = host
        self.shareId = shareId
        self.key = key
    }

    public var url: URL {
        var c = URLComponents(url: host, resolvingAgainstBaseURL: false)!
        c.path = "/s/\(shareId)"
        c.fragment = "k=\(Base64URL.encode(key))"
        return c.url!
    }

    public init?(url: URL) {
        guard let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
        let parts = c.path.split(separator: "/")
        guard parts.count == 2, parts[0] == "s", EntityID.isValid(String(parts[1])),
              let fragment = c.fragment, fragment.hasPrefix("k="),
              let key = Base64URL.decode(String(fragment.dropFirst(2))), key.count == DSCrypto.keyLength else { return nil }
        var hostC = c
        hostC.path = ""
        hostC.fragment = nil
        hostC.query = nil
        guard let host = hostC.url else { return nil }
        self.init(host: host, shareId: String(parts[1]), key: key)
    }
}
