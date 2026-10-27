import Foundation

/// Versioned keys and keys shared between accounts (crypto.md §10, D-54).
///
/// - The account's box secret key (`setBoxSecretKey`), persisted like the master key.
/// - A notebook key has a version (`notebookKeyVersion`); keys of earlier versions (from the
///   rotation chain) are kept with the retired keys and only read what was written with them.
/// - A note shared on its own: its key comes from the owner (`adoptSharedItem`), not from a
///   notebook this account has (`sharedNoteKey`).
extension KeyRing {
    static let boxSecretKeyName = "boxSecretKey"
    static func notebookKeyVersionName(_ id: String) -> String { "notebookKeyVersion.\(id)" }
    static func sharedNoteKeyName(_ id: String) -> String { "sharedNoteKey.\(id)" }
    static func sharedNoteKeyVersionName(_ id: String) -> String { "sharedNoteKeyVersion.\(id)" }
    static func retiredSharedNoteKeysName(_ id: String) -> String { "retiredSharedNoteKeys.\(id)" }

    // MARK: Account box key

    public func boxSecretKey() throws -> Data? {
        if let k = cache.withLock({ $0[Self.boxSecretKeyName] }) { return k }
        let k = try store.data(for: Self.boxSecretKeyName)
        if let k { cache.withLock { $0[Self.boxSecretKeyName] = k } }
        return k
    }

    public func setBoxSecretKey(_ key: Data) throws {
        try store.set(key, for: Self.boxSecretKeyName)
        cache.withLock { $0[Self.boxSecretKeyName] = key }
    }

    // MARK: Versions

    /// The version of this device's key of `notebookId` (1 until a rotation).
    public func notebookKeyVersion(_ notebookId: String) -> Int {
        (try? store.data(for: Self.notebookKeyVersionName(notebookId))).flatMap { $0 }.flatMap { Int(String(decoding: $0, as: UTF8.self)) } ?? 1
    }

    func setVersion(_ version: Int, name: String) throws {
        try store.set(Data(String(version).utf8), for: name)
    }

    func appendRetired(_ keys: [Data], name: String) throws {
        guard !keys.isEmpty else { return }
        var data = try store.data(for: name) ?? Data()
        let have = retiredNotebookKeys(in: data)
        for k in keys where k.count == DSCrypto.keyLength && !have.contains(k) { data.append(k) }
        try store.set(data, for: name)
    }

    /// Makes `key` (of `version`) the notebook's key; `olderKeys` (from its chain) are kept as
    /// retired, as is a different key this device had. Returns that previous key, if any.
    @discardableResult
    public func adoptNotebookKey(_ key: Data, version: Int, olderKeys: [Data], notebookId: String) throws -> Data? {
        let previous = try adoptNotebookKey(key, notebookId: notebookId)
        try appendRetired(olderKeys.filter { $0 != key }, name: Self.retiredNotebookKeysName(notebookId))
        try setVersion(version, name: Self.notebookKeyVersionName(notebookId))
        return previous
    }

    /// The owner's notebook key from `GET /notebooks/:id/key` (or the list): unwrapped with the
    /// master key and the `ad` of its version, the chain unwrapped back to version 1.
    @discardableResult
    public func addNotebookKey(wrapped: Data, notebookId: String, version: Int, chain: [Data]) throws -> Data {
        guard let master = try masterKey() else { throw CryptoError.decryptionFailed }
        let key = try DSCrypto.unwrapKey(wrapped, with: master, ad: CryptoAD.targetKey(.notebook, notebookId, version: version))
        let all = try DSCrypto.unwrapKeyChain(currentKey: key, currentVersion: version, chain: chain, kind: .notebook, targetId: notebookId)
        try adoptNotebookKey(key, version: version, olderKeys: Array(all.dropFirst()), notebookId: notebookId)
        return key
    }

    // MARK: Note keys

    /// The current key of a note from its `NoteMeta` (wrapped by the notebook key, `ad` of the
    /// note key's version). Notebook keys this device retired still open older wrappings.
    public func noteKey(_ meta: NoteMeta, notebookId: String) throws -> Data {
        if let shared = try sharedNoteKey(meta.id) { return shared }
        let name = "noteKey.\(meta.id).v\(meta.keyVersion)"
        if let k = cache.withLock({ $0[name] }) { return k }
        guard let nbKey = try notebookKey(notebookId), let wrapped = Base64URL.decode(meta.wrappedKey) else { throw CryptoError.decryptionFailed }
        let candidates = [nbKey] + retiredNotebookKeys(notebookId)
        guard let key = candidates.lazy.compactMap({ try? DSCrypto.unwrapKey(wrapped, with: $0, ad: meta.wrappedKeyAD) }).first else {
            throw CryptoError.decryptionFailed
        }
        cache.withLock { $0[name] = key }
        return key
    }

