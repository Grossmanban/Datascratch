import Foundation
import Testing
@testable import DSCore

/// Security audit 2026-10-27: a hostile server or hostile note content (other devices, agents).
@Suite struct SecurityTests {
    let malicious = ["../library.sqlite", "../../etc/passwd", "/etc/passwd", "a/b", "..", ".", "", "%2e%2e", "x?y", "x#y",
                     "0192f3c4-0000-7000-8000-00000000000a/../x"]

    func service(_ server: FakeRESTServer) throws -> AccountService {
        let api = APIClient(baseURL: URL(string: "https://example.com")!, transport: server, sessionStore: SecretSessionStore(store: InMemorySecretStore()))
        return AccountService(api: api, keys: KeyRing(store: InMemorySecretStore()), store: try LocalStore.inMemory())
    }

    @Test func kdfBounds() throws {
        try KDFParams.v1.validate()
        try KDFParams(ops: 10, mem: 256 * 1024 * 1024).validate()
        #expect(throws: CryptoError.unsafeKDF(ops: 1, mem: 67_108_864)) { try KDFParams(ops: 1, mem: 67_108_864).validate() }
        #expect(throws: CryptoError.unsafeKDF(ops: 11, mem: 67_108_864)) { try KDFParams(ops: 11, mem: 67_108_864).validate() }
        #expect(throws: CryptoError.unsafeKDF(ops: 3, mem: 8192)) { try KDFParams(ops: 3, mem: 8192).validate() }
        #expect(throws: CryptoError.unsafeKDF(ops: 3, mem: 512 * 1024 * 1024)) { try KDFParams(ops: 3, mem: 512 * 1024 * 1024).validate() }
        #expect(throws: CryptoError.unsupportedKDF("argon2i13")) { try KDFParams(alg: "argon2i13").validate() }
    }

