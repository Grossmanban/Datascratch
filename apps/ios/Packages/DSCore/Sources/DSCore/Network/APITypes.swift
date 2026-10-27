import Foundation

// Request/response bodies of the REST API (api.md v1; mirrors packages/shared/src/contracts/api.ts).
// Binary fields are base64url without padding (`Base64URLData`).

public struct APIErrorBody: Codable, Sendable {
    public struct Inner: Codable, Sendable {
        public var code: String
        public var message: String
        /// `device_revoked` (D-53).
        public var reason: DeviceRevocationReason?
        /// `rate_limited`.
        public var retryAfterMs: Int?
    }
    public var error: Inner
}

/// A request path would contain an unsafe segment (an id with `..`, `/` and the like); the
/// request is not sent.
public struct UnsafePathError: Error, Equatable, Sendable {
    public var path: String
}

public enum APIError: Error, Equatable, Sendable {
    /// `{ error: { code, message } }` with the HTTP status.
    case server(status: Int, code: String, message: String)
    /// No usable session (signed out or refresh token rejected).
    case notAuthenticated
    case invalidResponse(String)
    case transport(String)

    public var code: String? {
        if case .server(_, let code, _) = self { return code }
        return nil
    }
}

/// `Session` (api.md «Аутентификация»).
public struct AuthSession: Codable, Hashable, Sendable {
    public var userId: String
    /// This device's session id on the server (`DELETE /devices/:id`).
    public var deviceId: String
    public var accessToken: String
    public var refreshToken: String
    public var accessExpiresAt: String
    public var wrappedMasterKeyPassword: Base64URLData
    public var accountDocId: String

    public var accessExpiry: Date? { DSDate.parseISO(accessExpiresAt) }
}

public struct PreloginResponse: Codable, Hashable, Sendable {
    public var salt: Base64URLData
    public var kdf: KDFParams
}

public struct SignupRequest: Codable, Sendable {
    public var email: String
    public var salt: Base64URLData
    public var kdf: KDFParams
    public var loginKey: Base64URLData
    public var recoveryLoginKey: Base64URLData
    public var wrappedMasterKeyPassword: Base64URLData
    public var wrappedMasterKeyRecovery: Base64URLData
    public var userId: String
    public var accountDocId: String
    public var deviceName: String?
}

public struct RecoveryStartResponse: Codable, Hashable, Sendable {
    public var recoveryToken: String
    public var wrappedMasterKeyRecovery: Base64URLData
    public var userId: String
}

public struct MeResponse: Codable, Hashable, Sendable {
    public var userId: String
    public var email: String
    public var accountDocId: String
    public var createdAt: String
}

public struct Device: Codable, Hashable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var createdAt: String
    public var lastSeenAt: String
    public var current: Bool
}

public struct NotebookInfo: Codable, Hashable, Sendable, Identifiable {
    public var id: String
    public var mode: NotebookMode
    public var createdAt: String
    public var wrappedKey: Base64URLData
}

public struct DocVersion: Codable, Hashable, Sendable {
    public var seq: Int64
    public var createdAt: String
    public var deviceId: String
}

public struct AttachmentStatus: Codable, Hashable, Sendable {
    public var size: Int64
    public var chunkCount: Int
    public var mime: String
    public var uploadedChunks: [Int]
}

public enum SharePermission: String, Codable, Sendable { case view, edit }

public struct ShareTarget: Codable, Hashable, Sendable {
    public enum Kind: String, Codable, Sendable { case note, notebook }
    public var kind: Kind
    public var id: String

    public init(kind: Kind, id: String) {
        self.kind = kind
        self.id = id
    }
}

public struct Share: Codable, Hashable, Sendable, Identifiable {
    public var id: String
    public var target: ShareTarget
    public var permission: SharePermission
    public var expiresAt: String?
    public var createdAt: String
}

public struct GuestSession: Codable, Hashable, Sendable {
    public var guestToken: String
    public var target: ShareTarget
    public var permission: SharePermission
    public var docIds: [String]
}

public enum AgentPermission: String, Codable, Sendable { case read, readWrite = "read_write" }

public struct AgentToken: Codable, Hashable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var notebookIds: [String]
    public var permission: AgentPermission
    public var expiresAt: String?
    public var createdAt: String
    public var lastUsedAt: String?
}

public struct CreatedAgentToken: Codable, Hashable, Sendable {
    public var id: String
    /// Shown once.
    public var token: String
}

public struct HealthResponse: Codable, Hashable, Sendable {
    public var ok: Bool
    public var version: String
}

/// Emails are compared after trim + lowercase (same as the server).
public func normalizeEmail(_ email: String) -> String {
    email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
}
