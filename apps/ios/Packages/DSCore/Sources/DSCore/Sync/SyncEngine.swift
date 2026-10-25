import Foundation

/// Overall sync state for the UI.
public struct SyncStatus: Equatable, Sendable {
    public var connection: SyncConnectionState
    /// Outgoing messages not yet acknowledged (failed ones not included).
    public var pending: Int
    /// Documents still catching up after (re)connect.
    public var catchingUp: Int
    /// Documents whose messages could not be delivered and are no longer retried on their own
    /// (`retryFailed`, `discardFailed`). Everything else keeps syncing.
    public var failed: [FailedSync] = []

    public init(connection: SyncConnectionState, pending: Int, catchingUp: Int, failed: [FailedSync] = []) {
        self.connection = connection
        self.pending = pending
        self.catchingUp = catchingUp
        self.failed = failed
    }

    /// Nothing left to send or fetch (failed messages aside).
    public var isIdle: Bool { pending == 0 && catchingUp == 0 }
}

/// Ties documents, the local store, encryption and the WebSocket together
/// (sync-protocol.md):
///
/// - local updates of open documents are stored and queued atomically, encrypted with the
///   document key (`ad = ds1|doc|<docId>`) and pushed; unacknowledged ones survive restarts;
/// - on (re)connect every known document is subscribed from its `lastSeq`, then the queue is
///   flushed; documents are registered (`POST /v1/docs`) before their first push;
/// - remote updates/snapshots are decrypted, stored, and applied to open documents;
/// - after > 500 updates or > 1 MiB since the last snapshot a snapshot is uploaded
///   (orphaned strokes older than 30 days are purged first, strokes.md §4.2);
/// - awareness payloads are encrypted (`ds1|awareness|<docId>`) and only relayed, for open
///   documents only;
/// - only open documents have a live `CRDTDocument`. Everything else stays in the store as
///   updates: remote ones are appended, snapshots merge them without a document
///   (`CRDTUpdates.merge`), so memory does not grow with the number of notes.
public actor SyncEngine: SyncClientDelegate {
    public typealias KeyLookup = @Sendable (DocumentRecord) throws -> Data?
    public typealias Registrar = @Sendable (DocumentRecord) async throws -> Void
    public typealias AwarenessHandler = @Sendable (_ docId: String, _ payload: Data, _ deviceId: String) -> Void

    public nonisolated let store: LocalStore
    public nonisolated let client: SyncClient
    private let keyFor: KeyLookup
    private let register: Registrar?
    private var awarenessHandler: AwarenessHandler?

    private struct OpenDoc {
        let doc: CRDTDocument
        let subscription: CRDTSubscription
    }

    private var open: [String: OpenDoc] = [:]
    private var inFlight: Set<String> = []
    /// A flush is running; calls made meanwhile only ask it for another pass. Bulk edits
    /// (hundreds of updates in a row) then cost a few outbox scans instead of one per update.
    private var flushing = false
    private var flushAgain = false
    /// At most this many messages wait for an ack; the next ones go out as acks arrive.
    static let maxInFlight = 100
    /// The last pass left queued messages unsent (in-flight cap); an ack starts another pass.
    private var backlog = false
    private var catchingUp: Set<String> = []
    /// Documents subscribed on the current connection whose catch-up finished (`upToDate`).
    /// Pushes go only to these: otherwise `lastSeq = max(ack)` could skip others' updates.
    private var live: Set<String> = []
    /// Records of subscribed documents (kind/notebook for key lookup without a DB read).
    private var known: [String: DocumentRecord] = [:]
    private var connection: SyncConnectionState = .disconnected
    /// `start()` was called and `stop()` was not.
    private var running = false
    /// Every known document was subscribed on the current connection.
    private var subscribedAll = false
    private var statusContinuations: [UUID: AsyncStream<SyncStatus>.Continuation] = [:]

    /// - Parameters:
    ///   - keyFor: document key (master key for `account`, notebook key for `notebook`, note
    ///     key for `note`); nil while unknown — the document is skipped until it is.
    ///   - register: registers a document on the server (`APIClient.registerDoc`); nil for
    ///     guests (their documents already exist).
    public init(store: LocalStore, client: SyncClient, keyFor: @escaping KeyLookup, register: Registrar?) {
        self.store = store
        self.client = client
        self.keyFor = keyFor
        self.register = register
    }

    /// Connects and starts syncing every document known to the store.
    public func start() async {
        running = true
        await client.setDelegate(self)
        await client.start()
    }

    public func stop() async {
        running = false
        await client.stop()
    }

    /// Result of `syncOnce`.
    public struct SyncOnceResult: Sendable, Equatable {
        /// Every document was caught up and every sendable message acknowledged.
        public var completed: Bool
        /// Messages still queued (unsendable ones included: no key yet, failed).
        public var pending: Int
    }

    /// One sync pass for a background refresh (`BGAppRefreshTask`): connects, catches every
    /// known document up from its `lastSeq`, sends the outbox, waits for the acks and
    /// disconnects — or returns at `deadline` (or on task cancellation). Remote updates only go
    /// to the store (no documents are loaded, nothing is indexed), and cutting it short loses
    /// nothing: whatever was not stored or acknowledged is fetched or sent next time. If the
    /// engine was already running (app in the foreground) it stays connected.
    public func syncOnce(deadline: ContinuousClock.Instant) async -> SyncOnceResult {
        let wasRunning = running
        if !wasRunning { await start() }
        var completed = false
        while ContinuousClock.now < deadline, !Task.isCancelled {
            if await client.isConnected, subscribedAll, catchingUp.isEmpty, inFlight.isEmpty,
               (try? store.pendingOutbox(limit: Self.maxInFlight * 2))?.contains(where: { live.contains($0.docId) }) == false {
                completed = true
                break
            }
            try? await Task.sleep(for: .milliseconds(50))
        }
        if !wasRunning { await stop() }
        return SyncOnceResult(completed: completed, pending: (try? store.outboxCount()) ?? 0)
    }

    public func setAwarenessHandler(_ handler: AwarenessHandler?) {
        awarenessHandler = handler
    }

    /// Status updates (current value first).
    public func statusUpdates() -> AsyncStream<SyncStatus> {
        let id = UUID()
        let (stream, continuation) = AsyncStream<SyncStatus>.makeStream()
        statusContinuations[id] = continuation
        continuation.onTermination = { _ in Task { await self.removeStatus(id) } }
        continuation.yield(currentStatus())
        return stream
    }

    private func removeStatus(_ id: UUID) { statusContinuations[id] = nil }

    /// Current status (the same value `statusUpdates()` yields).
    public func status() -> SyncStatus { currentStatus() }

    private func currentStatus() -> SyncStatus {
        SyncStatus(connection: connection, pending: (try? store.outboxCount()) ?? 0, catchingUp: catchingUp.count,
                   failed: (try? store.failedOutbox()) ?? [])
    }

    private func publish() {
        let s = currentStatus()
        for c in statusContinuations.values { c.yield(s) }
    }

    // MARK: Documents

    /// Starts syncing a document without keeping it in memory (remote updates go to the store).
    public func track(docId: String, kind: DocKind, notebookId: String?) async throws {
        let record = try store.ensureDocument(docId: docId, kind: kind, notebookId: notebookId)
        if await client.isConnected { try? await subscribe([record]) }
    }

    /// Loads `doc` from the store and keeps it in sync: local edits are persisted and sent,
    /// remote ones applied. Content the document already had (created before opening) is
    /// stored as a local update.
    public func open(_ doc: CRDTDocument, notebookId: String?) async throws {
        if open[doc.docId] != nil { return }
        let record = try store.ensureDocument(docId: doc.docId, kind: doc.kind, notebookId: notebookId)
        if doc.stateVector().count > 1 {
            try store.appendLocalUpdate(docId: doc.docId, update: try doc.encodeStateAsUpdate(), origin: .system)
        }
        try doc.applyUpdates(try store.updates(docId: doc.docId), origin: .storage)
        let store = self.store
        let docId = doc.docId
        let sub = doc.observeUpdates { [weak self] update, origin in
            guard origin.isOutgoing else { return }
            // Synchronous: the update is durable before the transaction returns.
            try? store.appendLocalUpdate(docId: docId, update: update, origin: origin)
            Task { await self?.flush() }
        }
        open[doc.docId] = OpenDoc(doc: doc, subscription: sub)
        if await client.isConnected { try? await subscribe([record]) }
        await flush()
    }

    /// Stops applying remote updates to `docId` in memory (it stays tracked in the store).
    /// Uploads a snapshot first when ≥ 30 local edits were made since the last one: snapshots
    /// are the versions of the history (sync-protocol.md §5, spec/06).
    ///
    /// The document is detached before anything is awaited, so an `open` of the same document
    /// that runs meanwhile gets a fresh instance from the store, which already holds every edit
    /// of the closed one (the observer stores them synchronously).
    public func close(docId: String, now: Date = Date()) async {
        guard let closing = open.removeValue(forKey: docId) else { return }
        closing.subscription.cancel()
        if let record = try? store.document(docId), record.localEditsSinceSnapshot >= LocalStore.snapshotOnCloseEdits {
            await snapshot(docId: docId, now: now, detached: closing.doc)
        }
    }

    public func isOpen(_ docId: String) -> Bool { open[docId] != nil }

    /// Deletes a document locally: stops syncing it and removes it, its queue and its index
    /// entries from the store (e.g. a local document replaced at sign-in).
    public func deleteDocument(_ docId: String) throws {
        open.removeValue(forKey: docId)?.subscription.cancel()
        known[docId] = nil
        live.remove(docId)
        catchingUp.remove(docId)
        try store.deleteDocument(docId)
        publish()
    }

    // MARK: Failed messages

    /// Puts failed messages (of one document or all) back into the queue and tries again:
    /// registration, subscription, sending.
    public func retryFailed(docId: String? = nil) async {
        try? store.retryFailed(docId: docId)
        if await client.isConnected, let records = try? store.documents() {
            let waiting = records.filter { !live.contains($0.docId) && !catchingUp.contains($0.docId) && (docId == nil || $0.docId == docId) }
            try? await subscribe(waiting)
        }
        await flush()
    }

    /// Gives up on a document's failed messages (its local content stays).
    public func discardFailed(docId: String) {
        try? store.discardOutbox(docId: docId, onlyFailed: true)
        publish()
    }

    /// Errors that will not pass by retrying: the request was refused (4xx other than 401,
    /// 408 and 429).
    static func isPermanent(_ error: any Error) -> Bool {
        if case APIError.server(let status, _, _) = error { return (400..<500).contains(status) && ![401, 408, 429].contains(status) }
        return false
    }

    static func describe(_ error: any Error) -> String {
        if case APIError.server(let status, let code, _) = error { return "\(code) (\(status))" }
        return String(describing: error)
    }

    // MARK: Awareness

    public func sendAwareness(docId: String, payload: Data) async throws {
        guard open[docId] != nil, let record = try store.document(docId), let key = try keyFor(record) else { return }
        let sealed = try DSCrypto.seal(payload, key: key, ad: CryptoAD.awareness(docId))
        try await client.send(.awareness(docId: docId, payload: sealed))
    }

    // MARK: Outgoing

    /// Sends queued messages that are not in flight on the current connection.
    public func flush() async {
        if flushing {
            flushAgain = true
            return
        }
        flushing = true
        defer { flushing = false }
        repeat {
            flushAgain = false
            await flushPass()
        } while flushAgain
    }

    private func flushPass() async {
        guard await client.isConnected else {
            publish()
            return
        }
        guard let items = try? store.pendingOutbox(limit: Self.maxInFlight * 2) else { return }
        backlog = items.count == Self.maxInFlight * 2
        // Documents whose registration failed in this pass: their other messages wait.
        var skip: Set<String> = []
        for item in items where !inFlight.contains(item.clientMsgId) && live.contains(item.docId) && !skip.contains(item.docId) {
            guard inFlight.count < Self.maxInFlight else {
                backlog = true
                break
            }
            guard let record = try? store.document(item.docId) else {
                // The document is gone; its messages can never be sent.
                try? store.discardOutbox(docId: item.docId)
                continue
            }
            do {
                guard let key = try keyFor(record) else { continue }
                if !record.registered {
                    do {
                        if let register { try await register(record) }
                        try store.setRegistered(record.docId)
                    } catch {
                        skip.insert(item.docId)
                        if Self.isPermanent(error) { try? store.failOutbox(docId: item.docId, reason: "register: \(Self.describe(error))") }
                        continue
                    }
                }
                let sealed = try DSCrypto.seal(item.payload, key: key, ad: CryptoAD.doc(item.docId))
                let limit = item.kind == .push ? SyncProtocol.maxUpdateBytes : SyncProtocol.maxSnapshotBytes
                guard sealed.count <= limit else {
                    try store.markFailed(clientMsgId: item.clientMsgId, error: "payload_too_large (local)", permanent: true)
                    continue
                }
                inFlight.insert(item.clientMsgId)
                switch item.kind {
                case .push:
                    try await client.send(.push(docId: item.docId, clientMsgId: item.clientMsgId, payload: sealed))
                case .snapshot:
                    try await client.send(.snapshot(docId: item.docId, clientMsgId: item.clientMsgId, baseSeq: item.baseSeq ?? 0, payload: sealed))
                }
            } catch SyncClientError.notConnected {
                inFlight.remove(item.clientMsgId)
                break
            } catch {
                inFlight.remove(item.clientMsgId)
                try? store.markFailed(clientMsgId: item.clientMsgId, error: Self.describe(error))
            }
        }
        publish()
    }

    /// Registers (if needed) and subscribes documents whose key is known. A document must be
    /// subscribed and caught up before the first push (sync-protocol.md §4).
    private func subscribe(_ records: [DocumentRecord]) async throws {
        var ready: [DocumentRecord] = []
        for record in records where (try? keyFor(record)) != nil {
            if !record.registered {
                do {
                    if let register { try await register(record) }
                    try store.setRegistered(record.docId)
                } catch {
                    // Refused: its messages show up as failed (retryFailed tries again).
                    // Anything else is retried on the next connect.
                    if Self.isPermanent(error) { try? store.failOutbox(docId: record.docId, reason: "register: \(Self.describe(error))") }
                    continue
                }
            }
            ready.append(record)
        }
        for r in ready { known[r.docId] = r }
        let entries = ready.map { SubscribeEntry(docId: $0.docId, since: $0.lastSeq) }
        guard !entries.isEmpty else { return }
        for e in entries { catchingUp.insert(e.docId) }
        // Keep frames reasonably small.
        for chunk in stride(from: 0, to: entries.count, by: 100).map({ Array(entries[$0..<min($0 + 100, entries.count)]) }) {
            try await client.send(.subscribe(docs: chunk))
        }
        publish()
    }

    // MARK: Snapshots

    /// Uploads a snapshot when the thresholds are exceeded (sync-protocol.md §5).
    public func snapshotIfNeeded(docId: String, now: Date = Date()) async {
        guard (try? store.needsSnapshot(docId: docId)) == true else { return }
        await snapshot(docId: docId, now: now)
    }

    /// Builds, stores and sends a snapshot of `docId` (unless one is already queued).
    ///
    /// An open document (or one being closed, `detached`) is snapshotted from memory after the
    /// orphaned-stroke pass. Any other document is never loaded: its stored updates are merged
    /// as they are. Orphans only appear through edits, and the next open-and-close of the note
    /// runs the pass (strokes.md §4.2 sets no deadline tighter than that).
    private func snapshot(docId: String, now: Date, detached: CRDTDocument? = nil) async {
        guard let record = try? store.document(docId),
              (try? store.pendingOutbox(docId: docId))?.contains(where: { $0.kind == .snapshot }) != true else { return }
        do {
            guard let doc = open[docId]?.doc ?? detached else {
                let state = try CRDTUpdates.merge(try store.updates(docId: docId))
                _ = try store.enqueueSnapshot(docId: docId, state: state, baseSeq: record.lastSeq, now: now)
                try store.compact(docId: docId, now: now)
                await flush()
                return
            }
            if record.kind == .note {
                let note = NoteDocument(doc)
                try store.updateOrphans(noteId: docId, orphaned: try note.orphanedStrokeIds(), now: now)
                // The purge is a regular outgoing edit; an open document's observer stores and
                // queues it, a temporary one does it otherwise.
                let store = self.store
                let temporary = open[docId] == nil ? doc.observeUpdates { update, origin in
                    if origin.isOutgoing { try? store.appendLocalUpdate(docId: docId, update: update, origin: origin) }
                } : nil
                defer { temporary?.cancel() }
                try note.purgeOrphanedStrokes(orphanedAt: { try? store.orphanedAt(noteId: docId, strokeId: $0) }, now: now)
            }
            _ = try store.enqueueSnapshot(docId: docId, state: try doc.encodeStateAsUpdate(), baseSeq: record.lastSeq, now: now)
            try store.compact(docId: docId, now: now)
            await flush()
        } catch {
            // Try again after the next ack.
        }
    }

    // MARK: SyncClientDelegate

    public func syncClientDidConnect(_ client: SyncClient, userId: String?) async {
        inFlight.removeAll()
        catchingUp.removeAll()
        live.removeAll()
        subscribedAll = false
        if let records = try? store.documents() {
            try? await subscribe(records)
        }
        subscribedAll = true
        await flush()
    }

    public func syncClient(_ client: SyncClient, didChangeState state: SyncConnectionState) async {
        connection = state
        if case .connected = state {} else {
            inFlight.removeAll()
            live.removeAll()
            subscribedAll = false
        }
        publish()
    }

    public func syncClient(_ client: SyncClient, didReceive message: ServerMessage) async {
        switch message {
        case .welcome:
            break
        case .updates(let docId, let snapshot, let items, let upToDate):
            receive(docId: docId, snapshot: snapshot, items: items)
            if upToDate {
                catchingUp.remove(docId)
                live.insert(docId)
                publish()
                await flush()
                await snapshotIfNeeded(docId: docId)
            }
        case .update(let docId, let item):
            receive(docId: docId, snapshot: nil, items: [item])
            await snapshotIfNeeded(docId: docId)
        case .ack(let docId, let clientMsgId, let seq):
            inFlight.remove(clientMsgId)
            try? store.acknowledge(clientMsgId: clientMsgId, seq: seq)
            publish()
            if backlog { await flush() }
            await snapshotIfNeeded(docId: docId)
        case .awareness(let docId, let payload, let deviceId):
            guard open[docId] != nil, let record = try? store.document(docId), let key = try? keyFor(record),
                  let plain = try? DSCrypto.open(payload, key: key, ad: CryptoAD.awareness(docId)) else { return }
            awarenessHandler?(docId, plain, deviceId)
        case .error(let code, _, let ref):
            guard let ref else { return }
            if inFlight.contains(ref) {
                inFlight.remove(ref)
                // Refusals fail at once; doc_not_found (re-registered below) and server
                // trouble are retried up to LocalStore.maxSendAttempts.
                let permanent = [.forbidden, .payloadTooLarge, .badRequest, .protocolMismatch].contains(code)
                if code != .rateLimited { try? store.markFailed(clientMsgId: ref, error: code.rawValue, permanent: permanent) }
                if code == .docNotFound, let item = try? store.pendingOutbox().first(where: { $0.clientMsgId == ref }) {
                    // Registration was lost: register again on the next flush.
                    try? store.setRegistered(item.docId, false)
                }
            } else if code == .forbidden || code == .docNotFound {
                catchingUp.remove(ref)
            }
            publish()
        }
    }

    /// Decrypts, stores and applies remote data. Stops at the first item it cannot decrypt so
    /// that `lastSeq` never skips it.
    private func receive(docId: String, snapshot: (seq: Int64, payload: Data)?, items: [UpdateItem]) {
        guard let record = known[docId] ?? (try? store.document(docId)), let key = try? keyFor(record) else { return }
        let doc = open[docId]?.doc
        let ad = CryptoAD.doc(docId)
        if let snapshot {
            guard let state = try? DSCrypto.open(snapshot.payload, key: key, ad: ad) else { return }
            if (try? store.applyRemoteSnapshot(docId: docId, seq: snapshot.seq, state: state)) == true {
                try? doc?.applyUpdate(state, origin: .remote)
            }
        }
        var decrypted: [(seq: Int64, data: Data)] = []
        for item in items.sorted(by: { $0.seq < $1.seq }) {
            guard let plain = try? DSCrypto.open(item.payload, key: key, ad: ad) else { break }
            decrypted.append((item.seq, plain))
        }
        guard !decrypted.isEmpty, let added = try? store.appendRemoteUpdates(docId: docId, items: decrypted), !added.isEmpty else { return }
        try? doc?.applyUpdates(added.map(\.data), origin: .remote)
    }
}

/// Key lookup over a `KeyRing` (crypto.md §1): master key for the account document, notebook
/// keys for notebook documents, note keys unwrapped from `NoteMeta.wrappedKey`.
public struct KeyRingDocumentKeys: Sendable {
    public let keyRing: KeyRing
    /// `wrappedKey` of a note (from its notebook document).
    public let wrappedNoteKey: @Sendable (_ noteId: String, _ notebookId: String) -> String?

    public init(keyRing: KeyRing, wrappedNoteKey: @escaping @Sendable (_ noteId: String, _ notebookId: String) -> String?) {
        self.keyRing = keyRing
        self.wrappedNoteKey = wrappedNoteKey
    }

    public func key(for record: DocumentRecord) throws -> Data? {
        switch record.kind {
        case .account:
            return try keyRing.masterKey()
        case .notebook:
            return try keyRing.notebookKey(record.notebookId ?? record.docId)
        case .note:
            guard let nb = record.notebookId, let wrapped = wrappedNoteKey(record.docId, nb) else { return nil }
            return try keyRing.noteKey(noteId: record.docId, wrappedKey: wrapped, notebookId: nb)
        }
    }
}
