import Clibsodium
import Foundation

public enum CryptoError: Error, Equatable {
    case sodiumInit
    case invalidKeyLength
    case kdfFailed
    case unsupportedKDF(String)
    case malformedEnvelope
    case unsupportedVersion(UInt8)
    /// Wrong key, wrong `ad` or tampered ciphertext.
    case decryptionFailed
    case invalidRecoveryKey
}

/// Password KDF parameters stored next to the salt (crypto.md §2).
public struct KDFParams: Codable, Hashable, Sendable {
    public var alg: String
    public var ops: Int
    public var mem: Int

    public init(alg: String = "argon2id13", ops: Int = 3, mem: Int = 67_108_864) {
        self.alg = alg
        self.ops = ops
        self.mem = mem
    }

    public static let v1 = KDFParams()
}

/// Keys derived from the password (crypto.md §2).
public struct PasswordKeys: Sendable {
    /// Sent to the server (which stores `Argon2id(loginKey)`).
    public let loginKey: Data
    /// Never leaves the device; wraps the master key.
    public let passwordKey: Data
}

/// Associated data strings binding ciphertexts to their place (crypto.md §3).
public enum CryptoAD {
    public static func doc(_ docId: String) -> String { "ds1|doc|\(docId)" }
    public static func awareness(_ docId: String) -> String { "ds1|awareness|\(docId)" }
    public static func masterByPassword(userId: String) -> String { "ds1|key|master|password|\(userId)" }
    public static func masterByRecovery(userId: String) -> String { "ds1|key|master|recovery|\(userId)" }
    public static func notebookKey(_ notebookId: String) -> String { "ds1|key|notebook|\(notebookId)" }
    public static func notebookServerKey(_ notebookId: String) -> String { "ds1|key|notebook-server|\(notebookId)" }
    public static func noteKey(_ noteId: String) -> String { "ds1|key|note|\(noteId)" }
    public static func attachmentChunk(_ attachmentId: String, index: Int, last: Bool) -> String {
        "ds1|att|\(attachmentId)|\(index)|\(last ? 1 : 0)"
    }
}

/// libsodium primitives used by Datascratch, byte-compatible with the TS implementation
/// (`packages/shared/src/crypto/`). All keys are 32 bytes.
public enum DSCrypto {
    public static let keyLength = 32
    public static let nonceLength = 24
    public static let saltLength = 16
    public static let envelopeVersion: UInt8 = 0x01
    /// Version byte + nonce + Poly1305 tag.
    public static let envelopeOverhead = 1 + 24 + 16
    /// Attachment chunk size, plaintext bytes (crypto.md §6).
    public static let attachmentChunkSize = 1 << 20

    private static let ready: Bool = sodium_init() >= 0

    static func ensureReady() throws {
        guard ready else { throw CryptoError.sodiumInit }
    }

    // MARK: Random

    public static func randomBytes(_ count: Int) -> Data {
        _ = ready
        var out = Data(count: count)
        out.withUnsafeMutableBytes { randombytes_buf($0.baseAddress!, count) }
        return out
    }

    /// A new random 32-byte key (master, notebook, note, recovery keys).
    public static func newKey() -> Data { randomBytes(keyLength) }

    public static func newSalt() -> Data { randomBytes(saltLength) }

    // MARK: KDF (crypto.md §2)

    /// Argon2id13 → 64 bytes: `authSeed` (0..31) and `passwordKey` (32..63);
    /// `loginKey = BLAKE2b-256(key: authSeed, "ds1|login")`. Password is NFKC-normalised.
    /// Takes ~0.5 s and 64 MiB — call off the main thread.
    public static func deriveKeys(password: String, salt: Data, params: KDFParams = .v1) throws -> PasswordKeys {
        try ensureReady()
        guard params.alg == "argon2id13" else { throw CryptoError.unsupportedKDF(params.alg) }
        guard salt.count == saltLength else { throw CryptoError.invalidKeyLength }
        // Arrays (not Data) so that an empty password still passes a valid pointer.
        let normalized = Array(password.precomposedStringWithCompatibilityMapping.utf8).map { CChar(bitPattern: $0) } + [0]
        let saltBytes = [UInt8](salt)
        var outBytes = [UInt8](repeating: 0, count: 64)
        let rc = crypto_pwhash(&outBytes, 64, normalized, UInt64(normalized.count - 1), saltBytes,
                               UInt64(params.ops), Int(params.mem), crypto_pwhash_ALG_ARGON2ID13)
        let out = Data(outBytes)
        guard rc == 0 else { throw CryptoError.kdfFailed }
        let authSeed = out.prefix(32)
        let passwordKey = Data(out.suffix(32))
        return PasswordKeys(loginKey: try genericHash(Data("ds1|login".utf8), key: Data(authSeed)), passwordKey: passwordKey)
    }

