import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// crypto.md §10 against packages/test-vectors crypto/sharing.json (same bytes as TS).
@Suite(.enabled(if: FileManager.default.fileExists(atPath: Vectors.root.appendingPathComponent("crypto/sharing.json").path)))
struct SharingVectorTests {
    let f: [String: Any]
    init() throws { f = try Vectors.json("crypto/sharing.json") }

    var owner: [String: String] { (f["accounts"] as! [String: Any])["owner"] as! [String: String] }
    var member: [String: String] { (f["accounts"] as! [String: Any])["member"] as! [String: String] }

    @Test func keyPairsAndSecretKeyWrap() throws {
        for a in [owner, member] {
            let kp = try DSCrypto.newBoxKeyPair(seed: try Vectors.hex(a["seed"]))
            #expect(kp.publicKey == (try Vectors.hex(a["publicKey"])))
            #expect(kp.secretKey == (try Vectors.hex(a["secretKey"])))
            #expect(try DSCrypto.boxPublicKey(of: kp.secretKey) == kp.publicKey)
        }
        let master = try Vectors.hex(owner["masterKey"])
        let sk = try Vectors.hex(owner["secretKey"]), pk = try Vectors.hex(owner["publicKey"])
        #expect(CryptoAD.accountBoxKey(owner["userId"]!) == owner["ad"])
        let wrapped = try DSCrypto.wrapBoxSecretKey(sk, masterKey: master, userId: owner["userId"]!, nonce: try Vectors.hex(owner["wrapNonce"]))
        #expect(wrapped == (try Vectors.b64(owner["wrappedSecretKey"])))
        #expect(try DSCrypto.unwrapBoxSecretKey(wrapped, masterKey: master, userId: owner["userId"]!, publicKey: pk) == sk)
        // A published public key that is not this secret key's: refused.
        #expect(throws: CryptoError.boxKeyMismatch) {
            try DSCrypto.unwrapBoxSecretKey(wrapped, masterKey: master, userId: owner["userId"]!, publicKey: try Vectors.hex(member["publicKey"]))
        }
    }

    @Test func memberWrapKeyIsSymmetric() throws {
        let expected = try Vectors.hex(f["memberWrapKey"])
        let a = try DSCrypto.memberWrapKey(mySecretKey: try Vectors.hex(owner["secretKey"]), peerPublicKey: try Vectors.hex(member["publicKey"]))
        let b = try DSCrypto.memberWrapKey(mySecretKey: try Vectors.hex(member["secretKey"]), peerPublicKey: try Vectors.hex(owner["publicKey"]))
        #expect(a == expected && b == expected)
        #expect(throws: CryptoError.invalidPeerKey) {
            try DSCrypto.memberWrapKey(mySecretKey: try Vectors.hex(owner["secretKey"]), peerPublicKey: Data(count: 32))
        }
    }

    func ref(_ m: [String: Any]) -> MemberKeyRef {
        MemberKeyRef(kind: ShareTargetKind(rawValue: m["kind"] as! String)!, targetId: m["targetId"] as! String, version: m["version"] as! Int,
                     fromUserId: m["fromUserId"] as! String, toUserId: m["toUserId"] as! String)
    }

    func keys(_ t: [String: Any]) throws -> [Int: Data] {
        Dictionary(uniqueKeysWithValues: try (t["keys"] as! [[String: Any]]).map { ($0["version"] as! Int, try Vectors.hex($0["key"])) })
    }

    @Test(arguments: ["notebook", "note"])
    func targetWrapsMemberWrapsAndChain(_ name: String) throws {
        let t = f[name] as! [String: Any]
        let kind = ShareTargetKind(rawValue: name)!
        let id = t[name == "notebook" ? "notebookId" : "noteId"] as! String
        let k = try keys(t)
        let current = k.keys.max()!
        // Owner's own wrap (notebook: by the master key; note: by the notebook key), versioned ad.
        let own = (t["ownerWrap"] ?? t["wrappedByNotebookKey"]) as! [String: Any]
        #expect(CryptoAD.targetKey(kind, id, version: own["version"] as! Int) == own["ad"] as! String)
        if let legacy = t["legacyAdVersion1"] as? String { #expect(CryptoAD.targetKey(kind, id, version: 1) == legacy) }
        let wrappingKey = name == "notebook" ? try Vectors.hex(owner["masterKey"]) : try keys(f["notebook"] as! [String: Any]).max { $0.key < $1.key }!.value   // the current notebook key
        let w = try DSCrypto.wrapKey(k[current]!, with: wrappingKey, ad: own["ad"] as! String, nonce: try Vectors.hex(own["nonce"]))
        #expect(w == (try Vectors.b64(own["wrappedKey"])))

        // Member wrap.
        let m = t["memberWrap"] as! [String: Any]
        let r = ref(m)
        #expect(CryptoAD.memberKey(r) == m["ad"] as! String)
        let mw = try DSCrypto.wrapKeyForMember(k[current]!, ownerSecretKey: try Vectors.hex(owner["secretKey"]), memberPublicKey: try Vectors.hex(member["publicKey"]),
                                               ref: r, nonce: try Vectors.hex(m["nonce"]))
        #expect(mw == (try Vectors.b64(m["wrappedKey"])))
        #expect(try DSCrypto.unwrapKeyFromOwner(mw, memberSecretKey: try Vectors.hex(member["secretKey"]), ownerPublicKey: try Vectors.hex(owner["publicKey"]), ref: r) == k[current]!)

        // Chain back to version 1.
        let chain = try (t["keyChain"] as! [Any]).map { try Vectors.b64($0) }
        let all = try DSCrypto.unwrapKeyChain(currentKey: k[current]!, currentVersion: current, chain: chain, kind: kind, targetId: id)
        #expect(all == (1...current).reversed().map { k[$0]! })
        if let ads = t["keyChainAds"] as? [String] {
            #expect(ads == (0..<chain.count).map { CryptoAD.previousKey(kind, id, version: current - $0) })
        }
    }

    @Test func wrongAdsAreRefused() throws {
        let m = (f["notebook"] as! [String: Any])["memberWrap"] as! [String: Any]
        let wrapped = try Vectors.b64(m["wrappedKey"])
        let key = try DSCrypto.memberWrapKey(mySecretKey: try Vectors.hex(member["secretKey"]), peerPublicKey: try Vectors.hex(owner["publicKey"]))
        for c in f["invalid"] as! [[String: String]] {
            #expect(throws: (any Error).self, "\(c["reason"]!)") { try DSCrypto.unwrapKey(wrapped, with: key, ad: c["ad"]!) }
        }
    }

    @Test func safetyCode() throws {
        let a = (owner["userId"]!, try Vectors.hex(owner["publicKey"]))
        let b = (member["userId"]!, try Vectors.hex(member["publicKey"]))
        #expect(try DSCrypto.safetyCode(a, b) == f["safetyCode"] as! String)
        #expect(try DSCrypto.safetyCode(b, a) == f["safetyCode"] as! String)
    }
}

