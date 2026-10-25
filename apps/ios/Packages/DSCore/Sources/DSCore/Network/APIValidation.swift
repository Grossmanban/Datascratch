import Foundation

// Request bodies and validation of REST payloads (api.md; mirrors the zod schemas of
// packages/shared/src/contracts/api.ts, checked by vector api/bodies.json). Decoding rejects
// what the server would reject, so malformed responses fail loudly and requests can be checked
// before sending.

enum APIValidation {
    static func fail<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K, _ why: String) -> DecodingError {
        DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: why)
    }

    static func uuid<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String {
        let s = try c.decode(String.self, forKey: k)
        guard EntityID.isValid(s) else { throw fail(c, k, "expected lowercase UUIDv7") }
        return s
    }

    static func optionalUUID<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String? {
        guard c.contains(k), try !c.decodeNil(forKey: k) else { return nil }
        return try uuid(c, k)
    }

    static func bytes<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K, length: Int? = nil, nonEmpty: Bool = false) throws -> Base64URLData {
        let d = try c.decode(Base64URLData.self, forKey: k)
        if let length, d.data.count != length { throw fail(c, k, "expected \(length) bytes") }
        if nonEmpty, d.data.isEmpty { throw fail(c, k, "empty") }
        return d
    }

    static func string<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K, max: Int = .max) throws -> String {
        let s = try c.decode(String.self, forKey: k)
        guard !s.isEmpty, s.count <= max else { throw fail(c, k, "expected 1...\(max) characters") }
        return s
    }

    static func optionalString<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K, max: Int) throws -> String? {
        guard c.contains(k), try !c.decodeNil(forKey: k) else { return nil }
        return try string(c, k, max: max)
    }

    /// `2026-10-25T12:00:00.000Z` (milliseconds required).
    static func isoDateTime<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String {
        let s = try c.decode(String.self, forKey: k)
        guard isISODateTime(s) else { throw fail(c, k, "expected ISO 8601 UTC with milliseconds") }
        return s
    }

    static func optionalISODateTime<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String? {
        guard c.contains(k), try !c.decodeNil(forKey: k) else { return nil }
        return try isoDateTime(c, k)
    }

    static func isISODateTime(_ s: String) -> Bool {
        let u = Array(s.utf8)
        guard u.count == 24 else { return false }
        let pattern = Array("dddd-dd-ddTdd:dd:dd.dddZ".utf8)
        for (c, p) in zip(u, pattern) {
            if p == UInt8(ascii: "d") { if !(48...57).contains(c) { return false } } else if c != p { return false }
        }
        return DSDate.parseISO(s) != nil
    }

    /// Emails after trim + lowercase, with a plausible `local@domain.tld` shape.
    static func email<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String {
        let s = normalizeEmail(try c.decode(String.self, forKey: k))
        let parts = s.split(separator: "@", omittingEmptySubsequences: false)
        guard s.count <= 254, parts.count == 2, !parts[0].isEmpty, parts[1].contains("."),
              !parts[1].hasPrefix("."), !parts[1].hasSuffix("."), !s.contains(" ") else { throw fail(c, k, "expected an email") }
        return s
    }
}

extension KDFParams {
    enum CodingKeys: String, CodingKey { case alg, ops, mem }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        alg = try c.decode(String.self, forKey: .alg)
        ops = try c.decode(Int.self, forKey: .ops)
        mem = try c.decode(Int.self, forKey: .mem)
        guard alg == "argon2id13" else { throw APIValidation.fail(c, .alg, "unknown KDF") }
        guard (1...64).contains(ops) else { throw APIValidation.fail(c, .ops, "ops out of range") }
        guard (8 * 1024 * 1024 ... 4 * 1024 * 1024 * 1024).contains(mem) else { throw APIValidation.fail(c, .mem, "mem out of range") }
    }
}

public struct PreloginRequest: Codable, Sendable {
    public var email: String

    public init(email: String) { self.email = normalizeEmail(email) }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        email = try APIValidation.email(c, .email)
    }
}

extension PreloginResponse {
    enum CodingKeys: String, CodingKey { case salt, kdf }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        salt = try APIValidation.bytes(c, .salt, length: DSCrypto.saltLength)
        kdf = try c.decode(KDFParams.self, forKey: .kdf)
    }
}

