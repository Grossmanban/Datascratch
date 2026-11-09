import Foundation

/// Overall sync state for the UI.
/// Why a document is not syncing (`SyncStatus.waiting`).
public enum SyncWaitReason: String, Equatable, Sendable {
    /// Its key is not on this device (yet).
    case key
    /// The server does not let this account reach it (yet): `doc_not_found` / `forbidden`.
    case access
}

public struct SyncStatus: Equatable, Sendable {
    public var connection: SyncConnectionState
    /// Outgoing messages the engine can send now and that are not acknowledged yet (failed
    /// ones and ones held for a key not included).
    public var pending: Int
    /// Documents still catching up after (re)connect.
    public var catchingUp: Int
    /// Documents whose messages could not be delivered and are no longer retried on their own
    /// (`retryFailed`, `discardFailed`). Everything else keeps syncing.
    public var failed: [FailedSync] = []
    /// Documents with remote data this device could not read (another key) or apply: set
    /// aside, the rest is synced. A calm per-notebook warning, not part of `summary`;
    /// `SyncEngine.retryUnreadable` after a key repair.
    public var unreadable: [UnreadableSync] = []
    /// Outgoing messages held until their document's key is on this device (a notebook from
    /// another device before `reconcileNotebookKeys`, a note before its `NoteMeta`); sent by
    /// themselves once it is. A calm note, not a spinner: they do not count in `pending`.
    public var held = 0
    /// Documents that are not syncing and why (D-62): no key on this device yet, or the server
    /// says this account cannot reach them (yet) — e.g. a space joined a moment ago. They are
    /// retried by themselves: when a key is learned (`noteKeysLearned`), on `account_changed`
    /// and on reconnect; the app asks for keys when `setKeysMissingHandler` calls it.
    public var waiting: [String: SyncWaitReason] = [:]
    /// Not connected and the quick retries are used up (several attempts failed in a row).
    /// Until then a lost or stuck connection counts as syncing, not offline.
    public var connectionTrouble = false

    public init(connection: SyncConnectionState, pending: Int, catchingUp: Int, failed: [FailedSync] = [], connectionTrouble: Bool = false) {
        self.connection = connection
        self.pending = pending
        self.catchingUp = catchingUp
        self.failed = failed
        self.connectionTrouble = connectionTrouble
    }

    /// Nothing left to send or fetch (failed messages aside).
    public var isIdle: Bool { pending == 0 && catchingUp == 0 }

    /// D-53: the server revoked this device; syncing has stopped for good (the app wipes).
    public var revoked: DeviceRevocationReason? {
        if case .revoked(let reason) = connection { return reason }
        return nil
    }

    /// One state for the sync indicator.
    public enum Summary: Equatable, Sendable {
        /// No connection for a while (`pending` changes wait for it); a single failed or stuck
        /// handshake shows as `.syncing` while it is retried.
        case offline
        case syncing
        case synced
        /// Idle, but messages of `documents` documents could not be delivered.
        case failed(documents: Int, reason: String)
    }

    public var summary: Summary {
        switch connection {
        case .connected: break
        case .connecting, .waiting: return connectionTrouble ? .offline : .syncing
        case .disconnected, .stopped, .revoked: return .offline
        }
        if !isIdle { return .syncing }
        if let first = failed.first { return .failed(documents: failed.count, reason: first.reason) }
        return .synced
    }
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
    private let retiredKeysFor: (@Sendable (DocumentRecord) -> [Data])?
    private let isKeyCanonical: (@Sendable (DocumentRecord) -> Bool)?
    private let register: Registrar?
    /// Time for the snapshot policy (tests move it).
    private let clock: @Sendable () -> Date
    private var awarenessHandler: AwarenessHandler?

    private struct OpenDoc {
        let doc: CRDTDocument
        let subscription: CRDTSubscription
    }

    private var open: [String: OpenDoc] = [:]
    private var inFlight: Set<String> = []
    private var acksSincePublish = 0
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
    private var connectionTrouble = false
    /// `start()` was called and `stop()` was not.
    private var running = false
    /// Every known document was subscribed on the current connection.
    private var subscribedAll = false
    /// Documents whose registration was refused: not tried again until `retryFailed`.
    private var refused: Set<String> = []
    /// Documents without a key yet (a note whose `NoteMeta` has not arrived, a notebook before
    /// its key is fetched): not subscribed — nothing is fetched or skipped — until the key is
    /// there (`resumeDocumentsWaitingForKeys`, also after every notebook index update).
    private var waitingForKey: Set<String> = []
    /// Documents the server refused on subscribe (`doc_not_found` for a document it knew,
    /// `forbidden`): access may come a moment later (a space joined, a key granted), so they are
    /// subscribed again on `account_changed`, `noteKeysLearned` and reconnect, not left behind.
    private var noAccess: Set<String> = []
    private var accountChangedHandler: (@Sendable (Set<AccountChange>) -> Void)?
    private var keysMissingHandler: (@Sendable (Set<String>) -> Void)?
    /// Asks for keys shortly after documents start waiting for one, then a few times more.
    private var keysMissingTask: Task<Void, Never>?
    /// Documents the person is looking at, most recent first: subscribed ahead of the rest.
    private var focused: [String] = []
    /// Registrations in progress after `doc_not_found` (a document made on this device).
    private var registering: Set<String> = []
    private var keyRecheck: Task<Void, Never>?
    private var deviceRevokedHandler: (@Sendable (DeviceRevocationReason) -> Void)?
    private var revocationReported = false
    private var traceHandler: (@Sendable (SyncTraceEvent) -> Void)?
    /// Retry of temporary failures (registration, server errors) with exponential backoff.
    private var retryTask: Task<Void, Never>?
    private var retryDelay: Duration?
    var minRetryDelay: Duration = .seconds(1)
    static let maxRetryDelay: Duration = .seconds(60)
    private var statusContinuations: [UUID: AsyncStream<SyncStatus>.Continuation] = [:]