    /// `crypto_generichash` (BLAKE2b) with a key.
    public static func genericHash(_ message: Data, key: Data, length: Int = 32) throws -> Data {
        try ensureReady()
        var outBytes = [UInt8](repeating: 0, count: length)
        let m = [UInt8](message) + [0]
        let k = [UInt8](key) + [0]
        let rc = crypto_generichash(&outBytes, length, m, UInt64(message.count), k, key.count)
        let out = Data(outBytes)
        guard rc == 0 else { throw CryptoError.kdfFailed }
        return out
    }

    // MARK: Envelope (crypto.md §3)

    /// `0x01 || nonce(24) || XChaCha20-Poly1305-IETF(plaintext, ad)`. A random nonce unless one
    /// is given (test vectors).
    public static func seal(_ plaintext: Data, key: Data, ad: String, nonce: Data? = nil) throws -> Data {
        try ensureReady()
        guard key.count == keyLength else { throw CryptoError.invalidKeyLength }
        let nonce = nonce ?? randomBytes(nonceLength)
        guard nonce.count == nonceLength else { throw CryptoError.malformedEnvelope }
        let adBytes = Data(ad.utf8)
        var cipher = Data(count: plaintext.count + 16)
        var cipherLength: UInt64 = 0
        let rc = cipher.withUnsafeMutableBytes { c in
            plaintext.withUnsafeBytes { m in
                adBytes.withUnsafeBytes { a in
                    nonce.withUnsafeBytes { n in
                        key.withUnsafeBytes { k in
                            crypto_aead_xchacha20poly1305_ietf_encrypt(
                                c.bindMemory(to: UInt8.self).baseAddress!, &cipherLength,
                                m.bindMemory(to: UInt8.self).baseAddress, UInt64(plaintext.count),
                                a.bindMemory(to: UInt8.self).baseAddress, UInt64(adBytes.count),
                                nil, n.bindMemory(to: UInt8.self).baseAddress!, k.bindMemory(to: UInt8.self).baseAddress!)
                        }
                    }
                }
            }
        }
        guard rc == 0 else { throw CryptoError.decryptionFailed }
        var out = Data([envelopeVersion])
        out.append(nonce)
        out.append(cipher.prefix(Int(cipherLength)))
        return out
    }

    public static func open(_ envelope: Data, key: Data, ad: String) throws -> Data {
        try ensureReady()
        guard key.count == keyLength else { throw CryptoError.invalidKeyLength }
        guard envelope.count >= envelopeOverhead else { throw CryptoError.malformedEnvelope }
        let bytes = [UInt8](envelope)
        guard bytes[0] == envelopeVersion else { throw CryptoError.unsupportedVersion(bytes[0]) }
        let nonce = Array(bytes[1...24])
        let cipher = Array(bytes[25...])
        let adBytes = Array(ad.utf8)
        let keyBytes = [UInt8](key)
        var plain = [UInt8](repeating: 0, count: cipher.count - 16)
        var plainLength: UInt64 = 0
        let rc = plain.withUnsafeMutableBufferPointer { p in
            crypto_aead_xchacha20poly1305_ietf_decrypt(p.baseAddress, &plainLength, nil, cipher, UInt64(cipher.count),
                                                       adBytes, UInt64(adBytes.count), nonce, keyBytes)
        }
        guard rc == 0 else { throw CryptoError.decryptionFailed }
        return Data(plain.prefix(Int(plainLength)))
    }

    // MARK: Key wrapping

    /// Wraps a 32-byte key with another key (an envelope with the key's `ad`).
    public static func wrapKey(_ key: Data, with wrappingKey: Data, ad: String, nonce: Data? = nil) throws -> Data {
        guard key.count == keyLength else { throw CryptoError.invalidKeyLength }
        return try seal(key, key: wrappingKey, ad: ad, nonce: nonce)
    }

    public static func unwrapKey(_ wrapped: Data, with wrappingKey: Data, ad: String) throws -> Data {
        let key = try open(wrapped, key: wrappingKey, ad: ad)
        guard key.count == keyLength else { throw CryptoError.invalidKeyLength }
        return key
    }

    // MARK: Attachments (crypto.md §6)

