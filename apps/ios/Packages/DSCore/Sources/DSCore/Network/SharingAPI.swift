import Foundation

// Account sharing (D-54, api.md «Совместный доступ по аккаунтам»), validated like the TS schemas.

/// Who made an update or a version (set by the server, api.md `Author`).
public enum UpdateAuthor: Codable, Hashable, Sendable {
    case user(userId: String)
    case guest(shareId: String)
    case agent(tokenId: String)

    enum CodingKeys: String, CodingKey { case kind, userId, shareId, tokenId }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .kind) {
        case "user": self = .user(userId: try APIValidation.uuid(c, .userId))
        case "guest": self = .guest(shareId: try APIValidation.uuid(c, .shareId))
        case "agent": self = .agent(tokenId: try APIValidation.string(c, .tokenId, max: 128))
        case let k: throw APIValidation.fail(c, .kind, "unknown author kind \(k)")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .user(let id): try c.encode("user", forKey: .kind); try c.encode(id, forKey: .userId)
        case .guest(let id): try c.encode("guest", forKey: .kind); try c.encode(id, forKey: .shareId)
        case .agent(let id): try c.encode("agent", forKey: .kind); try c.encode(id, forKey: .tokenId)
        }
    }
}

public enum MemberRole: String, Codable, Hashable, Sendable { case editor, viewer }

/// A notebook or a note shared with accounts (`{ kind, id }`; spaces and folders cannot be shared).
public struct SharingTarget: Codable, Hashable, Sendable {
    public var kind: ShareTargetKind
    public var id: String

    public init(kind: ShareTargetKind, id: String) {
        self.kind = kind
        self.id = id
    }

    enum CodingKeys: String, CodingKey { case kind, id }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        kind = try c.decode(ShareTargetKind.self, forKey: .kind)
        id = try APIValidation.uuid(c, .id)
    }
}

/// `GET/PUT /me/box-key`.
public struct BoxKeyRecord: Codable, Hashable, Sendable {
    public var publicKey: Base64URLData
    public var wrappedSecretKey: Base64URLData

    public init(publicKey: Data, wrappedSecretKey: Data) {
        self.publicKey = .init(publicKey)
        self.wrappedSecretKey = .init(wrappedSecretKey)
    }

    enum CodingKeys: String, CodingKey { case publicKey, wrappedSecretKey }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        publicKey = try APIValidation.bytes(c, .publicKey, length: DSCrypto.boxKeyLength)
        wrappedSecretKey = try APIValidation.bytes(c, .wrappedSecretKey, nonEmpty: true)
    }
}

public struct CreateInvitationRequest: Codable, Hashable, Sendable {
    public var invitationId: String
    public var target: SharingTarget
    public var email: String
    public var role: MemberRole

    public init(invitationId: String, target: SharingTarget, email: String, role: MemberRole) {
        self.invitationId = invitationId
        self.target = target
        self.email = normalizeEmail(email)
        self.role = role
    }

    enum CodingKeys: String, CodingKey { case invitationId, target, email, role }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        invitationId = try APIValidation.uuid(c, .invitationId)
        target = try c.decode(SharingTarget.self, forKey: .target)
        email = try APIValidation.email(c, .email)
        role = try c.decode(MemberRole.self, forKey: .role)
    }
}

public enum InvitationStatus: String, Codable, Hashable, Sendable { case pending, accepted, declined, expired }

/// Outgoing invitation of a resource (`GET /invitations?target=`).
public struct OutgoingInvitation: Codable, Hashable, Sendable {
    public var id: String
    public var email: String
    public var role: MemberRole
    public var status: InvitationStatus
    public var createdAt: String
    public var expiresAt: String

    enum CodingKeys: String, CodingKey { case id, email, role, status, createdAt, expiresAt }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try APIValidation.uuid(c, .id)
        email = try APIValidation.email(c, .email)
        role = try c.decode(MemberRole.self, forKey: .role)
        status = try c.decode(InvitationStatus.self, forKey: .status)
        createdAt = try APIValidation.isoDateTime(c, .createdAt)
        expiresAt = try APIValidation.isoDateTime(c, .expiresAt)
    }
}