/// In-memory server for account sharing (api.md «Совместный доступ по аккаунтам»): just enough
/// to check what the clients send and that keys only ever travel wrapped.
final class FakeSharingServer: HTTPTransport, @unchecked Sendable {
    struct Membership { var role: String; var status: String; var createdAfter: Bool; var wrappedKey: String? }
    struct Resource { var owner: String; var version = 1; var ownerWrapped: String = ""; var chain: [String] = []; var pending = false
        var members: [String: Membership] = [:]; var docIds: [String] = [] }
    struct State {
        var boxKeys: [String: (publicKey: String, wrapped: String)] = [:]
        var emails: [String: String] = [:]           // email → userId
        var invitations: [String: (target: String, email: String, role: String, from: String)] = [:]
        var resources: [String: Resource] = [:]       // "kind:id"
        var tokens: [String: String] = [:]            // access token → userId
        var rotations: [[String: Any]] = []
    }
    let state = Locked(State())

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let token = request.value(forHTTPHeaderField: "Authorization")?.replacingOccurrences(of: "Bearer ", with: "") ?? ""
        let me = state.withLock { $0.tokens[token] } ?? ""
        let body = (request.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]) ?? [:]
        var path = request.url!.path
        let query = request.url!.query
        path.removeFirst("/v1".count)
        let parts = path.split(separator: "/").map(String.init)
        let (status, obj) = state.withLock { s in handle(&s, me, request.httpMethod!, parts, query, body) }
        let data = obj.map { try! JSONSerialization.data(withJSONObject: $0, options: [.fragmentsAllowed]) } ?? Data()
        return (data, HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }

    static func err(_ status: Int, _ code: String) -> (Int, Any?) { (status, ["error": ["code": code, "message": code]]) }

    func sharedItem(_ s: State, key: String, for user: String) -> [String: Any] {
        let r = s.resources[key]!
        let (kind, id) = (String(key.split(separator: ":")[0]), String(key.split(separator: ":")[1]))
        let m = r.members[user]!
        return ["target": ["kind": kind, "id": id], "owner": ["userId": r.owner, "email": s.emails.first { $0.value == r.owner }!.key, "publicKey": s.boxKeys[r.owner]!.publicKey],
                "role": m.role, "keyVersion": r.version, "wrappedKey": m.wrappedKey as Any? ?? NSNull(), "keyChain": r.chain, "docIds": r.docIds,
                "addedAt": "2026-10-27T12:00:00.000Z"]
    }

    func handle(_ s: inout State, _ me: String, _ method: String, _ p: [String], _ query: String?, _ b: [String: Any]) -> (Int, Any?) {
        switch (method, p.first ?? "") {
        case ("GET", "me") where p == ["me", "box-key"]:
            guard let k = s.boxKeys[me] else { return Self.err(404, "not_found") }
            return (200, ["publicKey": k.publicKey, "wrappedSecretKey": k.wrapped])
        case ("PUT", "me"):
            let new = (b["publicKey"] as! String, b["wrappedSecretKey"] as! String)
            if let have = s.boxKeys[me], have != new { return Self.err(409, "conflict") }
            s.boxKeys[me] = new
            return (204, nil)
        case ("GET", "users"):
            guard let k = s.boxKeys[p[1]] else { return Self.err(404, "not_found") }
            return (200, ["userId": p[1], "publicKey": k.publicKey])
        case ("POST", "invitations") where p.count == 1:
            let t = b["target"] as! [String: String]
            s.invitations[b["invitationId"] as! String] = ("\(t["kind"]!):\(t["id"]!)", b["email"] as! String, b["role"] as! String, me)
            return (204, nil)
        case ("POST", "invitations") where p.last == "accept":
            guard let inv = s.invitations[p[1]] else { return Self.err(404, "not_found") }
            s.resources[inv.target]!.members[me] = Membership(role: inv.role, status: "awaiting_key", createdAfter: s.emails[inv.email + "#late"] != nil, wrappedKey: nil)
            return (200, sharedItem(s, key: inv.target, for: me))
        case ("GET", "members") where p.count == 3:
            let key = "\(p[1]):\(p[2])"
            guard let r = s.resources[key] else { return Self.err(404, "not_found") }
            return (200, r.members.map { uid, m in
                ["userId": uid, "email": s.emails.first { $0.value == uid }!.key, "role": m.role, "status": m.status,
                 "joinedAt": "2026-10-27T12:00:00.000Z", "accountCreatedAfterInvite": m.createdAfter] as [String: Any]
            })
        case ("PUT", "members"):
            let key = "\(p[1]):\(p[2])"
            guard s.resources[key]?.owner == me else { return Self.err(403, "forbidden") }
            guard b["version"] as? Int == s.resources[key]!.version else { return Self.err(409, "conflict") }
            s.resources[key]!.members[p[3]]!.wrappedKey = b["wrappedKey"] as? String
            s.resources[key]!.members[p[3]]!.status = "active"
            return (204, nil)
        case ("DELETE", "members"):
            let key = "\(p[1]):\(p[2])"
            s.resources[key]!.members[p[3]] = nil
            s.resources[key]!.pending = true
            return (204, nil)
        case ("POST", "members") where p.last == "rotate":
            let key = "\(p[1]):\(p[2])"
            var r = s.resources[key]!
            guard r.owner == me else { return Self.err(403, "forbidden") }
            let keysFor = (b["memberKeys"] as! [[String: String]])
            guard b["version"] as? Int == r.version + 1, Set(keysFor.map { $0["userId"]! }) == Set(r.members.keys) else { return Self.err(409, "conflict") }
            r.version += 1
            r.ownerWrapped = b["ownerWrappedKey"] as! String
            r.chain.insert(b["previousKeyWrap"] as! String, at: 0)
            for k in keysFor { r.members[k["userId"]!]!.wrappedKey = k["wrappedKey"]; r.members[k["userId"]!]!.status = "active" }
            if p[1] == "note" { r.pending = false }
            s.resources[key] = r
            s.rotations.append(b)
            return (204, nil)
        case ("POST", "members") where p.last == "done":
            s.resources["notebook:\(p[2])"]!.pending = false
            return (204, nil)
        case ("GET", "members") where p.last == "key":
            let r = s.resources["note:\(p[2])"]!
            return (200, ["version": r.version, "ownerWrappedKey": r.ownerWrapped, "keyChain": r.chain])
        case ("GET", "notebooks") where p.last == "key":
            let r = s.resources["notebook:\(p[1])"]!
            return (200, ["wrappedKey": r.ownerWrapped, "version": r.version, "keyChain": r.chain, "keyRotationPending": r.pending])
        case ("GET", "shared-with-me"):
            return (200, s.resources.filter { $0.value.members[me] != nil }.map { sharedItem(s, key: $0.key, for: me) })
        default:
            return Self.err(500, "internal \(method) \(p)")
        }
    }
}

