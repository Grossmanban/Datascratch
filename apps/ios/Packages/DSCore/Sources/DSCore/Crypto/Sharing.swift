import Clibsodium
import Foundation

/// What can be shared with another account (D-54).
public enum ShareTargetKind: String, Codable, Hashable, Sendable {
    case notebook, note
}

/// An account's X25519 key pair (crypto.md §10.1).
public struct BoxKeyPair: Sendable, Equatable {
    public var publicKey: Data
    public var secretKey: Data
}

/// Which key a member wrap carries (crypto.md §10.2).
public struct MemberKeyRef: Sendable, Equatable {
    public var kind: ShareTargetKind
    public var targetId: String
    public var version: Int
    public var fromUserId: String
    public var toUserId: String

    public init(kind: ShareTargetKind, targetId: String, version: Int, fromUserId: String, toUserId: String) {
        self.kind = kind
        self.targetId = targetId
        self.version = version
        self.fromUserId = fromUserId
        self.toUserId = toUserId
    }
}

extension CryptoAD {
    public static func accountBoxKey(_ userId: String) -> String { "ds1|key|account-box|\(userId)" }

    /// Key of a notebook or note at `version` (§10.3): version 1 keeps the original `ad`.
    public static func targetKey(_ kind: ShareTargetKind, _ id: String, version: Int) -> String {
        version <= 1 ? "ds1|key|\(kind.rawValue)|\(id)" : "ds1|key|\(kind.rawValue)|\(id)|\(version)"
    }

    public static func memberKey(_ r: MemberKeyRef) -> String {
        "ds1|key|member|\(r.kind.rawValue)|\(r.targetId)|\(r.version)|\(r.fromUserId)|\(r.toUserId)"
    }

    /// Chain link: the key of `version - 1` wrapped by the key of `version`.
    public static func previousKey(_ kind: ShareTargetKind, _ id: String, version: Int) -> String {
        "ds1|key|prev|\(kind.rawValue)|\(id)|\(version)"
    }
}

/// Account sharing (crypto.md §10, TS `packages/shared/src/crypto/sharing.ts`).
extension DSCrypto {
    public static let boxKeyLength = 32
    static let memberWrapContext = "ds1|member-wrap"
    static let safetyCodeContext = "ds1|safety-code"

    /// A new X25519 key pair; `seed` (32 bytes) only for test vectors.
    public static func newBoxKeyPair(seed: Data? = nil) throws -> BoxKeyPair {
        try ensureReady()
        var pk = [UInt8](repeating: 0, count: boxKeyLength)
        var sk = [UInt8](repeating: 0, count: boxKeyLength)
        let rc: Int32
        if let seed {
            guard seed.count == 32 else { throw CryptoError.invalidKeyLength }
            rc = crypto_box_seed_keypair(&pk, &sk, [UInt8](seed))
        } else {
            rc = crypto_box_keypair(&pk, &sk)
        }
        guard rc == 0 else { throw CryptoError.kdfFailed }
        return BoxKeyPair(publicKey: Data(pk), secretKey: Data(sk))
    }

    /// The public key of an X25519 secret key.
    public static func boxPublicKey(of secretKey: Data) throws -> Data {
        try ensureReady()
        guard secretKey.count == boxKeyLength else { throw CryptoError.invalidKeyLength }
        var pk = [UInt8](repeating: 0, count: boxKeyLength)
        guard crypto_scalarmult_base(&pk, [UInt8](secretKey)) == 0 else { throw CryptoError.invalidKeyLength }
        return Data(pk)
    }

    public static func wrapBoxSecretKey(_ secretKey: Data, masterKey: Data, userId: String, nonce: Data? = nil) throws -> Data {
        try wrapKey(secretKey, with: masterKey, ad: CryptoAD.accountBoxKey(userId), nonce: nonce)
    }

