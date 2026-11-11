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
        /// Died silently: frames go nowhere and pings never come back (until closed).
        let dead = Locked(false)
        /// What the server closed with.
        let closedWith = Locked<(code: Int, reason: String?)?>(nil)
        var closeCode: Int? { closedWith.withLock { $0?.code } }
        var closeReason: String? { closedWith.withLock { $0?.reason } }

        init(server: FakeSyncServer) {
            self.server = server
            (incoming, continuation) = AsyncStream<String>.makeStream()
        }

        func send(_ text: String) async throws {
            guard !closed.withLock({ $0 }) else { throw SyncClientError.closed }
            if dead.withLock({ $0 }) { return }
            await server.handle(text, from: self)
        }

        func receive() async throws -> String {
            for await text in incoming { return text }
            throw SyncClientError.closed
        }

        func sendPing() async throws {
            let delay = await server.pongDelay
            if delay > .zero { try await Task.sleep(for: delay) }
            while dead.withLock({ $0 }) {
                if closed.withLock({ $0 }) { throw SyncClientError.closed }
                try await Task.sleep(for: .milliseconds(20))
            }
        }

        func close() {
            closed.withLock { $0 = true }
            continuation.finish()
            Task { await server.drop(self) }
        }

        func deliver(_ message: ServerMessage) {
            if dead.withLock({ $0 }) { return }
            continuation.yield(String(decoding: try! JSONEncoder.sync.encode(message), as: UTF8.self))
        }
    }

    var docs: [String: [Stored]] = [:]
    var snapshots: [String: (seq: Int64, payload: Data)] = [:]
    var registered: Set<String> = []
    var nextSeq: [String: Int64] = [:]
    var conns: [UUID: (conn: Conn, deviceId: String?, subs: Set<String>, accountSub: Bool)] = [:]
    var accepting = true
    /// The next `hello` is answered with `rate_limited` and this `retryAfterMs`.
    var rateLimitNextHello: Int?
    var hellos: [ContinuousClock.Instant] = []
    var helloVersions: [Int] = []
    /// Newest protocol this server speaks; a newer hello gets `protocol_mismatch` (an old server).
    var maxProtocol = SyncProtocol.latest
    func setMaxProtocol(_ v: Int) { maxProtocol = v }

    func setRateLimitNextHello(_ ms: Int?) { rateLimitNextHello = ms }
    var received: [ClientMessage] = []
    /// A client pushed into a document it had not subscribed to (protocol violation).
    var pushedWithoutSubscription = false
    /// Keeps the sender of a snapshot waiting this long (to hold `close` inside its upload).
    var snapshotDelay: Duration?

    func setSnapshotDelay(_ d: Duration?) { snapshotDelay = d }
    /// A slow link: each document of a `subscribe` takes this long to answer.
    var subscribeDelayPerDoc: Duration = .zero
    func setSubscribeDelayPerDoc(_ d: Duration) { subscribeDelayPerDoc = d }
    /// Pongs come back this late (stuck behind data on a slow link).
    var pongDelay: Duration = .zero
    func setPongDelay(_ d: Duration) { pongDelay = d }
    /// Documents named in `subscribe` frames, in order (every connection).
    var subscribedOrder: [String] = []
    func subscribeCount(_ docId: String) -> Int { subscribedOrder.filter { $0 == docId }.count }

    func snapshotsReceived(_ docId: String) -> Int {
        received.filter { if case .snapshot(let id, _, _, _) = $0 { return id == docId } else { return false } }.count
    }

    func connect() throws -> Conn {
        guard accepting else { throw SyncClientError.closed }
        let c = Conn(server: self)
        conns[c.id] = (c, nil, [], false)
        return c
    }

    func drop(_ c: Conn) { conns[c.id] = nil }

    func setAccepting(_ v: Bool) {
        accepting = v
        if !v { for c in conns.values { c.conn.close() } }
    }

    func register(_ docId: String) {
        registered.insert(docId)
        logChange(docId)
    }

    /// The connections of `deviceId` die silently (no close, no error): the server keeps them.
    func killSilently(deviceId: String) {
        for c in conns.values where c.deviceId == deviceId { c.conn.dead.withLock { $0 = true } }
    }

    func connections(deviceId: String) -> Int { conns.values.filter { $0.deviceId == deviceId }.count }

    /// Server-side close of every connection of `deviceId` with `code` (and `reason`), after
    /// an optional frame (D-53: `device_revoked` + 4410; or 4401 for a dead token).
    func closeConnections(deviceId: String, frame: ServerMessage?, code: Int, reason: String?) {
        for c in conns.values where c.deviceId == deviceId {
            if let frame { c.conn.deliver(frame) }
            c.conn.closedWith.withLock { $0 = (code, reason) }
            c.conn.close()
        }
    }

    func helloCount() -> Int { hellos.count }

    /// Documents a device may not reach (yet): its subscriptions get `doc_not_found`.
    var denied: [String: Set<String>] = [:]
    func deny(_ docId: String, to deviceId: String) {
        denied[deviceId, default: []].insert(docId)
        position += 1
        removedAt[docId] = position
    }
    func allow(_ docId: String, to deviceId: String) {
        denied[deviceId]?.remove(docId)
        // Access granted: a change in the log (sync-protocol §3.1, `granted_pos`).
        logChange(docId)
    }

    /// Sends `message` (or raw `text`) to every connection of `deviceId`.
    func send(_ message: ServerMessage, to deviceId: String) {
        for c in conns.values where c.deviceId == deviceId { c.conn.deliver(message) }
    }

    func sendRaw(_ text: String, to deviceId: String) {
        for c in conns.values where c.deviceId == deviceId { c.conn.continuation.yield(text) }
    }

    func subscribers(_ docId: String) -> Int { conns.values.filter { $0.subs.contains(docId) }.count }

    // MARK: Protocol 3 (§3.1)

    /// Change log: one position per change (an update, a document appearing or becoming
    /// readable); removals of access are logged too.
    var position: Int64 = 0
    var changedAt: [String: Int64] = [:]
    var removedAt: [String: Int64] = [:]
    enum ResumeMode { case normal, silent, reset, refuse }
    var resumeMode = ResumeMode.normal
    func setResumeMode(_ m: ResumeMode) { resumeMode = m }
    /// Cursors the clients sent in `resume`, in order.
    var resumeCursors: [String?] = []
    /// A server stuck on its database: this many pushes (or subscribe frames) are taken and
    /// never answered, the connection staying up (pongs still come).
    var swallowPushes = 0
    var swallowSubscribes = 0
    func setSwallow(pushes: Int = 0, subscribes: Int = 0) {
        swallowPushes = pushes
        swallowSubscribes = subscribes
    }
    /// An older server: pushes over this are refused with `payload_too_large` (nil: 16 MiB).
    var maxPushBytes: Int?
    func setMaxPushBytes(_ n: Int?) { maxPushBytes = n }
    /// Entries of `subscribe` frames received after `mark` (see `subscribedOrder`).
    func subscribedSince(_ mark: Int) -> [String] { Array(subscribedOrder.dropFirst(mark)) }

    private func logChange(_ docId: String) {
        position += 1
        changedAt[docId] = position
    }

    /// Whether this connection receives live frames of `docId`.
    private func follows(_ entry: (conn: Conn, deviceId: String?, subs: Set<String>, accountSub: Bool), _ docId: String) -> Bool {
        if entry.subs.contains(docId) { return true }
        guard entry.accountSub, registered.contains(docId) else { return false }
        return !(entry.deviceId.map { denied[$0]?.contains(docId) == true } ?? false)
    }

    func handle(_ text: String, from c: Conn) async {
        guard let msg = try? JSONDecoder().decode(ClientMessage.self, from: Data(text.utf8)) else { return }
        received.append(msg)
        if case .snapshot = msg, let snapshotDelay { try? await Task.sleep(for: snapshotDelay) }
        switch msg {
        case .hello(_, let deviceId, _, let version):
            hellos.append(.now)
            helloVersions.append(version)
            if version > maxProtocol {
                c.deliver(.error(code: .protocolMismatch, message: "unsupported protocol", ref: nil))
                c.close()
                return
            }
            if let ms = rateLimitNextHello {
                rateLimitNextHello = nil
                c.deliver(.error(code: .rateLimited, message: "slow down", ref: nil, retryAfterMs: ms))
                c.close()
                return
            }
            conns[c.id]?.deviceId = deviceId
            c.deliver(.welcome(userId: "0192f3c4-0000-7000-8000-00000000000a", serverTime: DSDate.iso(Date()), protocolVersion: version))
        case .subscribe(let entries):
            if swallowSubscribes > 0 {
                swallowSubscribes -= 1
                return
            }
            for e in entries {
                subscribedOrder.append(e.docId)
                if subscribeDelayPerDoc > .zero {
                    try? await Task.sleep(for: subscribeDelayPerDoc)
                    // The link dropped meanwhile: the rest of this frame is lost.
                    if c.closed.withLock({ $0 }) { return }
                }
                guard registered.contains(e.docId) else {
                    c.deliver(.error(code: .docNotFound, message: "unknown doc", ref: e.docId))
                    continue
                }
                if let device = conns[c.id]?.deviceId, denied[device]?.contains(e.docId) == true {
                    c.deliver(.error(code: .docNotFound, message: "document not found", ref: e.docId))
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
        case .resume(let cursor):
            resumeCursors.append(cursor)
            switch resumeMode {
            case .silent: return
            case .refuse:
                c.deliver(.error(code: .badRequest, message: "resume is for users", ref: nil))
                return
            case .normal, .reset: break
            }
            let device = conns[c.id]?.deviceId
            guard resumeMode == .normal, let cursor, cursor.hasPrefix("f."), let from = Int64(cursor.dropFirst(2)), from <= position else {
                c.deliver(.resumed(reset: true, cursor: "f.\(position)", docs: [], removed: []))
                return
            }
            // The account subscription first, then the list (no hole between them).
            conns[c.id]?.accountSub = true
            let deniedHere = device.map { denied[$0] ?? [] } ?? []
            let docs = changedAt.filter { $0.value > from && registered.contains($0.key) && !deniedHere.contains($0.key) }
                .map { ResumedDoc(docId: $0.key, seq: nextSeq[$0.key] ?? 0) }.sorted { $0.docId < $1.docId }
            let removed = removedAt.filter { $0.value > from && deniedHere.contains($0.key) }.map(\.key).sorted()
            c.deliver(.resumed(reset: false, cursor: "f.\(position)", docs: docs, removed: removed))
        case .push(let docId, let clientMsgId, let payload):
            pushedWithoutSubscription = pushedWithoutSubscription || !(conns[c.id]?.subs.contains(docId) ?? false)
            guard registered.contains(docId) else {
                c.deliver(.error(code: .docNotFound, message: "register first", ref: clientMsgId))
                return
            }
            if swallowPushes > 0 {
                swallowPushes -= 1
                return
            }
            if let maxPushBytes, payload.count > maxPushBytes {
                c.deliver(.error(code: .payloadTooLarge, message: "update too large", ref: clientMsgId))
                return
            }
            let seq = (nextSeq[docId] ?? 0) + 1
            logChange(docId)
            nextSeq[docId] = seq
            let device = conns[c.id]?.deviceId ?? "?"
            docs[docId, default: []].append(Stored(seq: seq, payload: payload, deviceId: device))
            c.deliver(.ack(docId: docId, clientMsgId: clientMsgId, seq: seq))
            for other in conns.values where other.conn.id != c.id && follows(other, docId) {
                other.conn.deliver(.update(docId: docId, item: UpdateItem(seq: seq, payload: payload, deviceId: device)))
            }
        case .snapshot(let docId, let clientMsgId, let baseSeq, let payload):
            snapshots[docId] = (baseSeq, payload)
            docs[docId] = docs[docId, default: []].filter { $0.seq > baseSeq }
            c.deliver(.ack(docId: docId, clientMsgId: clientMsgId, seq: baseSeq))
            // Forwarded at once to the other subscribed connections (§5, 2026-11-11).
            for other in conns.values where other.conn.id != c.id && follows(other, docId) {
                other.conn.deliver(.updates(docId: docId, snapshot: (baseSeq, payload), items: [], upToDate: false))
            }
        case .awareness(let docId, let payload):
            for other in conns.values where other.conn.id != c.id && follows(other, docId) {
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
///
/// `timeout` is time this waiter was actually given to run, not wall-clock time. On CI the
/// whole suite runs at once on a ~3-core simulator and some tests do seconds of synchronous
/// work (Argon2id at 64 MiB) on the shared concurrency pool: a 10 ms sleep then wakes seconds
/// late, and a wall-clock deadline ran out while neither the code under test nor this check
/// could run (`expiredTokenOrDroppedConnectionIsNotARevocation`, `noteWithoutKeyYet…`,
/// 2026-11-04). A late wake counts as two intervals at most, so starvation stops the clock and
/// a real hang still fails. Wall time is capped at 10 × `timeout` so a stuck run ends. Speed
/// is not asserted here: wall-clock targets are in `SyncPerfTests`/`LiveSyncTests`, which CI
/// runs alone.
func eventually(timeout: Duration = .seconds(5), _ condition: () async throws -> Bool) async throws -> Bool {
    let interval = Duration.milliseconds(10)
    let hardDeadline = ContinuousClock.now + timeout * 10
    var budget = timeout
    while budget > .zero, ContinuousClock.now < hardDeadline {
        if try await condition() { return true }
        let slept = ContinuousClock.now
        try await Task.sleep(for: interval)
        budget -= min(ContinuousClock.now - slept, interval * 2)
    }
    return try await condition()
}

@Suite(.serialized) struct SyncTests {
    let key = DSCrypto.newKey()

    func device(_ name: String, server: FakeSyncServer, clock: TestClock? = nil, registerDelay: Duration = .zero) throws -> SyncEngine {
        let store = try LocalStore.inMemory()
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: name, clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        config.maxBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = self.key
        let now: @Sendable () -> Date
        if let clock { now = { clock.now } } else { now = { Date() } }
        return SyncEngine(store: store, client: client, keyFor: { _ in key }, register: { record in
            if registerDelay > .zero { try await Task.sleep(for: registerDelay) }
            await server.register(record.docId)
        }, clock: now)
    }

    @Test func messagesRoundTripAsContractJSON() throws {
        let doc = "0192f3c4-0000-7000-8000-000000000001"
        let push = ClientMessage.push(docId: doc, clientMsgId: "m", payload: Data([0xfb, 0xff]))
        let text = try SyncFrame.encode(push)
        #expect(text == #"{"clientMsgId":"m","docId":"0192f3c4-0000-7000-8000-000000000001","payload":"-_8","type":"push"}"#)
        #expect(try JSONDecoder().decode(ClientMessage.self, from: Data(text.utf8)) == push)
        let hello = try SyncFrame.encode(.hello(auth: .guest(shareId: doc, guestToken: "g"), deviceId: "dev", client: ClientInfo(version: "1")))
        #expect(hello.contains(#""protocol":3"#) && hello.contains(#""kind":"guest""#) && hello.contains(#""platform":"ios""#))

        let updates = SyncFrame.decode(#"{"type":"updates","docId":"0192f3c4-0000-7000-8000-000000000001","snapshot":null,"items":[{"seq":3,"payload":"AQ","deviceId":"x"}],"upToDate":true}"#)
        #expect(updates == .updates(docId: doc, snapshot: nil, items: [UpdateItem(seq: 3, payload: Data([1]), deviceId: "x")], upToDate: true))
        #expect(SyncFrame.decode(#"{"type":"welcome","userId":null,"serverTime":"t","protocol":1}"#) == .welcome(userId: nil, serverTime: "t", protocolVersion: 1))
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
        // Every edit acknowledged (the server's last seq) and the snapshot stored. A generous
        // wait: 501 edits on a loaded CI simulator take seconds (CI #148: past 9 s); the test is
        // about the threshold, not speed.
        let edits = Int64(SnapshotPolicy.maxUpdates + 1)
        #expect(try await eventually(timeout: .seconds(30)) {
            let lastSeq = await server.nextSeq[docId] ?? 0
            let snap = await server.snapshots[docId]
            return lastSeq == edits && snap != nil && (try? a.store.outboxCount()) == 0
        })
        #expect(try a.store.needsSnapshot(docId: docId) == false)

        // B is caught up when it has the last seq, not when it has ten folders (it had them
        // after the first ten edits: «F490» ≠ «F500», 2026-11-04).
        let b = try device("B", server: server)
        await b.start()
        let copy = NotebookDocument(notebookId: docId)
        try await b.open(copy.crdt, notebookId: docId)
        #expect(try await eventually { (try? b.store.document(docId)?.lastSeq) == edits })
        #expect(copy.folders().count == 10)
        #expect(copy.folder(id: "f0")?.name == "F500")
        await a.stop()
        await b.stop()
    }

    /// spec/06 rule 1: leaving a document with at least one edit makes a version — a short
    /// dictation too (the owner's «Нет версий», 2026-11-09) — but not twice within 2 minutes.
    @Test func shortEditThenLeavingMakesAVersion() async throws {
        let server = FakeSyncServer()
        let clock = TestClock()
        let a = try device("A", server: server, clock: clock)
        await a.start()
        let note = NoteDocument(noteId: EntityID.make())
        let untouched = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try await a.open(untouched.crdt, notebookId: "nb")
        try note.initialize(title: "Диктовка")
        try note.insertText("Купить молоко", at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })

        await a.close(docId: note.noteId)
        await a.close(docId: untouched.noteId)
        #expect(try await eventually { await server.snapshots[note.noteId] != nil && (try? a.store.outboxCount()) == 0 })
        #expect(await server.snapshots[untouched.noteId] == nil)
        let record = try #require(try a.store.document(note.noteId))
        #expect(record.localEditsSinceSnapshot == 0 && record.lastSnapshotAt == clock.now)
        // The version is the full state, readable with the note key.
        let snap = try #require(await server.snapshots[note.noteId])
        let restored = NoteDocument(noteId: note.noteId)
        try restored.crdt.applyUpdate(try DSCrypto.open(snap.payload, key: key, ad: CryptoAD.doc(note.noteId)))
        #expect(try restored.block(at: [1])?.text == "Купить молоко")

        // Back a minute later, one more word, leave again: too soon for another version.
        clock.advance(60)
        let again = NoteDocument(noteId: note.noteId)
        try await a.open(again.crdt, notebookId: "nb")
        try again.insertText(" и хлеб", at: 13, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        await a.close(docId: note.noteId)
        #expect(await server.snapshotsReceived(note.noteId) == 1)
        // Two minutes after the version: the background (leaving without closing) makes one.
        try await a.open(again.crdt, notebookId: "nb")
        clock.advance(SnapshotPolicy.leaveInterval)
        await a.snapshotOnLeave()
        #expect(try await eventually { await server.snapshotsReceived(note.noteId) == 2 })
        await a.stop()
    }

    /// The app keeps every note open in the engine: leaving one makes its version but keeps it
    /// live — edits from another device still arrive.
    @Test func leavingANoteKeepsItSyncing() async throws {
        let server = FakeSyncServer()
        let clock = TestClock()
        let a = try device("A", server: server, clock: clock)
        let b = try device("B", server: server)
        await a.start()
        await b.start()
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "t")
        try note.insertText("с телефона", at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })

        await a.snapshotOnLeave(docId: note.noteId)
        #expect(try await eventually { await server.snapshotsReceived(note.noteId) == 1 })
        #expect(await a.isOpen(note.noteId))

        let remote = NoteDocument(noteId: note.noteId)
        try await b.open(remote.crdt, notebookId: "nb")
        #expect(try await eventually { (try? remote.block(at: [1])?.text) == "с телефона" })
        try remote.insertText("с Mac ", at: 0, inBlock: [1])
        #expect(try await eventually { (try? note.block(at: [1])?.text) == "с Mac с телефона" })
        await a.stop()
        await b.stop()
    }

    /// spec/06 rule 2: while editing, a version once the first edit after the last one is 10 min old.
    @Test func longEditingMakesAVersionEveryTenMinutes() async throws {
        let server = FakeSyncServer()
        let clock = TestClock()
        let a = try device("A", server: server, clock: clock)
        await a.start()
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "t")
        clock.advance(SnapshotPolicy.editingInterval - 1)
        try note.insertText("a", at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        #expect(await server.snapshots[note.noteId] == nil)
        // The rule is checked at most every few seconds per document (bulk edits).
        clock.advance(SyncEngine.editingCheckInterval)
        try note.insertText("b", at: 0, inBlock: [1])
        #expect(try await eventually { await server.snapshotsReceived(note.noteId) == 1 })
        // The clock starts again at the next edit, not at the version.
        clock.advance(SnapshotPolicy.editingInterval)
        try note.insertText("c", at: 0, inBlock: [1])
        clock.advance(SnapshotPolicy.editingInterval - 1)
        try note.insertText("d", at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        #expect(await server.snapshotsReceived(note.noteId) == 1)
        await a.stop()
    }

    /// spec/06 rule 3: before a suggestion replaces the text, a version of the state before it,
    /// even right after another version; with nothing changed since a version, none.
    @Test func snapshotBeforeSuggestionHoldsTheStateBefore() async throws {
        let server = FakeSyncServer()
        let clock = TestClock()
        let a = try device("A", server: server, clock: clock)
        await a.start()
        let note = NoteDocument(noteId: EntityID.make())
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "t")
        try note.insertText("сырой текст диктовки", at: 0, inBlock: [1])
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })

        #expect(await a.snapshotNow(docId: note.noteId, reason: .beforeSuggestion))
        // The suggestion is applied after the call returns.
        let block = try #require(try note.block(at: [1]))
        try note.deleteText(range: 0..<block.text.count, inBlock: [1])
        try note.insertText("Оформленный текст", at: 0, inBlock: [1])
        #expect(try await eventually { await server.snapshotsReceived(note.noteId) == 1 && (try? a.store.outboxCount()) == 0 })
        let snap = try #require(await server.snapshots[note.noteId])
        let before = NoteDocument(noteId: note.noteId)
        try before.crdt.applyUpdate(try DSCrypto.open(snap.payload, key: key, ad: CryptoAD.doc(note.noteId)))
        #expect(try before.block(at: [1])?.text == "сырой текст диктовки")

        // A voice insert right away: a new version (the suggestion is an edit since), no wait.
        #expect(await a.snapshotNow(docId: note.noteId, reason: .beforeVoiceInsert))
        #expect(try await eventually { await server.snapshotsReceived(note.noteId) == 2 })
        // Nothing changed since that version: no third one.
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        #expect(await !a.snapshotNow(docId: note.noteId, reason: .beforeSuggestion))
        await a.stop()
    }

    /// Reopening a note while its close is still uploading the snapshot, with another device
    /// writing all the time: the new instance is live and nothing is lost.
    @Test func reopenWhileClosingUnderContinuousWrites() async throws {
        let server = FakeSyncServer()
        let clock = TestClock()
        let edits = 30
        let a = try device("A", server: server, clock: clock)
        let b = try device("B", server: server)
        await a.start()
        await b.start()
        let docId = EntityID.make()
        var current = NoteDocument(noteId: docId)
        try await a.open(current.crdt, notebookId: "nb")
        try current.initialize(title: "Race")
        let remote = NoteDocument(noteId: docId)
        try await b.open(remote.crdt, notebookId: "nb")
        #expect(try await eventually { (try? remote.block(at: [1])) != nil })

        let writes = 100
        let writer = Task {
            for _ in 0..<writes {
                try remote.insertText("b", at: 0, inBlock: [1])
                try await Task.sleep(for: .milliseconds(3))
            }
        }
        // Generous waits: on a loaded CI simulator (all suites run in parallel) a round can
        // take seconds; the test is about losing nothing, not about speed.
        let wait = Duration.seconds(20)
        let rounds = 5
        await server.setSnapshotDelay(.milliseconds(50))
        for _ in 0..<rounds {
            // Each round leaves the note more than 2 minutes after the previous version.
            clock.advance(SnapshotPolicy.leaveInterval)
            for _ in 0..<edits { try current.insertText("a", at: 0, inBlock: [1]) }
            // Edits (and the previous snapshot) acknowledged: the close uploads its snapshot itself.
            #expect(try await eventually(timeout: wait) { (try? a.store.outboxCount()) == 0 })
            let before = await server.snapshotsReceived(docId)
            let closing = Task { await a.close(docId: docId) }
            // The close is now waiting on the server inside its snapshot upload.
            #expect(try await eventually(timeout: wait) { await server.snapshotsReceived(docId) > before })
            let next = NoteDocument(noteId: docId)
            try await a.open(next.crdt, notebookId: "nb")
            await closing.value
            #expect(await a.isOpen(docId))
            current = next
        }
        try await writer.value

        func counts(_ note: NoteDocument) -> (Int, Int) {
            let text = (try? note.block(at: [1])?.text) ?? ""
            return (text.filter { $0 == "a" }.count, text.filter { $0 == "b" }.count)
        }
        let expected = (rounds * edits, writes)
        #expect(try await eventually(timeout: wait) { counts(current) == expected && counts(remote) == expected })
        await a.stop()
        await b.stop()
    }

    /// Background refresh: one pass catches up, sends the outbox and disconnects; without a
    /// server it gives up at the deadline and keeps the edit queued.
    @Test func syncOnceCatchesUpSendsAndDisconnects() async throws {
        let server = FakeSyncServer()
        let a = try device("A", server: server)
        await a.start()
        let docId = EntityID.make()
        let note = NoteDocument(noteId: docId)
        try await a.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "Background")
        #expect(try await eventually { (try? a.store.outboxCount()) == 0 })
        await a.stop()

        // B knows the note (from its notebook index) and has an offline note of its own.
        let b = try device("B", server: server)
        try b.store.ensureDocument(docId: docId, kind: .note, notebookId: "nb")
        let other = NoteDocument(noteId: EntityID.make())
        try other.initialize(title: "Offline")
        try b.store.ensureDocument(docId: other.noteId, kind: .note, notebookId: "nb")
        try b.store.appendLocalUpdate(docId: other.noteId, update: try other.crdt.encodeStateAsUpdate(), origin: .local)

        let result = await b.syncOnce(deadline: .now + .seconds(10))
        #expect(result == .init(completed: true, pending: 0))
        #expect(try (b.store.document(docId)?.lastSeq ?? 0) > 0)
        #expect(await server.docs[other.noteId]?.isEmpty == false)
        #expect(await b.client.isConnected == false)
        #expect(try b.store.pendingIndexCount() == 2)

        await server.setAccepting(false)
        try b.store.appendLocalUpdate(docId: other.noteId, update: try other.crdt.encodeStateAsUpdate(), origin: .local)
        let start = ContinuousClock.now
        let cut = await b.syncOnce(deadline: .now + .milliseconds(300))
        #expect(cut == .init(completed: false, pending: 1))
        #expect(ContinuousClock.now - start < .seconds(3))
    }

    /// A note made offline is registered after `doc_not_found`; while that request runs the
    /// note is neither catching up nor live. The pass is not done until it is sent (CI failure
    /// of syncOnceCatchesUpSendsAndDisconnects, 2026-11-09: «completed» with the note unsent).
    @Test func syncOnceWaitsForASlowRegistration() async throws {
        let server = FakeSyncServer()
        let b = try device("B", server: server, registerDelay: .milliseconds(300))
        let offline = NoteDocument(noteId: EntityID.make())
        try offline.initialize(title: "Offline")
        try b.store.ensureDocument(docId: offline.noteId, kind: .note, notebookId: "nb")
        try b.store.appendLocalUpdate(docId: offline.noteId, update: try offline.crdt.encodeStateAsUpdate(), origin: .local)

        let result = await b.syncOnce(deadline: .now + .seconds(10))
        #expect(result == .init(completed: true, pending: 0))
        #expect(await server.docs[offline.noteId]?.isEmpty == false)
    }

    /// A refused registration fails only that document's messages (shown in `status.failed`);
    /// other documents keep syncing, and `retryFailed` sends them once the server accepts.
    @Test func refusedRegistrationIsReportedAndRetried() async throws {
        let server = FakeSyncServer()
        let refused = Locked<Set<String>>([])
        let attempts = Locked(0)
        let store = try LocalStore.inMemory()
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "A", clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = self.key
        let a = SyncEngine(store: store, client: client, keyFor: { _ in key }) { record in
            if refused.withLock({ $0.contains(record.docId) }) {
                attempts.withLock { $0 += 1 }
                throw APIError.server(status: 404, code: "not_found", message: "notebook not found")
            }
            await server.register(record.docId)
        }
        let bad = NoteDocument(noteId: EntityID.make())
        let good = NoteDocument(noteId: EntityID.make())
        refused.withLock { _ = $0.insert(bad.noteId) }
        try bad.initialize(title: "Refused")
        try good.initialize(title: "Fine")
        try await a.open(bad.crdt, notebookId: "nb")
        try await a.open(good.crdt, notebookId: "nb")
        await a.start()

        #expect(try await eventually { await server.docs[good.noteId]?.isEmpty == false })
        #expect(try await eventually { await a.status().failed.map(\.docId) == [bad.noteId] })
        // The refusal can come before the other document's messages are acknowledged.
        #expect(try await eventually { let s = await a.status(); return s.pending == 0 && s.isIdle })
        let status = await a.status()
        #expect(status.failed.first?.reason == "register: not_found (404)")
        #expect(status.summary == .failed(documents: 1, reason: "register: not_found (404)"))
        // Refused registrations are not retried on their own.
        try await Task.sleep(for: .milliseconds(200))
        #expect(attempts.withLock { $0 } == 1)

        refused.withLock { $0.removeAll() }
        await a.retryFailed(docId: bad.noteId)
        #expect(try await eventually { await server.docs[bad.noteId]?.isEmpty == false })
        #expect(await a.status().failed.isEmpty)
        #expect(try await eventually { await a.status().summary == .synced })
        await a.stop()
    }

    /// A temporary registration failure (server down) is retried with backoff, without the
    /// document ever showing as failed.
    @Test func temporaryRegistrationFailureRetriesWithBackoff() async throws {
        let server = FakeSyncServer()
        let failuresLeft = Locked(2)
        let store = try LocalStore.inMemory()
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "A", clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = self.key
        let a = SyncEngine(store: store, client: client, keyFor: { _ in key }) { record in
            if failuresLeft.withLock({ $0 -= 1; return $0 >= 0 }) { throw APIError.server(status: 503, code: "internal", message: "down") }
            await server.register(record.docId)
        }
        await a.setMinRetryDelay(.milliseconds(20))
        let note = NoteDocument(noteId: EntityID.make())
        try note.initialize(title: "Later")
        try await a.open(note.crdt, notebookId: "nb")
        await a.start()
        #expect(try await eventually { await server.docs[note.noteId]?.isEmpty == false })
        let status = await a.status()
        #expect(status.failed.isEmpty)
        #expect(try await eventually { await a.status().summary == .synced })
        await a.stop()
    }

    /// Deleting a document drops its queue, so the status can become idle.
    @Test func deletedDocumentLeavesNothingQueued() async throws {
        let server = FakeSyncServer()
        await server.setAccepting(false)
        let a = try device("A", server: server)
        let local = NoteDocument(noteId: EntityID.make())
        try local.initialize(title: "Local only")
        try await a.open(local.crdt, notebookId: "nb")
        #expect(await a.status().pending == 1)
        try await a.deleteDocument(local.noteId)
        #expect(await a.status().pending == 0)
        #expect(try a.store.updates(docId: local.noteId).isEmpty)
        #expect(await a.isOpen(local.noteId) == false)
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
        // Awareness is only for open documents.
        try await a.open(NoteDocument(noteId: docId).crdt, notebookId: "nb")
        try await b.track(docId: docId, kind: .note, notebookId: "nb")
        #expect(try await eventually {
            let connected = await a.client.isConnected
            let subs = await server.subscribers(docId)
            return connected && subs == 2
        })
        try await a.sendAwareness(docId: docId, payload: Data("cursor".utf8))
        try await Task.sleep(for: .milliseconds(100))
        #expect(got.withLock { $0 }.isEmpty)
        try await b.open(NoteDocument(noteId: docId).crdt, notebookId: "nb")
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
        #"{"userId":"0192f3c4-0000-7000-8000-00000000000a","deviceId":"dev","accessToken":"\#(token)","refreshToken":"r-\#(token)","accessExpiresAt":"\#(DSDate.iso(expires))","wrappedMasterKeyPassword":"AQID","accountDocId":"0192f3c4-0000-7000-8000-00000000000b"}"#
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

/// A clock the snapshot policy reads; tests move it.
final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current = Date(timeIntervalSince1970: 1_762_675_200)
    var now: Date { lock.withLock { current } }
    func advance(_ seconds: TimeInterval) { lock.withLock { current += seconds } }
}