    /// - Parameters:
    ///   - keyFor: document key (master key for `account`, notebook key for `notebook`, note
    ///     key for `note`); nil while unknown — the document is skipped until it is.
    ///   - register: registers a document on the server (`APIClient.registerDoc`); nil for
    ///     guests (their documents already exist).
    /// - Parameter retiredKeysFor: keys a document had on this device before its canonical one
    ///   (`KeyRing.retiredNotebookKeys`); used only to read what was written with them.
    /// - Parameter isKeyCanonical: the document's key is confirmed by the server
    ///   (`KeyRingDocumentKeys.isCanonical`). Only then does a document with set-aside items get
    ///   a fresh snapshot from this device, which covers the bad items for everyone else; a device
    ///   with a wrong key must never publish one.
    public init(store: LocalStore, client: SyncClient, keyFor: @escaping KeyLookup, register: Registrar?,
                retiredKeysFor: (@Sendable (DocumentRecord) -> [Data])? = nil,
                isKeyCanonical: (@Sendable (DocumentRecord) -> Bool)? = nil,
                clock: @escaping @Sendable () -> Date = { Date() }) {
        self.store = store
        self.clock = clock
        self.client = client
        self.keyFor = keyFor
        self.register = register
        self.retiredKeysFor = retiredKeysFor
        self.isKeyCanonical = isKeyCanonical
    }

    // MARK: Key repair

    static func rekeyFlag(_ docId: String) -> String { "sync.rekey.\(docId)" }

    /// Repairs a document after its key was replaced by the canonical one
    /// (`AccountService.reconcileNotebookKeys`): fetches it again from the start — reading what
    /// was written with the old key through `retiredKeysFor` — and then uploads a snapshot with
    /// the canonical key, so every device can read the whole document again. Survives restarts.
    public func rekey(docId: String) async {
        guard (try? store.document(docId)) != nil else { return }
        try? store.setValue(Data([1]), for: Self.rekeyFlag(docId))
        try? store.resetLastSeq(docId: docId)
        known[docId] = nil
        live.remove(docId)
        catchingUp.remove(docId)
        if await client.isConnected, let record = try? store.document(docId) { try? await subscribe([record]) }
        publish()
    }

    /// Fetches set-aside items again (all documents, or one) — after keys changed, e.g.
    /// `AccountService.reconcileNotebookKeys` filled in or replaced a key.
    public func retryUnreadable(docId: String? = nil) async {
        await resumeDocumentsWaitingForKeys()
        let ids = docId.map { [$0] } ?? Array(Set(((try? store.quarantined()) ?? []).map(\.docId)))
        var records: [DocumentRecord] = []
        for id in ids where (try? store.releaseQuarantine(docId: id)) == true {
            known[id] = nil
            live.remove(id)
            catchingUp.remove(id)
            if let record = try? store.document(id) { records.append(record) }
        }
        if !records.isEmpty, await client.isConnected { try? await subscribe(records) }
        publish()
    }

    /// After the catch-up of a re-keyed document: the canonical snapshot.
    private func finishRekey(docId: String) async {
        guard (try? store.value(Self.rekeyFlag(docId))) != nil else { return }
        try? store.discardQueuedSnapshots(docId: docId)
        await snapshot(docId: docId, now: Date())
        try? store.setValue(nil, for: Self.rekeyFlag(docId))
    }

    /// Connects and starts syncing every document known to the store.
    public func start() async {
        running = true
        await client.setDelegate(self)
        await client.start()
    }

    public func stop() async {
        running = false
        retryTask?.cancel()
        retryTask = nil
        keyRecheck?.cancel()
        keyRecheck = nil
        keysMissingTask?.cancel()
        keysMissingTask = nil
        await client.stop()
    }

    func setMinRetryDelay(_ d: Duration) { minRetryDelay = d }