@Suite struct SharingFlowTests {
    struct Device {
        let service: AccountService
        let userId: String
    }

    static func device(_ server: FakeSharingServer, userId: String, email: String, master: Data = DSCrypto.newKey()) async throws -> Device {
        let token = "t-\(EntityID.make())"
        server.state.withLock { $0.tokens[token] = userId; $0.emails[email] = userId }
        let sessions = SecretSessionStore(store: InMemorySecretStore())
        try sessions.save(AuthSession(userId: userId, deviceId: "d", accessToken: token, refreshToken: "r", accessExpiresAt: DSDate.iso(Date().addingTimeInterval(3600)),
                                      wrappedMasterKeyPassword: .init(Data([1])), accountDocId: EntityID.make()))
        let api = APIClient(baseURL: URL(string: "https://example.com")!, transport: server, sessionStore: sessions)
        let keys = KeyRing(store: InMemorySecretStore())
        try keys.setMasterKey(master)
        return Device(service: AccountService(api: api, keys: keys, store: try LocalStore.inMemory()), userId: userId)
    }

    @Test func boxKeyPairIsCreatedOnceAndLoadedElsewhere() async throws {
        let server = FakeSharingServer()
        let uid = EntityID.make(), master = DSCrypto.newKey()
        let a = try await Self.device(server, userId: uid, email: "a@x.co", master: master)
        let pk = try await a.service.ensureBoxKeyPair()
        #expect(try await a.service.ensureBoxKeyPair() == pk)
        // Another device of the same account loads the same pair.
        let a2 = try await Self.device(server, userId: uid, email: "a@x.co", master: master)
        #expect(try await a2.service.ensureBoxKeyPair() == pk)
        #expect(try a2.service.keys.boxSecretKey() == a.service.keys.boxSecretKey())
        // A published public key that does not match: refused.
        server.state.withLock { $0.boxKeys[uid]!.publicKey = Base64URL.encode(try! DSCrypto.newBoxKeyPair().publicKey) }
        await #expect(throws: CryptoError.boxKeyMismatch) { try await a2.service.ensureBoxKeyPair() }
    }

