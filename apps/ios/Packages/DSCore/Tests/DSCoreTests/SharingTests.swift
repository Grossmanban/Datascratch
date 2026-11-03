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
        var pendingSince: Int?
        var members: [String: Membership] = [:]; var docIds: [String] = [] }
    struct State {
        var boxKeys: [String: (publicKey: String, wrapped: String)] = [:]
        var emails: [String: String] = [:]           // email → userId
        var invitations: [String: (target: String, email: String, role: String, from: String)] = [:]
        var resources: [String: Resource] = [:]       // "kind:id"
        var tokens: [String: String] = [:]            // access token → userId
        var rotations: [[String: Any]] = []
        /// An older server: no `pendingSinceVersion`.
        var withoutPendingSince = false
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
            if !s.resources[key]!.pending { s.resources[key]!.pendingSince = s.resources[key]!.version }
            s.resources[key]!.pending = true
            return (204, nil)
        case ("POST", "members") where p.last == "rotate":
            let key = "\(p[1]):\(p[2])"
            var r = s.resources[key]!
            guard r.owner == me else { return Self.err(403, "forbidden") }
            let keysFor = (b["memberKeys"] as! [[String: String]])
            // memberKeys == the active members (awaiting ones get the key via PUT …/key).
            guard b["version"] as? Int == r.version + 1,
                  Set(keysFor.map { $0["userId"]! }) == Set(r.members.filter { $0.value.status == "active" }.keys) else { return Self.err(409, "conflict") }
            r.version += 1
            r.ownerWrapped = b["ownerWrappedKey"] as! String
            r.chain.insert(b["previousKeyWrap"] as! String, at: 0)
            for k in keysFor { r.members[k["userId"]!]!.wrappedKey = k["wrappedKey"]; r.members[k["userId"]!]!.status = "active" }
            if p[1] == "note" { r.pending = false; r.pendingSince = nil }
            s.resources[key] = r
            s.rotations.append(b)
            return (204, nil)
        case ("POST", "members") where p.last == "done":
            s.resources["notebook:\(p[2])"]!.pending = false
            s.resources["notebook:\(p[2])"]!.pendingSince = nil
            return (204, nil)
        case ("GET", "members") where p.last == "key":
            let r = s.resources["note:\(p[2])"]!
            return (200, ["version": r.version, "ownerWrappedKey": r.ownerWrapped, "keyChain": r.chain])
        case ("GET", "notebooks") where p.last == "key":
            let r = s.resources["notebook:\(p[1])"]!
            var body: [String: Any] = ["wrappedKey": r.ownerWrapped, "version": r.version, "keyChain": r.chain, "keyRotationPending": r.pending]
            if !s.withoutPendingSince { body["pendingSinceVersion"] = r.pendingSince as Any? ?? NSNull() }
            return (200, body)
        case ("GET", "shared-with-me"):
            return (200, s.resources.filter { $0.value.members[me] != nil }.map { sharedItem(s, key: $0.key, for: me) })
        case ("GET", "shared-by-me"):
            return (200, s.resources.filter { $0.value.owner == me }.map { key, r in
                ["target": ["kind": String(key.split(separator: ":")[0]), "id": String(key.split(separator: ":")[1])],
                 "keyVersion": r.version, "keyRotationPending": r.pending, "pendingSinceVersion": r.pendingSince as Any? ?? NSNull(),
                 "members": r.members.count, "awaitingKey": r.members.values.filter { $0.status == "awaiting_key" }.count] as [String: Any]
            })
        case ("GET", "invitations") where p.count == 1:
            let target = (query ?? "").replacingOccurrences(of: "target=", with: "")
            return (200, s.invitations.filter { $0.value.target == target }.map { id, inv in
                ["id": id, "email": inv.email, "role": inv.role, "status": "pending",
                 "createdAt": "2026-10-27T12:00:00.000Z", "expiresAt": "2026-11-26T12:00:00.000Z"]
            })
        case ("GET", "notebooks") where p.count == 1:
            return (200, s.resources.filter { $0.key.hasPrefix("notebook:") && $0.value.owner == me }.map { key, r in
                ["id": String(key.split(separator: ":")[1]), "mode": "private", "createdAt": "2026-10-27T12:00:00.000Z", "wrappedKey": r.ownerWrapped]
            })
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
        #expect(waiting.map(\.member.userId) == [boris.userId] && waiting.map(\.reason) == [.lateAccount])
        try await owner.service.grantPendingKeys(to: target, key: key, version: version, confirmed: [boris.userId: waiting[0].publicKey])

        // Members get the key; the server only ever saw it wrapped.
        _ = try await anna.service.refreshSharedWithMe()
        #expect(try anna.service.keys.notebookKey(nbId) == nbKey)
        #expect(try anna.service.store.document(note.noteId)?.notebookId == nbId)
        #expect(try anna.service.keys.noteKey(notebook.note(id: note.noteId)!, notebookId: nbId) == noteKeyV1)

        // Clara accepts too but registered after the invitation; not confirmed yet.
        let clara = try await Self.device(server, userId: EntityID.make(), email: "clara@x.co")
        try await clara.service.ensureBoxKeyPair()
        let invC = try await owner.service.invite("clara@x.co", role: .viewer, to: target)
        server.state.withLock { $0.emails["clara@x.co#late"] = "1" }
        _ = try await clara.service.acceptInvitation(id: invC)

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
        // The rotation did not give Clara the key; she gets v2 only once confirmed.
        #expect(server.state.withLock { $0.resources["notebook:\(nbId)"]!.members[clara.userId]!.wrappedKey } == nil)
        let claraWaits = try await owner.service.grantPendingKeys(to: target, key: key2, version: 2)
        #expect(claraWaits.map(\.member.userId) == [clara.userId])
        try await owner.service.grantPendingKeys(to: target, key: key2, version: 2, confirmed: [clara.userId: claraWaits[0].publicKey])
        _ = try await clara.service.refreshSharedWithMe()
        #expect(try clara.service.keys.notebookKey(nbId) == key2)
        #expect(clara.service.keys.retiredNotebookKeys(nbId).contains(nbKey))

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

    /// A rotation interrupted after `rotate` (before the notes got new keys) is finished from
    /// another device of the owner without rotating again — with `pendingSinceVersion`, and by
    /// the notes on an older server.
    @Test(arguments: [false, true])
    func rotationFinishedFromASecondOwnerDevice(olderServer: Bool) async throws {
        let server = FakeSharingServer()
        server.state.withLock { $0.withoutPendingSince = olderServer }
        let ownerId = EntityID.make(), master = DSCrypto.newKey()
        let phone = try await Self.device(server, userId: ownerId, email: "o@x.co", master: master)
        let member = try await Self.device(server, userId: EntityID.make(), email: "m@x.co")
        let leaving = try await Self.device(server, userId: EntityID.make(), email: "l@x.co")
        for d in [phone, member, leaving] { try await d.service.ensureBoxKeyPair() }
        let notebook = NotebookDocument(notebookId: EntityID.make())
        try notebook.initialize()
        let nbId = notebook.notebookId
        let (_, wrapped) = try phone.service.keys.createNotebookKey(notebookId: nbId)
        let note = try await phone.service.createNote(in: notebook, title: "n")
        server.state.withLock { $0.resources["notebook:\(nbId)"] = .init(owner: ownerId, ownerWrapped: Base64URL.encode(wrapped), docIds: [nbId, note.noteId]) }
        let target = SharingTarget(kind: .notebook, id: nbId)
        for (d, email) in [(member, "m@x.co"), (leaving, "l@x.co")] {
            let inv = try await phone.service.invite(email, role: .editor, to: target)
            _ = try await d.service.acceptInvitation(id: inv)
        }
        let (k1, v1) = try await phone.service.ownerKey(notebookId: nbId)
        try await phone.service.grantPendingKeys(to: target, key: k1, version: v1)
        try await phone.service.api.removeMember(userId: leaving.userId, from: target)

        // The phone rotates (step 1) but stops before the notes get new keys: simulate by
        // taking the index state from before step 2.
        let before = try notebook.crdt.encodeStateAsUpdate()
        try await phone.service.rotateNotebookKey(notebook)
        let indexAfterStep1 = NotebookDocument(notebookId: nbId)
        try indexAfterStep1.crdt.applyUpdate(before, origin: .remote)
        #expect(server.state.withLock { $0.rotations.count } == 1)

        // The iPad (same account, fresh device) finishes: no second rotate.
        let ipad = try await Self.device(server, userId: ownerId, email: "o@x.co", master: master)
        try await ipad.service.ensureBoxKeyPair()
        #expect(try await ipad.service.resumeNotebookRotation(indexAfterStep1))
        #expect(server.state.withLock { $0.rotations.count } == 1)
        #expect(try ipad.service.keys.notebookKeyVersion(nbId) == 2)
        #expect(try await ipad.service.notesNeedingNewKeys(in: indexAfterStep1).isEmpty)
        #expect(try await ipad.service.finishNotebookRotation(indexAfterStep1))
        #expect(server.state.withLock { $0.resources["notebook:\(nbId)"]!.pending } == false)
    }
}

