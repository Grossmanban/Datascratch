import Foundation

/// Keys of shared spaces (D-62, crypto.md §11): the space key (owner: under the master key;
/// member: wrapped by the owner, §10.2) with its version and chain, and the keys of the space's
/// notebooks, which are wrapped by the space key — kept like any notebook key (version, chain),
/// so notes and sync work unchanged.
extension KeyRing {
    static func spaceKeyName(_ id: String) -> String { "spaceKey.\(id)" }
    static func spaceKeyVersionName(_ id: String) -> String { "spaceKeyVersion.\(id)" }
    static func retiredSpaceKeysName(_ id: String) -> String { "retiredSpaceKeys.\(id)" }
    static func notebookSpaceName(_ notebookId: String) -> String { "notebookSpace.\(notebookId)" }

    /// The current key of a shared space this account owns or is a member of.
    public func spaceKey(_ spaceId: String) throws -> Data? {
        let name = Self.spaceKeyName(spaceId)
        if let k = cache.withLock({ $0[name] }) { return k }
        let k = try store.data(for: name)
        if let k { cache.withLock { $0[name] = k } }
        return k
    }

    public func spaceKeyVersion(_ spaceId: String) -> Int {
        (try? store.data(for: Self.spaceKeyVersionName(spaceId))).flatMap { $0 }.flatMap { Int(String(decoding: $0, as: UTF8.self)) } ?? 1
    }

    /// Earlier keys of the space (its chain): they read what was written before a rotation.
    public func retiredSpaceKeys(_ spaceId: String) -> [Data] {
        retiredNotebookKeys(in: (try? store.data(for: Self.retiredSpaceKeysName(spaceId))).flatMap { $0 } ?? Data())
    }

    /// Makes `key` (of `version`) the space's key; `olderKeys` and a different previous key are
    /// kept as retired.
    public func adoptSpaceKey(_ key: Data, version: Int, olderKeys: [Data], spaceId: String) throws {
        if let previous = try spaceKey(spaceId), previous != key { try appendRetired([previous], name: Self.retiredSpaceKeysName(spaceId)) }
        try appendRetired(olderKeys.filter { $0 != key }, name: Self.retiredSpaceKeysName(spaceId))
        try store.set(key, for: Self.spaceKeyName(spaceId))
        try setVersion(version, name: Self.spaceKeyVersionName(spaceId))
        cache.withLock { $0[Self.spaceKeyName(spaceId)] = key }
    }

    /// The owner's space key (`GET /spaces/:id/key`): under the master key, `ad` of its version,
    /// the chain unwrapped back to version 1.
    @discardableResult
    public func addSpaceKey(wrapped: Data, spaceId: String, version: Int, chain: [Data]) throws -> Data {
        guard let master = try masterKey() else { throw CryptoError.decryptionFailed }
        let key = try DSCrypto.unwrapKey(wrapped, with: master, ad: CryptoAD.targetKey(.space, spaceId, version: version))
        let all = try DSCrypto.unwrapKeyChain(currentKey: key, currentVersion: version, chain: chain, kind: .space, targetId: spaceId)
        try adoptSpaceKey(key, version: version, olderKeys: Array(all.dropFirst()), spaceId: spaceId)
        return key
    }

    /// A notebook of a shared space (`GET /spaces/:id/notebooks`): its key unwrapped with the
    /// space key (current, else an earlier one), kept as the notebook key with its version and
    /// chain. Returns the key and whether it was a different key than this device had.
    @discardableResult
    public func addSpaceNotebookKey(spaceWrapped: Data, spaceId: String, notebookId: String, version: Int, chain: [Data]) throws -> Data {
        guard let current = try spaceKey(spaceId) else { throw SharingError.noSpaceKey(spaceId: spaceId) }
        let ad = CryptoAD.spaceNotebookKey(spaceId: spaceId, notebookId: notebookId, version: version)
        guard let key = ([current] + retiredSpaceKeys(spaceId)).lazy.compactMap({ try? DSCrypto.unwrapKey(spaceWrapped, with: $0, ad: ad) }).first else {
            throw CryptoError.decryptionFailed
        }
        let all = try DSCrypto.unwrapKeyChain(currentKey: key, currentVersion: version, chain: chain, kind: .notebook, targetId: notebookId)
        try adoptNotebookKey(key, version: version, olderKeys: Array(all.dropFirst()), notebookId: notebookId)
        try store.set(Data(spaceId.utf8), for: Self.notebookSpaceName(notebookId))
        return key
    }

    /// The shared space a notebook belongs to on this device (its key came from that space).
    public func spaceOfNotebook(_ notebookId: String) -> String? {
        (try? store.data(for: Self.notebookSpaceName(notebookId))).flatMap { $0 }.map { String(decoding: $0, as: UTF8.self) }
    }

    /// The notebook left the space (moved out): its key no longer comes from the space.
    public func forgetNotebookSpace(_ notebookId: String) throws {
        try store.remove(Self.notebookSpaceName(notebookId))
    }
}