    @Test func inviteGrantRotateAndReadEarlierVersions() async throws {
        let server = FakeSharingServer()
        let owner = try await Self.device(server, userId: EntityID.make(), email: "owner@x.co")
        let anna = try await Self.device(server, userId: EntityID.make(), email: "anna@x.co")
        let boris = try await Self.device(server, userId: EntityID.make(), email: "boris@x.co")
        for d in [owner, anna, boris] { try await d.service.ensureBoxKeyPair() }

        // The owner's notebook with one note (keys as createNotebook/createNote make them).
        let notebook = NotebookDocument(notebookId: EntityID.make())
        try notebook.initialize()
        let nbId = notebook.notebookId
        let (nbKey, nbWrapped) = try owner.service.keys.createNotebookKey(notebookId: nbId)
        let note = try await owner.service.createNote(in: notebook, title: "Shared note")
        let noteKeyV1 = try owner.service.keys.noteKey(notebook.note(id: note.noteId)!, notebookId: nbId)
        server.state.withLock {
            $0.resources["notebook:\(nbId)"] = .init(owner: owner.userId, ownerWrapped: Base64URL.encode(nbWrapped), docIds: [nbId, note.noteId])
        }
        let target = SharingTarget(kind: .notebook, id: nbId)

        // Invite both; Boris registered after the invitation (needs the owner's confirmation).
        let invA = try await owner.service.invite("Anna@x.co", role: .editor, to: target)
        let invB = try await owner.service.invite("boris@x.co", role: .viewer, to: target)
        server.state.withLock { $0.emails["boris@x.co#late"] = "1" }
        let accepted = try await anna.service.acceptInvitation(id: invA)
        #expect(accepted.wrappedKey == nil)
        _ = try await boris.service.acceptInvitation(id: invB)

        let (key, version) = try await owner.service.ownerKey(notebookId: nbId)
        #expect(key == nbKey && version == 1)
        let waiting = try await owner.service.grantPendingKeys(to: target, key: key, version: version)
        #expect(waiting.map(\.userId) == [boris.userId])
        try await owner.service.grantPendingKeys(to: target, key: key, version: version, confirmed: [boris.userId])

        // Members get the key; the server only ever saw it wrapped.
        _ = try await anna.service.refreshSharedWithMe()
        #expect(try anna.service.keys.notebookKey(nbId) == nbKey)
        #expect(try anna.service.store.document(note.noteId)?.notebookId == nbId)
        #expect(try anna.service.keys.noteKey(notebook.note(id: note.noteId)!, notebookId: nbId) == noteKeyV1)

        // Boris is removed: the owner rotates; Anna gets v2 and can still read v1 data.
        try await owner.service.api.removeMember(userId: boris.userId, from: target)
        #expect(try await owner.service.resumeNotebookRotation(notebook))
        let (key2, version2) = try await owner.service.ownerKey(notebookId: nbId)
        #expect(version2 == 2 && key2 != nbKey)
        let meta2 = try #require(notebook.note(id: note.noteId))
        #expect(meta2.keyVersion == 2 && meta2.keyChain.count == 1)
        let noteKeyV2 = try owner.service.keys.noteKey(meta2, notebookId: nbId)
        #expect(noteKeyV2 != noteKeyV1)
        #expect(owner.service.keys.earlierNoteKeys(meta2, notebookId: nbId) == [noteKeyV1])
        // The server never got a key in the clear (not in agent mode).
        #expect(server.state.withLock { $0.rotations.allSatisfy { $0["notebookKey"] == nil } })

        _ = try await anna.service.refreshSharedWithMe()
        #expect(try anna.service.keys.notebookKey(nbId) == key2)
        #expect(anna.service.keys.retiredNotebookKeys(nbId).contains(nbKey))
        #expect(try anna.service.keys.noteKey(meta2, notebookId: nbId) == noteKeyV2)
        #expect(anna.service.keys.earlierNoteKeys(meta2, notebookId: nbId) == [noteKeyV1])
        // Boris has no key to the new version.
        #expect(server.state.withLock { $0.resources["notebook:\(nbId)"]!.members[boris.userId] } == nil)

        #expect(try owner.service.store.pendingOutbox(docId: nbId).isEmpty)
        // The list (JSON) and the single read agree on the key fields.
        #expect(notebook.notes(includeTrashed: true).first { $0.id == note.noteId } == notebook.note(id: note.noteId))
        // Step 3 clears the pending flag once the index is synced (no outbox here).
        #expect(try await owner.service.finishNotebookRotation(notebook))
        #expect(server.state.withLock { $0.resources["notebook:\(nbId)"]!.pending } == false)
        #expect(try await owner.service.resumeNotebookRotation(notebook) == false)
    }

