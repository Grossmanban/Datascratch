import Foundation
import Network
import Observation

/// Sync state shown in the sidebar footer and settings (spec/10).
/// DSCore's sync client will drive `phase`; until then only connectivity is real.
@Observable
final class SyncCenter {
    enum Phase: Equatable {
        /// No server configured: everything stays on this device.
        case localOnly
        case offline(pending: Int)
        case syncing
        case upToDate(Date)
        case failed(String)
        /// Idle, but changes of `documents` documents could not be delivered.
        case notSent(documents: Int, reason: String)
        /// The server ended this device's session (from another device or the web).
        case sessionEnded
    }

    private(set) var isOnline = true
    private(set) var phase: Phase
    private(set) var pendingChanges = 0
    /// Notebooks with changes from other devices this device could not read (another key):
    /// set aside, everything else syncs. A calm note on the notebook, not a global state.
    var unreadableNotebookIds: Set<String> = [] {
        didSet {
            if !unreadableNotebookIds.isSubset(of: oldValue) {
                record("keys.unreadable", documentId: unreadableNotebookIds.subtracting(oldValue).sorted().first)
            }
        }
    }
    /// Per notebook, what is set aside right now (item count and newest seq): the banner's
    /// dismissal is keyed by it, so only new unreadable items bring it back.
    var unreadableSignatures: [String: String] = [:]
    /// What is not syncing yet and goes by itself once it can (D-62): changes held for a key,
    /// documents whose key is not here yet, documents the server does not open to this account
    /// yet (a space joined a moment ago). Not a spinner. Since when, for a calm hint if it lasts.
    struct Awaited: Equatable {
        /// Outgoing changes held for a key.
        var changes = 0
        /// Documents waiting for their key on this device.
        var keyDocuments = 0
        /// Documents the server does not let this account reach yet.
        var accessDocuments = 0

        var isEmpty: Bool { changes == 0 && keyDocuments == 0 && accessDocuments == 0 }
        /// Something waits for a key (not only for access).
        var needsKey: Bool { changes > 0 || keyDocuments > 0 }
    }

    private(set) var awaited = Awaited()
    private(set) var awaitedSince: Date?

    func setAwaited(_ value: Awaited, now: Date = Date()) {
        guard value != awaited else { return }
        if value.needsKey, !awaited.needsKey { record("keys.waiting", at: now) }
        awaited = value
        awaitedSince = value.isEmpty ? nil : (awaitedSince ?? now)
    }

    /// Only changes held for a key (the engine's `held`), documents unchanged.
    func setHeld(_ count: Int, now: Date = Date()) {
        var value = awaited
        value.changes = count
        setAwaited(value, now: now)
    }

    /// What waiting for a key or for access means right now (owner, 2026-11-08: a bare
    /// «Изменений ждут ключ: N» hung there with nothing to do about it).
    enum KeyWait: Equatable {
        case none
        /// Just now: on its way (a member's key comes from the owner's device; access to a joined
        /// space follows in a moment).
        case waiting(Awaited)
        /// Longer than `keyPatience`: the device that gives the key is not online, or the server
        /// still does not open the documents.
        case stuck(Awaited)

        var isStuck: Bool {
            if case .stuck = self { true } else { false }
        }
    }

    /// How long a key may take before the status says why it does not come.
    nonisolated static let keyPatience: TimeInterval = 30

    /// A key that comes at once (the usual case) is not worth a line at all.
    nonisolated static let keyGrace: TimeInterval = 3

    func keyWait(now: Date = Date()) -> KeyWait {
        guard !awaited.isEmpty, let since = awaitedSince else { return .none }
        let waited = now.timeIntervalSince(since)
        if waited > Self.keyPatience { return .stuck(awaited) }
        return waited > Self.keyGrace ? .waiting(awaited) : .none
    }
    private(set) var serverURL: URL?

    // MARK: Diagnostics (spec/10)

    /// Recent sync problems and state changes, newest first (codes and ids only).
    private(set) var recentEvents: [DiagnosticEvent] = []
    static let maxEvents = 50
    /// Documents whose changes could not be delivered (ids, from the sync engine).
    var failedDocumentIds: [String] = []

    func record(_ code: String, documentId: String? = nil, at date: Date = Date()) {
        // The same problem reported again and again (each status update) is one entry.
        if let last = recentEvents.first, last.code == code, last.documentId == documentId,
           date.timeIntervalSince(last.date) < 60 { return }
        recentEvents.insert(DiagnosticEvent(date: date, code: code, documentId: documentId), at: 0)
        if recentEvents.count > Self.maxEvents { recentEvents.removeLast(recentEvents.count - Self.maxEvents) }
    }

    /// The connection as a code for the report.
    var phaseCode: String {
        switch phase {
        case .localOnly: "local_only"
        case .offline: "offline"
        case .syncing: "syncing"
        case .upToDate: "up_to_date"
        case .failed: "failed"
        case .notSent: "not_sent"
        case .sessionEnded: "session_ended"
        }
    }

    /// Photos and files on their way, counted per batch (DSCore: a batch is what goes together,
    /// e.g. photos pasted at once; zero again when nothing moves).
    struct Transfers: Equatable {
        var sent = 0, toSend = 0, received = 0, toReceive = 0
    }
    var transfers = Transfers()