    /// Unwraps the secret key and checks it matches the published public key (§10.1).
    public static func unwrapBoxSecretKey(_ wrapped: Data, masterKey: Data, userId: String, publicKey: Data) throws -> Data {
        let secretKey = try unwrapKey(wrapped, with: masterKey, ad: CryptoAD.accountBoxKey(userId))
        let derived = try boxPublicKey(of: secretKey)
        guard derived.count == publicKey.count, sodium_memcmp([UInt8](derived), [UInt8](publicKey), derived.count) == 0 else {
            throw CryptoError.boxKeyMismatch
        }
        return secretKey
    }

    /// The symmetric key two accounts share: BLAKE2b-256 keyed by `crypto_box_beforenm`
    /// (X25519 + HSalsa20) over a fixed context; the same from either side.
    public static func memberWrapKey(mySecretKey: Data, peerPublicKey: Data) throws -> Data {
        try ensureReady()
        guard mySecretKey.count == boxKeyLength, peerPublicKey.count == boxKeyLength else { throw CryptoError.invalidKeyLength }
        var shared = [UInt8](repeating: 0, count: Int(crypto_box_beforenmbytes()))
        // libsodium rejects low-order public keys (all-zero shared secret).
        guard crypto_box_beforenm(&shared, [UInt8](peerPublicKey), [UInt8](mySecretKey)) == 0 else { throw CryptoError.invalidPeerKey }
        return try genericHash(Data(memberWrapContext.utf8), key: Data(shared))
    }

    /// The owner wraps a notebook or note key for a member.
    public static func wrapKeyForMember(_ key: Data, ownerSecretKey: Data, memberPublicKey: Data, ref: MemberKeyRef, nonce: Data? = nil) throws -> Data {
        try wrapKey(key, with: memberWrapKey(mySecretKey: ownerSecretKey, peerPublicKey: memberPublicKey), ad: CryptoAD.memberKey(ref), nonce: nonce)
    }

    /// The member unwraps it with its secret key and the owner's public key.
    public static func unwrapKeyFromOwner(_ wrapped: Data, memberSecretKey: Data, ownerPublicKey: Data, ref: MemberKeyRef) throws -> Data {
        try unwrapKey(wrapped, with: memberWrapKey(mySecretKey: memberSecretKey, peerPublicKey: ownerPublicKey), ad: CryptoAD.memberKey(ref))
    }

    /// Wraps the key of `version - 1` with the key of `version` (rotation chain, §10.3).
    public static func wrapPreviousKey(_ previousKey: Data, with newKey: Data, kind: ShareTargetKind, targetId: String, version: Int, nonce: Data? = nil) throws -> Data {
        try wrapKey(previousKey, with: newKey, ad: CryptoAD.previousKey(kind, targetId, version: version), nonce: nonce)
    }

    /// Walks the chain from the current key back: `chain[i]` is the key of version
    /// `currentVersion - i - 1` wrapped by the key one version newer. Newest first, the
    /// current key included.
    public static func unwrapKeyChain(currentKey: Data, currentVersion: Int, chain: [Data], kind: ShareTargetKind, targetId: String) throws -> [Data] {
        var keys = [currentKey]
        var key = currentKey
        for (i, link) in chain.enumerated() where currentVersion - i > 1 {
            key = try unwrapKey(link, with: key, ad: CryptoAD.previousKey(kind, targetId, version: currentVersion - i))
            keys.append(key)
        }
        return keys
    }

    /// Safety code of two accounts (§10.5): 6 groups of 5 digits, equal on both sides.
    public static func safetyCode(_ a: (userId: String, publicKey: Data), _ b: (userId: String, publicKey: Data)) throws -> String {
        let (x, y) = a.userId < b.userId ? (a, b) : (b, a)
        let msg = Data("\(x.userId)|\(y.userId)|".utf8) + x.publicKey + y.publicKey
        let h = [UInt8](try genericHash(msg, key: Data(safetyCodeContext.utf8), length: 30))
        return (0..<6).map { g in
            let n = h[g * 5..<g * 5 + 5].reduce(UInt64(0)) { $0 * 256 + UInt64($1) }
            let s = String(n % 100_000)
            return String(repeating: "0", count: 5 - s.count) + s
        }.joined(separator: " ")
    }
}
