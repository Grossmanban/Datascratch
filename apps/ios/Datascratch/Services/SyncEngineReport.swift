import Foundation

/// Diagnostics → Sync: the sync engine's own view (DSCore `SyncDiagnostics`), mirrored so the
/// screens do not depend on DSCore. Codes, counts, ids and times only — never note content.
nonisolated struct SyncEngineReport: Sendable, Equatable {
    nonisolated struct Pending: Sendable, Equatable, Identifiable {
        var docId: String
        var count: Int
        var oldest: Date
        var lastError: String?
        var id: String { docId }
    }

    nonisolated struct Event: Sendable, Equatable, Identifiable {
        var at: Date
        /// `connected`, `disconnected`, `connectionLost`, `serverError`, `failed`, `pushTrimmed`, `resume`, `unanswered`.
        var kind: String
        var docId: String?
        var detail: String
        var id: String { "\(at.timeIntervalSince1970)-\(kind)-\(docId ?? "")-\(detail)" }
    }

    /// `connected`, `connecting`, `disconnected`, `waiting`, `stopped: …`.
    var connection: String
    var connectionsOpened: Int
    var consecutiveFailures: Int
    var protocolVersion: Int?
    var lastError: String?
    var lastErrorAt: Date?
    var pending: [Pending]
    var inFlight: Int
    var catchingUp: Int
    var queuedSubscriptions: Int
    var live: Int
    var failed: Int
    var unreadable: Int
    var quarantined: Int
    var waiting: Int
    /// Oldest first, as the engine keeps them.
    var events: [Event]

    func oldestPendingAge(now: Date = Date()) -> TimeInterval? {
        pending.map(\.oldest).min().map { now.timeIntervalSince($0) }
    }

    /// Lines for the copied or shared report.
    func lines(now: Date = Date()) -> [String] {
        let iso = ISO8601DateFormatter()
        var lines = [
            "sync.connection: \(connection)",
            "sync.connections_opened: \(connectionsOpened)",
            "sync.consecutive_failures: \(consecutiveFailures)",
            "sync.protocol: \(protocolVersion.map(String.init) ?? "-")",
            "sync.last_error: \(lastError ?? "-")\(lastErrorAt.map { " at \(iso.string(from: $0))" } ?? "")",
            "sync.pending: \(pending.reduce(0) { $0 + $1.count }) in \(pending.count) documents, oldest \(oldestPendingAge(now: now).map { "\(Int($0)) s" } ?? "-")",
            "sync.in_flight: \(inFlight)",
            "sync.catching_up: \(catchingUp) (queued \(queuedSubscriptions), live \(live))",
            "sync.failed_documents: \(failed)",
            "sync.unreadable_documents: \(unreadable), quarantined items: \(quarantined)",
            "sync.waiting_documents: \(waiting)",
        ]
        for p in pending.prefix(20) {
            lines.append("  pending doc=\(p.docId) count=\(p.count) since=\(iso.string(from: p.oldest))\(p.lastError.map { " error=\($0)" } ?? "")")
        }
        lines.append("sync.events (newest first):")
        if events.isEmpty { lines.append("-") }
        for e in events.reversed().prefix(100) {
            lines.append("\(iso.string(from: e.at)) \(e.kind)\(e.docId.map { " doc=\($0)" } ?? "")\(e.detail.isEmpty ? "" : " — \(e.detail)")")
        }
        return lines
    }
}
