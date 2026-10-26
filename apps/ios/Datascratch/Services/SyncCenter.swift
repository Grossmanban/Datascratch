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
    var unreadableNotebookIds: Set<String> = []
    /// Per notebook, what is set aside right now (item count and newest seq): the banner's
    /// dismissal is keyed by it, so only new unreadable items bring it back.
    var unreadableSignatures: [String: String] = [:]
    let serverURL: URL?

    @ObservationIgnored private var monitor: NWPathMonitor?

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
        case .failed(let documents, let reason): phase = .notSent(documents: documents, reason: reason)
        }
    }

    /// Mirror of DSCore's `SyncStatus.Summary`, so the UI does not depend on DSCore.
    enum Summary: Equatable {
        case offline, syncing, synced
        case failed(documents: Int, reason: String)
    }

    /// Sends the undelivered changes again (`SyncEngine.retryFailed`).
    @ObservationIgnored var onRetry: (() -> Void)?

    func retryFailed() {
        guard case .notSent = phase else { return }
        phase = .syncing
        onRetry?()
    }

    /// Called when connectivity returns (the sync engine reconnects at once).
    @ObservationIgnored var onBackOnline: (() -> Void)?

    func markFailed(_ message: String) {
        phase = .failed(message)
    }

    func setOnline(_ online: Bool) {
        let cameBack = online && !isOnline
        isOnline = online
        if cameBack { onBackOnline?() }
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