    public static func chunkCount(plaintextSize: Int) -> Int {
        max(1, (plaintextSize + attachmentChunkSize - 1) / attachmentChunkSize)
    }

    /// Encrypts chunk `index` of an attachment (`plaintext` ≤ 1 MiB).
    public static func sealChunk(_ plaintext: Data, key: Data, attachmentId: String, index: Int, last: Bool, nonce: Data? = nil) throws -> Data {
        try seal(plaintext, key: key, ad: CryptoAD.attachmentChunk(attachmentId, index: index, last: last), nonce: nonce)
    }

    public static func openChunk(_ envelope: Data, key: Data, attachmentId: String, index: Int, last: Bool) throws -> Data {
        try open(envelope, key: key, ad: CryptoAD.attachmentChunk(attachmentId, index: index, last: last))
    }

    /// Encrypts a whole file into chunk envelopes.
    public static func sealAttachment(_ data: Data, key: Data, attachmentId: String) throws -> [Data] {
        let count = chunkCount(plaintextSize: data.count)
        return try (0..<count).map { i in
            let start = data.startIndex + i * attachmentChunkSize
            let end = min(start + attachmentChunkSize, data.endIndex)
            return try sealChunk(data[start..<end], key: key, attachmentId: attachmentId, index: i, last: i == count - 1)
        }
    }

    /// Decrypts chunk envelopes back into the file. The `last` flag in `ad` detects truncation.
    public static func openAttachment(_ chunks: [Data], key: Data, attachmentId: String) throws -> Data {
        var out = Data()
        for (i, c) in chunks.enumerated() {
            out.append(try openChunk(c, key: key, attachmentId: attachmentId, index: i, last: i == chunks.count - 1))
        }
        return out
    }

    // MARK: Recovery key (crypto.md §4)

    /// `recoveryLoginKey = BLAKE2b-256(key: recoveryKey, "ds1|recovery-login")`.
    public static func recoveryLoginKey(_ recoveryKey: Data) throws -> Data {
        try genericHash(Data("ds1|recovery-login".utf8), key: recoveryKey)
    }
}

/// The recovery key shown to the user: `DS1-` + Crockford Base32 of 32 bytes (52 symbols) in
/// groups of 4 (crypto.md §4).
public enum RecoveryKeyFormat {
    static let alphabet = Array("0123456789ABCDEFGHJKMNPQRSTVWXYZ")

    public static func format(_ key: Data) throws -> String {
        guard key.count == DSCrypto.keyLength else { throw CryptoError.invalidKeyLength }
        let symbols = base32(key)
        var groups: [String] = []
        var i = symbols.startIndex
        while i < symbols.endIndex {
            let j = symbols.index(i, offsetBy: 4, limitedBy: symbols.endIndex) ?? symbols.endIndex
            groups.append(String(symbols[i..<j]))
            i = j
        }
        return "DS1-" + groups.joined(separator: "-")
    }

    /// Parses what the user typed: case-insensitive, dashes/spaces ignored, `I`/`L` → `1`,
    /// `O` → `0` (Crockford).
    public static func parse(_ text: String) throws -> Data {
        var s = text.uppercased().filter { !$0.isWhitespace && $0 != "-" }
        if s.hasPrefix("DS1") { s.removeFirst(3) }
        guard s.count == 52 else { throw CryptoError.invalidRecoveryKey }
        var bits = 0
        var buffer = 0
        var out = Data()
        for ch in s {
            let c: Character = switch ch {
            case "I", "L": "1"
            case "O": "0"
            default: ch
            }
            guard let v = alphabet.firstIndex(of: c) else { throw CryptoError.invalidRecoveryKey }
            buffer = (buffer << 5) | v
            bits += 5
            if bits >= 8 {
                bits -= 8
                out.append(UInt8((buffer >> bits) & 0xFF))
            }
            buffer &= (1 << bits) - 1
        }
        guard out.count == DSCrypto.keyLength, buffer == 0 else { throw CryptoError.invalidRecoveryKey }
        return out
    }

    static func base32(_ data: Data) -> String {
        var out = ""
        var buffer = 0
        var bits = 0
        for byte in data {
            buffer = (buffer << 8) | Int(byte)
            bits += 8
            while bits >= 5 {
                bits -= 5
                out.append(alphabet[(buffer >> bits) & 0x1F])
            }
            buffer &= (1 << bits) - 1
        }
        if bits > 0 {
            out.append(alphabet[(buffer << (5 - bits)) & 0x1F])
        }
        return out
    }
}