/// The account's own record of its sharing (shared sharing/trust.ts, same keys).
@Suite struct TrustRecordTests {
    @Test func knowsInvitedAddressesAndPinnedKeysTakesOverEveryoneOnlyBeforeMigration() throws {
        let trust = AccountDocument(accountDocId: EntityID.make()).trust
        let target = SharingTarget(kind: .notebook, id: EntityID.make())
        let alice = EntityID.make()
        #expect(trust.memberTrust(target, userId: alice, email: "Alice@X.co", publicKey: "pk1") == .known)
        try trust.markMigrated()
        #expect(trust.memberTrust(target, userId: alice, email: "Alice@X.co", publicKey: "pk1") == .notInvited)
        try trust.recordInvite(target, email: " alice@x.co ")
        #expect(trust.memberTrust(target, userId: alice, email: "Alice@X.co", publicKey: "pk1") == .known)
        try trust.recordMemberKey(target, userId: alice, publicKey: "pk1")
        #expect(trust.memberTrust(target, userId: alice, email: "Alice@X.co", publicKey: "pk1") == .known)
        #expect(trust.memberTrust(target, userId: alice, email: "Alice@X.co", publicKey: "pk2") == .keyChanged)
        // Another resource knows nothing of it.
        #expect(trust.memberTrust(SharingTarget(kind: .note, id: target.id), userId: alice, email: "alice@x.co", publicKey: "pk1") == .notInvited)
        #expect(trust.knownKeyVersion(target) == 0)
        try trust.recordKeyVersion(target, 1)
        // migrated, invite, member: version 1 is not written.
        #expect(trust.account.crdt.mapKeys("trust").count == 3)
        try trust.recordKeyVersion(target, 3)
        try trust.recordKeyVersion(target, 2)
        #expect(trust.knownKeyVersion(target) == 3)
        #expect(trust.knownKeyVersion(SharingTarget(kind: .note, id: target.id)) == 0)
    }