public struct InvitationSender: Codable, Hashable, Sendable {
    public var userId: String
    public var email: String

    enum CodingKeys: String, CodingKey { case userId, email }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try APIValidation.uuid(c, .userId)
        email = try APIValidation.email(c, .email)
    }
}

/// `GET /invitations/incoming` (pending only).
public struct IncomingInvitation: Codable, Hashable, Sendable {
    public var id: String
    public var target: SharingTarget
    public var from: InvitationSender
    public var role: MemberRole
    public var createdAt: String
    public var expiresAt: String

    enum CodingKeys: String, CodingKey { case id, target, from, role, createdAt, expiresAt }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try APIValidation.uuid(c, .id)
        target = try c.decode(SharingTarget.self, forKey: .target)
        from = try c.decode(InvitationSender.self, forKey: .from)
        role = try c.decode(MemberRole.self, forKey: .role)
        createdAt = try APIValidation.isoDateTime(c, .createdAt)
        expiresAt = try APIValidation.isoDateTime(c, .expiresAt)
    }
}

public enum MemberStatus: String, Codable, Hashable, Sendable {
    case active
    /// Accepted; the owner's client has not given it the key yet.
    case awaitingKey = "awaiting_key"
}

public struct Member: Codable, Hashable, Sendable {
    public var userId: String
    public var email: String
    public var role: MemberRole
    public var status: MemberStatus
    public var joinedAt: String
    /// Registered after the invitation: the owner confirms before the key is given (D-54).
    public var accountCreatedAfterInvite: Bool

    enum CodingKeys: String, CodingKey { case userId, email, role, status, joinedAt, accountCreatedAfterInvite }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try APIValidation.uuid(c, .userId)
        email = try APIValidation.email(c, .email)
        role = try c.decode(MemberRole.self, forKey: .role)
        status = try c.decode(MemberStatus.self, forKey: .status)
        joinedAt = try APIValidation.isoDateTime(c, .joinedAt)
        accountCreatedAfterInvite = try c.decode(Bool.self, forKey: .accountCreatedAfterInvite)
    }
}

public struct PutMemberKeyRequest: Codable, Hashable, Sendable {
    public var version: Int
    public var wrappedKey: Base64URLData

    public init(version: Int, wrappedKey: Data) {
        self.version = version
        self.wrappedKey = .init(wrappedKey)
    }

    enum CodingKeys: String, CodingKey { case version, wrappedKey }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        version = try c.decode(Int.self, forKey: .version)
        guard version >= 1 else { throw APIValidation.fail(c, .version, "version ≥ 1") }
        wrappedKey = try APIValidation.bytes(c, .wrappedKey, nonEmpty: true)
    }
}

public struct MemberKey: Codable, Hashable, Sendable {
    public var userId: String
    public var wrappedKey: Base64URLData

    public init(userId: String, wrappedKey: Data) {
        self.userId = userId
        self.wrappedKey = .init(wrappedKey)
    }

    enum CodingKeys: String, CodingKey { case userId, wrappedKey }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try APIValidation.uuid(c, .userId)
        wrappedKey = try APIValidation.bytes(c, .wrappedKey, nonEmpty: true)
    }
}

/// `POST /members/:kind/:id/rotate` (crypto.md §10.3).
public struct RotateKeyRequest: Codable, Hashable, Sendable {
    public var version: Int
    public var ownerWrappedKey: Base64URLData
    public var previousKeyWrap: Base64URLData
    public var memberKeys: [MemberKey]
    /// Notebooks in agent mode only: the new key in the clear for the server (crypto.md §8).
    public var notebookKey: Base64URLData?

    public init(version: Int, ownerWrappedKey: Data, previousKeyWrap: Data, memberKeys: [MemberKey], notebookKey: Data? = nil) {
        self.version = version
        self.ownerWrappedKey = .init(ownerWrappedKey)
        self.previousKeyWrap = .init(previousKeyWrap)
        self.memberKeys = memberKeys
        self.notebookKey = notebookKey.map(Base64URLData.init)
    }

