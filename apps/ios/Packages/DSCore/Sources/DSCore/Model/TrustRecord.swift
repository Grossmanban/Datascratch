import Foundation

/// What this account itself did in sharing, kept in its end-to-end encrypted account document
/// (root `trust`, document-model.md §2; security review 2026-11-02). The server lists members,
/// their public keys and key versions — none of which it can be trusted with: a compromised
/// server could name a member that was never invited (to be handed the notebook key), swap a
/// member's public key, or hand back an old key after a rotation. Clients check its answers
/// against this record. Same format as shared sharing/trust.ts: web and iOS read each other's.
///
/// Flat keys in one map, so concurrent writes of two devices never overwrite each other:
///
///     invite|<kind>|<id>|<email>    → ISO time   this account invited <email> to the resource
///     member|<kind>|<id>|<userId>   → publicKey  this account gave the resource's key to <userId>
///     key|<kind>|<id>|<version>     → true       this account has seen key <version> of the resource
///     migrated                      → ISO time   members that had keys before the record existed
///                                                were taken over once (trust on first use)
public struct TrustRecord: Sendable {
    public static let root = "trust"
    public let account: AccountDocument

    public init(_ account: AccountDocument) {
        self.account = account
    }

    private static func resource(_ target: SharingTarget) -> String { "\(target.kind.rawValue)|\(target.id)" }

    private func value(_ key: String) -> YValue? {
        switch account.crdt.mapValue(Self.root, [key]) {
        case nil, .undefined?: nil
        case let value?: value
        }
    }

    private func set(_ key: String, _ value: YValue) throws {
        // Written by the app, not the person: pushed, never undone.
        try account.crdt.transact(origin: .system) { $0.set(Self.root, key: key, value) }
    }

    public func recordInvite(_ target: SharingTarget, email: String, at date: Date = Date()) throws {
        try set("invite|\(Self.resource(target))|\(normalizeEmail(email))", .string(value: DSDate.iso(date)))
    }

    /// `userId` got the key of `target` wrapped for `publicKey` (base64url, as the server gives it).
    public func recordMemberKey(_ target: SharingTarget, userId: String, publicKey: String) throws {
        let key = "member|\(Self.resource(target))|\(userId)"
        if value(key)?.stringValue != publicKey { try set(key, .string(value: publicKey)) }
    }

    public var isMigrated: Bool { value("migrated")?.stringValue != nil }

    public func markMigrated(at date: Date = Date()) throws {
        if value("migrated") == nil { try set("migrated", .string(value: DSDate.iso(date))) }
    }

    /// May `userId` get the key of `target` (wrapped for `publicKey`) without asking the owner?
    /// Known: this account gave them a key for this public key before, or invited their address.
    /// Before the record existed (not migrated yet) everyone the server names is taken over once.
    public func memberTrust(_ target: SharingTarget, userId: String, email: String?, publicKey: String) -> MemberTrust {
        if let pinned = value("member|\(Self.resource(target))|\(userId)")?.stringValue {
            return pinned == publicKey ? .known : .keyChanged
        }
        if let email, !email.isEmpty, value("invite|\(Self.resource(target))|\(normalizeEmail(email))") != nil { return .known }
        return isMigrated ? .notInvited : .known
    }

    public func recordKeyVersion(_ target: SharingTarget, _ version: Int) throws {
        // Version 1 is the floor: there is nothing older to roll back to, and opening a document
        // on a new device must not write to the account document.
        guard version > 1 else { return }
        let key = "key|\(Self.resource(target))|\(version)"
        if value(key) == nil { try set(key, .bool(value: true)) }
    }

    /// The newest key version of `target` this account has seen (0: none recorded).
    public func knownKeyVersion(_ target: SharingTarget) -> Int {
        let prefix = "key|\(Self.resource(target))|"
        return account.crdt.mapKeys(Self.root)
            .filter { $0.hasPrefix(prefix) }
            .compactMap { Int($0.dropFirst(prefix.count)) }
            .max() ?? 0
    }
}

/// Whether a member may get a key without the owner saying so (`TrustRecord.memberTrust`).
public enum MemberTrust: String, Sendable {
    case known
    /// This account has no record of inviting them: the server named them.
    case notInvited = "not_invited"
    /// Their public key is not the one this account gave a key to before.
    case keyChanged = "key_changed"
}

extension AccountDocument {
    /// This account's own record of its sharing (`TrustRecord`).
    public var trust: TrustRecord { TrustRecord(self) }
}