    /// The web reads and writes the same flat keys; two devices writing at once keep both.
    @Test func sameKeysAsTheWebAndConcurrentWritesMerge() throws {
        let account = AccountDocument(accountDocId: EntityID.make())
        let noteId = EntityID.make(), user = EntityID.make()
        let target = SharingTarget(kind: .note, id: noteId)
        try account.trust.recordInvite(target, email: "Bob@X.co")
        try account.trust.recordMemberKey(target, userId: user, publicKey: "pk")
        try account.trust.recordKeyVersion(target, 2)
        try account.trust.markMigrated()
        #expect(Set(account.crdt.mapKeys("trust")) == ["invite|note|\(noteId)|bob@x.co", "member|note|\(noteId)|\(user)", "key|note|\(noteId)|2", "migrated"])
        #expect(account.crdt.mapValue("trust", ["member|note|\(noteId)|\(user)"]) == .string(value: "pk"))
        #expect(account.crdt.mapValue("trust", ["key|note|\(noteId)|2"]) == .bool(value: true))
        #expect(account.crdt.mapValue("trust", ["migrated"])?.stringValue.flatMap(DSDate.parseISO) != nil)

        let other = AccountDocument(accountDocId: account.accountDocId)
        try other.crdt.applyUpdate(try account.crdt.encodeStateAsUpdate(), origin: .remote)
        try other.trust.recordKeyVersion(target, 3)
        try account.trust.recordInvite(target, email: "carol@x.co")
        try account.crdt.applyUpdate(try other.crdt.encodeStateAsUpdate(since: account.crdt.stateVector()), origin: .remote)
        try other.crdt.applyUpdate(try account.crdt.encodeStateAsUpdate(since: other.crdt.stateVector()), origin: .remote)
        for doc in [account, other] {
            #expect(doc.trust.knownKeyVersion(target) == 3)
            #expect(doc.trust.memberTrust(target, userId: EntityID.make(), email: "Carol@x.co", publicKey: "x") == .known)
        }
    }
}