extension SignupRequest {
    enum CodingKeys: String, CodingKey {
        case email, salt, kdf, loginKey, recoveryLoginKey, wrappedMasterKeyPassword, wrappedMasterKeyRecovery, userId, accountDocId, deviceName
    }

    public init(from decoder: any Decoder) throws {
        typealias V = APIValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        email = try V.email(c, .email)
        salt = try V.bytes(c, .salt, length: DSCrypto.saltLength)
        kdf = try c.decode(KDFParams.self, forKey: .kdf)
        loginKey = try V.bytes(c, .loginKey, length: 32)
        recoveryLoginKey = try V.bytes(c, .recoveryLoginKey, length: 32)
        wrappedMasterKeyPassword = try V.bytes(c, .wrappedMasterKeyPassword, nonEmpty: true)
        wrappedMasterKeyRecovery = try V.bytes(c, .wrappedMasterKeyRecovery, nonEmpty: true)
        userId = try V.uuid(c, .userId)
        accountDocId = try V.uuid(c, .accountDocId)
        deviceName = try V.optionalString(c, .deviceName, max: 200)
    }
}

public struct LoginRequest: Codable, Sendable {
    public var email: String
    public var loginKey: Base64URLData
    public var deviceName: String

    public init(email: String, loginKey: Data, deviceName: String) {
        self.email = normalizeEmail(email)
        self.loginKey = .init(loginKey)
        self.deviceName = deviceName
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        email = try APIValidation.email(c, .email)
        loginKey = try APIValidation.bytes(c, .loginKey, length: 32)
        deviceName = try APIValidation.string(c, .deviceName, max: 200)
    }
}

public struct RecoveryFinishRequest: Codable, Sendable {
    public var recoveryToken: String
    public var salt: Base64URLData
    public var kdf: KDFParams
    public var loginKey: Base64URLData
    public var wrappedMasterKeyPassword: Base64URLData
    public var deviceName: String?

    public init(recoveryToken: String, material: PasswordChangeMaterial, deviceName: String? = nil) {
        self.recoveryToken = recoveryToken
        salt = .init(material.salt)
        kdf = material.kdf
        loginKey = .init(material.loginKey)
        wrappedMasterKeyPassword = .init(material.wrappedMasterKeyPassword)
        self.deviceName = deviceName
    }

    public init(from decoder: any Decoder) throws {
        typealias V = APIValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        recoveryToken = try V.string(c, .recoveryToken)
        salt = try V.bytes(c, .salt, length: DSCrypto.saltLength)
        kdf = try c.decode(KDFParams.self, forKey: .kdf)
        loginKey = try V.bytes(c, .loginKey, length: 32)
        wrappedMasterKeyPassword = try V.bytes(c, .wrappedMasterKeyPassword, nonEmpty: true)
        deviceName = try V.optionalString(c, .deviceName, max: 200)
    }
}

public struct CreateNotebookRequest: Codable, Sendable {
    public var notebookId: String
    public var mode: NotebookMode
    public var wrappedKey: Base64URLData
    /// Raw notebook key — only (and always) for `mode = .agent` (crypto.md §8).
    public var notebookKey: Base64URLData?

    public init(notebookId: String, mode: NotebookMode, wrappedKey: Data, notebookKey: Data?) {
        self.notebookId = notebookId
        self.mode = mode
        self.wrappedKey = .init(wrappedKey)
        self.notebookKey = notebookKey.map(Base64URLData.init)
    }

    public init(from decoder: any Decoder) throws {
        typealias V = APIValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        notebookId = try V.uuid(c, .notebookId)
        mode = try c.decode(NotebookMode.self, forKey: .mode)
        wrappedKey = try V.bytes(c, .wrappedKey, nonEmpty: true)
        notebookKey = c.contains(.notebookKey) ? try V.bytes(c, .notebookKey, length: 32) : nil
        guard (mode == .agent) == (notebookKey != nil) else {
            throw V.fail(c, .notebookKey, "notebookKey is required for mode=agent and forbidden for mode=private")
        }
    }
}

public struct RegisterDocRequest: Codable, Sendable {
    public var docId: String
    public var kind: DocKind
    /// nil only for the account document; equals `docId` for a notebook document.
    public var notebookId: String?

    enum CodingKeys: String, CodingKey { case docId, kind, notebookId }

