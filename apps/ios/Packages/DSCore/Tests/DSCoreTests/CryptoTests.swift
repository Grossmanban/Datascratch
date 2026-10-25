import Foundation
import Testing
@testable import DSCore

/// Reference values computed with libsodium-wrappers-sumo 0.7.15 (the TS library), until
/// `packages/test-vectors/crypto` lands.
@Suite struct CryptoTests {
    let key = Data((1...32).map { UInt8($0) })
    let nonce = Data((100..<124).map { UInt8($0) })

    @Test func kdfMatchesTS() throws {
        let keys = try DSCrypto.deriveKeys(password: "pässwörd", salt: Data((0..<16).map { UInt8($0) }))
        #expect(keys.loginKey.hexString == "c7d9c7452891449fecd050a835c6b74eebf4244def234a2a0e24a0a31a2d4246")
        #expect(keys.passwordKey.hexString == "6b42d1cda2f8b4af7d0066e0df217322e3d75dfd1cacbbc9d84f12b30c1cc7cd")
        // NFKC: a decomposed "ä" derives the same keys.
        let decomposed = try DSCrypto.deriveKeys(password: "pa\u{0308}sswo\u{0308}rd", salt: Data((0..<16).map { UInt8($0) }))
        #expect(decomposed.loginKey == keys.loginKey)
    }

    @Test func envelopeMatchesTS() throws {
        let env = try DSCrypto.seal(Data("hello".utf8), key: key, ad: CryptoAD.doc("d1"), nonce: nonce)
        #expect(env.hexString == "016465666768696a6b6c6d6e6f707172737475767778797a7bd5a1d57ee1e0bd8d444906ecb1e30f639dbc0a14ac")
        #expect(try DSCrypto.open(env, key: key, ad: "ds1|doc|d1") == Data("hello".utf8))
        #expect(throws: CryptoError.decryptionFailed) { try DSCrypto.open(env, key: key, ad: "ds1|doc|d2") }
        var tampered = env
        tampered[30] ^= 1
        #expect(throws: CryptoError.decryptionFailed) { try DSCrypto.open(tampered, key: key, ad: "ds1|doc|d1") }
        var v2 = env
        v2[0] = 2
        #expect(throws: CryptoError.unsupportedVersion(2)) { try DSCrypto.open(v2, key: key, ad: "ds1|doc|d1") }
        // Empty plaintext works.
        let empty = try DSCrypto.seal(Data(), key: key, ad: "x")
        #expect(empty.count == DSCrypto.envelopeOverhead)
        #expect(try DSCrypto.open(empty, key: key, ad: "x").isEmpty)
    }

    @Test func recoveryKey() throws {
        #expect(try DSCrypto.recoveryLoginKey(key).hexString == "ec4d161a590bbbd48601ba98e7976388b5324c39f6bbf454e3f13cdc8c2c69ec")
        let text = try RecoveryKeyFormat.format(key)
        #expect(text.hasPrefix("DS1-"))
        #expect(text.count == 4 + 52 + 12)
        #expect(try RecoveryKeyFormat.parse(text) == key)
        #expect(try RecoveryKeyFormat.parse(text.lowercased().replacingOccurrences(of: "-", with: " ")) == key)
        #expect(RecoveryKeyFormat.base32(Data([0xFF])) == "ZW")
        #expect(throws: CryptoError.invalidRecoveryKey) { try RecoveryKeyFormat.parse("DS1-ABCD") }
    }

    @Test func attachmentChunks() throws {
        let data = DSCrypto.randomBytes(DSCrypto.attachmentChunkSize * 2 + 10)
        let chunks = try DSCrypto.sealAttachment(data, key: key, attachmentId: "a1")
        #expect(chunks.count == 3)
        #expect(try DSCrypto.openAttachment(chunks, key: key, attachmentId: "a1") == data)
        // Truncation is detected: chunk 1 was not sealed as the last one.
        #expect(throws: CryptoError.decryptionFailed) { try DSCrypto.openAttachment(Array(chunks.prefix(2)), key: key, attachmentId: "a1") }
        #expect(DSCrypto.chunkCount(plaintextSize: 0) == 1)
    }

    @Test func keyHierarchy() throws {
        let material = try SignupMaterial.make(password: "secret", userId: "u1", kdf: KDFParams(ops: 1, mem: 8192))
        let ring = KeyRing(store: InMemorySecretStore())
        try ring.unlock(wrappedMasterKey: material.wrappedMasterKeyPassword, passwordKey: material.passwordKey, userId: "u1")
        #expect(try ring.masterKey() == material.masterKey)
        // Recovery path unwraps the same master key.
        let recovered = try DSCrypto.unwrapKey(material.wrappedMasterKeyRecovery, with: try RecoveryKeyFormat.parse(material.recoveryKeyText),
                                               ad: CryptoAD.masterByRecovery(userId: "u1"))
        #expect(recovered == material.masterKey)

        let (nbKey, wrappedNb) = try ring.createNotebookKey(notebookId: "nb1")
        let other = KeyRing(store: InMemorySecretStore())
        try other.setMasterKey(material.masterKey)
        #expect(try other.addNotebookKey(wrapped: wrappedNb, notebookId: "nb1") == nbKey)
        #expect(throws: CryptoError.decryptionFailed) { try other.addNotebookKey(wrapped: wrappedNb, notebookId: "nb2") }

        let (noteKey, wrappedNote) = try ring.createNoteKey(noteId: "n1", notebookId: "nb1")
        #expect(try other.noteKey(noteId: "n1", wrappedKey: wrappedNote, notebookId: "nb1") == noteKey)

        let change = try PasswordChangeMaterial.make(newPassword: "new", masterKey: material.masterKey, userId: "u1", kdf: KDFParams(ops: 1, mem: 8192))
        let newKeys = try DSCrypto.deriveKeys(password: "new", salt: change.salt, params: change.kdf)
        #expect(try DSCrypto.unwrapKey(change.wrappedMasterKeyPassword, with: newKeys.passwordKey, ad: CryptoAD.masterByPassword(userId: "u1")) == material.masterKey)
        try ring.clear()
        #expect(try ring.masterKey() == nil)
    }
}
