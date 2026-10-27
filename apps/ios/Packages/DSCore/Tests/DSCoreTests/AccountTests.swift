import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// Minimal in-memory REST server for account/notebook/attachment flows (api.md).
final class FakeRESTServer: HTTPTransport, @unchecked Sendable {
    struct User { var userId: String; var salt: String; var kdf: [String: Any]; var loginKey: String; var recoveryLoginKey: String
        var wrappedPassword: String; var wrappedRecovery: String; var accountDocId: String }

    let state = Locked<(users: [String: User], notebooks: [String: [String: Any]], docs: Set<String>,
                        attachments: [String: (chunkCount: Int, chunks: [Int: Data])], tokens: Int, moved: [String: String],
                        events: [[String: Any]])>(([:], [:], [], [:], 0, [:], []))

    func session(_ u: User) -> [String: Any] {
        let n = state.withLock { $0.tokens += 1; return $0.tokens }
        return ["userId": u.userId, "deviceId": "dev-\(n)", "accessToken": "at\(n)", "refreshToken": "rt\(n)", "accessExpiresAt": DSDate.iso(Date().addingTimeInterval(900)),
                "wrappedMasterKeyPassword": u.wrappedPassword, "accountDocId": u.accountDocId]
    }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let path = request.url!.path
        let body = (request.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]) ?? [:]
        let (status, obj) = handle(request.httpMethod ?? "GET", path, body, request.httpBody)
        let data: Data
        if let d = obj as? Data { data = d } else if let obj { data = try JSONSerialization.data(withJSONObject: obj) } else { data = Data() }
        return (data, HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }

    func error(_ status: Int, _ code: String) -> (Int, Any?) { (status, ["error": ["code": code, "message": code]]) }

    func handle(_ method: String, _ path: String, _ b: [String: Any], _ raw: Data?) -> (Int, Any?) {
        let parts = path.split(separator: "/").map(String.init)
        switch (method, path) {
        case ("POST", "/v1/auth/prelogin"):
            guard let u = state.withLock({ $0.users[b["email"] as! String] }) else { return error(404, "not_found") }
            return (200, ["salt": u.salt, "kdf": u.kdf])
        case ("POST", "/v1/auth/signup"):
            let u = User(userId: b["userId"] as! String, salt: b["salt"] as! String, kdf: b["kdf"] as! [String: Any], loginKey: b["loginKey"] as! String,
                         recoveryLoginKey: b["recoveryLoginKey"] as! String, wrappedPassword: b["wrappedMasterKeyPassword"] as! String,
                         wrappedRecovery: b["wrappedMasterKeyRecovery"] as! String, accountDocId: b["accountDocId"] as! String)
            state.withLock { $0.users[b["email"] as! String] = u }
            return (200, session(u))
        case ("POST", "/v1/auth/login"):
            guard let u = state.withLock({ $0.users[b["email"] as! String] }), u.loginKey == b["loginKey"] as? String else { return error(401, "unauthorized") }
            return (200, session(u))
        case ("POST", "/v1/auth/recovery/start"):
            guard let u = state.withLock({ $0.users[b["email"] as! String] }), u.recoveryLoginKey == b["recoveryLoginKey"] as? String else { return error(401, "unauthorized") }
            return (200, ["recoveryToken": "rec-\(b["email"]!)", "wrappedMasterKeyRecovery": u.wrappedRecovery, "userId": u.userId])
        case ("POST", "/v1/auth/recovery/finish"), ("POST", "/v1/auth/password"):
            let email = state.withLock { s in s.users.first { path.hasSuffix("finish") ? "rec-\($0.key)" == b["recoveryToken"] as? String : $0.value.loginKey == b["currentLoginKey"] as? String }?.key }
            guard let email else { return error(401, "unauthorized") }
            let u = state.withLock { s -> User in
                s.users[email]!.salt = b["salt"] as! String
                s.users[email]!.loginKey = b["loginKey"] as! String
                s.users[email]!.wrappedPassword = b["wrappedMasterKeyPassword"] as! String
                return s.users[email]!
            }
            return path.hasSuffix("finish") ? (200, session(u)) : (204, nil)
        case ("POST", "/v1/auth/recovery-key"):
            guard let email = state.withLock({ s in s.users.first { $0.value.loginKey == b["currentLoginKey"] as? String }?.key }) else { return error(401, "unauthorized") }
            state.withLock { s in
                s.users[email]!.recoveryLoginKey = b["recoveryLoginKey"] as! String
                s.users[email]!.wrappedRecovery = b["wrappedMasterKeyRecovery"] as! String
                s.events.insert(["kind": "recovery_key_rotated", "at": DSDate.iso(Date()), "deviceId": "dev-1", "deviceName": NSNull()], at: 0)
            }
            return (204, nil)
        case ("GET", "/v1/me/security-events"):
            return (200, state.withLock { $0.events })
        case ("POST", "/v1/auth/logout"):
            return (204, nil)
        case ("POST", "/v1/notebooks"):
            let nb: [String: Any] = ["id": b["notebookId"]!, "mode": b["mode"]!, "createdAt": DSDate.iso(Date()), "wrappedKey": b["wrappedKey"]!]
            state.withLock { $0.notebooks[b["notebookId"] as! String] = nb }
            return (200, nb)
        case ("GET", "/v1/notebooks"):
            return (200, state.withLock { Array($0.notebooks.values) })
        case ("PATCH", _) where parts.count == 3 && parts[1] == "docs":
            state.withLock { $0.moved[parts[2]] = b["notebookId"] as? String }
            return (204, nil)
        case ("POST", "/v1/docs"):
            state.withLock { _ = $0.docs.insert(b["docId"] as! String) }
            return (204, nil)
        case ("POST", "/v1/attachments"):
            let id = b["attachmentId"] as! String
            if state.withLock({ $0.attachments[id] != nil }) { return error(409, "conflict") }
            state.withLock { $0.attachments[id] = (b["chunkCount"] as! Int, [:]) }
            return (204, nil)
        default:
            if parts.count == 4, parts[1] == "notebooks", parts[3] == "key", method == "GET" {
                guard let nb = state.withLock({ $0.notebooks[parts[2]] }) else { return error(404, "not_found") }
                return (200, ["wrappedKey": nb["wrappedKey"]!])
            }
            if parts.count >= 3, parts[1] == "notebooks", method == "PATCH" {
                state.withLock { $0.notebooks[parts[2]]?["mode"] = b["mode"] }
                return (204, nil)
            }
            if parts.count >= 3, parts[1] == "attachments" {
                let id = parts[2]
                guard let att = state.withLock({ $0.attachments[id] }) else { return error(404, "not_found") }
                if parts.count == 3, method == "GET" {
                    let size = att.chunks.values.reduce(0) { $0 + $1.count }
                    return (200, ["size": size, "chunkCount": att.chunkCount, "mime": "image/png", "uploadedChunks": att.chunks.keys.sorted()])
                }
                if parts.count == 5, let index = Int(parts[4]) {
                    if method == "PUT" {
                        state.withLock { $0.attachments[id]?.chunks[index] = raw }
                        return (204, nil)
                    }
                    return att.chunks[index].map { (200, $0) } ?? error(404, "not_found")
                }
            }
            return error(500, "internal")
        }
    }
}