/// The owner's client checks the members and key versions the server names against the
/// account's `TrustRecord` (security review 2026-11-02).
@Suite struct SharingTrustTests {
    typealias Device = SharingFlowTests.Device

    struct Owner {
        let device: Device
        let account: AccountDocument
        let notebook: NotebookDocument
        var target: SharingTarget { SharingTarget(kind: .notebook, id: notebook.notebookId) }
        var key: String { "notebook:\(notebook.notebookId)" }
    }

    /// An owner with a notebook on the server and its account document as the trust record.
    static func owner(_ server: FakeSharingServer) async throws -> Owner {
        let device = try await SharingFlowTests.device(server, userId: EntityID.make(), email: "owner@x.co")
        try await device.service.ensureBoxKeyPair()
        let account = AccountDocument(accountDocId: EntityID.make())
        device.service.useTrustRecord(account)
        let notebook = NotebookDocument(notebookId: EntityID.make())
        try notebook.initialize()
        let id = notebook.notebookId
        let (_, wrapped) = try device.service.keys.createNotebookKey(notebookId: id)
        try account.putNotebook(NotebookRef(id: id, spaceId: EntityID.make(), name: "Shared", order: 0))
        server.state.withLock { $0.resources["notebook:\(id)"] = .init(owner: device.userId, ownerWrapped: Base64URL.encode(wrapped), docIds: [id]) }
        return Owner(device: device, account: account, notebook: notebook)
    }

    static func person(_ server: FakeSharingServer, _ email: String) async throws -> Device {
        let d = try await SharingFlowTests.device(server, userId: EntityID.make(), email: email)
        try await d.service.ensureBoxKeyPair()
        return d
    }

    /// The server lists someone as a member without this account having invited them.
    static func slipIn(_ server: FakeSharingServer, _ who: Device, into key: String, status: String = "awaiting_key") {
        server.state.withLock {
            $0.resources[key]!.members[who.userId] = .init(role: "viewer", status: status, createdAfter: false, wrappedKey: status == "active" ? "x" : nil)
        }
    }

    static func publicKey(_ server: FakeSharingServer, _ who: Device) -> String {
        server.state.withLock { $0.boxKeys[who.userId]!.publicKey }
    }