    /// «Uploading photos: 3 of 8» instead of a bare «Syncing…» while photos move (owner,
    /// build 36); uploads first, they are this person's own.
    var transferLine: (icon: String, text: String)? {
        if transfers.sent < transfers.toSend {
            return ("arrow.up.circle", String(localized: "Uploading photos: \(transfers.sent) of \(transfers.toSend)"))
        }
        if transfers.received < transfers.toReceive {
            return ("arrow.down.circle", String(localized: "Downloading photos: \(transfers.received) of \(transfers.toReceive)"))
        }
        return nil
    }

    @ObservationIgnored private var monitor: NWPathMonitor?

    /// D-49: signing in on another server (only while signed out).
    func useServer(_ url: URL) {
        serverURL = url
        if case .localOnly = phase { phase = .offline(pending: 0) }
    }

    init(serverURL: URL?, monitorNetwork: Bool = true) {
        self.serverURL = serverURL
        self.phase = serverURL == nil ? .localOnly : .offline(pending: 0)
        if monitorNetwork { startMonitoring() }
    }

    var isLocalOnly: Bool { serverURL == nil }

    func noteLocalChange() {
        guard !isLocalOnly else { return }
        pendingChanges += 1
        refreshPhase()
    }

    /// Called by the sync engine when the queue drained.
    func markSynced(at date: Date = Date()) {
        pendingChanges = 0
        phase = .upToDate(date)
    }

    /// State reported by the sync engine.
    func apply(connected: Bool, pending: Int, catchingUp: Int) {
        pendingChanges = pending
        if !connected {
            phase = .offline(pending: pending)
        } else if pending > 0 || catchingUp > 0 {
            phase = .syncing
        } else {
            phase = .upToDate(Date())
        }
    }

    /// The server ended this device's session (revoked from another device or the web): sync
    /// stops until the person signs in again. Nothing on the device is removed.
    private(set) var isSessionEnded = false
    /// The «signed out on this device» sheet is up (closed with «Later», reopened from the badge).
    var showsSessionEnded = false

    func markSessionEnded() {
        record("session.ended")
        isSessionEnded = true
        showsSessionEnded = true
        phase = .sessionEnded
    }

    func markSessionRestored() {
        isSessionEnded = false
        showsSessionEnded = false
        phase = .syncing
    }

    /// Summary reported by the sync engine (`SyncStatus.summary`).
    func apply(summary: Summary, pending: Int) {
        guard !isSessionEnded else { return }
        pendingChanges = pending
        switch summary {
        case .offline: phase = .offline(pending: pending)
        case .syncing: phase = .syncing
        case .synced:
            if case .upToDate = phase { break }
            phase = .upToDate(Date())
        case .failed(let documents, let reason):
            if phase != .notSent(documents: documents, reason: reason) {
                record("sync.not_sent." + DiagnosticCode.from(reason: reason), documentId: failedDocumentIds.first)
            }
            phase = .notSent(documents: documents, reason: reason)
        }
    }

    /// Mirror of DSCore's `SyncStatus.Summary`, so the UI does not depend on DSCore.
    enum Summary: Equatable {
        case offline, syncing, synced
        case failed(documents: Int, reason: String)
    }

    /// Sends the undelivered changes again (`SyncEngine.retryFailed`).
    @ObservationIgnored var onRetry: (() -> Void)?
    /// Changes wait for a key: fetch the keys from the server again and send what they open.
    @ObservationIgnored var onCheckKeys: (() -> Void)?

    func checkKeys() { onCheckKeys?() }

    func retryFailed() {
        guard case .notSent = phase else { return }
        phase = .syncing
        onRetry?()
    }

    /// Called when connectivity returns (the sync engine reconnects at once).
    @ObservationIgnored var onBackOnline: (() -> Void)?
    /// D-65: the dictation inbox's retries (kept apart from the connection's own hook).
    @ObservationIgnored var onBackOnlineForVoice: (() -> Void)?

    func markFailed(_ message: String) {
        // The message is an error description (free text): only the fact is recorded.
        record("sync.start_failed")
        phase = .failed(message)
    }

    func setOnline(_ online: Bool) {
        let cameBack = online && !isOnline
        if !online, isOnline, !isLocalOnly { record("network.offline") }
        isOnline = online
        if cameBack {
            onBackOnline?()
            onBackOnlineForVoice?()
        }
        refreshPhase()
    }

    private func refreshPhase() {
        guard !isSessionEnded else { return }
        guard !isLocalOnly else {
            phase = .localOnly
            return
        }
        if !isOnline {
            phase = .offline(pending: pendingChanges)
        } else if pendingChanges > 0 {
            phase = .syncing
        } else if case .upToDate = phase {
            // keep the timestamp
        } else if case .notSent = phase {
            // only the engine clears it
        } else {
            phase = .upToDate(Date())
        }
    }

    private func startMonitoring() {
        let monitor = NWPathMonitor()
        // SyncCenter lives as long as the app, so a strong capture is fine.
        monitor.pathUpdateHandler = Self.handler { online in
            Task { @MainActor in self.setOnline(online) }
        }
        monitor.start(queue: DispatchQueue(label: "com.datascratch.network"))
        self.monitor = monitor
    }

    nonisolated private static func handler(
        _ sink: @escaping @Sendable (Bool) -> Void
    ) -> @Sendable (NWPath) -> Void {
        { path in sink(path.status == .satisfied) }
    }
}
