import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// Two devices with two keys for one notebook (prod incident 2026-10-26): the canonical key is the
/// server's wrapping; a device that wrote with another key adopts the canonical one and repairs.
@Suite struct KeyRepairTests {
    @Test func adoptingTheServerKeyRetiresTheLocalOne() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        try keys.setMasterKey(DSCrypto.newKey())
        let nb = EntityID.make()
        let (local, _) = try keys.createNotebookKey(notebookId: nb)
        let canonical = DSCrypto.newKey()
        #expect(try keys.adoptNotebookKey(canonical, notebookId: nb) == local)
        #expect(try keys.notebookKey(nb) == canonical)
        #expect(keys.retiredNotebookKeys(nb) == [local])
        #expect(try keys.adoptNotebookKey(canonical, notebookId: nb) == nil)
        #expect(keys.retiredNotebookKeys(nb) == [local])

        // A note key wrapped with the retired key still opens (until it is re-wrapped).
        let noteId = EntityID.make()
        let noteKey = DSCrypto.newKey()
        let wrapped = Base64URL.encode(try DSCrypto.wrapKey(noteKey, with: local, ad: CryptoAD.noteKey(noteId)))
        #expect(try keys.noteKey(noteId: noteId, wrappedKey: wrapped, notebookId: nb) == noteKey)
    }

    @Test func noteKeysAreRewrappedWithTheCanonicalKey() throws {
        let notebook = NotebookDocument(notebookId: EntityID.make())
        try notebook.initialize()
        let (old, new) = (DSCrypto.newKey(), DSCrypto.newKey())
        let (stale, fine) = (EntityID.make(), EntityID.make())
        let (k1, k2) = (DSCrypto.newKey(), DSCrypto.newKey())
        try notebook.putNote(NoteMeta(id: stale, wrappedKey: Base64URL.encode(try DSCrypto.wrapKey(k1, with: old, ad: CryptoAD.noteKey(stale)))))
        try notebook.putNote(NoteMeta(id: fine, wrappedKey: Base64URL.encode(try DSCrypto.wrapKey(k2, with: new, ad: CryptoAD.noteKey(fine)))))
        #expect(try notebook.rewrapNoteKeys(from: old, to: new) == 1)
        for (id, key) in [(stale, k1), (fine, k2)] {
            let meta = try #require(notebook.note(id: id))
            let wrapped = try #require(Base64URL.decode(meta.wrappedKey))
            #expect(try DSCrypto.unwrapKey(wrapped, with: new, ad: CryptoAD.noteKey(id)) == key)
        }
        #expect(try notebook.rewrapNoteKeys(from: old, to: new) == 0)
    }

    /// The server's wrapping wins over a different local key; missing keys are filled in.
    @Test func reconcileAdoptsServerKeys() async throws {
        let server = FakeRESTServer()
        let api1 = APIClient(baseURL: URL(string: "https://example.com")!, transport: server, sessionStore: SecretSessionStore(store: InMemorySecretStore()))
        let device1 = AccountService(api: api1, keys: KeyRing(store: InMemorySecretStore()), store: try LocalStore.inMemory())
        let signup = try await device1.signup(email: "k@example.com", password: "pw")
        let space = Space(name: "S", order: 1)
        try signup.account.putSpace(space)
        let a = try await device1.createNotebook(name: "A", spaceId: space.id, order: 1, in: signup.account)
        let b = try await device1.createNotebook(name: "B", spaceId: space.id, order: 2, in: signup.account)

        let api2 = APIClient(baseURL: URL(string: "https://example.com")!, transport: server, sessionStore: SecretSessionStore(store: InMemorySecretStore()))
        let keys2 = KeyRing(store: InMemorySecretStore())
        let device2 = AccountService(api: api2, keys: keys2, store: try LocalStore.inMemory())
        try await device2.login(email: "k@example.com", password: "pw", deviceName: "iPad")
        // The bug: device 2 made its own key for notebook A.
        let (wrong, _) = try keys2.createNotebookKey(notebookId: a.notebookId)
        let changes = try await device2.reconcileNotebookKeys()
        let canonicalA = try #require(try device1.keys.notebookKey(a.notebookId))
        #expect(changes == [.init(notebookId: a.notebookId, previousKey: wrong, key: canonicalA)])
        #expect(try keys2.notebookKey(a.notebookId) == canonicalA)
        #expect(try keys2.notebookKey(b.notebookId) == (try device1.keys.notebookKey(b.notebookId)))
        #expect(try await device2.reconcileNotebookKeys().isEmpty)
        #expect(try await device2.notebookKeyForWriting(b.notebookId) == (try device1.keys.notebookKey(b.notebookId)))
        #expect(try await device2.notebookKeyForWriting(EntityID.make()) == nil)
    }

    /// One unreadable item (another key) and one invalid update in the middle of a stream: the
    /// rest is applied, `lastSeq` moves past them, the status shows a calm per-notebook warning
    /// (not a spinner), and once the other key is known the item is fetched and read.
    @Test func unreadableItemsAreSetAsideAndRetried() async throws {
        let server = FakeSyncServer()
        let nbId = EntityID.make()
        let key = DSCrypto.newKey()
        let other = DSCrypto.newKey()
        let ad = CryptoAD.doc(nbId)
        func update(_ folder: String) throws -> Data {
            let d = NotebookDocument(notebookId: nbId)
            try d.putFolder(Folder(id: folder, parentId: nil, name: folder, order: 1))
            return try d.crdt.encodeStateAsUpdate()
        }
        await server.register(nbId)
        await server.seed(docId: nbId, payload: try DSCrypto.seal(try update("one"), key: key, ad: ad))
        await server.seed(docId: nbId, payload: try DSCrypto.seal(try update("two"), key: other, ad: ad))
        await server.seed(docId: nbId, payload: try DSCrypto.seal(Data([0xFF, 0x00, 0x13]), key: key, ad: ad))
        await server.seed(docId: nbId, payload: try DSCrypto.seal(try update("four"), key: key, ad: ad))

        let retired = Locked<[Data]>([])
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "B", clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let b = SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in key },
                           register: { await server.register($0.docId) }, retiredKeysFor: { _ in retired.withLock { $0 } })
        await b.start()
        let doc = NotebookDocument(notebookId: nbId)
        try await b.open(doc.crdt, notebookId: nbId)
        #expect(try await eventually { doc.folders().map(\.id).sorted() == ["four", "one"] })
        #expect(try b.store.document(nbId)?.lastSeq == 4)
        let status = await b.status()
        #expect(status.unreadable.map(\.docId) == [nbId])
        #expect(status.unreadable.first?.notebookId == nbId)
        #expect(status.unreadable.first?.count == 2)
        #expect(status.unreadable.first?.deviceIds == ["other"])
        #expect(try b.store.quarantined(docId: nbId).map(\.seq) == [2, 3])
        #expect(status.summary == .synced)

        // The other key becomes known (as a retired key after a repair): seq 2 is read now; the
        // invalid update stays aside.
        retired.withLock { $0 = [other] }
        await b.retryUnreadable()
        #expect(try await eventually { doc.folder(id: "two") != nil })
        #expect(try await eventually { (try? b.store.quarantined(docId: nbId).map(\.seq)) == [3] })
        #expect(try b.store.document(nbId)?.lastSeq == 4)
        await b.stop()
    }

    /// With a key the server confirmed, the device that met unreadable items uploads a snapshot
    /// of what it can read: a fresh device catches up from it and never meets the bad items.
    /// Without that confirmation nothing is uploaded (a device with a wrong key must not).
    @Test func canonicalDeviceCoversUnreadableItemsWithASnapshot() async throws {
        for canonical in [false, true] {
            let server = FakeSyncServer()
            let nbId = EntityID.make()
            let key = DSCrypto.newKey()
            let ad = CryptoAD.doc(nbId)
            func update(_ folder: String) throws -> Data {
                let d = NotebookDocument(notebookId: nbId)
                try d.putFolder(Folder(id: folder, parentId: nil, name: folder, order: 1))
                return try d.crdt.encodeStateAsUpdate()
            }
            await server.register(nbId)
            await server.seed(docId: nbId, payload: try DSCrypto.seal(try update("one"), key: key, ad: ad))
            await server.seed(docId: nbId, payload: try DSCrypto.seal(try update("bad"), key: DSCrypto.newKey(), ad: ad))
            await server.seed(docId: nbId, payload: try DSCrypto.seal(try update("three"), key: key, ad: ad))

            func device(_ name: String) throws -> SyncEngine {
                var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
                config.minBackoff = .milliseconds(10)
                let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
                return SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in key },
                                  register: { await server.register($0.docId) }, isKeyCanonical: { _ in canonical })
            }
            let b = try device("B")
            await b.start()
            let doc = NotebookDocument(notebookId: nbId)
            try await b.open(doc.crdt, notebookId: nbId)
            #expect(try await eventually { doc.folders().count == 2 })
            if canonical {
                #expect(try await eventually { let snap = await server.snapshots[nbId]; return snap?.seq == 3 })
                let c = try device("C")
                await c.start()
                let docC = NotebookDocument(notebookId: nbId)
                try await c.open(docC.crdt, notebookId: nbId)
                #expect(try await eventually { docC.folders().map(\.id).sorted() == ["one", "three"] })
                #expect(await c.status().unreadable.isEmpty)
                await c.stop()
            } else {
                try await Task.sleep(for: .milliseconds(200))
                let snap = await server.snapshots[nbId]
                #expect(snap == nil)
            }
            await b.stop()
        }
    }

    /// Device B wrote a notebook document with its own key. After adopting the canonical key and
    /// `rekey`, it reads everything (its old updates through the retired key) and uploads a
    /// canonical snapshot: a fresh device with the canonical key sees both devices' edits.
    @Test func rekeyRepairsADocumentWrittenWithAnotherKey() async throws {
        let server = FakeSyncServer()
        let nbId = EntityID.make()
        let canonical = DSCrypto.newKey()
        let wrong = DSCrypto.newKey()

        func device(_ name: String, key: Locked<Data>, retired: Locked<[Data]> = Locked([])) throws -> SyncEngine {
            var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
            config.minBackoff = .milliseconds(10)
            let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
            return SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in key.withLock { $0 } },
                              register: { await server.register($0.docId) }, retiredKeysFor: { _ in retired.withLock { $0 } })
        }

        let a = try device("A", key: Locked(canonical))
        await a.start()
        let docA = NotebookDocument(notebookId: nbId)
        try await a.open(docA.crdt, notebookId: nbId)
        try docA.initialize()
        try docA.putFolder(Folder(id: "fa", parentId: nil, name: "From A", order: 1))
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })

        let keyB = Locked(wrong)
        let retiredB = Locked<[Data]>([])
        let b = try device("B", key: keyB, retired: retiredB)
        await b.start()
        let docB = NotebookDocument(notebookId: nbId)
        try await b.open(docB.crdt, notebookId: nbId)
        try docB.putFolder(Folder(id: "fb", parentId: nil, name: "From B", order: 2))
        #expect(try await eventually { (try? b.store.outboxCount()) == 0 })
        #expect(docB.folder(id: "fa") == nil) // B cannot read A's update

        // Repair: B adopts the canonical key and re-keys the document.
        keyB.withLock { $0 = canonical }
        retiredB.withLock { $0 = [wrong] }
        await b.rekey(docId: nbId)
        #expect(try await eventually { docB.folder(id: "fa")?.name == "From A" })
        #expect(try await eventually { await server.snapshots[nbId] != nil && (try? b.store.outboxCount()) == 0 })
        #expect(try b.store.value(SyncEngine.rekeyFlag(nbId)) == nil)

        let c = try device("C", key: Locked(canonical))
        await c.start()
        let docC = NotebookDocument(notebookId: nbId)
        try await c.open(docC.crdt, notebookId: nbId)
        #expect(try await eventually { docC.folders().map(\.name).sorted() == ["From A", "From B"] })
        await a.stop()
        await b.stop()
        await c.stop()
    }
}
