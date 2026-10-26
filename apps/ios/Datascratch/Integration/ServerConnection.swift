#if canImport(DSCore)
import DSCore
import Foundation
import Observation
import os
import UIKit

/// Everything that talks to the Datascratch server (contracts/api.md, sync-protocol.md):
/// REST client with the stored session, DSCore's account flows, and the sync engine
/// that persists, encrypts and exchanges document updates. Used when `DS_SERVER_URL`
/// is set; without a server the app works on this device only.
final class ServerConnection: CoreLibraryRemote {
    nonisolated private static let log = Logger(subsystem: "com.datascratch.app", category: "Server")

    let serverURL: URL
    let webHost: String
    let api: APIClient
    let core: CoreLibrary
    let accounts: DSCore.AccountService
    let sync: SyncCenter
    private var engine: SyncEngine?
    private var statusTask: Task<Void, Never>?
    /// `POST /notebooks` in flight; notebook and note documents are registered after it.
    private var notebookCreation: [String: Task<Void, Never>] = [:]
    /// Encrypted attachments (cover images) in the same directory as `CoverImages`.
    let attachments: AttachmentManager?

    init(serverURL: URL, webHost: String, core: CoreLibrary, sync: SyncCenter, attachmentsDirectory: URL) {
        self.serverURL = serverURL
        self.webHost = webHost
        self.core = core
        self.sync = sync
        api = APIClient(baseURL: serverURL, sessionStore: SecretSessionStore(store: core.secrets))
        accounts = DSCore.AccountService(api: api, keys: core.keys, store: core.store)
        attachments = try? AttachmentManager(api: api, store: core.store, directory: attachmentsDirectory)
    }

    /// Merges what doubled up when the device library was carried into the account.
    /// Called on every start; `true` right after the device library was carried in.
    var onLibraryCarried: ((_ justCarried: Bool) -> Void)?

