import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// In-memory server implementing sync-protocol.md (seq per document, ack, fan-out, catch-up).
actor FakeSyncServer {
    struct Stored { var seq: Int64; var payload: Data; var deviceId: String }

    final class Conn: WebSocketConnection, @unchecked Sendable {
        let server: FakeSyncServer
        let id = UUID()
        let incoming: AsyncStream<String>
        let continuation: AsyncStream<String>.Continuation
        let closed = Locked(false)

        init(server: FakeSyncServer) {
            self.server = server
            (incoming, continuation) = AsyncStream<String>.makeStream()
        }

        func send(_ text: String) async throws {
            guard !closed.withLock({ $0 }) else { throw SyncClientError.closed }
            await server.handle(text, from: self)
        }

        func receive() async throws -> String {
            for await text in incoming { return text }
            throw SyncClientError.closed
        }

        func sendPing() async throws {}

        func close() {
            closed.withLock { $0 = true }
            continuation.finish()
            Task { await server.drop(self) }
        }

        func deliver(_ message: ServerMessage) {
            continuation.yield(String(decoding: try! JSONEncoder.sync.encode(message), as: UTF8.self))
        }
    }

    var docs: [String: [Stored]] = [:]
    var snapshots: [String: (seq: Int64, payload: Data)] = [:]
    var registered: Set<String> = []
    var nextSeq: [String: Int64] = [:]
    var conns: [UUID: (conn: Conn, deviceId: String?, subs: Set<String>)] = [:]
    var accepting = true
    var received: [ClientMessage] = []
    /// A client pushed into a document it had not subscribed to (protocol violation).
    var pushedWithoutSubscription = false

    func connect() throws -> Conn {
        guard accepting else { throw SyncClientError.closed }
        let c = Conn(server: self)
        conns[c.id] = (c, nil, [])
        return c
    }

    func drop(_ c: Conn) { conns[c.id] = nil }

    func setAccepting(_ v: Bool) {
        accepting = v
        if !v { for c in conns.values { c.conn.close() } }
    }

    func register(_ docId: String) { registered.insert(docId) }

    func subscribers(_ docId: String) -> Int { conns.values.filter { $0.subs.contains(docId) }.count }

    func handle(_ text: String, from c: Conn) {
        guard let msg = try? JSONDecoder().decode(ClientMessage.self, from: Data(text.utf8)) else { return }
        received.append(msg)
        switch msg {
        case .hello(_, let deviceId, _):
            conns[c.id]?.deviceId = deviceId
            c.deliver(.welcome(userId: "0192f3c4-0000-7000-8000-00000000000a", serverTime: DSDate.iso(Date())))
        case .subscribe(let entries):
            for e in entries {
                guard registered.contains(e.docId) else {
                    c.deliver(.error(code: .docNotFound, message: "unknown doc", ref: e.docId))
                    continue
                }
                conns[c.id]?.subs.insert(e.docId)
                var snap: (seq: Int64, payload: Data)?
                var items = docs[e.docId, default: []].filter { $0.seq > e.since }
                if let s = snapshots[e.docId], s.seq > e.since {
                    snap = s
                    items = items.filter { $0.seq > s.seq }
                }
                c.deliver(.updates(docId: e.docId, snapshot: snap,
                                   items: items.map { UpdateItem(seq: $0.seq, payload: $0.payload, deviceId: $0.deviceId) }, upToDate: true))
            }
        case .unsubscribe(let ids):
            for id in ids { conns[c.id]?.subs.remove(id) }
        case .push(let docId, let clientMsgId, let payload):
            pushedWithoutSubscription = pushedWithoutSubscription || !(conns[c.id]?.subs.contains(docId) ?? false)
            guard registered.contains(docId) else {
                c.deliver(.error(code: .docNotFound, message: "register first", ref: clientMsgId))
                return
            }
            let seq = (nextSeq[docId] ?? 0) + 1
            nextSeq[docId] = seq
            let device = conns[c.id]?.deviceId ?? "?"
            docs[docId, default: []].append(Stored(seq: seq, payload: payload, deviceId: device))
            c.deliver(.ack(docId: docId, clientMsgId: clientMsgId, seq: seq))
            for other in conns.values where other.conn.id != c.id && other.subs.contains(docId) {
                other.conn.deliver(.update(docId: docId, item: UpdateItem(seq: seq, payload: payload, deviceId: device)))
            }
        case .snapshot(let docId, let clientMsgId, let baseSeq, let payload):
            snapshots[docId] = (baseSeq, payload)
            docs[docId] = docs[docId, default: []].filter { $0.seq > baseSeq }
            c.deliver(.ack(docId: docId, clientMsgId: clientMsgId, seq: baseSeq))
        case .awareness(let docId, let payload):
            for other in conns.values where other.conn.id != c.id && other.subs.contains(docId) {
                other.conn.deliver(.awareness(docId: docId, payload: payload, deviceId: conns[c.id]?.deviceId ?? "?"))
            }
        }
    }
}

