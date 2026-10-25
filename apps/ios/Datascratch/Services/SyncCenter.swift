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
    }

    private(set) var isOnline = true
    private(set) var phase: Phase
    private(set) var pendingChanges = 0
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