    /// Schedules one retry pass (registration, subscription, sending) after a temporary
    /// failure; the delay doubles up to a minute and resets once a pass has none.
    /// `atLeast`: the server's `retryAfterMs` for `rate_limited`.
    private func scheduleRetry(atLeast minimum: Duration? = nil) {
        guard retryTask == nil else { return }
        let delay = max(retryDelay.map { min($0 * 2, Self.maxRetryDelay) } ?? minRetryDelay, minimum ?? .zero)
        retryDelay = delay
        retryTask = Task { [weak self] in
            try? await Task.sleep(for: delay)
            guard !Task.isCancelled else { return }
            await self?.retryPass()
        }
    }

    private func retryPass() async {
        retryTask = nil
        guard await client.isConnected else { return }
        var temporary = false
        if let records = try? store.documents() {
            let waiting = records.filter { !live.contains($0.docId) && !catchingUp.contains($0.docId) && !refused.contains($0.docId) }
            temporary = (try? await subscribe(waiting)) == false
        }
        await flush()
        if !temporary, retryTask == nil { retryDelay = nil }
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
            // `registering`: a document made offline is between `doc_not_found` and its new
            // subscription — neither catching up nor live, but not sent yet (CI, 2026-11-09).
            if await client.isConnected, subscribedAll, catchingUp.isEmpty, registering.isEmpty, inFlight.isEmpty,
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
        // Messages of documents without a key cannot be sent: they are held, not pending.
        var pending = 0
        var held = 0
        for (docId, count) in (try? store.pendingOutboxCounts()) ?? [:] {
            let record = known[docId] ?? (try? store.document(docId))
            if waitingForKey.contains(docId) || record.map({ (try? keyFor($0)) == nil }) ?? true {
                held += count
            } else {
                pending += count
            }
        }
        var s = SyncStatus(connection: connection, pending: pending, catchingUp: catchingUp.count,
                           failed: (try? store.failedOutbox()) ?? [], connectionTrouble: connectionTrouble)
        s.held = held
        s.unreadable = (try? store.unreadable()) ?? []
        for docId in waitingForKey { s.waiting[docId] = .key }
        for docId in noAccess { s.waiting[docId] = .access }
        return s
    }

    private func publish() {
        // Three queries per call: skipped when nobody listens (`status()` computes it anyway).
        guard !statusContinuations.isEmpty else { return }
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
        let clock = self.clock
        let sub = doc.observeUpdates { [weak self] update, origin in
            guard origin.isOutgoing else { return }
            // Synchronous: the update is durable before the transaction returns.
            try? store.appendLocalUpdate(docId: docId, update: update, origin: origin, now: clock())
            Task { await self?.afterLocalEdit(docId) }
        }
        open[doc.docId] = OpenDoc(doc: doc, subscription: sub)
        if await client.isConnected { try? await subscribe([record]) }
        await flush()
    }

    /// **A real close**: stops applying remote updates to `docId` in memory and drops it from
    /// the open documents (it stays tracked in the store and synced there). For a note the user
    /// merely leaves while it stays open in the app, call `snapshotOnLeave(docId:)` instead.
    /// Closing snapshots it first when the policy says so (at least one local
    /// edit, the last snapshot ≥ 2 min old): snapshots are the versions of the history
    /// (`SnapshotPolicy`, spec/06).
    ///
    /// The document is detached before anything is awaited, so an `open` of the same document
    /// that runs meanwhile gets a fresh instance from the store, which already holds every edit
    /// of the closed one (the observer stores them synchronously).
    public func close(docId: String, now: Date? = nil) async {
        guard let closing = open.removeValue(forKey: docId) else { return }
        closing.subscription.cancel()
        let now = now ?? clock()
        if let record = try? store.document(docId), SnapshotPolicy.onLeave(record, now: now) {
            await snapshot(docId: docId, now: now, detached: closing.doc)
        }
    }

    /// **Leaving a note on screen — use this, not `close`.** The app keeps every note document
    /// open in the engine (the library opens them all), so leaving one must not stop its sync:
    /// this only makes the snapshot that leaving calls for (`SnapshotPolicy.onLeave`: at least
    /// one local edit, this device's last snapshot ≥ 2 min old). The document stays open,
    /// subscribed and live. With `docId` nil — the app goes to the background — every open
    /// document with local edits since its last snapshot is checked (one query, not one read
    /// per document).
    public func snapshotOnLeave(docId: String? = nil, now: Date? = nil) async {
        let now = now ?? clock()
        let records: [DocumentRecord]
        if let docId {
            records = (try? store.document(docId)).flatMap { $0 }.map { [$0] } ?? []
        } else {
            records = ((try? store.documentsWithLocalEdits()) ?? []).filter { open[$0.docId] != nil }
        }
        for record in records where SnapshotPolicy.onLeave(record, now: now) {
            await snapshot(docId: record.docId, now: now)
        }
    }