    /// A server that answers `prelogin` with weakened parameters: login and password change
    /// refuse before deriving anything or sending a login key.
    @Test func loginRefusesWeakenedKDFFromTheServer() async throws {
        let server = FakeRESTServer()
        let device = try service(server)
        _ = try await device.signup(email: "kdf@example.com", password: "pw")
        try await device.logout()
        server.state.withLock { $0.users["kdf@example.com"]?.kdf = ["alg": "argon2id13", "ops": 1, "mem": 67_108_864] }
        await #expect(throws: CryptoError.unsafeKDF(ops: 1, mem: 67_108_864)) {
            try await device.login(email: "kdf@example.com", password: "pw", deviceName: "iPad")
        }
        #expect(try device.keys.masterKey() == nil)
    }

    @Test func requestPathsRefuseUnsafeSegments() async throws {
        let base = URL(string: "https://example.com/v1")!
        #expect(try APIClient.url(base, "/attachments/0192f3c4-0000-7000-8000-00000000000a/chunks/3").absoluteString
                == "https://example.com/v1/attachments/0192f3c4-0000-7000-8000-00000000000a/chunks/3")
        // "a/b" makes two plain segments: ids are checked one by one in the API methods (below).
        for id in malicious where id != "a/b" {
            #expect(throws: UnsafePathError.self) { try APIClient.url(base, "/attachments/\(id)") }
        }
        let api = APIClient(baseURL: URL(string: "https://example.com")!, transport: FakeRESTServer(),
                            sessionStore: SecretSessionStore(store: InMemorySecretStore()))
        await #expect(throws: UnsafePathError.self) { try await api.deleteDoc(id: "../me") }
        await #expect(throws: UnsafePathError.self) { _ = try await api.attachmentStatus(id: "../auth/logout") }
        for id in malicious {
            await #expect(throws: UnsafePathError.self) { _ = try await api.attachmentStatus(id: id) }
            await #expect(throws: UnsafePathError.self) { try await api.deleteAttachment(id: id) }
        }
    }

    @Test func attachmentIdsNeverLeaveTheFolder() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        let dir = root.appendingPathComponent("Attachments")
        defer { try? FileManager.default.removeItem(at: root) }
        let server = FakeRESTServer()
        let device = try service(server)
        let files = try AttachmentManager(api: device.api, store: device.store, directory: dir)
        // Files next to the folder that a traversal would hit.
        let victim = root.appendingPathComponent("library.sqlite")
        try Data("db".utf8).write(to: victim)
        let key = DSCrypto.newKey()
        for id in malicious + [victim.path] {
            #expect(await files.localURL(id) == nil)
            await #expect(throws: AttachmentError.invalidId(id)) { try await files.delete(id) }
            await #expect(throws: AttachmentError.invalidId(id)) { _ = try await files.download(id, noteId: EntityID.make(), noteKey: key) }
            await #expect(throws: AttachmentError.invalidId(id)) { try await files.upload(id, noteKey: key) }
            await #expect(throws: AttachmentError.invalidId(id)) { _ = try await files.add(Data([1]), mime: "image/png", noteId: EntityID.make(), id: id) }
        }
        #expect(FileManager.default.fileExists(atPath: victim.path))
        #expect(server.state.withLock { $0.attachments.isEmpty })
    }

    @Test func coverWithAMaliciousIdIsIgnored() throws {
        let note = NoteDocument(noteId: EntityID.make())
        try note.initialize(title: "x")
        try note.setCover(NoteMetaContent.Cover(attachmentId: "../library.sqlite"))
        #expect(note.meta().cover == nil)
        let good = EntityID.make()
        try note.setCover(NoteMetaContent.Cover(attachmentId: good))
        #expect(note.meta().cover?.attachmentId == good)
    }

    @Test func downloadChecksWhatTheServerSays() async throws {
        let mib = DSCrypto.attachmentChunkSize, o = DSCrypto.envelopeOverhead
        func status(_ size: Int64, _ chunks: Int) -> AttachmentStatus { AttachmentStatus(size: size, chunkCount: chunks, mime: "image/png", uploadedChunks: []) }
        let max: Int64 = 200_000_000
        try AttachmentManager.check(status(Int64(10 + o), 1), recordedSize: nil, maxSize: max)
        try AttachmentManager.check(status(Int64(mib + 5 + 2 * o), 2), recordedSize: Int64(mib + 5 + 2 * o), maxSize: max)
        // Chunk count inflated (memory/time), size over the cap, size not what we recorded.
        #expect(throws: AttachmentError.self) { try AttachmentManager.check(status(Int64(10 + o), 1_000_000), recordedSize: nil, maxSize: max) }
        #expect(throws: AttachmentError.self) { try AttachmentManager.check(status(Int64(10 + o), 2), recordedSize: nil, maxSize: max) }
        #expect(throws: AttachmentError.self) { try AttachmentManager.check(status(max + 1, 191), recordedSize: nil, maxSize: max) }
        #expect(throws: AttachmentError.self) { try AttachmentManager.check(status(Int64(10 + o), 1), recordedSize: 999, maxSize: max) }
        #expect(throws: AttachmentError.self) { try AttachmentManager.check(status(0, 1), recordedSize: nil, maxSize: max) }
    }

    /// End to end: the server lies about the chunk count; nothing is written.
    @Test func lyingServerLeavesNoFile() async throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        defer { try? FileManager.default.removeItem(at: dir) }
        let server = FakeRESTServer()
        let device = try service(server)
        _ = try await device.signup(email: "dl@example.com", password: "pw")
        let files = try AttachmentManager(api: device.api, store: device.store, directory: dir)
        let id = EntityID.make()
        let key = DSCrypto.newKey()
        let chunks = try DSCrypto.sealAttachment(Data(repeating: 7, count: 100), key: key, attachmentId: id)
        server.state.withLock { $0.attachments[id] = (chunkCount: 50, chunks: [0: chunks[0]]) }
        await #expect(throws: AttachmentError.self) { _ = try await files.download(id, noteId: EntityID.make(), noteKey: key) }
        #expect(await files.localURL(id) == nil)
        #expect(try FileManager.default.contentsOfDirectory(atPath: dir.path).isEmpty)
        // Honest description: downloads.
        server.state.withLock { $0.attachments[id]?.chunkCount = 1 }
        let url = try await files.download(id, noteId: EntityID.make(), noteKey: key)
        #expect(try Data(contentsOf: url) == Data(repeating: 7, count: 100))
    }

    @Test func wipeLocalRemovesFilesAndRecords() async throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        defer { try? FileManager.default.removeItem(at: dir) }
        let device = try service(FakeRESTServer())
        let files = try AttachmentManager(api: device.api, store: device.store, directory: dir)
        let a = try await files.add(Data([1, 2, 3]), mime: "image/png", noteId: EntityID.make())
        let b = try await files.add(Data([4]), mime: "image/png", noteId: EntityID.make())
        try await files.wipeLocal()
        #expect(await files.localURL(a) == nil)
        #expect(await files.localURL(b) == nil)
        #expect(try device.store.attachment(a) == nil && device.store.attachment(b) == nil)
        #expect(try FileManager.default.contentsOfDirectory(atPath: dir.path).isEmpty)
    }
}