@Suite struct AccountServiceTests {
    let fastKDF = KDFParams(ops: 1, mem: 8 * 1024 * 1024)

    func makeService(_ server: FakeRESTServer) throws -> AccountService {
        let api = APIClient(baseURL: URL(string: "https://example.com")!, transport: server, sessionStore: SecretSessionStore(store: InMemorySecretStore()))
        return AccountService(api: api, keys: KeyRing(store: InMemorySecretStore()), store: try LocalStore.inMemory())
    }

    /// spec/07: signing out keeps the keys of notebooks not on the server yet; signing in to the
    /// same account keeps them as ordinary keys, another account or «Удалить данные» removes them.
    @Test func signOutKeepsKeysOfUnsentNotebooks() async throws {
        let server = FakeRESTServer()
        let device = try makeService(server)
        let signup = try await device.signup(email: "keep@example.com", password: "pw")
        let space = Space(name: "S", order: 1)
        try signup.account.putSpace(space)
        let sent = try await device.createNotebook(name: "Sent", spaceId: space.id, order: 1, in: signup.account)
        let unsent = EntityID.make()
        try device.store.ensureDocument(docId: unsent, kind: .notebook, notebookId: unsent)
        let (unsentKey, _) = try device.keys.createNotebookKey(notebookId: unsent)
        try device.store.appendLocalUpdate(docId: unsent, update: Data([1]), origin: .local)
        #expect(try device.store.unsentNotebookIds() == [unsent])
        #expect(try device.store.unsentChangeCount() == 2)

        #expect(try await device.logout() == [unsent])
        #expect(try device.keys.notebookKey(unsent) == unsentKey)
        #expect(try device.keys.notebookKey(sent.notebookId) == nil)
        #expect(try device.keys.masterKey() == nil)
        #expect(device.keys.keptNotebookKeys?.owner == signup.session.userId)

        // Same account: the key stays and is ordinary again; the rest comes from the server.
        try await device.login(email: "keep@example.com", password: "pw", deviceName: "iPad")
        #expect(try device.keys.notebookKey(unsent) == unsentKey)
        #expect(device.keys.keptNotebookKeys == nil)
        try await device.loadNotebookKeys()
        #expect(try device.keys.notebookKey(sent.notebookId) != nil)

        // Another account: kept keys are removed.
        try await device.logout()
        #expect(try device.keys.notebookKey(unsent) == unsentKey)
        _ = try await device.signup(email: "other@example.com", password: "pw")
        #expect(try device.keys.notebookKey(unsent) == nil)

        // «Удалить данные с этого устройства».
        try device.store.ensureDocument(docId: unsent, kind: .notebook, notebookId: unsent)
        _ = try device.keys.createNotebookKey(notebookId: unsent)
        try await device.logout()
        #expect(try device.keys.notebookKey(unsent) != nil)
        try device.eraseDeviceKeys()
        #expect(try device.keys.notebookKey(unsent) == nil)
        #expect(device.keys.keptNotebookKeys == nil)
    }