    public init(docId: String, kind: DocKind, notebookId: String?) {
        self.docId = docId
        self.kind = kind
        self.notebookId = notebookId
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(docId, forKey: .docId)
        try c.encode(kind, forKey: .kind)
        try c.encode(notebookId, forKey: .notebookId) // explicit null
    }

    public init(from decoder: any Decoder) throws {
        typealias V = APIValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        docId = try V.uuid(c, .docId)
        kind = try c.decode(DocKind.self, forKey: .kind)
        notebookId = try V.optionalUUID(c, .notebookId)
        guard (kind == .account) == (notebookId == nil) else {
            throw V.fail(c, .notebookId, "notebookId must be null for account documents and set otherwise")
        }
        guard kind != .notebook || docId == notebookId else { throw V.fail(c, .docId, "a notebook document's docId equals its notebookId") }
    }
}

/// `PATCH /docs/:id` — move a note to another notebook of the same user.
public struct MoveDocRequest: Codable, Sendable {
    public var notebookId: String

    public init(notebookId: String) { self.notebookId = notebookId }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        notebookId = try APIValidation.uuid(c, .notebookId)
    }
}

public struct CreateShareRequest: Codable, Sendable {
    public var shareId: String
    public var target: ShareTarget
    public var permission: SharePermission
    public var expiresAt: String?

    enum CodingKeys: String, CodingKey { case shareId, target, permission, expiresAt }

    public init(shareId: String, target: ShareTarget, permission: SharePermission, expiresAt: Date?) {
        self.shareId = shareId
        self.target = target
        self.permission = permission
        self.expiresAt = expiresAt.map(DSDate.iso)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(shareId, forKey: .shareId)
        try c.encode(target, forKey: .target)
        try c.encode(permission, forKey: .permission)
        try c.encode(expiresAt, forKey: .expiresAt) // explicit null = no expiry
    }

    public init(from decoder: any Decoder) throws {
        typealias V = APIValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        shareId = try V.uuid(c, .shareId)
        target = try c.decode(ShareTarget.self, forKey: .target)
        permission = try c.decode(SharePermission.self, forKey: .permission)
        expiresAt = try V.optionalISODateTime(c, .expiresAt)
    }
}

extension ShareTarget {
    enum CodingKeys: String, CodingKey { case kind, id }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        kind = try c.decode(Kind.self, forKey: .kind)
        id = try APIValidation.uuid(c, .id)
    }
}

extension AuthSession {
    enum CodingKeys: String, CodingKey { case userId, deviceId, accessToken, refreshToken, accessExpiresAt, wrappedMasterKeyPassword, accountDocId }

    public init(from decoder: any Decoder) throws {
        typealias V = APIValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try V.uuid(c, .userId)
        deviceId = try V.string(c, .deviceId)
        accessToken = try V.string(c, .accessToken)
        refreshToken = try V.string(c, .refreshToken)
        accessExpiresAt = try V.isoDateTime(c, .accessExpiresAt)
        wrappedMasterKeyPassword = try V.bytes(c, .wrappedMasterKeyPassword, nonEmpty: true)
        accountDocId = try V.uuid(c, .accountDocId)
    }
}

extension AttachmentStatus {
    enum CodingKeys: String, CodingKey { case size, chunkCount, mime, uploadedChunks }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        size = try c.decode(Int64.self, forKey: .size)
        chunkCount = try c.decode(Int.self, forKey: .chunkCount)
        mime = try APIValidation.string(c, .mime, max: 255)
        uploadedChunks = try c.decode([Int].self, forKey: .uploadedChunks)
        guard size >= 0, chunkCount > 0, uploadedChunks.allSatisfy({ $0 >= 0 }) else { throw APIValidation.fail(c, .size, "invalid status") }
    }
}

/// REST error codes (api.md «Общее»).
public enum APIErrorCode: String, Codable, Sendable {
    case badRequest = "bad_request", unauthorized, forbidden, notFound = "not_found", conflict
    case rateLimited = "rate_limited", payloadTooLarge = "payload_too_large", `internal`
}

extension APIErrorBody.Inner {
    enum CodingKeys: String, CodingKey { case code, message }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        code = try c.decode(APIErrorCode.self, forKey: .code).rawValue
        message = try c.decode(String.self, forKey: .message)
    }
}