    @Test func memberNeverInvitedOrWithAnotherKeyWaitsForTheOwner() async throws {
        let server = FakeSharingServer()
        let o = try await Self.owner(server)
        try await o.device.service.migrateMemberTrust()
        #expect(o.account.trust.isMigrated)
        let anna = try await Self.person(server, "anna@x.co")
        let mallory = try await Self.person(server, "mallory@x.co")
        // The invitation is recorded before it is sent.
        let inv = try await o.device.service.invite(" Anna@x.co", role: .editor, to: o.target)
        #expect(o.account.trust.memberTrust(o.target, userId: anna.userId, email: "anna@x.co", publicKey: "?") == .known)
        _ = try await anna.service.acceptInvitation(id: inv)
        Self.slipIn(server, mallory, into: o.key)

        let (key, version) = try await o.device.service.ownerKey(notebookId: o.notebook.notebookId)
        let asked = try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version)
        #expect(asked.map(\.member.userId) == [mallory.userId] && asked.map(\.reason) == [.notInvited])
        #expect(asked.first?.publicKey == Self.publicKey(server, mallory))
        #expect(server.state.withLock { $0.resources[o.key]!.members[mallory.userId]!.wrappedKey } == nil)
        // Anna got it, and her public key is pinned.
        _ = try await anna.service.refreshSharedWithMe()
        #expect(try anna.service.keys.notebookKey(o.notebook.notebookId) == key)
        let annaKey = Self.publicKey(server, anna)
        #expect(o.account.trust.memberTrust(o.target, userId: anna.userId, email: nil, publicKey: annaKey) == .known)

