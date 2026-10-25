import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Sends HTTP requests. `URLSession` in the app; a stub in tests.
public protocol HTTPTransport: Sendable {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

extension URLSession: HTTPTransport {
    public func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse("not HTTP") }
        return (data, http)
    }
}

/// Persists the session between launches (refresh token in the Keychain).
public protocol SessionStore: Sendable {
    func load() throws -> AuthSession?
    func save(_ session: AuthSession?) throws
}

/// `SessionStore` on top of a `SecretStore`.
public struct SecretSessionStore: SessionStore {
    let store: any SecretStore
    let key: String

    public init(store: any SecretStore, key: String = "session") {
        self.store = store
        self.key = key
    }

    public func load() throws -> AuthSession? {
        try store.data(for: key).flatMap { try? JSONDecoder().decode(AuthSession.self, from: $0) }
    }

    public func save(_ session: AuthSession?) throws {
        if let session { try store.set(JSONEncoder().encode(session), for: key) } else { try store.remove(key) }
    }
}

/// REST client for `https://<host>/v1` (api.md).
///
/// Keeps the session, adds `Authorization`, refreshes the access token shortly before expiry
/// or after a 401 (refresh tokens rotate; refreshes are serialized by the actor).
public actor APIClient {
    public let baseURL: URL
    private let transport: any HTTPTransport
    private let sessionStore: any SessionStore
    private var session: AuthSession?
    private var refreshTask: Task<AuthSession, any Error>?
    private let now: @Sendable () -> Date

    /// Called whenever the session changes (sign-in, refresh, sign-out).
    private var onSessionChange: (@Sendable (AuthSession?) -> Void)?

    /// - Parameter baseURL: server root, e.g. `https://notes.example.com` (`/v1` is appended).
    public init(baseURL: URL, transport: any HTTPTransport = URLSession.shared, sessionStore: any SessionStore,
                now: @escaping @Sendable () -> Date = Date.init) {
        self.baseURL = baseURL.appendingPathComponent("v1")
        self.transport = transport
        self.sessionStore = sessionStore
        self.session = try? sessionStore.load()
        self.now = now
    }

    public func setSessionObserver(_ observer: (@Sendable (AuthSession?) -> Void)?) {
        onSessionChange = observer
    }

    public var currentSession: AuthSession? { session }

    public var isSignedIn: Bool { session != nil }

    /// A valid access token (refreshing if needed) — for the sync `hello`.
    public func accessToken() async throws -> String {
        try await validSession().accessToken
    }

    // MARK: Auth

    public func prelogin(email: String) async throws -> PreloginResponse {
        try await call("POST", "/auth/prelogin", body: PreloginRequest(email: email), auth: false)
    }

    /// Signs up and stores the session.
    @discardableResult
    public func signup(email: String, material: SignupMaterial, userId: String, accountDocId: String, deviceName: String? = nil) async throws -> AuthSession {
        let body = SignupRequest(
            email: normalizeEmail(email), salt: .init(material.salt), kdf: material.kdf, loginKey: .init(material.loginKey),
            recoveryLoginKey: .init(material.recoveryLoginKey), wrappedMasterKeyPassword: .init(material.wrappedMasterKeyPassword),
            wrappedMasterKeyRecovery: .init(material.wrappedMasterKeyRecovery), userId: userId, accountDocId: accountDocId, deviceName: deviceName)
        let s: AuthSession = try await call("POST", "/auth/signup", body: body, auth: false)
        try setSession(s)
        return s
    }

    @discardableResult
    public func login(email: String, loginKey: Data, deviceName: String) async throws -> AuthSession {
        let s: AuthSession = try await call("POST", "/auth/login", body: LoginRequest(email: email, loginKey: loginKey, deviceName: deviceName), auth: false)
        try setSession(s)
        return s
    }

    /// Revokes the refresh token on the server (best effort) and forgets the session.
    public func logout() async throws {
        if let s = session {
            _ = try? await send("POST", "/auth/logout", body: ["refreshToken": s.refreshToken], auth: false)
        }
        try setSession(nil)
    }

    public func recoveryStart(email: String, recoveryLoginKey: Data) async throws -> RecoveryStartResponse {
        struct Body: Encodable { var email: String; var recoveryLoginKey: Base64URLData }
        return try await call("POST", "/auth/recovery/start", body: Body(email: normalizeEmail(email), recoveryLoginKey: .init(recoveryLoginKey)), auth: false)
    }

    @discardableResult
    public func recoveryFinish(recoveryToken: String, material: PasswordChangeMaterial, deviceName: String? = nil) async throws -> AuthSession {
        let s: AuthSession = try await call("POST", "/auth/recovery/finish",
                                            body: RecoveryFinishRequest(recoveryToken: recoveryToken, material: material, deviceName: deviceName), auth: false)
        try setSession(s)
        return s
    }

    public func changePassword(currentLoginKey: Data, material: PasswordChangeMaterial) async throws {
        struct Body: Encodable { var currentLoginKey: Base64URLData; var salt: Base64URLData; var kdf: KDFParams; var loginKey: Base64URLData; var wrappedMasterKeyPassword: Base64URLData }
        try await send("POST", "/auth/password", body: Body(
            currentLoginKey: .init(currentLoginKey), salt: .init(material.salt), kdf: material.kdf, loginKey: .init(material.loginKey),
            wrappedMasterKeyPassword: .init(material.wrappedMasterKeyPassword)))
    }

    /// Replaces the recovery key; the old one stops working at once (crypto.md §4).
    public func rotateRecoveryKey(_ body: RotateRecoveryKeyRequest) async throws {
        try await send("POST", "/auth/recovery-key", body: body)
    }

    // MARK: Account

    public func me() async throws -> MeResponse { try await call("GET", "/me") }

    /// Security log, newest first (up to 100).
    public func securityEvents() async throws -> [SecurityEvent] { try await call("GET", "/me/security-events") }

    public func devices() async throws -> [Device] { try await call("GET", "/devices") }

    public func revokeDevice(id: String) async throws { try await send("DELETE", "/devices/\(id)") }

    public func deleteAccount(loginKey: Data) async throws {
        try await send("DELETE", "/me", body: ["loginKey": Base64URL.encode(loginKey)])
        try setSession(nil)
    }

    // MARK: Notebooks and documents

    /// `notebookKey` only for `mode = .agent` (crypto.md §8).
    public func createNotebook(id: String, mode: NotebookMode, wrappedKey: Data, notebookKey: Data? = nil) async throws -> NotebookInfo {
        try await call("POST", "/notebooks", body: CreateNotebookRequest(notebookId: id, mode: mode, wrappedKey: wrappedKey, notebookKey: notebookKey))
    }

    public func notebooks() async throws -> [NotebookInfo] { try await call("GET", "/notebooks") }

    public func notebookKey(id: String) async throws -> Data {
        struct R: Decodable { var wrappedKey: Base64URLData }
        let r: R = try await call("GET", "/notebooks/\(id)/key")
        return r.wrappedKey.data
    }

    public func setNotebookMode(id: String, mode: NotebookMode, notebookKey: Data? = nil) async throws {
        struct Body: Encodable { var mode: NotebookMode; var notebookKey: Base64URLData? }
        try await send("PATCH", "/notebooks/\(id)/mode", body: Body(mode: mode, notebookKey: notebookKey.map(Base64URLData.init)))
    }

    public func deleteNotebook(id: String) async throws { try await send("DELETE", "/notebooks/\(id)") }

    /// Registers a document before its first push (`notebookId` nil only for the account doc).
    public func registerDoc(docId: String, kind: DocKind, notebookId: String?) async throws {
        try await send("POST", "/docs", body: RegisterDocRequest(docId: docId, kind: kind, notebookId: notebookId))
    }

    /// Moves a note document to another notebook (api.md «Перенос заметки»). Use
    /// `AccountService.moveNote`, which also rewraps the note key and moves its `NoteMeta`.
    public func moveDoc(id: String, toNotebook notebookId: String) async throws {
        try await send("PATCH", "/docs/\(id)", body: MoveDocRequest(notebookId: notebookId))
    }

    public func deleteDoc(id: String) async throws { try await send("DELETE", "/docs/\(id)") }

    public func versions(docId: String) async throws -> [DocVersion] { try await call("GET", "/docs/\(docId)/versions") }

    /// Encrypted state at `seq` (open with `CryptoAD.doc(docId)`).
    public func version(docId: String, seq: Int64) async throws -> Data {
        struct R: Decodable { var payload: Base64URLData }
        let r: R = try await call("GET", "/docs/\(docId)/versions/\(seq)")
        return r.payload.data
    }

    // MARK: Attachments

    public func createAttachment(id: String, noteId: String, size: Int64, chunkCount: Int, mime: String) async throws {
        struct Body: Encodable { var attachmentId: String; var noteId: String; var size: Int64; var chunkCount: Int; var mime: String }
        try await send("POST", "/attachments", body: Body(attachmentId: id, noteId: noteId, size: size, chunkCount: chunkCount, mime: mime))
    }

    public func uploadChunk(attachmentId: String, index: Int, data: Data) async throws {
        _ = try await raw("PUT", "/attachments/\(attachmentId)/chunks/\(index)", body: data, contentType: "application/octet-stream")
    }

    public func attachmentStatus(id: String) async throws -> AttachmentStatus { try await call("GET", "/attachments/\(id)") }

    public func downloadChunk(attachmentId: String, index: Int) async throws -> Data {
        try await raw("GET", "/attachments/\(attachmentId)/chunks/\(index)", body: nil, contentType: nil)
    }

    public func deleteAttachment(id: String) async throws { try await send("DELETE", "/attachments/\(id)") }

    // MARK: Sharing

    public func createShare(id: String, target: ShareTarget, permission: SharePermission, expiresAt: Date? = nil) async throws -> Share {
        try await call("POST", "/shares", body: CreateShareRequest(shareId: id, target: target, permission: permission, expiresAt: expiresAt))
    }

    public func shares() async throws -> [Share] { try await call("GET", "/shares") }

    public func revokeShare(id: String) async throws { try await send("DELETE", "/shares/\(id)") }

    /// Guest access without an account (D-37).
    public func guestSession(shareId: String) async throws -> GuestSession {
        try await call("POST", "/shares/\(shareId)/guest", body: [String: String](), auth: false)
    }

    // MARK: Agent tokens

    public func createAgentToken(name: String, notebookIds: [String], permission: AgentPermission, expiresAt: Date? = nil) async throws -> CreatedAgentToken {
        struct Body: Encodable { var name: String; var notebookIds: [String]; var permission: AgentPermission; var expiresAt: String? }
        return try await call("POST", "/agent-tokens", body: Body(name: name, notebookIds: notebookIds, permission: permission, expiresAt: expiresAt.map(DSDate.iso)))
    }

    public func agentTokens() async throws -> [AgentToken] { try await call("GET", "/agent-tokens") }

    public func revokeAgentToken(id: String) async throws { try await send("DELETE", "/agent-tokens/\(id)") }

    /// The audit format belongs to the agents stream; returned as raw JSON.
    public func agentTokenAudit(id: String) async throws -> Data { try await raw("GET", "/agent-tokens/\(id)/audit", body: nil, contentType: nil) }

    // MARK: Service

    public func health() async throws -> HealthResponse { try await call("GET", "/health", auth: false) }

    // MARK: Session

    private func setSession(_ s: AuthSession?) throws {
        session = s
        try sessionStore.save(s)
        onSessionChange?(s)
    }

    /// Refreshes 60 s before expiry; concurrent callers share one refresh.
    private func validSession(forceRefresh: Bool = false) async throws -> AuthSession {
        guard let s = session else { throw APIError.notAuthenticated }
        if !forceRefresh, let exp = s.accessExpiry, exp.timeIntervalSince(now()) > 60 { return s }
        if let task = refreshTask { return try await task.value }
        let task = Task { () throws -> AuthSession in
            let fresh: AuthSession = try await self.call("POST", "/auth/refresh", body: ["refreshToken": s.refreshToken], auth: false)
            return fresh
        }
        refreshTask = task
        defer { refreshTask = nil }
        do {
            let fresh = try await task.value
            try setSession(fresh)
            return fresh
        } catch let APIError.server(status, _, _) where status == 401 {
            try setSession(nil)
            throw APIError.notAuthenticated
        }
    }

    // MARK: Plumbing

    private func call<R: Decodable>(_ method: String, _ path: String, auth: Bool = true) async throws -> R {
        try await call(method, path, body: Optional<[String: String]>.none, auth: auth)
    }

    private func call<B: Encodable, R: Decodable>(_ method: String, _ path: String, body: B?, auth: Bool = true) async throws -> R {
        let data = try await send(method, path, body: body, auth: auth)
        do {
            return try JSONDecoder().decode(R.self, from: data)
        } catch {
            throw APIError.invalidResponse("\(method) \(path): \(error)")
        }
    }

    /// For endpoints answering `204` (or whose body is not needed).
    @discardableResult
    private func send(_ method: String, _ path: String, auth: Bool = true) async throws -> Data {
        try await send(method, path, body: Optional<[String: String]>.none, auth: auth)
    }

    @discardableResult
    private func send<B: Encodable>(_ method: String, _ path: String, body: B?, auth: Bool = true) async throws -> Data {
        let encoded = try body.map { try JSONEncoder().encode($0) }
        return try await raw(method, path, body: encoded, contentType: encoded == nil ? nil : "application/json", auth: auth)
    }

    private func raw(_ method: String, _ path: String, body: Data?, contentType: String?, auth: Bool = true) async throws -> Data {
        var retried = false
        while true {
            var request = URLRequest(url: baseURL.appendingPathComponent(String(path.dropFirst())))
            request.httpMethod = method
            request.httpBody = body
            if let contentType { request.setValue(contentType, forHTTPHeaderField: "Content-Type") }
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            if auth {
                let s = try await validSession(forceRefresh: retried)
                request.setValue("Bearer \(s.accessToken)", forHTTPHeaderField: "Authorization")
            }
            let (data, response): (Data, HTTPURLResponse)
            do {
                (data, response) = try await transport.send(request)
            } catch let e as APIError {
                throw e
            } catch {
                throw APIError.transport(String(describing: error))
            }
            if (200..<300).contains(response.statusCode) { return data }
            if response.statusCode == 401, auth, !retried {
                retried = true
                continue
            }
            if let body = try? JSONDecoder().decode(APIErrorBody.self, from: data) {
                throw APIError.server(status: response.statusCode, code: body.error.code, message: body.error.message)
            }
            throw APIError.server(status: response.statusCode, code: "internal", message: String(decoding: data.prefix(200), as: UTF8.self))
        }
    }
}
