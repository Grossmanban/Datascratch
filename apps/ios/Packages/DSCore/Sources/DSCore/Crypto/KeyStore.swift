import Foundation
#if canImport(Security)
import Security
#endif

/// Secure storage of secrets (master key, notebook/note keys, refresh token).
public protocol SecretStore: Sendable {
    func data(for key: String) throws -> Data?
    func set(_ data: Data, for key: String) throws
    func remove(_ key: String) throws
    /// Removes everything this store holds (sign-out).
    func removeAll() throws
}

public enum SecretStoreError: Error, Equatable {
    case keychain(Int32)
}

/// In-memory store for tests and previews.
public final class InMemorySecretStore: SecretStore {
    private let storage = Locked<[String: Data]>([:])

    public init() {}

    public func data(for key: String) throws -> Data? { storage.withLock { $0[key] } }
    public func set(_ data: Data, for key: String) throws { storage.withLock { $0[key] = data } }
    public func remove(_ key: String) throws { storage.withLock { $0[key] = nil } }
    public func removeAll() throws { storage.withLock { $0.removeAll() } }
}

#if canImport(Security)
/// Keychain-backed store: generic passwords under one service, available after first unlock,
/// never synced to iCloud and never migrated to another device.
public final class KeychainSecretStore: SecretStore {
    public let service: String
    public let accessGroup: String?

    public init(service: String = "app.datascratch.keys", accessGroup: String? = nil) {
        self.service = service
        self.accessGroup = accessGroup
    }