    enum CodingKeys: String, CodingKey { case version, ownerWrappedKey, previousKeyWrap, memberKeys, notebookKey }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        version = try c.decode(Int.self, forKey: .version)
        guard version >= 2 else { throw APIValidation.fail(c, .version, "a rotation produces version ≥ 2") }
        ownerWrappedKey = try APIValidation.bytes(c, .ownerWrappedKey, nonEmpty: true)
        previousKeyWrap = try APIValidation.bytes(c, .previousKeyWrap, nonEmpty: true)
        memberKeys = try c.decode([MemberKey].self, forKey: .memberKeys)
        guard Set(memberKeys.map(\.userId)).count == memberKeys.count else { throw APIValidation.fail(c, .memberKeys, "duplicate member") }
        notebookKey = c.contains(.notebookKey) ? try APIValidation.bytes(c, .notebookKey, length: DSCrypto.keyLength) : nil
    }
}

public struct SharedOwner: Codable, Hashable, Sendable {
    public var userId: String
    public var email: String
    public var publicKey: Base64URLData

    enum CodingKeys: String, CodingKey { case userId, email, publicKey }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try APIValidation.uuid(c, .userId)
        email = try APIValidation.email(c, .email)
        publicKey = try APIValidation.bytes(c, .publicKey, length: DSCrypto.boxKeyLength)
    }
}

/// `GET /shared-with-me`, `POST /invitations/:id/accept`.
public struct SharedItem: Codable, Hashable, Sendable {
    public var target: SharingTarget
    public var owner: SharedOwner
    public var role: MemberRole
    public var keyVersion: Int
    /// The key wrapped for this account (crypto.md §10.2); nil until the owner's client gives it.
    public var wrappedKey: Base64URLData?
    /// Links from the current version back (crypto.md §10.3).
    public var keyChain: [Base64URLData]
    /// Documents of the resource (index and notes of a notebook, or the one note).
    public var docIds: [String]
    public var addedAt: String

    enum CodingKeys: String, CodingKey { case target, owner, role, keyVersion, wrappedKey, keyChain, docIds, addedAt }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        target = try c.decode(SharingTarget.self, forKey: .target)
        owner = try c.decode(SharedOwner.self, forKey: .owner)
        role = try c.decode(MemberRole.self, forKey: .role)
        keyVersion = try c.decode(Int.self, forKey: .keyVersion)
        guard keyVersion >= 1 else { throw APIValidation.fail(c, .keyVersion, "version ≥ 1") }
        // Nullable but required.
        wrappedKey = try c.decodeNil(forKey: .wrappedKey) ? nil : try APIValidation.bytes(c, .wrappedKey, nonEmpty: true)
        keyChain = try c.decode([Base64URLData].self, forKey: .keyChain)
        docIds = try c.decode([String].self, forKey: .docIds)
        guard docIds.allSatisfy(EntityID.isValid) else { throw APIValidation.fail(c, .docIds, "expected lowercase UUIDv7") }
        addedAt = try APIValidation.isoDateTime(c, .addedAt)
    }

    /// Who wrapped `wrappedKey` for whom, at which version.
    public func memberKeyRef(memberUserId: String) -> MemberKeyRef {
        MemberKeyRef(kind: target.kind, targetId: target.id, version: keyVersion, fromUserId: owner.userId, toUserId: memberUserId)
    }
}

/// `GET /members/note/:id/key`: the current key of a note shared on its own (owner only).
public struct NoteKeyState: Codable, Hashable, Sendable {
    public var version: Int
    public var ownerWrappedKey: Base64URLData
    public var keyChain: [Base64URLData]
}

/// Owner's `GET /notebooks/:id/key` with sharing fields (D-54).
public struct NotebookKeyState: Codable, Hashable, Sendable {
    public var wrappedKey: Base64URLData
    public var version: Int?
    public var keyChain: [Base64URLData]?
    public var keyRotationPending: Bool?
}

public struct PublicKeyRecord: Codable, Hashable, Sendable {
    public var userId: String
    public var publicKey: Base64URLData

    enum CodingKeys: String, CodingKey { case userId, publicKey }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try APIValidation.uuid(c, .userId)
        publicKey = try APIValidation.bytes(c, .publicKey, length: DSCrypto.boxKeyLength)
    }
}