    /// A version to roll back to, made now: call **before** applying a suggestion (voice
    /// «Оформить», `agentEdit` replaceWithSuggestion) or a voice insert, so the snapshot holds
    /// the state before it. Skipped only when this device's last snapshot already holds the
    /// current state. Returns whether a snapshot was queued.
    @discardableResult
    public func snapshotNow(docId: String, reason: SnapshotReason, now: Date? = nil) async -> Bool {
        guard let record = try? store.document(docId), SnapshotPolicy.beforeChange(record) else { return false }
        return await snapshot(docId: docId, now: now ?? clock(), force: true)
    }

    /// After a local edit: send it, and snapshot after 10 minutes of editing.
    private func afterLocalEdit(_ docId: String) async {
        await flush()
        let now = clock()
        if let record = try? store.document(docId), SnapshotPolicy.whileEditing(record, now: now) {
            await snapshot(docId: docId, now: now)
        }
    }

    public func isOpen(_ docId: String) -> Bool { open[docId] != nil }

    /// Deletes a document locally: stops syncing it and removes it, its queue and its index
    /// entries from the store (e.g. a local document replaced at sign-in).
    public func deleteDocument(_ docId: String) throws {
        refused.remove(docId)
        open.removeValue(forKey: docId)?.subscription.cancel()
        known[docId] = nil
        live.remove(docId)
        catchingUp.remove(docId)
        try store.deleteDocument(docId)
        publish()
    }

    // MARK: Priority and tracing

    /// The person opened `docId` (a note in the editor): it is caught up before the other
    /// documents — subscribed at once in its own frame, and first after every reconnect.
    public func focus(_ docId: String) async {
        focused.removeAll { $0 == docId }
        focused.insert(docId, at: 0)
        if focused.count > 8 { focused.removeLast() }
        guard !live.contains(docId), !catchingUp.contains(docId), await client.isConnected,
              let record = try? store.document(docId) else { return }
        try? await subscribe([record])
    }

    /// Timing events of the sync (for `os_signpost` / a debug log in the app).
    /// Called once when the server revokes this device (D-53: `device_revoked` frame or close
    /// 4410). Never for an expired token or a network failure. The app wipes local data.
    public func setDeviceRevokedHandler(_ handler: (@Sendable (DeviceRevocationReason) -> Void)?) {
        deviceRevokedHandler = handler
    }

    /// Called on `account_changed` from the server (D-62), with what changed (never empty: a
    /// message naming only things this client does not know is dropped).
    /// The app refreshes invitations, spaces and keys, then calls `noteKeysLearned`. Documents
    /// refused before are subscribed again by the engine itself.
    public func setAccountChangedHandler(_ handler: (@Sendable (Set<AccountChange>) -> Void)?) {
        accountChangedHandler = handler
    }

    /// Called ~0.2 s after documents start waiting for their key (and again after 2, 10 and
    /// 30 s while some still wait), with the documents waiting: the app fetches keys right away
    /// instead of on its next refresh, then calls `noteKeysLearned`.
    public func setKeysMissingHandler(_ handler: (@Sendable (Set<String>) -> Void)?) {
        keysMissingHandler = handler
        if handler != nil, !waitingForKey.isEmpty { scheduleKeysMissing() }
    }

    /// Keys (or access) were learned: documents that waited for a key and documents the server
    /// refused are subscribed again, and what was held is sent once they are caught up.
    public func noteKeysLearned() async {
        await resumeDocumentsWaitingForKeys()
        await retryRefusedAccess()
        await flush()
    }

    private func retryRefusedAccess() async {
        guard !noAccess.isEmpty, await client.isConnected else { return }
        let records = noAccess.compactMap { try? store.document($0) }
        noAccess.removeAll()
        publish()
        try? await subscribe(records)
    }

    private func scheduleKeysMissing() {
        guard keysMissingHandler != nil, keysMissingTask == nil else { return }
        keysMissingTask = Task { [weak self] in
            for delay in [Duration.milliseconds(200), .seconds(2), .seconds(10), .seconds(30)] {
                try? await Task.sleep(for: delay)
                guard !Task.isCancelled, let self, await self.askForMissingKeys() else { break }
            }
            await self?.clearKeysMissingTask()
        }
    }

    /// Calls the handler with the documents still waiting; false when none wait.
    private func askForMissingKeys() -> Bool {
        guard !waitingForKey.isEmpty, let handler = keysMissingHandler else { return false }
        handler(waitingForKey)
        return true
    }

    private func clearKeysMissingTask() { keysMissingTask = nil }

    public func setTraceHandler(_ handler: (@Sendable (SyncTraceEvent) -> Void)?) {
        traceHandler = handler
    }

    private func trace(_ event: SyncTraceEvent) { traceHandler?(event) }

    /// Account, notebook indexes and focused documents first (the list and the open note),
    /// then the rest.
    private func priority(_ record: DocumentRecord) -> Int {
        if let i = focused.firstIndex(of: record.docId) { return 2 + i }
        switch record.kind {
        case .account: return 0
        case .notebook, .space: return 1
        case .note: return 100
        }
    }

    // MARK: Failed messages