    private func query(_ key: String? = nil) -> [String: Any] {
        var q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecUseDataProtectionKeychain as String: true,
        ]
        if let key { q[kSecAttrAccount as String] = key }
        if let accessGroup { q[kSecAttrAccessGroup as String] = accessGroup }
        return q
    }

    public func data(for key: String) throws -> Data? {
        var q = query(key)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        let status = SecItemCopyMatching(q as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw SecretStoreError.keychain(status) }
        return result as? Data
    }

    public func set(_ data: Data, for key: String) throws {
        let attrs: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        var status = SecItemUpdate(query(key) as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound {
            status = SecItemAdd(query(key).merging(attrs) { $1 } as CFDictionary, nil)
        }
        guard status == errSecSuccess else { throw SecretStoreError.keychain(status) }
    }

    public func remove(_ key: String) throws {
        let status = SecItemDelete(query(key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw SecretStoreError.keychain(status) }
    }

    public func removeAll() throws {
        let status = SecItemDelete(query() as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw SecretStoreError.keychain(status) }
    }
}
#endif

/// Holds the key hierarchy of the signed-in account (crypto.md §1) and caches unwrapped keys.
///
/// Persisted in the `SecretStore`: master key and (optionally) unwrapped notebook keys.
/// Note keys are unwrapped on demand from `NoteMeta.wrappedKey` and kept in memory only.
public final class KeyRing: Sendable {
    private let store: any SecretStore
    private let cache = Locked<[String: Data]>([:])

    static let masterKeyName = "masterKey"
    static func notebookKeyName(_ id: String) -> String { "notebookKey.\(id)" }
    static func retiredNotebookKeysName(_ id: String) -> String { "retiredNotebookKeys.\(id)" }

    public init(store: any SecretStore) {
        self.store = store
    }

    // MARK: Master key

    public func masterKey() throws -> Data? {
        if let k = cache.withLock({ $0[Self.masterKeyName] }) { return k }
        let k = try store.data(for: Self.masterKeyName)
        if let k { cache.withLock { $0[Self.masterKeyName] = k } }
        return k
    }

    public func setMasterKey(_ key: Data) throws {
        try store.set(key, for: Self.masterKeyName)
        cache.withLock { $0[Self.masterKeyName] = key }
    }

    /// Unwraps `wrappedMasterKeyPassword` from a login session and stores the master key.
    @discardableResult
    public func unlock(wrappedMasterKey: Data, passwordKey: Data, userId: String) throws -> Data {
        let master = try DSCrypto.unwrapKey(wrappedMasterKey, with: passwordKey, ad: CryptoAD.masterByPassword(userId: userId))
        try setMasterKey(master)
        return master
    }

    // MARK: Notebook keys

    public func notebookKey(_ notebookId: String) throws -> Data? {
        let name = Self.notebookKeyName(notebookId)
        if let k = cache.withLock({ $0[name] }) { return k }
        let k = try store.data(for: name)
        if let k { cache.withLock { $0[name] = k } }
        return k
    }

    /// Unwraps a notebook key (from `GET /notebooks/:id/key`) with the master key and keeps it.
    /// The server's wrapping is canonical: a different local key is retired (`adoptNotebookKey`).
    @discardableResult
    public func addNotebookKey(wrapped: Data, notebookId: String) throws -> Data {
        guard let master = try masterKey() else { throw CryptoError.decryptionFailed }
        let key = try DSCrypto.unwrapKey(wrapped, with: master, ad: CryptoAD.notebookKey(notebookId))
        try adoptNotebookKey(key, notebookId: notebookId)
        return key
    }

    /// Makes `key` the notebook's key — the canonical one from the server. A different key this
    /// device had is kept as retired (only to read what was already written with it) and
    /// returned.
    @discardableResult
    public func adoptNotebookKey(_ key: Data, notebookId: String) throws -> Data? {
        let previous = try notebookKey(notebookId)
        if let previous, previous != key {
            let name = Self.retiredNotebookKeysName(notebookId)
            var retired = try store.data(for: name) ?? Data()
            if !retiredNotebookKeys(in: retired).contains(previous) { retired.append(previous) }
            try store.set(retired, for: name)
        }
        try setNotebookKey(key, notebookId: notebookId)
        return previous == key ? nil : previous
    }

    /// Keys this notebook had on this device before the canonical one (`adoptNotebookKey`).
    public func retiredNotebookKeys(_ notebookId: String) -> [Data] {
        retiredNotebookKeys(in: (try? store.data(for: Self.retiredNotebookKeysName(notebookId))) ?? Data())
    }

    private func retiredNotebookKeys(in data: Data) -> [Data] {
        stride(from: 0, to: data.count - data.count % 32, by: 32).map { data.subdata(in: data.startIndex + $0 ..< data.startIndex + $0 + 32) }
    }

    public func setNotebookKey(_ key: Data, notebookId: String) throws {
        let name = Self.notebookKeyName(notebookId)
        try store.set(key, for: name)
        cache.withLock { $0[name] = key }
    }

    /// Creates a notebook key and its wrapping under the master key (for `POST /notebooks`).
    /// Only for a notebook made on this device that is not on the server: a notebook from
    /// another device has its key there (`AccountService.notebookKeyForWriting`).
    public func createNotebookKey(notebookId: String) throws -> (key: Data, wrapped: Data) {
        guard let master = try masterKey() else { throw CryptoError.decryptionFailed }
        let key = DSCrypto.newKey()
        let wrapped = try DSCrypto.wrapKey(key, with: master, ad: CryptoAD.notebookKey(notebookId))
        try setNotebookKey(key, notebookId: notebookId)
        return (key, wrapped)
    }

    // MARK: Note keys

    /// Note key from `NoteMeta.wrappedKey` (base64url), cached in memory.
    public func noteKey(noteId: String, wrappedKey: String, notebookId: String) throws -> Data {
        let name = "noteKey.\(noteId)"
        if let k = cache.withLock({ $0[name] }) { return k }
        guard let nbKey = try notebookKey(notebookId), let wrapped = Base64URL.decode(wrappedKey) else { throw CryptoError.decryptionFailed }
        // A wrapping made with a key this notebook had before its canonical one still opens
        // (until `NotebookDocument.rewrapNoteKeys` fixes it).
        let candidates = [nbKey] + retiredNotebookKeys(notebookId)
        guard let key = candidates.lazy.compactMap({ try? DSCrypto.unwrapKey(wrapped, with: $0, ad: CryptoAD.noteKey(noteId)) }).first else {
            throw CryptoError.decryptionFailed
        }
        cache.withLock { $0[name] = key }
        return key
    }

    /// Creates a note key and its `wrappedKey` (base64url) for `NoteMeta`.
    public func createNoteKey(noteId: String, notebookId: String) throws -> (key: Data, wrappedKey: String) {
        guard let nbKey = try notebookKey(notebookId) else { throw CryptoError.decryptionFailed }
        let key = DSCrypto.newKey()
        let wrapped = try DSCrypto.wrapKey(key, with: nbKey, ad: CryptoAD.noteKey(noteId))
        cache.withLock { $0["noteKey.\(noteId)"] = key }
        return (key, Base64URL.encode(wrapped))
    }

    /// Puts a key into the in-memory cache only (keys from share links).
    public func cacheKey(_ key: Data, name: String) {
        cache.withLock { $0[name] = key }
    }

    /// Forgets all keys (sign-out).
    public func clear() throws {
        cache.withLock { $0.removeAll() }
        try store.removeAll()
    }
}

/// Everything needed to sign up (crypto.md §1–4, `POST /auth/signup`).
public struct SignupMaterial: Sendable {
    public var salt: Data
    public var kdf: KDFParams
    public var loginKey: Data
    public var passwordKey: Data
    public var masterKey: Data
    public var recoveryKey: Data
    /// What the user writes down (`DS1-XXXX-...`).
    public var recoveryKeyText: String
    public var recoveryLoginKey: Data
    public var wrappedMasterKeyPassword: Data
    public var wrappedMasterKeyRecovery: Data

    /// Generates keys for a new account. Slow (Argon2id) — call off the main thread.
    public static func make(password: String, userId: String, kdf: KDFParams = .v1) throws -> SignupMaterial {
        try make(password: password, userId: userId, kdf: kdf, salt: DSCrypto.newSalt(), masterKey: DSCrypto.newKey(), recoveryKey: DSCrypto.newKey())
    }

    /// Deterministic variant (vector `crypto/signup-flow.json`).
    static func make(password: String, userId: String, kdf: KDFParams, salt: Data, masterKey master: Data, recoveryKey recovery: Data,
                     nonceMasterPassword: Data? = nil, nonceMasterRecovery: Data? = nil) throws -> SignupMaterial {
        let keys = try DSCrypto.deriveKeys(password: password, salt: salt, params: kdf)
        return SignupMaterial(
            salt: salt, kdf: kdf, loginKey: keys.loginKey, passwordKey: keys.passwordKey, masterKey: master,
            recoveryKey: recovery, recoveryKeyText: try RecoveryKeyFormat.format(recovery),
            recoveryLoginKey: try DSCrypto.recoveryLoginKey(recovery),
            wrappedMasterKeyPassword: try DSCrypto.wrapKey(master, with: keys.passwordKey, ad: CryptoAD.masterByPassword(userId: userId), nonce: nonceMasterPassword),
            wrappedMasterKeyRecovery: try DSCrypto.wrapKey(master, with: recovery, ad: CryptoAD.masterByRecovery(userId: userId), nonce: nonceMasterRecovery))
    }
}

/// New recovery key for a signed-in account (crypto.md §4, `POST /auth/recovery-key`). The master
/// key is rewrapped with the new key; data is not re-encrypted.
public struct RecoveryKeyRotation: Sendable {
    public var recoveryKey: Data
    /// Shown to the user once (`DS1-XXXX-...`).
    public var recoveryKeyText: String
    public var body: RotateRecoveryKeyRequest

    public static func make(masterKey: Data, currentLoginKey: Data, userId: String) throws -> RecoveryKeyRotation {
        try make(masterKey: masterKey, currentLoginKey: currentLoginKey, userId: userId, recoveryKey: DSCrypto.newKey())
    }

    /// Deterministic variant (vector `crypto/recovery-rotate.json`).
    static func make(masterKey: Data, currentLoginKey: Data, userId: String, recoveryKey: Data, nonce: Data? = nil) throws -> RecoveryKeyRotation {
        RecoveryKeyRotation(
            recoveryKey: recoveryKey, recoveryKeyText: try RecoveryKeyFormat.format(recoveryKey),
            body: RotateRecoveryKeyRequest(
                currentLoginKey: currentLoginKey, recoveryLoginKey: try DSCrypto.recoveryLoginKey(recoveryKey),
                wrappedMasterKeyRecovery: try DSCrypto.wrapKey(masterKey, with: recoveryKey, ad: CryptoAD.masterByRecovery(userId: userId), nonce: nonce)))
    }
}

/// New password material (password change, recovery finish — crypto.md §4–5).
public struct PasswordChangeMaterial: Sendable {
    public var salt: Data
    public var kdf: KDFParams
    public var loginKey: Data
    public var wrappedMasterKeyPassword: Data

    public static func make(newPassword: String, masterKey: Data, userId: String, kdf: KDFParams = .v1) throws -> PasswordChangeMaterial {
        let salt = DSCrypto.newSalt()
        let keys = try DSCrypto.deriveKeys(password: newPassword, salt: salt, params: kdf)
        return PasswordChangeMaterial(salt: salt, kdf: kdf, loginKey: keys.loginKey,
                                      wrappedMasterKeyPassword: try DSCrypto.wrapKey(masterKey, with: keys.passwordKey, ad: CryptoAD.masterByPassword(userId: userId)))
    }
}