        // The owner says yes for the key that was shown: Mallory gets it.
        #expect(try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version,
                                                             confirmed: [mallory.userId: asked[0].publicKey]).isEmpty)
        #expect(server.state.withLock { $0.resources[o.key]!.members[mallory.userId]!.wrappedKey } != nil)

        // The server swaps Anna's public key (and has her wait for a key again).
        let swapped = Base64URL.encode(try DSCrypto.newBoxKeyPair().publicKey)
        server.state.withLock {
            $0.boxKeys[anna.userId]!.publicKey = swapped
            $0.resources[o.key]!.members[anna.userId]!.status = "awaiting_key"
            $0.resources[o.key]!.members[anna.userId]!.wrappedKey = nil
        }
        let changed = try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version)
        #expect(changed.map(\.member.userId) == [anna.userId] && changed.map(\.reason) == [.keyChanged])
        // A yes given for her earlier key does not cover the new one.
        let again = try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version, confirmed: [anna.userId: annaKey])
        #expect(again.map(\.reason) == [.keyChanged])
        #expect(server.state.withLock { $0.resources[o.key]!.members[anna.userId]!.wrappedKey } == nil)
        try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version, confirmed: [anna.userId: swapped])
        #expect(o.account.trust.memberTrust(o.target, userId: anna.userId, email: nil, publicKey: swapped) == .known)
    }

    /// Members and invitations from before the record are taken over once; later ones are not.
    @Test func migrationTakesOverExistingMembersOnce() async throws {
        let server = FakeSharingServer()
        let o = try await Self.owner(server)
        let anna = try await Self.person(server, "anna@x.co")
        let boris = try await Self.person(server, "boris@x.co")
        // Shared before the record existed (an older build): no trust entries.
        o.device.service.useTrustRecord(nil)
        let invA = try await o.device.service.invite("anna@x.co", role: .editor, to: o.target)
        _ = try await anna.service.acceptInvitation(id: invA)
        let (key, version) = try await o.device.service.ownerKey(notebookId: o.notebook.notebookId)
        try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version)
        let invB = try await o.device.service.invite("boris@x.co", role: .viewer, to: o.target)
        _ = try await boris.service.acceptInvitation(id: invB)
        _ = try await o.device.service.invite("clara@x.co", role: .viewer, to: o.target)
        #expect(o.account.crdt.mapKeys("trust").isEmpty)

        o.device.service.useTrustRecord(o.account)
        try await o.device.service.migrateMemberTrust()
        let trust = o.account.trust
        #expect(trust.isMigrated)
        #expect(trust.memberTrust(o.target, userId: anna.userId, email: nil, publicKey: Self.publicKey(server, anna)) == .known)
        #expect(trust.memberTrust(o.target, userId: boris.userId, email: "boris@x.co", publicKey: "any") == .known)
        #expect(trust.memberTrust(o.target, userId: EntityID.make(), email: "clara@x.co", publicKey: "any") == .known)
        #expect(trust.memberTrust(o.target, userId: EntityID.make(), email: "mallory@x.co", publicKey: "any") == .notInvited)
        // Boris (awaiting, invited) gets his key without a question.
        #expect(try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version).isEmpty)
        // Once migrated, a second pass changes nothing (the server cannot slip someone in then).
        let mallory = try await Self.person(server, "mallory@x.co")
        Self.slipIn(server, mallory, into: o.key, status: "active")
        try await o.device.service.migrateMemberTrust()
        #expect(trust.memberTrust(o.target, userId: mallory.userId, email: "mallory@x.co", publicKey: Self.publicKey(server, mallory)) == .notInvited)
    }

    /// A rotation must name every active member: one the record does not know stops it until the
    /// owner says yes (it is retried on the next pass).
    @Test func rotationWaitsForAnUnknownActiveMember() async throws {
        let server = FakeSharingServer()
        let o = try await Self.owner(server)
        try await o.device.service.migrateMemberTrust()
        let anna = try await Self.person(server, "anna@x.co")
        let mallory = try await Self.person(server, "mallory@x.co")
        let inv = try await o.device.service.invite("anna@x.co", role: .editor, to: o.target)
        _ = try await anna.service.acceptInvitation(id: inv)
        let (key, version) = try await o.device.service.ownerKey(notebookId: o.notebook.notebookId)
        try await o.device.service.grantPendingKeys(to: o.target, key: key, version: version)
        Self.slipIn(server, mallory, into: o.key, status: "active")
        server.state.withLock { $0.resources[o.key]!.pending = true; $0.resources[o.key]!.pendingSince = 1 }

        do {
            _ = try await o.device.service.resumeNotebookRotation(o.notebook)
            Issue.record("rotated with a member nobody confirmed")
        } catch SharingError.notConfirmed(let members) {
            #expect(members.map(\.member.userId) == [mallory.userId] && members.map(\.reason) == [.notInvited])
        }
        #expect(server.state.withLock { $0.rotations.isEmpty })
        #expect(o.device.service.keys.notebookKeyVersion(o.notebook.notebookId) == 1)

        #expect(try await o.device.service.resumeNotebookRotation(o.notebook, confirmed: [mallory.userId: Self.publicKey(server, mallory)]))
        #expect(server.state.withLock { $0.rotations.count } == 1)
        #expect(o.account.trust.knownKeyVersion(o.target) == 2)
        #expect(o.account.trust.memberTrust(o.target, userId: mallory.userId, email: nil, publicKey: Self.publicKey(server, mallory)) == .known)
    }

    /// After a rotation the server hands back the genuine key from before it (one a removed
    /// member still holds): neither the owner's devices nor a member's take it.
    @Test func olderKeyAfterARotationIsRefused() async throws {
        let server = FakeSharingServer()
        let o = try await Self.owner(server)
        let nbId = o.notebook.notebookId
        try await o.device.service.migrateMemberTrust()
        let anna = try await Self.person(server, "anna@x.co")
        let annaAccount = AccountDocument(accountDocId: EntityID.make())
        anna.service.useTrustRecord(annaAccount)
        let boris = try await Self.person(server, "boris@x.co")
        for (d, email) in [(anna, "anna@x.co"), (boris, "boris@x.co")] {
            let inv = try await o.device.service.invite(email, role: .editor, to: o.target)
            _ = try await d.service.acceptInvitation(id: inv)
        }
        let (key1, v1) = try await o.device.service.ownerKey(notebookId: nbId)
        try await o.device.service.grantPendingKeys(to: o.target, key: key1, version: v1)
        _ = try await anna.service.refreshSharedWithMe()
        let before = server.state.withLock { $0.resources[o.key]! }
        #expect(annaAccount.trust.knownKeyVersion(o.target) == 0)

        try await o.device.service.api.removeMember(userId: boris.userId, from: o.target)
        #expect(try await o.device.service.resumeNotebookRotation(o.notebook))
        let (key2, v2) = try await o.device.service.ownerKey(notebookId: nbId)
        #expect(v2 == 2)
        _ = try await anna.service.refreshSharedWithMe()
        #expect(try anna.service.keys.notebookKey(nbId) == key2)
        #expect(annaAccount.trust.knownKeyVersion(o.target) == 2)

        // The server replays version 1: the owner's wrap and Anna's.
        server.state.withLock {
            $0.resources[o.key]!.version = 1
            $0.resources[o.key]!.chain = []
            $0.resources[o.key]!.ownerWrapped = before.ownerWrapped
            $0.resources[o.key]!.members[anna.userId]!.wrappedKey = before.members[anna.userId]!.wrappedKey
        }
        #expect(try await o.device.service.reconcileNotebookKeys().isEmpty)
        #expect(try o.device.service.keys.notebookKey(nbId) == key2)
        #expect(o.device.service.keys.notebookKeyVersion(nbId) == 2)
        _ = try await anna.service.refreshSharedWithMe()
        #expect(try anna.service.keys.notebookKey(nbId) == key2)
        #expect(anna.service.keys.notebookKeyVersion(nbId) == 2)

        // Another device of the owner, with the account document synced but no key yet.
        let ipadAccount = AccountDocument(accountDocId: o.account.accountDocId)
        try ipadAccount.crdt.applyUpdate(try o.account.crdt.encodeStateAsUpdate(), origin: .remote)
        let ipad = try await SharingFlowTests.device(server, userId: o.device.userId, email: "owner@x.co",
                                                     master: try #require(try o.device.service.keys.masterKey()))
        ipad.service.useTrustRecord(ipadAccount)
        #expect(try await ipad.service.reconcileNotebookKeys().isEmpty)
        #expect(try ipad.service.keys.notebookKey(nbId) == nil)
        await #expect(throws: SharingError.olderKey(version: 1, known: 2)) { try await ipad.service.notebookKeyForWriting(nbId) }
    }

    /// A rotation made on one device of the owner reaches another that held version 1: it is a
    /// real key change, not a key that device invented — nothing to re-wrap, the old key stays
    /// for reading (the owner's iPad «waited for a key», 2026-11-03).
    @Test func rotationFromAnotherDeviceIsNotAReplacedKey() async throws {
        let server = FakeSharingServer()
        let o = try await Self.owner(server)
        let nbId = o.notebook.notebookId
        try await o.device.service.migrateMemberTrust()
        let ipad = try await SharingFlowTests.device(server, userId: o.device.userId, email: "owner@x.co",
                                                     master: try #require(try o.device.service.keys.masterKey()))
        #expect(try await ipad.service.reconcileNotebookKeys().isEmpty)
        let key1 = try #require(try ipad.service.keys.notebookKey(nbId))

        let anna = try await Self.person(server, "anna@x.co")
        let inv = try await o.device.service.invite("anna@x.co", role: .editor, to: o.target)
        _ = try await anna.service.acceptInvitation(id: inv)
        let (k1, v1) = try await o.device.service.ownerKey(notebookId: nbId)
        try await o.device.service.grantPendingKeys(to: o.target, key: k1, version: v1)
        try await o.device.service.api.removeMember(userId: anna.userId, from: o.target)
        #expect(try await o.device.service.resumeNotebookRotation(o.notebook))
        let (key2, v2) = try await o.device.service.ownerKey(notebookId: nbId)
        #expect(v2 == 2)

        #expect(try await ipad.service.reconcileNotebookKeys().isEmpty, "a real rotation is not a replaced key")
        #expect(try ipad.service.keys.notebookKey(nbId) == key2)
        #expect(ipad.service.keys.notebookKeyVersion(nbId) == 2)
        #expect(ipad.service.keys.retiredNotebookKeys(nbId).contains(key1), "the old key still opens older wrappings")
    }

    /// «Shared with me» pointing at this account's own notebook or note (to swap its key for one
    /// the server chose), or naming this account as the owner: ignored.
    @Test func sharedItemForOwnNotebookOrNoteIsIgnored() async throws {
        let server = FakeSharingServer()
        let o = try await Self.owner(server)
        let nbId = o.notebook.notebookId
        let note = try await o.device.service.createNote(in: o.notebook, title: "Mine")
        let noteId = note.noteId
        o.device.service.useTrustRecord(o.account, notebookOfNote: { $0 == noteId ? nbId : nil })
        let ownKey = try #require(try o.device.service.keys.notebookKey(nbId))
        let mallory = try await Self.person(server, "mallory@x.co")
        let mallorySecret = try #require(try mallory.service.keys.boxSecretKey())
        let ownerPublic = try #require(Base64URL.decode(Self.publicKey(server, o.device)))
        func forged(_ kind: ShareTargetKind, _ id: String) throws -> String {
            let ref = MemberKeyRef(kind: kind, targetId: id, version: 1, fromUserId: mallory.userId, toUserId: o.device.userId)
            return Base64URL.encode(try DSCrypto.wrapKeyForMember(DSCrypto.newKey(), ownerSecretKey: mallorySecret, memberPublicKey: ownerPublic, ref: ref))
        }
        let other = EntityID.make()
        let notebookWrap = try forged(.notebook, nbId), noteWrap = try forged(.note, noteId)
        server.state.withLock {
            // The server says Mallory shares the owner's own notebook and note with the owner.
            $0.resources["notebook:\(nbId)"] = .init(owner: mallory.userId, members: [
                o.device.userId: .init(role: "editor", status: "active", createdAfter: false, wrappedKey: notebookWrap)], docIds: [nbId])
            $0.resources["note:\(noteId)"] = .init(owner: mallory.userId, members: [
                o.device.userId: .init(role: "editor", status: "active", createdAfter: false, wrappedKey: noteWrap)], docIds: [noteId])
            // And an item "shared by" the account itself.
            $0.resources["notebook:\(other)"] = .init(owner: o.device.userId, members: [
                o.device.userId: .init(role: "editor", status: "active", createdAfter: false, wrappedKey: notebookWrap)], docIds: [other])
        }
        let items = try await o.device.service.refreshSharedWithMe()
        #expect(items.isEmpty)
        #expect(try o.device.service.keys.notebookKey(nbId) == ownKey)
        #expect(try o.device.service.keys.sharedNoteKey(noteId) == nil)
        #expect(try o.device.service.keys.notebookKey(other) == nil)

        // Someone else's notebook still comes through.
        let theirs = EntityID.make()
        let theirWrap = try forged(.notebook, theirs)
        server.state.withLock {
            $0.resources["notebook:\(theirs)"] = .init(owner: mallory.userId, members: [
                o.device.userId: .init(role: "editor", status: "active", createdAfter: false, wrappedKey: theirWrap)], docIds: [theirs])
        }
        #expect(try await o.device.service.refreshSharedWithMe().map(\.target.id) == [theirs])
        #expect(try o.device.service.keys.notebookKey(theirs) != nil)
    }
}

@Suite(.enabled(if: FileManager.default.fileExists(atPath: Vectors.root.appendingPathComponent("api/bodies.json").path)))
struct SharedItemVectorTests {
    /// `agentsMode` (✨): true when given, nil from older servers; not a boolean → rejected.
    @Test func agentsMode() throws {
        let c = (try Vectors.json("api/bodies.json")["cases"] as! [String: Any])["sharedItem"] as! [String: Any]
        let items = try (c["valid"] as! [Any]).map { try JSONDecoder().decode(SharedItem.self, from: try JSONSerialization.data(withJSONObject: $0)) }
        let expected = (c["valid"] as! [[String: Any]]).map { $0["agentsMode"] as? Bool }
        #expect(items.map(\.agentsMode) == expected)
        #expect(expected.contains(true) && expected.contains(nil))
        for inv in c["invalid"] as! [[String: Any]] where (inv["body"] as! [String: Any])["agentsMode"] != nil {
            #expect(throws: (any Error).self) { try JSONDecoder().decode(SharedItem.self, from: try JSONSerialization.data(withJSONObject: inv["body"]!)) }
        }
    }
}
