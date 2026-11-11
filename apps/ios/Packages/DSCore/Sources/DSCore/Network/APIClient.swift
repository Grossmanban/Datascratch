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
        try await URLSessionTransport(session: self).send(request)
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
///
/// Unreliable networks (handshakes that hang on some connections): each attempt has a short
/// idle timeout, and failed attempts are retried with jittered backoff — any request when it
/// certainly was not sent (`TransportFailure.notSent`), idempotent ones (GET/PUT/DELETE and
/// the POST/PATCH that are idempotent by id) also after timeouts and 502/503/504. Requests that
/// may have reached the server and are not idempotent — sign-in, password change — are not
/// repeated. The token refresh is: the server answers a repeat within 60 s with the same session.
public actor APIClient {
    /// Idle timeout of attempt 1, 2, …; a stuck connection fails fast and the next attempt
    /// opens a new one.
    var attemptTimeouts: [TimeInterval] = [5, 8, 12, 15]
    var retryBaseDelay: Duration = .milliseconds(300)

    func setRetryTiming(timeouts: [TimeInterval], baseDelay: Duration) {
        attemptTimeouts = timeouts
        retryBaseDelay = baseDelay
    }

    public let baseURL: URL
    private let transport: any HTTPTransport
    private let sessionStore: any SessionStore
    private var session: AuthSession?
    private var refreshTask: Task<AuthSession, any Error>?
    private var deviceRevokedHandler: (@Sendable (DeviceRevocationReason) -> Void)?
    private let now: @Sendable () -> Date

    /// Called whenever the session changes (sign-in, refresh, sign-out).
    private var onSessionChange: (@Sendable (AuthSession?) -> Void)?

    /// - Parameter baseURL: server root, e.g. `https://notes.example.com` (`/v1` is appended).
    public init(baseURL: URL, transport: any HTTPTransport = URLSessionTransport(), sessionStore: any SessionStore,
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

    /// Salt and KDF parameters for a login. Parameters outside crypto.md §2 bounds throw
    /// `CryptoError.unsafeKDF`: a hostile server (the address is user-entered, D-49) could
    /// otherwise lower them and brute-force the password from a cheap login key.
    public func prelogin(email: String) async throws -> PreloginResponse {
        let response: PreloginResponse = try await call("POST", "/auth/prelogin", body: PreloginRequest(email: email), auth: false, idempotent: true)
        try response.kdf.validate()
        return response
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
            _ = try? await send("POST", "/auth/logout", body: ["refreshToken": s.refreshToken], auth: false, idempotent: true)
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

    public func revokeDevice(id: String) async throws { try await send("DELETE", "/devices/\(seg(id))") }

    public func deleteAccount(loginKey: Data) async throws {
        try await send("DELETE", "/me", body: ["loginKey": Base64URL.encode(loginKey)])
        try setSession(nil)
    }

    // MARK: Notebooks and documents

    /// `notebookKey` only for `mode = .agent` (crypto.md §8).
    /// `spaceId`: a notebook of that shared space, `wrappedKey` under the space key (D-62).
    /// `spaceKeyVersion`: the space key version `wrappedKey` is under (with `spaceId`).
    public func createNotebook(id: String, mode: NotebookMode, wrappedKey: Data, notebookKey: Data? = nil, spaceId: String? = nil,
                               spaceKeyVersion: Int? = nil) async throws -> NotebookInfo {
        try await call("POST", "/notebooks", body: CreateNotebookRequest(notebookId: id, mode: mode, wrappedKey: wrappedKey, notebookKey: notebookKey,
                                                                         spaceId: spaceId, spaceKeyVersion: spaceKeyVersion),
                       idempotent: true)
    }

    public func notebooks() async throws -> [NotebookInfo] { try await call("GET", "/notebooks") }

    public func notebookKey(id: String) async throws -> Data {
        struct R: Decodable { var wrappedKey: Base64URLData }
        let r: R = try await call("GET", "/notebooks/\(seg(id))/key")
        return r.wrappedKey.data
    }

    /// The owner's notebook key with its sharing state (D-54: version, chain, pending rotation).
    public func notebookKeyState(id: String) async throws -> NotebookKeyState {
        try await call("GET", "/notebooks/\(seg(id))/key")
    }

    public func setNotebookMode(id: String, mode: NotebookMode, notebookKey: Data? = nil) async throws {
        struct Body: Encodable { var mode: NotebookMode; var notebookKey: Base64URLData? }
        try await send("PATCH", "/notebooks/\(seg(id))/mode", body: Body(mode: mode, notebookKey: notebookKey.map(Base64URLData.init)), idempotent: true)
    }

    public func deleteNotebook(id: String) async throws { try await send("DELETE", "/notebooks/\(seg(id))") }

    /// Registers a document before its first push (`notebookId` nil only for the account doc).
    public func registerDoc(docId: String, kind: DocKind, notebookId: String?) async throws {
        try await send("POST", "/docs", body: RegisterDocRequest(docId: docId, kind: kind, notebookId: notebookId), idempotent: true)
    }

    /// Moves a note document to another notebook (api.md «Перенос заметки»). Use
    /// `AccountService.moveNote`, which also rewraps the note key and moves its `NoteMeta`.
    public func moveDoc(id: String, toNotebook notebookId: String) async throws {
        try await send("PATCH", "/docs/\(seg(id))", body: MoveDocRequest(notebookId: notebookId), idempotent: true)
    }

    public func deleteDoc(id: String) async throws { try await send("DELETE", "/docs/\(seg(id))") }

    public func versions(docId: String) async throws -> [DocVersion] { try await call("GET", "/docs/\(seg(docId))/versions") }

    /// Encrypted state at `seq` (open with `CryptoAD.doc(docId)`).
    public func version(docId: String, seq: Int64) async throws -> Data {
        struct R: Decodable { var payload: String }
        let path = try "/docs/\(seg(docId))/versions/\(seq)"
        let r: R = try await call("GET", path)
        if let data = Base64URL.decode(r.payload) { return data }
        // Not canonical base64url (padding, `+` `/`, line breaks from something in between):
        // still the same bytes — read them, and say so in the logs.
        let standard = r.payload.filter { !$0.isWhitespace }
            .replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        let padded = standard.padding(toLength: (standard.count + 3) / 4 * 4, withPad: "=", startingAt: 0)
        if let data = Data(base64Encoded: padded) { return data }
        throw APIError.invalidResponse("GET \(path): payload is not base64 (\(r.payload.count) chars, ends \(r.payload.suffix(8)))")
    }

    // MARK: Attachments

    public func createAttachment(id: String, noteId: String, size: Int64, chunkCount: Int, mime: String) async throws {
        struct Body: Encodable { var attachmentId: String; var noteId: String; var size: Int64; var chunkCount: Int; var mime: String }
        try await send("POST", "/attachments", body: Body(attachmentId: id, noteId: noteId, size: size, chunkCount: chunkCount, mime: mime), idempotent: true)
    }

    public func uploadChunk(attachmentId: String, index: Int, data: Data) async throws {
        _ = try await raw("PUT", "/attachments/\(seg(attachmentId))/chunks/\(index)", body: data, contentType: "application/octet-stream")
    }

    public func attachmentStatus(id: String) async throws -> AttachmentStatus { try await call("GET", "/attachments/\(seg(id))") }

    public func downloadChunk(attachmentId: String, index: Int) async throws -> Data {
        try await raw("GET", "/attachments/\(seg(attachmentId))/chunks/\(index)", body: nil, contentType: nil)
    }

    public func deleteAttachment(id: String) async throws { try await send("DELETE", "/attachments/\(seg(id))") }

    // MARK: Sharing

    public func createShare(id: String, target: ShareTarget, permission: SharePermission, expiresAt: Date? = nil) async throws -> Share {
        try await call("POST", "/shares", body: CreateShareRequest(shareId: id, target: target, permission: permission, expiresAt: expiresAt), idempotent: true)
    }

    public func shares() async throws -> [Share] { try await call("GET", "/shares") }

    public func revokeShare(id: String) async throws { try await send("DELETE", "/shares/\(seg(id))") }

    /// Guest access without an account (D-37).
    public func guestSession(shareId: String) async throws -> GuestSession {
        try await call("POST", "/shares/\(seg(shareId))/guest", body: [String: String](), auth: false)
    }

    // MARK: Agent tokens

    public func createAgentToken(name: String, notebookIds: [String], permission: AgentPermission, expiresAt: Date? = nil) async throws -> CreatedAgentToken {
        struct Body: Encodable { var name: String; var notebookIds: [String]; var permission: AgentPermission; var expiresAt: String? }
        return try await call("POST", "/agent-tokens", body: Body(name: name, notebookIds: notebookIds, permission: permission, expiresAt: expiresAt.map(DSDate.iso)))
    }

    public func agentTokens() async throws -> [AgentToken] { try await call("GET", "/agent-tokens") }

    public func revokeAgentToken(id: String) async throws { try await send("DELETE", "/agent-tokens/\(seg(id))") }

    /// The audit format belongs to the agents stream; returned as raw JSON.
    public func agentTokenAudit(id: String) async throws -> Data { try await raw("GET", "/agent-tokens/\(seg(id))/audit", body: nil, contentType: nil) }

    // MARK: Service

    public func health() async throws -> HealthResponse { try await call("GET", "/health", auth: false) }

    // MARK: Session

    private func setSession(_ s: AuthSession?) throws {
        // A new device session (sign-in, sign-up, recovery; not a token refresh) starts afresh:
        // a later revocation is reported again.
        if let s, s.deviceId != session?.deviceId { revocation = nil }
        session = s
        try sessionStore.save(s)
        onSessionChange?(s)
    }

    // MARK: Account sharing (D-54)

    /// The account's box key pair: `nil` until created (`404`).
    public func boxKey() async throws -> BoxKeyRecord? {
        do {
            return try await call("GET", "/me/box-key")
        } catch APIError.server(404, _, _) {
            return nil
        }
    }

    /// Once per account; the same data again is accepted, different data is `409`.
    public func putBoxKey(_ record: BoxKeyRecord) async throws {
        _ = try await send("PUT", "/me/box-key", body: record)
    }

    public func publicKey(userId: String) async throws -> Data {
        let r: PublicKeyRecord = try await call("GET", "/users/\(seg(userId))/public-key")
        return r.publicKey.data
    }

    /// The same answer whether or not an account has this email.
    public func invite(_ request: CreateInvitationRequest) async throws {
        _ = try await send("POST", "/invitations", body: request, idempotent: true)
    }

    public func invitations(for target: SharingTarget) async throws -> [OutgoingInvitation] {
        try await call("GET", "/invitations?target=\(target.kind.rawValue):\(seg(target.id))")
    }

    public func revokeInvitation(id: String) async throws { _ = try await send("DELETE", "/invitations/\(seg(id))") }

    public func incomingInvitations() async throws -> [IncomingInvitation] { try await call("GET", "/invitations/incoming") }

    public func acceptInvitation(id: String) async throws -> SharedItem {
        try await call("POST", "/invitations/\(seg(id))/accept", body: [String: String](), idempotent: true)
    }

    public func declineInvitation(id: String) async throws {
        _ = try await send("POST", "/invitations/\(seg(id))/decline", body: [String: String](), idempotent: true)
    }

    public func members(of target: SharingTarget) async throws -> [Member] {
        try await call("GET", "/members/\(target.kind.rawValue)/\(seg(target.id))")
    }

    public func setMemberRole(_ role: MemberRole, userId: String, in target: SharingTarget) async throws {
        _ = try await send("PATCH", "/members/\(target.kind.rawValue)/\(seg(target.id))/\(seg(userId))", body: ["role": role], idempotent: true)
    }

    /// The owner removes a member, or a member removes itself («Выйти»).
    public func removeMember(userId: String, from target: SharingTarget) async throws {
        _ = try await send("DELETE", "/members/\(target.kind.rawValue)/\(seg(target.id))/\(seg(userId))")
    }

    /// The owner gives a member the current key (`409` if `version` is not current).
    public func putMemberKey(_ request: PutMemberKeyRequest, userId: String, in target: SharingTarget) async throws {
        _ = try await send("PUT", "/members/\(target.kind.rawValue)/\(seg(target.id))/\(seg(userId))/key", body: request)
    }

    /// Atomic key rotation (`409` if `version` ≠ current + 1 or a member is missing).
    public func rotateKey(_ request: RotateKeyRequest, of target: SharingTarget) async throws {
        _ = try await send("POST", "/members/\(target.kind.rawValue)/\(seg(target.id))/rotate", body: request)
    }

    /// Notebooks: every note has its new key → clears `keyRotationPending`.
    public func rotationDone(notebookId: String) async throws {
        _ = try await send("POST", "/members/notebook/\(seg(notebookId))/rotate/done", body: [String: String](), idempotent: true)
    }

    public func sharedNoteKey(noteId: String) async throws -> NoteKeyState {
        try await call("GET", "/members/note/\(seg(noteId))/key")
    }

    public func sharedWithMe() async throws -> [SharedItem] { try await call("GET", "/shared-with-me") }

    public func sharedByMe() async throws -> [SharedByMeItem] { try await call("GET", "/shared-by-me") }

    // MARK: Shared spaces (D-62)

    /// Makes this account's space shared: `wrappedKey` is the space key under the master key.
    public func createSharedSpace(id: String, wrappedKey: Data) async throws -> SharedSpace {
        try await call("POST", "/spaces", body: CreateSpaceRequest(spaceId: id, wrappedKey: wrappedKey), idempotent: true)
    }

    /// Shared spaces this account owns or is a member of (with or without a key).
    public func sharedSpaces() async throws -> [SharedSpace] { try await call("GET", "/spaces") }

    /// The owner's space key with its version, chain and rotation state.
    public func spaceKeyState(id: String) async throws -> SpaceKeyState { try await call("GET", "/spaces/\(seg(id))/key") }

    /// The space's notebooks and their keys under the space key.
    public func spaceNotebooks(id: String) async throws -> [SpaceNotebook] { try await call("GET", "/spaces/\(seg(id))/notebooks") }

    /// The owner moves a personal notebook into the shared space (`409`: not the current
    /// version, or the notebook has its own members).
    public func moveNotebookIntoSpace(_ request: SpaceNotebookKeyRequest, notebookId: String, spaceId: String) async throws {
        _ = try await send("PUT", "/spaces/\(seg(spaceId))/notebooks/\(seg(notebookId))", body: request)
    }

    /// The owner moves a notebook out of the shared space with a new notebook key.
    public func moveNotebookOutOfSpace(_ request: MoveOutRequest, notebookId: String, spaceId: String) async throws {
        _ = try await send("POST", "/spaces/\(seg(spaceId))/notebooks/\(seg(notebookId))/move-out", body: request)
    }

    /// Atomic rotation of the space key and every notebook key of the space (crypto.md §11.4).
    public func rotateSpaceKey(_ request: RotateSpaceRequest, spaceId: String) async throws {
        _ = try await send("POST", "/spaces/\(seg(spaceId))/rotate", body: request)
    }

    public func spaceRotationDone(spaceId: String) async throws {
        _ = try await send("POST", "/spaces/\(seg(spaceId))/rotate/done", body: [String: String](), idempotent: true)
    }

    /// The owner deletes the shared space, its notebooks and documents.
    public func deleteSharedSpace(id: String) async throws { _ = try await send("DELETE", "/spaces/\(seg(id))") }

    /// Called once when the server reports this device revoked (D-53), from any request; the
    /// app wipes local data. Not called for expired or rejected tokens or network failures.
    public func setDeviceRevokedHandler(_ handler: (@Sendable (DeviceRevocationReason) -> Void)?) {
        deviceRevokedHandler = handler
    }

    /// Set once the server said this device is revoked.
    public private(set) var revocation: DeviceRevocationReason?

    private func deviceRevoked(_ reason: DeviceRevocationReason) {
        guard revocation == nil else { return }
        revocation = reason
        deviceRevokedHandler?(reason)
    }

    /// Refreshes 60 s before expiry; concurrent callers share one refresh.
    private func validSession(forceRefresh: Bool = false) async throws -> AuthSession {
        guard let s = session else { throw APIError.notAuthenticated }
        if !forceRefresh, let exp = s.accessExpiry, exp.timeIntervalSince(now()) > 60 { return s }
        if let task = refreshTask { return try await task.value }
        let task = Task { () throws -> AuthSession in
            // The server answers a repeat of the same token within 60 s with the same new session
            // (api.md), so a lost response is retried; all attempts fit in that window.
            let fresh: AuthSession = try await self.call("POST", "/auth/refresh", body: ["refreshToken": s.refreshToken], auth: false, idempotent: true)
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

    private func call<B: Encodable, R: Decodable>(_ method: String, _ path: String, body: B?, auth: Bool = true, idempotent: Bool? = nil) async throws -> R {
        let data = try await send(method, path, body: body, auth: auth, idempotent: idempotent)
        do {
            return try JSONDecoder().decode(R.self, from: data)
        } catch {
            throw APIError.invalidResponse("\(method) \(path): \(error) [\(Self.describe(data))]")
        }
    }

    /// For endpoints answering `204` (or whose body is not needed).
    @discardableResult
    private func send(_ method: String, _ path: String, auth: Bool = true) async throws -> Data {
        try await send(method, path, body: Optional<[String: String]>.none, auth: auth)
    }

    @discardableResult
    private func send<B: Encodable>(_ method: String, _ path: String, body: B?, auth: Bool = true, idempotent: Bool? = nil) async throws -> Data {
        let encoded = try body.map { try JSONEncoder().encode($0) }
        return try await raw(method, path, body: encoded, contentType: encoded == nil ? nil : "application/json", auth: auth, idempotent: idempotent)
    }

    /// A body that could not be decoded, for the error: its size and how it starts (a proxy's
    /// HTML page, a truncated or empty body). Payloads are encrypted, so nothing private shows.
    static func describe(_ data: Data) -> String {
        let start = String(decoding: data.prefix(80), as: UTF8.self)
            .replacingOccurrences(of: "\n", with: " ")
        return "\(data.count) bytes: \(start)"
    }

    /// Delay before retry `n` (1-based): base · 2ⁿ⁻¹ ± 30 %.
    private func retryDelay(_ n: Int) -> Duration {
        retryBaseDelay * (pow(2, Double(n - 1)) * Double.random(in: 0.7...1.3))
    }

    /// An id as one path segment; throws `UnsafePathError` for anything but letters, digits,
    /// `-` and `_` (an id with `/` would otherwise pass as several plain segments).
    private func seg(_ id: String) throws -> String {
        guard Self.isPlainSegment(Substring(id)) else { throw UnsafePathError(path: id) }
        return id
    }

    static func isPlainSegment(_ s: Substring) -> Bool {
        !s.isEmpty && s.unicodeScalars.allSatisfy { $0.isASCII && (CharacterSet.alphanumerics.contains($0) || $0 == "-" || $0 == "_") }
    }

    /// The endpoint URL. Ids in paths come from documents and servers: a segment like `..`,
    /// or one carrying `/`, `%`, `?` or `#`, could reach another endpoint, so only plain
    /// segments (letters, digits, `-`, `_`) are allowed.
    static func url(_ base: URL, _ path: String) throws -> URL {
        // An optional query (`?target=notebook:<id>`): letters, digits, `-`, `_`, `:`, `=`, `&`.
        let parts = path.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        let route = parts[0]
        let segments = route.dropFirst().split(separator: "/", omittingEmptySubsequences: false)
        let plain = segments.allSatisfy(isPlainSegment)
        let query = parts.count > 1 ? String(parts[1]) : nil
        let queryOK = query.map { q in
            !q.isEmpty && q.unicodeScalars.allSatisfy { $0.isASCII && (CharacterSet.alphanumerics.contains($0) || "-_:=&".unicodeScalars.contains($0)) }
        } ?? true
        guard route.hasPrefix("/"), plain, queryOK else { throw UnsafePathError(path: path) }
        let url = base.appendingPathComponent(String(route.dropFirst()))
        guard let query else { return url }
        var c = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        c.percentEncodedQuery = query
        return c.url!
    }

    /// - Parameter idempotent: repeating the request has the same effect; default by method
    ///   (GET, PUT, DELETE, HEAD).
    private func raw(_ method: String, _ path: String, body: Data?, contentType: String?, auth: Bool = true, idempotent: Bool? = nil) async throws -> Data {
        let idempotent = idempotent ?? ["GET", "PUT", "DELETE", "HEAD"].contains(method)
        var retried = false
        var attempt = 0
        while true {
            var request = URLRequest(url: try Self.url(baseURL, path))
            request.timeoutInterval = attemptTimeouts[min(attempt, attemptTimeouts.count - 1)]
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
            } catch let failure as TransportFailure {
                attempt += 1
                guard attempt < attemptTimeouts.count, failure.notSent || idempotent, !Task.isCancelled else {
                    throw APIError.transport(failure.message)
                }
                try await Task.sleep(for: retryDelay(attempt))
                continue
            } catch {
                throw APIError.transport(String(describing: error))
            }
            if [502, 503, 504].contains(response.statusCode), idempotent, attempt + 1 < attemptTimeouts.count {
                attempt += 1
                try await Task.sleep(for: retryDelay(attempt))
                continue
            }
            if (200..<300).contains(response.statusCode) { return data }
            switch APIFailure.classify(status: response.statusCode, body: data) {
            case .deviceRevoked(let reason):
                // D-53: never retried or refreshed (a refresh is refused the same way).
                deviceRevoked(reason)
                throw DeviceRevokedError(reason: reason)
            case .unauthorized where auth && !retried:
                retried = true
                continue
            case .unauthorized:
                let fields = APIFailure.errorBody(data)
                throw APIError.server(status: 401, code: fields?.code ?? "unauthorized", message: fields?.message ?? "HTTP 401")
            case .network:
                throw APIError.transport("HTTP \(response.statusCode)")
            case .error(let status, let code, let message):
                throw APIError.server(status: status, code: code ?? "internal", message: message)
            }
        }
    }
}