    /// Keys of earlier versions of a note (its chain), newest first — to read what was written
    /// before a rotation.
    public func earlierNoteKeys(_ meta: NoteMeta, notebookId: String) -> [Data] {
        if (try? sharedNoteKey(meta.id)) != nil { return retiredSharedNoteKeys(meta.id) }
        guard meta.keyVersion > 1, !meta.keyChain.isEmpty, let key = try? noteKey(meta, notebookId: notebookId) else { return [] }
        let chain = meta.keyChain.compactMap(Base64URL.decode)
        return (try? DSCrypto.unwrapKeyChain(currentKey: key, currentVersion: meta.keyVersion, chain: chain, kind: .note, targetId: meta.id))
            .map { Array($0.dropFirst()) } ?? []
    }

    // MARK: Shared with this account

    /// Key of a note shared with this account on its own.
    public func sharedNoteKey(_ noteId: String) throws -> Data? {
        let name = Self.sharedNoteKeyName(noteId)
        if let k = cache.withLock({ $0[name] }) { return k }
        let k = try store.data(for: name)
        if let k { cache.withLock { $0[name] = k } }
        return k
    }

    public func sharedNoteKeyVersion(_ noteId: String) -> Int {
        (try? store.data(for: Self.sharedNoteKeyVersionName(noteId))).flatMap { $0 }.flatMap { Int(String(decoding: $0, as: UTF8.self)) } ?? 1
    }

    public func retiredSharedNoteKeys(_ noteId: String) -> [Data] {
        retiredNotebookKeys(in: (try? store.data(for: Self.retiredSharedNoteKeysName(noteId))).flatMap { $0 } ?? Data())
    }

    /// Takes the key of a resource shared with this account (`SharedItem`, crypto.md §10.2):
    /// unwrapped with this account's secret key and the owner's public key, the chain back to
    /// version 1 kept for older data. A notebook's key becomes the notebook key (its notes'
    /// keys then come from its index as usual); a note's key is kept for that note. `false`
    /// while the owner has not given the key yet.
    @discardableResult
    public func adoptSharedItem(_ item: SharedItem, memberUserId: String) throws -> Bool {
        guard let wrapped = item.wrappedKey?.data else { return false }
        guard let secretKey = try boxSecretKey() else { throw SharingError.noBoxKey }
        let key = try DSCrypto.unwrapKeyFromOwner(wrapped, memberSecretKey: secretKey, ownerPublicKey: item.owner.publicKey.data,
                                                   ref: item.memberKeyRef(memberUserId: memberUserId))
        let all = try DSCrypto.unwrapKeyChain(currentKey: key, currentVersion: item.keyVersion, chain: item.keyChain.map(\.data),
                                              kind: item.target.kind, targetId: item.target.id)
        let older = Array(all.dropFirst())
        switch item.target.kind {
        case .notebook:
            try adoptNotebookKey(key, version: item.keyVersion, olderKeys: older, notebookId: item.target.id)
        case .note:
            let id = item.target.id
            if let previous = try sharedNoteKey(id), previous != key { try appendRetired([previous], name: Self.retiredSharedNoteKeysName(id)) }
            try appendRetired(older, name: Self.retiredSharedNoteKeysName(id))
            try store.set(key, for: Self.sharedNoteKeyName(id))
            try setVersion(item.keyVersion, name: Self.sharedNoteKeyVersionName(id))
            cache.withLock { $0[Self.sharedNoteKeyName(id)] = key }
        }
        return true
    }

    /// Access ended (removed, left): the keys stay only for what is already on this device.
    public func forgetSharedNote(_ noteId: String) throws {
        try store.remove(Self.sharedNoteKeyName(noteId))
        try store.remove(Self.sharedNoteKeyVersionName(noteId))
        try store.remove(Self.retiredSharedNoteKeysName(noteId))
        cache.withLock { $0[Self.sharedNoteKeyName(noteId)] = nil }
    }
}

public enum SharingError: Error, Equatable, Sendable {
    /// This account has no box key pair on this device yet (`AccountService.ensureBoxKeyPair`).
    case noBoxKey
    /// Not signed in.
    case notSignedIn
    /// The member's public key could not be fetched.
    case noPublicKey(userId: String)
    /// A rotation is needed before the key can be given (server version is ahead).
    case versionMismatch(local: Int, server: Int)
}