    /// Starts syncing for a signed-in account.
    func start(session: AuthSession, isNewAccount: Bool) async {
        do {
            let carried = try core.adoptAccount(docId: session.accountDocId, isNew: isNewAccount)
            let api = self.api
            // Notebooks made on this device before signing in exist on the server before any of
            // their documents is registered (otherwise POST /docs answers 404).
            for notebook in carried {
                do {
                    _ = try await api.createNotebook(id: notebook.id, mode: notebook.mode, wrappedKey: notebook.wrappedKey,
                                                     notebookKey: notebook.mode == .agent ? notebook.key : nil)
                    core.keys.markNotebookKeyVerified(notebook.id)
                } catch APIError.server(409, _, _) {
                    // Already there (an earlier attempt, or another device): its key is the
                    // server's — reconcileNotebookKeys below takes it.
                } catch {
                    Self.log.error("carrying notebook \(notebook.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
                }
            }
            // The server's notebook keys are the truth: fetch the ones this device lacks and
            // replace any it invented, before anything is sealed.
            let changes = await reconcileNotebookKeys()
            let client = SyncClient(
                configuration: .init(url: SyncClient.Configuration.url(forServer: serverURL),
                                     deviceId: try core.store.deviceId(),
                                     clientVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0")
            ) { [weak self] in
                do {
                    return .user(accessToken: try await api.accessToken())
                } catch APIError.notAuthenticated {
                    // The refresh token was refused: the session was ended on the server.
                    await self?.sessionEnded()
                    throw APIError.notAuthenticated
                }
            }
            let wrappedKeys = core.wrappedKeys
            let keys = KeyRingDocumentKeys(keyRing: core.keys) { noteId, notebookId in
                wrappedKeys.wrapped(noteId: noteId, notebookId: notebookId)
            }
            let keyRing = core.keys
            let engine = SyncEngine(store: core.store, client: client, keyFor: keys.key(for:), register: { [core] record in
                do {
                    try await api.registerDoc(docId: record.docId, kind: record.kind, notebookId: record.notebookId)
                } catch {
                    // The notebook is not on the server (carried in while its creation failed,
                    // e.g. offline at the first start): create it, then register again.
                    guard case APIError.server(404, _, _) = error, let notebookId = record.notebookId,
                          let notebook = await core.serverNotebook(notebookId) else { throw error }
                    do {
                        _ = try await api.createNotebook(id: notebook.id, mode: notebook.mode, wrappedKey: notebook.wrappedKey,
                                                         notebookKey: notebook.mode == .agent ? notebook.key : nil)
                        keyRing.markNotebookKeyVerified(notebook.id)
                    } catch APIError.server(409, _, _) {
                        // Created meanwhile; the next reconcile settles whose key it is.
                    }
                    try await api.registerDoc(docId: record.docId, kind: record.kind, notebookId: record.notebookId)
                }
            }, retiredKeysFor: keys.retiredKeys(for:), isKeyCanonical: keys.isCanonical)
            self.engine = engine
            core.remote = self
            await engine.start()
            await repairKeys(changes, engine: engine)
            observeStatus(engine)
            sync.onRetry = { Task { await engine.retryFailed() } }
            // With the engine running, removing duplicates reaches the server too.
            // Every start: build 6 carried libraries without merging the duplicates.
            onLibraryCarried?(core.needsCarriedMerge)
            core.needsCarriedMerge = false
            // Notebook modes changed while sync was stopped (signed out, signed out by the server,
            // offline at the switch) never reached the server: agents would not see a notebook
            // the app shows as open to them.
            Task { await reconcileNotebookModes() }
            // Moves made offline or before a restart.
            let moves = core.pendingMoves
            Task { for (noteId, notebookId) in moves { await deliverMove(noteId, to: notebookId) } }
            uploadPendingAttachments()
        } catch {
            Self.log.error("starting sync failed: \(error.localizedDescription, privacy: .public)")
            sync.markFailed(error.localizedDescription)
        }
    }

    /// The server ended this device's session (revoked from another device or the web, or the
    /// refresh token expired). Sync stops; the library and the keys stay on the device, and
    /// signing in again picks up where it stopped.
    func sessionEnded() async {
        guard !sync.isSessionEnded else { return }
        sync.markSessionEnded()
        let email = (try? core.store.string(ServerAccountService.emailKey)) ?? nil
        try? core.store.setString(email ?? "", for: ServerAccountService.sessionEndedKey)
        await stop()
    }

    func stop() async {
        statusTask?.cancel()
        sync.onRetry = nil
        await engine?.stop()
        engine = nil
        core.remote = nil
    }

    /// Network came back: reconnect right away instead of waiting for the back-off.
    func reconnect() {
        guard let engine else { return }
        Task { await engine.client.reconnectNow() }
        uploadPendingAttachments()
    }

    /// Attachments added offline (or interrupted) go up once the note key is known.
    private func uploadPendingAttachments() {
        guard let attachments else { return }
        let keys = Dictionary(core.knownNoteIds.compactMap { id in noteKey(id).map { (id, $0) } }, uniquingKeysWith: { a, _ in a })
        Task { await attachments.uploadPending { keys[$0] } }
    }

    private func noteKey(_ noteId: String) -> Data? {
        try? core.shareKey(for: ShareTarget(kind: .note, id: noteId))
    }

    private func observeStatus(_ engine: SyncEngine) {
        statusTask?.cancel()
        statusTask = Task { [weak self, sync] in
            var catching = false, caughtUp = false
            for await status in await engine.statusUpdates() {
                // Once the account has caught up with the server: first-run twins are judged on
                // what it really holds, not on what this device had before the first sync.
                if status.catchingUp > 0 { catching = true }
                if !caughtUp, catching, status.catchingUp == 0, case .connected = status.connection {
                    caughtUp = true
                    self?.onLibraryCarried?(false)
                }
                let summary: SyncCenter.Summary = switch status.summary {
                case .offline: .offline
                case .syncing: .syncing
                case .synced: .synced
                case .failed(let documents, let reason): .failed(documents: documents, reason: reason)
                }
                sync.apply(summary: summary, pending: status.pending)
                let unreadable = Set(status.unreadable.compactMap { $0.notebookId ?? nil })
                if sync.unreadableNotebookIds != unreadable { sync.unreadableNotebookIds = unreadable }
                var signatures: [String: String] = [:]
                for (notebook, items) in Dictionary(grouping: status.unreadable, by: { $0.notebookId ?? $0.docId }) {
                    let count = items.reduce(0) { $0 + $1.count }
                    let newest = items.map(\.lastSeq).max() ?? 0
                    signatures[notebook] = "\(count)-\(newest)-\(items.count)"
                }
                if sync.unreadableSignatures != signatures { sync.unreadableSignatures = signatures }
            }
        }
    }

    // MARK: CoreLibraryRemote

    func notebookCreated(id: String, mode: NotebookMode, wrappedKey: Data, key: Data) {
        let api = self.api
        notebookCreation[id] = Task {
            do {
                _ = try await api.createNotebook(id: id, mode: mode == .agent ? .agent : .private,
                                                 wrappedKey: wrappedKey, notebookKey: mode == .agent ? key : nil)
                core.keys.markNotebookKeyVerified(id)
            } catch APIError.server(409, _, _) {
                // The id is taken on the server: its key there is the notebook's key.
                await reconcileAndRepair()
            } catch {
                ServerConnection.log.error("POST /notebooks \(id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    func notebookModeChanged(id: String, mode: NotebookMode, key: Data?) {
        let api = self.api
        Task {
            await notebookCreation[id]?.value
            // Agents get the key the server holds, never this device's own copy: one an earlier
            // build invented would lock everyone else out of the notebook.
            var agentKey: Data?
            if mode == .agent {
                if !core.keys.isNotebookKeyVerified(id) { await reconcileAndRepair() }
                guard core.keys.isNotebookKeyVerified(id), let canonical = (try? core.keys.notebookKey(id)) ?? nil else {
                    ServerConnection.log.error("PATCH mode \(id, privacy: .public) postponed: the server's key is not available")
                    return
                }
                agentKey = canonical
            }
            do {
                try await api.setNotebookMode(id: id, mode: mode == .agent ? .agent : .private, notebookKey: agentKey)
            } catch {
                ServerConnection.log.error("PATCH mode \(id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    func documentDeleted(_ docId: String) {
        guard let engine else { return }
        Task {
            do {
                try await engine.deleteDocument(docId)
            } catch {
                ServerConnection.log.error("sync delete \(docId, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    func noteMoved(_ noteId: String, toNotebook notebookId: String) {
        let pending = notebookCreation[notebookId]
        Task {
            await pending?.value
            await deliverMove(noteId, to: notebookId)
        }
    }

    /// Brings the server's notebook modes in line with the account document (what the apps
    /// show and the person chose); a notebook the server does not have yet is created by the
    /// registration of its documents.
    /// `AccountService.reconcileNotebookKeys`: keys this device lacks are stored, a key that
    /// differs from the server's is replaced (the old one kept as retired, for reading) and the
    /// note keys it wrapped are re-wrapped. Returns the replaced keys.
    private func reconcileNotebookKeys() async -> [DSCore.AccountService.NotebookKeyChange] {
        let changes: [DSCore.AccountService.NotebookKeyChange]
        do {
            changes = try await accounts.reconcileNotebookKeys()
        } catch {
            Self.log.error("reconciling notebook keys failed: \(error.localizedDescription, privacy: .public)")
            return []
        }
        for change in changes {
            Self.log.error("notebook \(change.notebookId, privacy: .public) held a key the server does not know; replaced")
            _ = try? core.notebookDocument(change.notebookId).rewrapNoteKeys(from: change.previousKey, to: change.key)
        }
        core.notebookKeysChanged()
        return changes
    }

    /// After the keys are right: re-read and re-upload what was sealed with a wrong key — the
    /// replaced notebooks, notes whose key only an invented (lost) notebook key opened, and
    /// once per device every notebook (build 12, prod 2026-10-26) — then fetch set-aside items.
    private func repairKeys(_ changes: [DSCore.AccountService.NotebookKeyChange], engine: SyncEngine) async {
        // Documents that waited for a key (a notebook from another device) start syncing now.
        await engine.resumeDocumentsWaitingForKeys()
        var docs = changes.map(\.notebookId)
        docs += core.healUnreadableNotes()
        docs += core.takeOneTimeNotebookRekey()
        for docId in Set(docs) { await engine.rekey(docId: docId) }
        await engine.resumeDocumentsWaitingForKeys()
        await engine.retryUnreadable()
    }

    private func reconcileAndRepair() async {
        let changes = await reconcileNotebookKeys()
        if let engine { await repairKeys(changes, engine: engine) }
    }

    /// The account document brought notebooks whose keys this device lacks (made on another
    /// device): fetch them, then let the engine pick their documents up.
    func notebookKeysMissing() {
        guard engine != nil, !isFetchingKeys else { return }
        isFetchingKeys = true
        Task {
            await reconcileAndRepair()
            isFetchingKeys = false
            reconnect()
        }
    }

    private var isFetchingKeys = false

    private func reconcileNotebookModes() async {
        guard let server = try? await api.notebooks() else { return }
        let modes = Dictionary(server.map { ($0.id, $0.mode) }, uniquingKeysWith: { a, _ in a })
        for ref in core.account.notebooks() {
            guard let serverMode = modes[ref.id], serverMode != ref.mode else { continue }
            let key = ref.mode == .agent && core.keys.isNotebookKeyVerified(ref.id) ? (try? core.keys.notebookKey(ref.id)) ?? nil : nil
            if ref.mode == .agent, key == nil { continue }
            do {
                try await api.setNotebookMode(id: ref.id, mode: ref.mode, notebookKey: key)
                ServerConnection.log.info("notebook \(ref.id, privacy: .public) mode set to \(ref.mode.rawValue, privacy: .public) on the server")
            } catch {
                ServerConnection.log.error("PATCH mode \(ref.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    /// `PATCH /docs/:id` for a note moved to another notebook (api.md «Перенос заметки»). Stays
    /// pending on failure and is sent again at the next start.
    private func deliverMove(_ noteId: String, to notebookId: String) async {
        do {
            try await api.moveDoc(id: noteId, toNotebook: notebookId)
            core.moveDelivered(noteId, toNotebook: notebookId)
        } catch APIError.server(404, _, _) {
            // Not registered yet: registration sends the new notebook itself.
            guard (try? core.store.document(noteId))?.registered == true else {
                core.moveDelivered(noteId, toNotebook: notebookId)
                return
            }
            // Otherwise the target notebook is missing on the server: create it, try once more.
            guard let notebook = core.serverNotebook(notebookId) else { return }
            do {
                _ = try await api.createNotebook(id: notebook.id, mode: notebook.mode, wrappedKey: notebook.wrappedKey,
                                                 notebookKey: notebook.mode == .agent ? notebook.key : nil)
            } catch APIError.server(409, _, _) {
            } catch {
                ServerConnection.log.error("POST /notebooks \(notebookId, privacy: .public) for a move failed: \(error.localizedDescription, privacy: .public)")
                return
            }
            if (try? await api.moveDoc(id: noteId, toNotebook: notebookId)) != nil {
                core.moveDelivered(noteId, toNotebook: notebookId)
            }
        } catch {
            ServerConnection.log.error("PATCH /docs/\(noteId, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    func notebookDeleted(id: String) {
        let api = self.api
        Task {
            await notebookCreation[id]?.value
            try? await api.deleteNotebook(id: id)
        }
    }

    func documentOpened(_ crdt: CRDTDocument, notebookId: String?) {
        guard let engine else { return }
        let pending = notebookId.flatMap { notebookCreation[$0] }
        Task {
            await pending?.value
            do {
                try await engine.open(crdt, notebookId: notebookId)
            } catch {
                ServerConnection.log.error("sync open \(crdt.docId, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }
}

// MARK: - Attachments

extension ServerConnection: CoverAttachmentRemote {
    func addAttachment(_ data: Data, mime: String, noteId: String) async throws -> String {
        guard let attachments else { throw APIError.notAuthenticated }
        return try await attachments.add(data, mime: mime, noteId: noteId)
    }

    func uploadAttachment(_ attachmentId: String, noteId: String) async {
        guard let attachments, engine != nil, let key = noteKey(noteId) else { return }
        do {
            try await attachments.upload(attachmentId, noteKey: key)
        } catch {
            Self.log.error("attachment upload \(attachmentId, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    func downloadAttachment(_ attachmentId: String, noteId: String) async -> URL? {
        guard let attachments, engine != nil, let key = noteKey(noteId) else { return nil }
        return try? await attachments.download(attachmentId, noteId: noteId, noteKey: key)
    }

    func deleteAttachment(_ attachmentId: String) async {
        guard let attachments else { return }
        try? await attachments.delete(attachmentId)
    }
}

// MARK: - Account

/// `AccountService` over the server (D-34, crypto.md): Argon2id, key wrapping and the
/// REST calls are DSCore's; this adds the app's session state.
@Observable
final class ServerAccountService: AccountService {
    private(set) var account: Account?
    var isServerBacked: Bool { true }
    @ObservationIgnored private let connection: ServerConnection
    static let emailKey = "app.email"
    /// Set when the server ended the session, cleared by signing in or out: the next launch
    /// shows «signed out on this device» instead of the welcome screen.
    static let sessionEndedKey = "app.sessionEnded"

    init(connection: ServerConnection) {
        self.connection = connection
        Task { await restore() }
    }

    /// A stored session survives restarts: resume syncing without asking for the password.
    private func restore() async {
        guard let session = await connection.api.currentSession else {
            if let email = try? connection.core.store.string(Self.sessionEndedKey) {
                account = Account(userId: "", email: email, createdAt: Date())
                connection.sync.markSessionEnded()
            }
            return
        }
        let email = (try? connection.core.store.string(Self.emailKey)) ?? ""
        account = Account(userId: session.userId, email: email, createdAt: Date())
        await connection.start(session: session, isNewAccount: false)
    }

    func signUp(email: String, password: String) async throws -> RecoveryKey {
        let email = Credentials.normalizedEmail(email)
        guard Credentials.isValidEmail(email) else { throw AccountError.invalidEmail }
        guard password.count >= Credentials.minimumPasswordLength else { throw AccountError.weakPassword }
        do {
            let result = try await connection.accounts.signup(email: email, password: password)
            guard let key = RecoveryKey(result.recoveryKeyText) else { throw AccountError.invalidRecoveryKey }
            try? connection.core.store.setString(email, for: Self.emailKey)
            account = Account(userId: result.session.userId, email: email, createdAt: Date())
            await connection.start(session: result.session, isNewAccount: true)
            return key
        } catch let error as APIError {
            throw Self.map(error)
        }
    }

    func signIn(email: String, password: String) async throws {
        let email = Credentials.normalizedEmail(email)
        // Signed out on this device, now signing in to a different account: what the previous
        // account left here is removed first, so none of it reaches the new one (spec/07).
        if let previous = signedOutEmail, previous != email {
            try? connection.core.wipeLocalData()
        }
        do {
            let session = try await connection.accounts.login(email: email, password: password, deviceName: UIDevice.current.name)
            try await connection.accounts.loadNotebookKeys()
            try? connection.core.store.setString(email, for: Self.emailKey)
            account = Account(userId: session.userId, email: email, createdAt: Date())
            sessionResumed()
            await connection.start(session: session, isNewAccount: false)
        } catch let error as APIError {
            throw Self.map(error)
        }
    }

    /// The account this device was signed out of (the server ended the session), if any.
    var signedOutEmail: String? {
        guard let email = try? connection.core.store.string(Self.sessionEndedKey), !email.isEmpty else { return nil }
        return Credentials.normalizedEmail(email)
    }

    /// «Delete data from this device» (spec/07): documents, keys and the stored session go; the
    /// app starts over at the welcome screen.
    func deleteLocalData() async {
        await connection.stop()
        // Every key, kept ones of unsent notebooks too; then the database.
        try? connection.accounts.eraseDeviceKeys()
        try? connection.core.wipeLocalData()
        try? connection.core.store.setString(nil, for: Self.emailKey)
        sessionResumed()
        account = nil
    }

    private func sessionResumed() {
        try? connection.core.store.setString(nil, for: Self.sessionEndedKey)
        if connection.sync.isSessionEnded { connection.sync.markSessionRestored() }
    }

    func recover(email: String, recoveryKey: RecoveryKey, newPassword: String) async throws {
        let email = Credentials.normalizedEmail(email)
        guard newPassword.count >= Credentials.minimumPasswordLength else { throw AccountError.weakPassword }
        do {
            let session = try await connection.accounts.recover(email: email, recoveryKeyText: recoveryKey.formatted,
                                                                 newPassword: newPassword)
            try await connection.accounts.loadNotebookKeys()
            try? connection.core.store.setString(email, for: Self.emailKey)
            account = Account(userId: session.userId, email: email, createdAt: Date())
            sessionResumed()
            await connection.start(session: session, isNewAccount: false)
        } catch let error as APIError {
            throw Self.map(error, recovering: true)
        }
    }

    func changePassword(current: String, new: String) async throws {
        guard let email = account?.email else { throw AccountError.wrongCredentials }
        guard new.count >= Credentials.minimumPasswordLength else { throw AccountError.weakPassword }
        do {
            try await connection.accounts.changePassword(email: email, currentPassword: current, newPassword: new)
        } catch let error as APIError {
            throw Self.map(error)
        }
    }

    func rotateRecoveryKey(currentPassword: String) async throws -> RecoveryKey {
        guard let email = account?.email else { throw AccountError.wrongCredentials }
        do {
            let text = try await connection.accounts.rotateRecoveryKey(email: email, currentPassword: currentPassword,
                                                                       account: connection.core.account)
            guard let key = RecoveryKey(text) else { throw AccountError.invalidRecoveryKey }
            return key
        } catch let error as APIError {
            throw Self.map(error)
        }
    }

    func securityEvents() async throws -> [SecurityEvent] {
        do {
            return try await connection.accounts.securityEvents().compactMap { event in
                guard let date = event.date else { return nil }
                let kind: SecurityEvent.Kind = switch event.kind {
                case .passwordChanged: .passwordChanged
                case .recoveryUsed: .recoveryUsed
                case .recoveryKeyRotated: .recoveryKeyRotated
                }
                return SecurityEvent(kind: kind, date: date, deviceName: event.deviceName)
            }
        } catch let error as APIError {
            throw Self.map(error)
        }
    }

    func signOut() async {
        sessionResumed()
        await connection.stop()
        // DSCore keeps the keys of notebooks still only on this device: signing in to the same
        // account uploads them; another account or «Delete data» removes them (spec/07).
        _ = try? await connection.accounts.logout()
        account = nil
    }

    var unsentChanges: Int { connection.core.unsentChangeCount }

    /// «Send first»: waits (up to `timeout`) until nothing is left to send.
    func sendPending(timeout: Duration) async -> Bool {
        connection.reconnect()
        let clock = ContinuousClock()
        let deadline = clock.now.advanced(by: timeout)
        while clock.now < deadline {
            if unsentChanges == 0 { return true }
            try? await Task.sleep(for: .milliseconds(500))
        }
        return unsentChanges == 0
    }

    private static func map(_ error: APIError, recovering: Bool = false) -> AccountError {
        switch error {
        case .server(_, let code, let message):
            switch code {
            case "unauthorized": return recovering ? .invalidRecoveryKey : .wrongCredentials
            case "conflict": return .accountExists
            default: return .server(message)
            }
        case .notAuthenticated: return .wrongCredentials
        case .invalidResponse(let message), .transport(let message): return .server(message)
        }
    }
}

// MARK: - Sharing

@Observable
final class ServerSharingService: SharingService {
    private(set) var links: [SharedLink] = []
    @ObservationIgnored private let connection: ServerConnection

    init(connection: ServerConnection) {
        self.connection = connection
        Task { await refresh() }
    }

    func refresh() async {
        guard let shares = try? await connection.api.shares() else { return }
        links = shares.compactMap { share in
            let target = ShareTarget(kind: share.target.kind == .notebook ? .notebook : .note, id: share.target.id)
            guard let url = url(shareId: share.id, target: target) else { return nil }
            return SharedLink(id: share.id, target: target,
                              permission: share.permission == .edit ? .edit : .view,
                              expiresAt: share.expiresAt.flatMap(DSCore.DSDate.parseISO),
                              createdAt: DSCore.DSDate.parseISO(share.createdAt) ?? Date(), url: url)
        }
    }

    func createLink(for target: ShareTarget, permission: SharePermission, expiresAt: Date?) async throws -> SharedLink {
        let id = UUIDv7.make()
        let share = try await connection.api.createShare(
            id: id, target: DSCore.ShareTarget(kind: target.kind == .notebook ? .notebook : .note, id: target.id),
            permission: permission == .edit ? .edit : .view, expiresAt: expiresAt)
        guard let url = url(shareId: share.id, target: target) else { throw AccountError.server(String(localized: "The encryption key of this document is not on this device.")) }
        let link = SharedLink(id: share.id, target: target, permission: permission, expiresAt: expiresAt,
                              createdAt: Date(), url: url)
        links.append(link)
        return link
    }

    func revoke(_ linkId: String) async throws {
        try await connection.api.revokeShare(id: linkId)
        links.removeAll { $0.id == linkId }
    }

    /// `https://<web-host>/s/<id>#k=<key>`; the key never goes to the server.
    private func url(shareId: String, target: ShareTarget) -> URL? {
        guard let host = URL(string: "https://\(connection.webHost)"),
              let key = try? connection.core.shareKey(for: target) else { return nil }
        return DSCore.ShareLink(host: host, shareId: shareId, key: key).url
    }
}

// MARK: - Devices and agent tokens

@Observable
final class ServerAccessService: AccessService {
    private(set) var devices: [Device] = []
    private(set) var agentTokens: [AgentToken] = []
    @ObservationIgnored private let connection: ServerConnection

    init(connection: ServerConnection) {
        self.connection = connection
    }

    func refresh() async {
        if let list = try? await connection.api.devices() {
            devices = list.map { device in
                Device(id: device.id, name: device.name, platform: "", lastSeenAt: DSCore.DSDate.parseISO(device.lastSeenAt) ?? Date(),
                       isCurrent: device.current)
            }
        }
        if let list = try? await connection.api.agentTokens() {
            agentTokens = list.map { token in
                AgentToken(id: token.id, name: token.name, notebookIds: token.notebookIds,
                           permission: token.permission == .readWrite ? .readWrite : .read,
                           createdAt: DSCore.DSDate.parseISO(token.createdAt) ?? Date(),
                           expiresAt: token.expiresAt.flatMap(DSCore.DSDate.parseISO),
                           lastUsedAt: token.lastUsedAt.flatMap(DSCore.DSDate.parseISO))
            }
        }
    }

    func revokeDevice(_ id: String) async throws {
        try await connection.api.revokeDevice(id: id)
        devices.removeAll { $0.id == id }
    }

    func createAgentToken(name: String, notebookIds: [String], permission: AgentPermission,
                          expiresAt: Date?) async throws -> String {
        let created = try await connection.api.createAgentToken(name: name, notebookIds: notebookIds,
                                                                permission: permission == .readWrite ? .readWrite : .read,
                                                                expiresAt: expiresAt)
        await refresh()
        return created.token
    }

    func revokeAgentToken(_ id: String) async throws {
        try await connection.api.revokeAgentToken(id: id)
        agentTokens.removeAll { $0.id == id }
    }

    func auditLog(forToken id: String) async throws -> [AgentAuditEntry] {
        let data = try await connection.api.agentTokenAudit(id: id)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            return DSCore.DSDate.parseISO(text) ?? Date()
        }
        return try decoder.decode([AgentAuditEntry].self, from: data)
    }
}
#endif