struct FakeFactory: WebSocketFactory {
    let server: FakeSyncServer
    func connect(to url: URL) async throws -> any WebSocketConnection { try await server.connect() }
}

/// Polls until `condition` holds (async delivery between actors).
func eventually(timeout: Duration = .seconds(5), _ condition: () async throws -> Bool) async throws -> Bool {
    let deadline = ContinuousClock.now + timeout
    while ContinuousClock.now < deadline {
        if try await condition() { return true }
        try await Task.sleep(for: .milliseconds(10))
    }
    return false
}

@Suite(.serialized) struct SyncTests {
    let key = DSCrypto.newKey()

    func device(_ name: String, server: FakeSyncServer) throws -> SyncEngine {
        let store = try LocalStore.inMemory()
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        config.maxBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = self.key
        return SyncEngine(store: store, client: client, keyFor: { _ in key }, register: { record in await server.register(record.docId) })
    }

    @Test func messagesRoundTripAsContractJSON() throws {
        let doc = "0192f3c4-0000-7000-8000-000000000001"
        let push = ClientMessage.push(docId: doc, clientMsgId: "m", payload: Data([0xfb, 0xff]))
        let text = try SyncFrame.encode(push)
        #expect(text == #"{"clientMsgId":"m","docId":"0192f3c4-0000-7000-8000-000000000001","payload":"-_8","type":"push"}"#)
        #expect(try JSONDecoder().decode(ClientMessage.self, from: Data(text.utf8)) == push)
        let hello = try SyncFrame.encode(.hello(auth: .guest(shareId: doc, guestToken: "g"), deviceId: "dev", client: ClientInfo(version: "1")))
        #expect(hello.contains(#""protocol":1"#) && hello.contains(#""kind":"guest""#) && hello.contains(#""platform":"ios""#))

        let updates = SyncFrame.decode(#"{"type":"updates","docId":"0192f3c4-0000-7000-8000-000000000001","snapshot":null,"items":[{"seq":3,"payload":"AQ","deviceId":"x"}],"upToDate":true}"#)
        #expect(updates == .updates(docId: doc, snapshot: nil, items: [UpdateItem(seq: 3, payload: Data([1]), deviceId: "x")], upToDate: true))
        #expect(SyncFrame.decode(#"{"type":"welcome","userId":null,"serverTime":"t","protocol":1}"#) == .welcome(userId: nil, serverTime: "t"))
        #expect(SyncFrame.decode(#"{"type":"error","code":"doc_not_found","message":"x","ref":"m"}"#) == .error(code: .docNotFound, message: "x", ref: "m"))
        #expect(SyncFrame.decode(#"{"type":"nope"}"#) == nil)
        #expect(SyncFrame.decode("not json") == nil)
        #expect(SyncClient.Configuration.url(forServer: URL(string: "https://a.b")!).absoluteString == "wss://a.b/v1/sync")
    }

    @Test func twoDevicesSyncANoteThroughTheServer() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        let b = try device("B", server: server)
        await a.start()
        await b.start()

        let docId = EntityID.make()
        let noteA = NoteDocument(noteId: docId)
        try await a.open(noteA.crdt, notebookId: "nb")
        try noteA.initialize(title: "Shared")
        try noteA.insertText("from A", at: 0, inBlock: [1])

        let noteB = NoteDocument(noteId: docId)
        try await b.open(noteB.crdt, notebookId: "nb")
        #expect(try await eventually { (try? noteB.title()) == "Shared" && (try? noteB.block(at: [1])?.text) == "from A" })

        try noteB.insertText(" and B", at: 6, inBlock: [1])
        #expect(try await eventually { (try? noteA.block(at: [1])?.text) == "from A and B" })
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 && (try? b.store.outboxCount()) == 0 })

        // Payloads on the server are encrypted with the document key and its ad.
        let stored = await server.docs[docId] ?? []
        #expect(!stored.isEmpty)
        #expect(stored.allSatisfy { (try? DSCrypto.open($0.payload, key: key, ad: CryptoAD.doc(docId))) != nil })
        #expect(await server.registered.contains(docId))
        #expect(await server.pushedWithoutSubscription == false)

        await a.stop()
        await b.stop()
    }

    @Test func offlineEditsAreQueuedAndSentAfterReconnect() async throws {
        let server = FakeSyncServer()
        await server.setAccepting(false)
        let a = try device("A", server: server)
        await a.start()
        let docId = EntityID.make()
        let note = NoteDocument(noteId: docId)
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "Offline")
        #expect(try a.store.outboxCount() == 1)

        await server.setAccepting(true)
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })

        // A fresh device catches up from seq 0, then live updates keep coming.
        let b = try device("B", server: server)
        await b.start()
        let copy = NoteDocument(noteId: docId)
        try await b.open(copy.crdt, notebookId: "nb")
        #expect(try await eventually { (try? copy.title()) == "Offline" })
        #expect(try await eventually { (try? b.store.document(docId)?.lastSeq) == 1 })

        // Reconnect: B resubscribes from lastSeq and does not re-apply old updates.
        await server.setAccepting(false)
        try note.insertText("x", at: 0, inBlock: [1])
        await server.setAccepting(true)
        #expect(try await eventually { (try? copy.block(at: [1])?.text) == "x" })
        #expect(try b.store.updates(docId: docId).count == 2)
        await a.stop()
        await b.stop()
    }

    @Test func snapshotAfterThresholdAndCatchUpFromSnapshot() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        let docId = EntityID.make()
        let nb = NotebookDocument(notebookId: docId)
        try await a.open(nb.crdt, notebookId: docId)
        for i in 0...SnapshotPolicy.maxUpdates {
            try nb.putFolder(Folder(id: "f\(i % 10)", parentId: nil, name: "F\(i)", order: Double(i)))
        }
        #expect(try await eventually(timeout: .seconds(20)) {
            let snap = await server.snapshots[docId]
            return snap != nil && (try? a.store.outboxCount()) == 0
        })
        #expect(try a.store.needsSnapshot(docId: docId) == false)

        let b = try device("B", server: server)
        await b.start()
        let copy = NotebookDocument(notebookId: docId)
        try await b.open(copy.crdt, notebookId: docId)
        #expect(try await eventually { copy.folders().count == 10 })
        #expect(copy.folder(id: "f0")?.name == "F500")
        await a.stop()
        await b.stop()
    }

    @Test func snapshotOnCloseAfter30LocalEdits() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        let few = NoteDocument(noteId: EntityID.make())
        let many = NoteDocument(noteId: EntityID.make())
        for note in [few, many] {
            try await a.open(note.crdt, notebookId: "nb")
            try note.initialize(title: "t")
        }
        for i in 0..<28 { try few.insertText("\(i)", at: 0, inBlock: [1]) } // 29 edits with initialize
        for i in 0..<29 { try many.insertText("\(i)", at: 0, inBlock: [1]) } // 30 edits
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        #expect(try a.store.document(many.noteId)?.localEditsSinceSnapshot == 30)

        await a.close(docId: few.noteId)
        await a.close(docId: many.noteId)
        #expect(try await eventually {
            let snap = await server.snapshots[many.noteId]
            return snap != nil && (try? a.store.outboxCount()) == 0
        })
        #expect(await server.snapshots[few.noteId] == nil)
        #expect(try a.store.document(many.noteId)?.localEditsSinceSnapshot == 0)
        // The snapshot is the full state, readable with the note key.
        let snap = try #require(await server.snapshots[many.noteId])
        let restored = NoteDocument(noteId: many.noteId)
        try restored.crdt.applyUpdate(try DSCrypto.open(snap.payload, key: key, ad: CryptoAD.doc(many.noteId)))
        #expect(try restored.block(at: [1])?.text == (try many.block(at: [1])?.text))
        await a.stop()
    }

    @Test func awarenessIsEncryptedAndRelayed() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        let b = try device("B", server: server)
        let got = Locked<[Data]>([])
        await b.setAwarenessHandler { _, payload, _ in got.withLock { $0.append(payload) } }
        await a.start()
        await b.start()
        let docId = EntityID.make()
        try await a.track(docId: docId, kind: .note, notebookId: "nb")
        try await b.track(docId: docId, kind: .note, notebookId: "nb")
        #expect(try await eventually {
            let connected = await a.client.isConnected
            let subs = await server.subscribers(docId)
            return connected && subs == 2
        })
        try await a.sendAwareness(docId: docId, payload: Data("cursor".utf8))
        #expect(try await eventually { got.withLock { $0 } == [Data("cursor".utf8)] })
        await a.stop()
        await b.stop()
    }
}