    @Test func noteSharedOnItsOwn() async throws {
        let server = FakeSharingServer()
        let owner = try await Self.device(server, userId: EntityID.make(), email: "o@x.co")
        let member = try await Self.device(server, userId: EntityID.make(), email: "m@x.co")
        for d in [owner, member] { try await d.service.ensureBoxKeyPair() }
        let notebook = NotebookDocument(notebookId: EntityID.make())
        try notebook.initialize()
        _ = try owner.service.keys.createNotebookKey(notebookId: notebook.notebookId)
        let note = try await owner.service.createNote(in: notebook, title: "Just this")
        let meta = try #require(notebook.note(id: note.noteId))
        server.state.withLock {
            $0.resources["note:\(note.noteId)"] = .init(owner: owner.userId, ownerWrapped: meta.wrappedKey, docIds: [note.noteId])
        }
        let target = SharingTarget(kind: .note, id: note.noteId)
        let inv = try await owner.service.invite("m@x.co", role: .viewer, to: target)
        _ = try await member.service.acceptInvitation(id: inv)
        let (k1, v1) = try await owner.service.ownerKey(note: meta, notebookId: notebook.notebookId)
        try await owner.service.grantPendingKeys(to: target, key: k1, version: v1)
        _ = try await member.service.refreshSharedWithMe()
        #expect(try member.service.keys.sharedNoteKey(note.noteId) == k1)
        // The member's key lookup finds it without the owner's notebook.
        let lookup = KeyRingDocumentKeys(keyRing: member.service.keys, noteMeta: { _, _ in nil })
        let record = try #require(try member.service.store.document(note.noteId))
        #expect(try lookup.key(for: record) == k1)

        try await owner.service.rotateNoteKey(note.noteId, in: notebook)
        let meta2 = try #require(notebook.note(id: note.noteId))
        #expect(meta2.keyVersion == 2)
        let k2 = try owner.service.keys.noteKey(meta2, notebookId: notebook.notebookId)
        _ = try await member.service.refreshSharedWithMe()
        #expect(try member.service.keys.sharedNoteKey(note.noteId) == k2)
        #expect(lookup.retiredKeys(for: record) == [k1])
    }
}
