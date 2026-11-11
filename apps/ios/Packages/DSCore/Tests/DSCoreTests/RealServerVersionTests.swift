import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// Against a running server — in CI (ios-app «Real server») the real one, behind the production
/// Caddy front door with its compression (`infra/deploy/Caddyfile`), over URLSession. Build 46:
/// the version list showed, but opening a version said «DSCore.APIError error 2». Here a note
/// gets versions the way the app makes them (`snapshotNow`), also one of more than 1 MB, in a
/// private and in an agent-mode notebook, and every listed version opens and decrypts.
@Suite(.serialized, .enabled(if: ProcessInfo.processInfo.environment["DS_REAL_SERVER"] != nil,
                             "set DS_REAL_SERVER=http://127.0.0.1:8480"))
struct RealServerVersionTests {
    let server = URL(string: ProcessInfo.processInfo.environment["DS_REAL_SERVER"] ?? "http://127.0.0.1:8480")!

    @Test(arguments: [NotebookMode.private, NotebookMode.agent])
    func everyVersionOpens(mode: NotebookMode) async throws {
        let api = APIClient(baseURL: server, sessionStore: SecretSessionStore(store: InMemorySecretStore()))
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let accounts = AccountService(api: api, keys: keys, store: store)
        let signup = try await accounts.signup(email: "versions-\(EntityID.make())@example.com",
                                               password: "correct horse battery staple")
        let notebook = try await accounts.createNotebook(name: "Для ИИ Личное", spaceId: EntityID.make(), mode: mode,
                                                         order: 0, in: signup.account)
        let note = try accounts.createNote(in: notebook, title: "Plan")
        let noteId = note.noteId
        let meta = try #require(notebook.note(id: noteId))
        let noteKey = try keys.noteKey(noteId: noteId, wrappedKey: meta.wrappedKey, notebookId: notebook.notebookId)

        let config = SyncClient.Configuration(url: SyncClient.Configuration.url(forServer: server),
                                              deviceId: try store.deviceId(), clientVersion: "test")
        let client = SyncClient(configuration: config) { .user(accessToken: try await api.accessToken()) }
        let engine = SyncEngine(store: store, client: client, keyFor: { record in record.docId == noteId ? noteKey : nil },
                                register: { record in
                                    try await api.registerDoc(docId: record.docId, kind: record.kind, notebookId: record.notebookId)
                                })
        await engine.start()
        try await engine.open(note.crdt, notebookId: notebook.notebookId)

        try note.insertText("Buy milk and bread.", at: 0, inBlock: [1])
        #expect(try await eventually(timeout: .seconds(20)) { (try? store.outboxCount()) == 0 }, "the first edit was not sent")
        #expect(await engine.snapshotNow(docId: noteId, reason: .beforeSuggestion), "no first version")

        // A long note: a version of more than 1 MB (the edits in pieces, each well under the
        // server's 2 MB update limit).
        let paragraph = String(repeating: "Долгий текст заметки, чтобы версия была большой. ", count: 1_000)
        for _ in 0..<14 { try note.insertText(paragraph, at: 0, inBlock: [1]) }
        #expect(try await eventually(timeout: .seconds(60)) { (try? store.outboxCount()) == 0 }, "the long text was not sent")
        #expect(await engine.snapshotNow(docId: noteId, reason: .beforeVoiceInsert), "no second version")

        var versions: [DocVersion] = []
        _ = try await eventually(timeout: .seconds(20)) {
            versions = (try? await api.versions(docId: noteId)) ?? []
            return versions.count >= 2
        }
        #expect(versions.count >= 2, "versions listed: \(versions.map(\.seq))")
        var largest = 0
        for version in versions {
            let sealed: Data
            do {
                sealed = try await api.version(docId: noteId, seq: version.seq)
            } catch {
                Issue.record("version \(version.seq) did not open: \(error) — \(error.localizedDescription)")
                continue
            }
            let plain = try DSCrypto.open(sealed, key: noteKey, ad: CryptoAD.doc(noteId))
            let opened = NoteDocument(noteId: noteId)
            try opened.crdt.applyUpdate(plain, origin: .storage)
            #expect(try opened.block(at: [1])?.text.contains("Buy milk and bread.") == true, "version \(version.seq) holds the note")
            largest = max(largest, sealed.count)
        }
        #expect(largest > 1_000_000, "the long version was \(largest) bytes")
        await engine.stop()
    }
}