/// Stub HTTP transport.
final class StubTransport: HTTPTransport, @unchecked Sendable {
    let handler: Locked<(URLRequest) -> (Int, Data)>
    let requests = Locked<[URLRequest]>([])

    init(_ handler: @escaping (URLRequest) -> (Int, Data)) { self.handler = Locked(handler) }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.withLock { $0.append(request) }
        let (status, data) = handler.withLock { $0(request) }
        return (data, HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

@Suite struct APIClientTests {
    func session(_ token: String, expires: Date) -> String {
        #"{"userId":"u","accessToken":"\#(token)","refreshToken":"r-\#(token)","accessExpiresAt":"\#(DSDate.iso(expires))","wrappedMasterKeyPassword":"AQID","accountDocId":"a"}"#
    }

    @Test func loginRefreshesOnExpiryAnd401() async throws {
        let calls = Locked(0)
        let transport = StubTransport { req in
            switch req.url!.path {
            case "/v1/auth/login": return (200, Data(self.session("t1", expires: Date().addingTimeInterval(3600)).utf8))
            case "/v1/auth/refresh":
                return (200, Data(self.session("t2", expires: Date().addingTimeInterval(3600)).utf8))
            case "/v1/me":
                calls.withLock { $0 += 1 }
                if req.value(forHTTPHeaderField: "Authorization") == "Bearer t1" {
                    return (401, Data(#"{"error":{"code":"unauthorized","message":"expired"}}"#.utf8))
                }
                return (200, Data(#"{"userId":"u","email":"e@x","accountDocId":"a","createdAt":"2026-10-25T00:00:00.000Z"}"#.utf8))
            case "/v1/notebooks/nb/key": return (404, Data(#"{"error":{"code":"not_found","message":"no"}}"#.utf8))
            default: return (500, Data())
            }
        }
        let sessions = SecretSessionStore(store: InMemorySecretStore())
        let api = APIClient(baseURL: URL(string: "https://example.com")!, transport: transport, sessionStore: sessions)
        let s = try await api.login(email: "  E@X ", loginKey: Data(repeating: 1, count: 32), deviceName: "iPad")
        #expect(s.wrappedMasterKeyPassword.data == Data([1, 2, 3]))
        let loginBody = try #require(transport.requests.withLock { $0.first?.httpBody })
        #expect(String(decoding: loginBody, as: UTF8.self).contains(#""email":"e@x""#))

        let me = try await api.me()
        #expect(me.email == "e@x")
        #expect(calls.withLock { $0 } == 2)
        #expect(try sessions.load()?.accessToken == "t2")

        await #expect(throws: APIError.server(status: 404, code: "not_found", message: "no")) { try await api.notebookKey(id: "nb") }

        try await api.logout()
        #expect(try sessions.load() == nil)
        await #expect(throws: APIError.notAuthenticated) { try await api.me() }
    }

    @Test func registerDocSendsExplicitNull() async throws {
        let transport = StubTransport { _ in (204, Data()) }
        let sessions = SecretSessionStore(store: InMemorySecretStore())
        try sessions.save(try JSONDecoder().decode(AuthSession.self, from: Data(session("t", expires: Date().addingTimeInterval(3600)).utf8)))
        let api = APIClient(baseURL: URL(string: "https://example.com")!, transport: transport, sessionStore: sessions)
        try await api.registerDoc(docId: "a", kind: .account, notebookId: nil)
        let body = try #require(transport.requests.withLock { $0.last?.httpBody })
        #expect(String(decoding: body, as: UTF8.self).contains(#""notebookId":null"#))
    }
}