    /// Puts failed messages (of one document or all) back into the queue and tries again:
    /// registration, subscription, sending.
    public func retryFailed(docId: String? = nil) async {
        try? store.retryFailed(docId: docId)
        if let docId { refused.remove(docId) } else { refused.removeAll() }
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
        guard let queued = try? store.pendingOutbox(limit: Self.maxInFlight * 2) else { return }
        backlog = queued.count == Self.maxInFlight * 2
        // Indexes before notes, each document's messages in order: a note's key travels in its
        // notebook's index (`NoteMeta`), so a note made with its index entry must not reach the
        // server — and other devices — ahead of that entry (they would wait for its key).
        let isNote = Dictionary(Set(queued.map(\.docId)).map { id in (id, (known[id] ?? (try? store.document(id)))?.kind == .note) },
                                uniquingKeysWith: { a, _ in a })
        let items = queued.enumerated().sorted {
            let a = isNote[$0.element.docId] == true ? 1 : 0, b = isNote[$1.element.docId] == true ? 1 : 0
            return (a, $0.offset) < (b, $1.offset)
        }.map(\.element)
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
                        if Self.isPermanent(error) {
                            refused.insert(item.docId)
                            try? store.failOutbox(docId: item.docId, reason: "register: \(Self.describe(error))")
                        } else {
                            scheduleRetry()
                        }
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

    /// Subscribes documents whose key is known, all at once and without registering them first:
    /// most were made on other devices and exist on the server, and a `POST /docs` per document
    /// before subscribing cost a REST round trip each (seconds for a library, far more on a
    /// flaky network). A document the server does not know answers `doc_not_found` and is
    /// registered then (`registerMissing`); a document whose catch-up finishes is marked
    /// registered. A document must be caught up before its first push (sync-protocol.md §4).
    /// Order: account and notebook indexes, focused documents, then notes — the first frame
    /// holds what the list and the open note need. Returns false when a registration failed
    /// temporarily (a retry is scheduled).
    @discardableResult
    private func subscribe(_ records: [DocumentRecord]) async throws -> Bool {
        var ready: [DocumentRecord] = []
        var seen: Set<String> = []
        // No docId twice in a frame (sync-protocol §2: the server refuses the whole message).
        for record in records where !refused.contains(record.docId) && seen.insert(record.docId).inserted {
            guard (try? keyFor(record)) != nil else {
                waitingForKey.insert(record.docId)
                trace(.keyMissing(docId: record.docId))
                scheduleKeysMissing()
                continue
            }
            waitingForKey.remove(record.docId)
            noAccess.remove(record.docId)
            ready.append(record)
        }
        for r in ready { known[r.docId] = r }
        ready.sort { (priority($0), $0.docId) < (priority($1), $1.docId) }
        guard !ready.isEmpty else { return true }
        for r in ready { catchingUp.insert(r.docId) }
        // What the list and the open note need goes in a frame of its own, ahead of the notes.
        let urgentCount = ready.prefix { priority($0) < 100 }.count
        var frames: [[DocumentRecord]] = urgentCount > 0 && urgentCount < ready.count ? [Array(ready[..<urgentCount])] : []
        let rest = urgentCount > 0 && urgentCount < ready.count ? Array(ready[urgentCount...]) : ready
        frames += stride(from: 0, to: rest.count, by: min(100, SyncProtocol.maxSubscribeDocs)).map { Array(rest[$0..<min($0 + 100, rest.count)]) }
        for frame in frames {
            try await client.send(.subscribe(docs: frame.map { SubscribeEntry(docId: $0.docId, since: $0.lastSeq) }))
            trace(.subscribed(docIds: frame.map(\.docId)))
        }
        publish()
        return true
    }

    /// `doc_not_found` for the subscription of a document never registered from here: the
    /// server does not have it (made on this device). Registers it, then subscribes again. A
    /// document the server knew (registered) and now does not was deleted: it is not brought
    /// back.
    private func registerMissing(_ docId: String) async {
        guard !registering.contains(docId), let record = try? store.document(docId), !record.registered else { return }
        registering.insert(docId)
        defer { registering.remove(docId) }
        do {
            if let register { try await register(record) }
            try store.setRegistered(docId)
            trace(.registered(docId: docId))
        } catch {
            // Refused: its messages show up as failed (retryFailed tries again). Anything else
            // is retried with backoff.
            if Self.isPermanent(error) {
                refused.insert(docId)
                try? store.failOutbox(docId: docId, reason: "register: \(Self.describe(error))")
            } else {
                scheduleRetry()
            }
            publish()
            return
        }
        if await client.isConnected, let fresh = try? store.document(docId) { try? await subscribe([fresh]) }
    }

    // MARK: Snapshots

    /// Uploads a snapshot when the thresholds are exceeded (sync-protocol.md §5).
    public func snapshotIfNeeded(docId: String, now: Date = Date()) async {
        guard (try? store.needsSnapshot(docId: docId)) == true else { return }
        await snapshot(docId: docId, now: now)
    }

    /// Builds, stores and sends a snapshot of `docId` (unless one is already queued; `force`
    /// adds one anyway — a version of this very state is wanted).
    ///
    /// An open document (or one being closed, `detached`) is snapshotted from memory after the
    /// orphaned-stroke pass. Any other document is never loaded: its stored updates are merged
    /// as they are. Orphans only appear through edits, and the next open-and-close of the note
    /// runs the pass (strokes.md §4.2 sets no deadline tighter than that).
    @discardableResult
    private func snapshot(docId: String, now: Date, detached: CRDTDocument? = nil, force: Bool = false) async -> Bool {
        guard let record = try? store.document(docId),
              force || (try? store.pendingOutbox(docId: docId))?.contains(where: { $0.kind == .snapshot }) != true else { return false }
        do {
            guard let doc = open[docId]?.doc ?? detached else {
                let state = try CRDTUpdates.merge(try store.updates(docId: docId))
                _ = try store.enqueueSnapshot(docId: docId, state: state, baseSeq: record.lastSeq, now: now)
                try store.compact(docId: docId, now: now)
                await flush()
                return true
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
            return true
        } catch {
            // Try again after the next ack.
            return false
        }
    }

    // MARK: SyncClientDelegate

    public func syncClientDidConnect(_ client: SyncClient, userId: String?) async {
        inFlight.removeAll()
        catchingUp.removeAll()
        live.removeAll()
        subscribedAll = false
        trace(.connected)
        if let records = try? store.documents() {
            try? await subscribe(records)
        }
        subscribedAll = true
        await flush()
    }

    public func syncClient(_ client: SyncClient, didChangeState state: SyncConnectionState) async {
        connection = state
        if case .revoked(let reason) = state, !revocationReported {
            // Nothing more is sent: the client never reconnects; retries stop here.
            revocationReported = true
            retryTask?.cancel()
            retryTask = nil
            keyRecheck?.cancel()
            keyRecheck = nil
            deviceRevokedHandler?(reason)
        }
        connectionTrouble = await client.consecutiveFailures > client.configuration.quickRetries
        if case .connected = state {} else {
            inFlight.removeAll()
            live.removeAll()
            subscribedAll = false
            // The next connection subscribes everything again, refused documents included.
            noAccess.removeAll()
        }
        publish()
    }

    public func syncClient(_ client: SyncClient, didReceive message: ServerMessage) async {
        switch message {
        case .welcome:
            break
        case .accountChanged(let what):
            // Only names this client knows count; none left: nothing to do (as the TS client).
            guard !what.isEmpty else { return }
            accountChangedHandler?(what)
            // Access may have come (a space joined, a notebook shared or moved into a space).
            if !what.isDisjoint(with: [.spaces, .members, .notebooks, .keys]) {
                await retryRefusedAccess()
                await resumeDocumentsWaitingForKeys()
            }
        case .updates(let docId, let snapshot, let items, let upToDate):
            guard receive(docId: docId, snapshot: snapshot, items: items) else { return }
            await resumeAfterIndexUpdate(docId)
            if upToDate {
                catchingUp.remove(docId)
                live.insert(docId)
                // The server has it: no `POST /docs` needed before pushing.
                if known[docId]?.registered == false || (try? store.document(docId))?.registered == false {
                    try? store.setRegistered(docId)
                    known[docId]?.registered = true
                }
                trace(.caughtUp(docId: docId))
                publish()
                await flush()
                await finishRekey(docId: docId)
                await snapshotIfNeeded(docId: docId)
            }
        case .update(let docId, let item):
            guard receive(docId: docId, snapshot: nil, items: [item]) else { return }
            await resumeAfterIndexUpdate(docId)
            if live.contains(docId) { await finishRekey(docId: docId) }
            await snapshotIfNeeded(docId: docId)
        case .ack(let docId, let clientMsgId, let seq):
            inFlight.remove(clientMsgId)
            try? store.acknowledge(clientMsgId: clientMsgId, seq: seq)
            // A burst of acks updates the status every few acks and when the window empties,
            // not after each one (the count of what is left changes with every ack).
            acksSincePublish += 1
            if inFlight.isEmpty || acksSincePublish >= Self.maxInFlight / 4 {
                acksSincePublish = 0
                publish()
            }
            // The window is refilled in batches, not by a pass (re-reading the next 200 queued
            // messages) after every ack.
            if backlog, inFlight.count <= Self.maxInFlight / 2 { await flush() }
            await snapshotIfNeeded(docId: docId)
        case .awareness(let docId, let payload, let deviceId):
            guard open[docId] != nil, let record = try? store.document(docId), let key = try? keyFor(record),
                  let plain = try? DSCrypto.open(payload, key: key, ad: CryptoAD.awareness(docId)) else { return }
            awarenessHandler?(docId, plain, deviceId)
        case .error(let code, _, let ref, let retryAfterMs, _):
            guard let ref else { return }
            if inFlight.contains(ref) {
                inFlight.remove(ref)
                // Refusals fail at once; doc_not_found (re-registered below) and server
                // trouble are retried up to LocalStore.maxSendAttempts.
                let permanent = [.forbidden, .payloadTooLarge, .badRequest, .protocolMismatch].contains(code)
                if code != .rateLimited { try? store.markFailed(clientMsgId: ref, error: code.rawValue, permanent: permanent) }
                if !permanent { scheduleRetry(atLeast: retryAfterMs.map { .milliseconds($0) }) }
                if code == .docNotFound, let item = try? store.pendingOutbox().first(where: { $0.clientMsgId == ref }) {
                    // Registration was lost: register again on the next flush.
                    try? store.setRegistered(item.docId, false)
                }
            } else if code == .docNotFound, catchingUp.contains(ref), (try? store.document(ref))?.registered == false {
                catchingUp.remove(ref)
                await registerMissing(ref)
            } else if code == .forbidden || code == .docNotFound {
                if catchingUp.remove(ref) != nil || live.remove(ref) != nil { noAccess.insert(ref) }
            }
            publish()
        }
    }

    /// Decrypts, stores and applies remote data. Items that cannot be read (another key) or are
    /// not valid updates are set aside (`LocalStore.quarantined`, `SyncStatus.unreadable`) and
    /// skipped: one bad item must not stop a document for good.
    ///
    /// No key (yet) is not «unreadable»: nothing is stored or skipped, `lastSeq` stays, and the
    /// document waits for its key; returns false then.
    @discardableResult
    private func receive(docId: String, snapshot: (seq: Int64, payload: Data)?, items: [UpdateItem]) -> Bool {
        guard var record = known[docId] ?? (try? store.document(docId)) else { return false }
        var found = try? keyFor(record)
        if found == nil, let fresh = try? store.document(docId) {
            // The cached record may be stale (a note moved to another notebook).
            record = fresh
            known[docId] = fresh
            found = try? keyFor(fresh)
        }
        guard let key = found else {
            pauseForKey(docId)
            return false
        }
        let doc = open[docId]?.doc
        let ad = CryptoAD.doc(docId)
        let retired = retiredKeysFor?(record) ?? []
        func decrypt(_ payload: Data) -> Data? {
            if let plain = try? DSCrypto.open(payload, key: key, ad: ad) { return plain }
            return retired.lazy.compactMap { try? DSCrypto.open(payload, key: $0, ad: ad) }.first
        }
        /// Readable and a valid update.
        func check(_ payload: Data) -> (data: Data?, reason: String) {
            guard let plain = decrypt(payload) else { return (nil, "cannot decrypt") }
            guard (try? CRDTUpdates.stateVector(of: plain)) != nil else { return (nil, "not a valid update") }
            return (plain, "")
        }
        var quarantine: [QuarantinedItem] = []
        if let snapshot {
            let (state, reason) = check(snapshot.payload)
            if let state {
                if (try? store.applyRemoteSnapshot(docId: docId, seq: snapshot.seq, state: state)) == true {
                    try? doc?.applyUpdate(state, origin: .remote)
                }
            } else {
                quarantine.append(QuarantinedItem(docId: docId, seq: snapshot.seq, deviceId: "snapshot", payload: snapshot.payload, reason: "snapshot: \(reason)"))
            }
        }
        var readable: [(seq: Int64, data: Data)] = []
        for item in items.sorted(by: { $0.seq < $1.seq }) {
            let (plain, reason) = check(item.payload)
            if let plain {
                readable.append((item.seq, plain))
            } else {
                quarantine.append(QuarantinedItem(docId: docId, seq: item.seq, deviceId: item.deviceId, payload: item.payload, reason: reason))
            }
        }
        guard !readable.isEmpty || !quarantine.isEmpty,
              let added = try? store.appendRemoteUpdates(docId: docId, items: readable, quarantine: quarantine) else { return true }
        if let doc, !added.isEmpty, (try? doc.applyUpdates(added.map(\.data), origin: .remote)) == nil {
            // One by one, so that a single update the document rejects does not hold back the rest.
            for update in added { try? doc.applyUpdate(update.data, origin: .remote) }
        }
        if !quarantine.isEmpty {
            // Our readable state, re-uploaded as a snapshot, covers the bad items for other
            // devices (they catch up from it) — only with a key the server confirmed.
            if isKeyCanonical?(record) == true { try? store.setValue(Data([1]), for: Self.rekeyFlag(docId)) }
            publish()
        }
        return true
    }

    /// Stops following a document whose key went missing (e.g. a moved note before the target
    /// notebook's index lists it): what the server sends meanwhile is not stored, so `lastSeq`
    /// stays and the resubscription fetches it again.
    private func pauseForKey(_ docId: String) {
        waitingForKey.insert(docId)
        scheduleKeysMissing()
        live.remove(docId)
        catchingUp.remove(docId)
        publish()
    }

    /// Subscribes documents that were waiting for their key and have it now. Called after every
    /// notebook index update (a `NoteMeta` with the note's key may have arrived); call it also
    /// after `AccountService.reconcileNotebookKeys`.
    public func resumeDocumentsWaitingForKeys() async {
        guard !waitingForKey.isEmpty, await client.isConnected else { return }
        let ready = waitingForKey.compactMap { try? store.document($0) }.filter { (try? keyFor($0)) != nil }
        guard !ready.isEmpty else { return }
        for r in ready { known[r.docId] = r }
        try? await subscribe(ready)
    }

    private func resumeAfterIndexUpdate(_ docId: String) async {
        guard !waitingForKey.isEmpty, (known[docId] ?? (try? store.document(docId)))?.kind == .notebook else { return }
        await resumeDocumentsWaitingForKeys()
        // The key lookup may learn the note keys from this index a moment later (the app reads
        // them when it reloads after remote changes): check again shortly, or the documents
        // would wait until the next index update or restart.
        guard !waitingForKey.isEmpty, keyRecheck == nil else { return }
        keyRecheck = Task { [weak self] in
            for delay in [Duration.milliseconds(500), .seconds(2), .seconds(10)] {
                try? await Task.sleep(for: delay)
                guard !Task.isCancelled, let self, await self.recheckWaitingForKeys() else { break }
            }
            await self?.clearKeyRecheck()
        }
    }

    /// Whether documents still wait for their key.
    private func recheckWaitingForKeys() async -> Bool {
        await resumeDocumentsWaitingForKeys()
        return !waitingForKey.isEmpty
    }

    private func clearKeyRecheck() { keyRecheck = nil }
}

/// Key lookup over a `KeyRing` (crypto.md §1): master key for the account document, notebook
/// keys for notebook documents, note keys unwrapped from `NoteMeta.wrappedKey`.
public struct KeyRingDocumentKeys: Sendable {
    public let keyRing: KeyRing
    /// `NoteMeta` of a note (from its notebook document): wrapped key, key version and chain.
    public let noteMeta: @Sendable (_ noteId: String, _ notebookId: String) -> NoteMeta?

    public init(keyRing: KeyRing, noteMeta: @escaping @Sendable (_ noteId: String, _ notebookId: String) -> NoteMeta?) {
        self.keyRing = keyRing
        self.noteMeta = noteMeta
    }

    /// Only the `wrappedKey` (note keys of version 1, before D-54).
    public init(keyRing: KeyRing, wrappedNoteKey: @escaping @Sendable (_ noteId: String, _ notebookId: String) -> String?) {
        self.init(keyRing: keyRing) { noteId, notebookId in
            wrappedNoteKey(noteId, notebookId).map { NoteMeta(id: noteId, wrappedKey: $0) }
        }
    }

    public func key(for record: DocumentRecord) throws -> Data? {
        switch record.kind {
        case .account:
            return try keyRing.masterKey()
        case .notebook:
            return try keyRing.notebookKey(record.notebookId ?? record.docId)
        case .note:
            // A note shared with this account on its own: its key came from the owner.
            if let shared = try keyRing.sharedNoteKey(record.docId) { return shared }
            guard let nb = record.notebookId, let meta = noteMeta(record.docId, nb) else { return nil }
            return try keyRing.noteKey(meta, notebookId: nb)
        case .space:
            // The space document: the space key (crypto.md §11.1); docId = spaceId.
            return try keyRing.spaceKey(record.docId)
        }
    }

    /// The document's key is the server's (`SyncEngine(isKeyCanonical:)`): the master key for the
    /// account document; a notebook key confirmed in this session (`reconcileNotebookKeys`,
    /// `createNotebook`) for a notebook and its notes.
    public func isCanonical(_ record: DocumentRecord) -> Bool {
        switch record.kind {
        case .account: true
        case .notebook, .note: record.notebookId.map(keyRing.isNotebookKeyVerified) ?? keyRing.isNotebookKeyVerified(record.docId)
        // Only ever from the server (the owner's master-key wrap or the owner's member wrap).
        case .space: (try? keyRing.spaceKey(record.docId)) != nil
        }
    }

    /// Keys a document had before its current one (`SyncEngine(retiredKeysFor:)`): a notebook's
    /// retired and earlier-version keys; a note's earlier versions (its chain, crypto.md §10.3).
    public func retiredKeys(for record: DocumentRecord) -> [Data] {
        switch record.kind {
        case .account: return []
        case .notebook: return keyRing.retiredNotebookKeys(record.notebookId ?? record.docId)
        case .note:
            if (try? keyRing.sharedNoteKey(record.docId)) != nil { return keyRing.retiredSharedNoteKeys(record.docId) }
            guard let nb = record.notebookId, let meta = noteMeta(record.docId, nb) else { return [] }
            return keyRing.earlierNoteKeys(meta, notebookId: nb)
        case .space: return keyRing.retiredSpaceKeys(record.docId)
        }
    }
}