    @Test func signupLoginNotebookNoteRecoveryAttachment() async throws {
        let server = FakeRESTServer()
        let device1 = try makeService(server)
        let signup = try await device1.signup(email: "Me@Example.com", password: "pässword")
        #expect(signup.recoveryKeyText.hasPrefix("DS1-"))
        let master = try #require(try device1.keys.masterKey())

        let space = Space(name: "Personal", order: 1)
        try signup.account.putSpace(space)
        let notebook = try await device1.createNotebook(name: "Journal", spaceId: space.id, icon: "📓", color: "green", order: 1, in: signup.account)
        #expect(notebook.metaCopy == .init(name: "Journal", icon: "📓", color: "green", spaceId: space.id, spaceName: "Personal", spaceIcon: nil))
        try signup.account.updateNotebook(id: notebook.notebookId, ["color": .string(value: "red")])
        try device1.refreshNotebookMeta(notebook, in: signup.account)
        #expect(notebook.metaCopy?.color == "red")
        #expect(signup.account.notebooks(inSpace: space.id).map(\.name) == ["Journal"])
        #expect(server.state.withLock { $0.docs.contains(notebook.notebookId) })
        let note = try await device1.createNote(in: notebook, title: "First")
        let meta = try #require(notebook.note(id: note.noteId))
        #expect(meta.title == "First")
        let noteKey1Before = try device1.keys.noteKey(noteId: note.noteId, wrappedKey: meta.wrappedKey, notebookId: notebook.notebookId)
        // Move the note to another notebook: key rewrapped, meta moved, server told.
        let other = try await device1.createNotebook(name: "Work", spaceId: space.id, order: 2, in: signup.account)
        try await device1.moveNote(id: note.noteId, from: notebook, to: other)
        #expect(notebook.note(id: note.noteId) == nil)
        let movedMeta = try #require(other.note(id: note.noteId))
        #expect(server.state.withLock { $0.moved[note.noteId] } == other.notebookId)
        #expect(try device1.keys.noteKey(noteId: note.noteId, wrappedKey: movedMeta.wrappedKey, notebookId: other.notebookId) == noteKey1Before)
        #expect(try device1.store.document(note.noteId)?.notebookId == other.notebookId)
        try await device1.moveNote(id: note.noteId, from: other, to: notebook)
        let daily = try await device1.dailyNote(for: "2026-10-25", in: notebook)
        #expect(daily.created != nil && daily.meta.kind == .daily)
        #expect(try await device1.dailyNote(for: "2026-10-25", in: notebook).created == nil)
        let inbox = try await device1.inbox(in: notebook)
        #expect(try await device1.inbox(in: notebook).meta.id == inbox.meta.id)

        // A second device signs in with the password and gets the same keys.
        let device2 = try makeService(server)
        try await device2.login(email: "me@example.com", password: "pässword", deviceName: "iPhone")
        #expect(try device2.keys.masterKey() == master)
        try await device2.loadNotebookKeys()
        let noteKey1 = try device1.keys.noteKey(noteId: note.noteId, wrappedKey: meta.wrappedKey, notebookId: notebook.notebookId)
        #expect(try device2.keys.noteKey(noteId: note.noteId, wrappedKey: meta.wrappedKey, notebookId: notebook.notebookId) == noteKey1)

        // Wrong password fails.
        await #expect(throws: APIError.self) { try await device2.login(email: "me@example.com", password: "nope", deviceName: "x") }

        // Recovery sets a new password; the master key is unchanged.
        let device3 = try makeService(server)
        try await device3.recover(email: "me@example.com", recoveryKeyText: signup.recoveryKeyText.lowercased(), newPassword: "new one")
        #expect(try device3.keys.masterKey() == master)
        let device4 = try makeService(server)
        try await device4.login(email: "me@example.com", password: "new one", deviceName: "Mac")
        #expect(try device4.keys.masterKey() == master)

        // Recovery key rotation: the old key stops working, the new one recovers the same master key.
        try signup.account.setRecoveryKeyConfirmed(true)
        await #expect(throws: (any Error).self) {
            _ = try await device4.rotateRecoveryKey(email: "me@example.com", currentPassword: "wrong", account: signup.account)
        }
        let newRecovery = try await device4.rotateRecoveryKey(email: "me@example.com", currentPassword: "new one", account: signup.account)
        #expect(newRecovery.hasPrefix("DS1-") && newRecovery != signup.recoveryKeyText)
        #expect(signup.account.recoveryKeyConfirmed == false)
        #expect(try await device4.securityEvents().map(\.kind) == [.recoveryKeyRotated])
        await #expect(throws: APIError.self) {
            try await makeService(server).recover(email: "me@example.com", recoveryKeyText: signup.recoveryKeyText, newPassword: "x")
        }
        let device5 = try makeService(server)
        try await device5.recover(email: "me@example.com", recoveryKeyText: newRecovery, newPassword: "new one")
        #expect(try device5.keys.masterKey() == master)

        // Attachments: encrypted chunk upload, resumable, downloaded by another device.
        let dir1 = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        let dir2 = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        defer { try? FileManager.default.removeItem(at: dir1); try? FileManager.default.removeItem(at: dir2) }
        let files1 = try AttachmentManager(api: device1.api, store: device1.store, directory: dir1)
        let payload = DSCrypto.randomBytes(DSCrypto.attachmentChunkSize + 5)
        let attId = try await files1.add(payload, mime: "image/png", noteId: note.noteId)
        await files1.uploadPending { _ in noteKey1 }
        #expect(try device1.store.attachment(attId)?.state == .synced)
        #expect(server.state.withLock { $0.attachments[attId]?.chunks.count } == 2)
        let files2 = try AttachmentManager(api: device4.api, store: device4.store, directory: dir2)
        let url = try await files2.download(attId, noteId: note.noteId, noteKey: noteKey1, mime: "image/png")
        #expect(try Data(contentsOf: url) == payload)

        try await device1.logout()
        #expect(try device1.keys.masterKey() == nil)
    }

    /// Rich paste: the block gets the attachment id before the image bytes exist; the bytes are
    /// added under that id later, or never (then nothing is stored or sent).
    @Test func attachmentWithIdMadeBeforehand() async throws {
        let server = FakeRESTServer()
        let device = try makeService(server)
        let signup = try await device.signup(email: "paste@example.com", password: "pw")
        let space = Space(name: "Personal", order: 1)
        try signup.account.putSpace(space)
        let notebook = try await device.createNotebook(name: "Web", spaceId: space.id, order: 1, in: signup.account)
        let note = try await device.createNote(in: notebook, title: "Pasted")
        let meta = try #require(notebook.note(id: note.noteId))
        let noteKey = try #require(try device.keys.noteKey(noteId: note.noteId, wrappedKey: meta.wrappedKey, notebookId: notebook.notebookId))
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        let dir2 = FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make())
        defer { try? FileManager.default.removeItem(at: dir); try? FileManager.default.removeItem(at: dir2) }
        let files = try AttachmentManager(api: device.api, store: device.store, directory: dir)

        let filled = EntityID.make()
        let never = EntityID.make()
        // Nothing exists for a reserved id until its bytes are added.
        #expect(try device.store.attachment(filled) == nil)
        let payload = DSCrypto.randomBytes(1000)
        #expect(try await files.add(payload, mime: "image/jpeg", noteId: note.noteId, id: filled) == filled)
        await files.uploadPending { _ in noteKey }
        #expect(try device.store.attachment(filled)?.state == .synced)
        let other = try AttachmentManager(api: device.api, store: try LocalStore.inMemory(), directory: dir2)
        #expect(try Data(contentsOf: try await other.download(filled, noteId: note.noteId, noteKey: noteKey)) == payload)

        // The id that never got bytes: nothing stored, nothing uploaded.
        #expect(try device.store.attachment(never) == nil)
        #expect(await files.localURL(never) == nil)
        #expect(server.state.withLock { $0.attachments[never] } == nil)
        #expect(server.state.withLock { $0.attachments.count } == 1)

        // Misuse is refused.
        await #expect(throws: AttachmentError.alreadyExists(filled)) { try await files.add(payload, mime: "image/jpeg", noteId: note.noteId, id: filled) }
        await #expect(throws: AttachmentError.invalidId("nope")) { try await files.add(payload, mime: "image/jpeg", noteId: note.noteId, id: "nope") }
    }
}
