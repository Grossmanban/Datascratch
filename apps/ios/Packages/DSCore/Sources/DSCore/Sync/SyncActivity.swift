import Foundation

/// Diagnostics → Sync (owner, build 46): the state of the connection, what waits to be sent and
/// for how long, what failed and what was set aside. `SyncEngine.diagnostics()`;
/// «Отправить снова» is `SyncEngine.retryAll()`.
public struct SyncDiagnostics: Sendable, Equatable {
    public var connection: SyncConnectionState
    /// Connections that reached `welcome` since launch: a number that keeps growing on a
    /// steady network means the connection keeps dropping.
    public var connectionsOpened: Int
    /// Connection attempts that failed in a row (0 while connected).
    public var consecutiveFailures: Int
    public var protocolVersion: Int?
    /// Last error met: a server code (`payload_too_large`, `rate_limited`, …) or
    /// `connection: …` when the connection broke under a send.
    public var lastError: String?
    public var lastErrorAt: Date?
    /// Messages still to be sent, per document, oldest first, with the age of the oldest.
    public var pending: [PendingSync]
    /// Sent on this connection, not acknowledged yet.
    public var inFlight: Int
    /// Documents subscribed on this connection and not caught up yet / waiting for their turn /
    /// caught up.
    public var catchingUp: Int
    public var queuedSubscriptions: Int
    public var live: Int
    /// Outgoing messages the server refused for good, per document (not retried by
    /// themselves; they do not hold up anything else).
    public var failed: [FailedSync]
    /// Documents with remote data this device could not read or apply (set aside).
    public var unreadable: [UnreadableSync]
    /// Remote items set aside (quarantine), all documents.
    public var quarantined: Int
    /// Documents not syncing yet and why (no key, no access).
    public var waiting: [String: SyncWaitReason]
    /// The last events, oldest first (connections, server refusals per document, failures).
    public var events: [SyncEvent] = []

    /// How long the oldest message has waited (nil: nothing to send).
    public func oldestPendingAge(now: Date = Date()) -> TimeInterval? {
        pending.map(\.oldest).min().map { now.timeIntervalSince($0) }
    }
}

/// One line of Diagnostics → Sync events.
public struct SyncEvent: Sendable, Equatable {
    public enum Kind: String, Sendable {
        case connected, disconnected
        /// Protocol 3: `resume` sent, its answer, the cursor stored (§3.1).
        case resume
        /// The connection broke under a send (the message stays queued).
        case connectionLost
        /// The server answered `error` (code and message; the document when known).
        case serverError
        /// A message was refused for good (moved to failed).
        case failed
        /// A big push was cut to what the server lacks, or dropped as already there.
        case pushTrimmed
    }
    public var at: Date
    public var kind: Kind
    public var docId: String?
    public var detail: String
}

/// When to show «синхронизация» (owner, build 46: it was shown all the time and flickered).
/// The indicator is on only once something has been waiting for `showAfter` — a message not
/// acknowledged, a catch-up not finished — and stays on for at least `minimumOn`, then for
/// `holdOff` after the work is done, so a burst of short jobs reads as one. Pure: feed it the
/// status and the time; `nextChange` says when to ask again without a new status.
public struct SyncActivityGate: Sendable, Equatable {
    public var showAfter: TimeInterval = 3
    public var minimumOn: TimeInterval = 1.5
    public var holdOff: TimeInterval = 1
    public private(set) var visible = false
    private var shownAt: Date?
    private var idleSince: Date?
    private var busySince: Date?

    public init() {}

    /// Whether the indicator shows for `status` at `now`.
    @discardableResult
    public mutating func update(_ status: SyncStatus, now: Date = Date()) -> Bool {
        let since = Self.workingSince(status)
        busySince = since
        if let since, now.timeIntervalSince(since) >= showAfter {
            idleSince = nil
            if !visible {
                visible = true
                shownAt = now
            }
        } else if visible {
            // New work while shown keeps it on; the hold counts from the end of the last work.
            if since != nil {
                idleSince = nil
            } else if idleSince == nil {
                idleSince = now
            }
            let onLongEnough = shownAt.map { now.timeIntervalSince($0) >= minimumOn } ?? true
            let idleLongEnough = idleSince.map { now.timeIntervalSince($0) >= holdOff } ?? false
            if since == nil, onLongEnough, idleLongEnough {
                visible = false
                shownAt = nil
                idleSince = nil
            }
        }
        return visible
    }

    /// When `update` may give another answer with the same status (a timer for the app).
    public func nextChange(after now: Date) -> Date? {
        if !visible, let busySince { return max(now, busySince.addingTimeInterval(showAfter)) }
        if visible, busySince == nil {
            let off = max(shownAt?.addingTimeInterval(minimumOn) ?? now, (idleSince ?? now).addingTimeInterval(holdOff))
            return max(now, off)
        }
        return nil
    }

    /// Since when something has been waiting: the oldest unsent message, or the catch-up.
    /// A reconnect alone is not «syncing» (on flaky 4G it happens every half minute): only
    /// unsent messages count while connecting. Offline is its own state, not this indicator.
    static func workingSince(_ status: SyncStatus) -> Date? {
        let pending = status.pending > 0 ? status.oldestPendingAt : nil
        switch status.connection {
        case .connected: break
        case .connecting, .waiting: return status.connectionTrouble ? nil : pending
        case .disconnected, .stopped, .revoked: return nil
        }
        let catching = status.catchingUp > 0 ? status.catchingUpSince : nil
        switch (pending, catching) {
        case let (a?, b?): return min(a, b)
        case let (a?, nil): return a
        case let (nil, b?): return b
        default: return nil
        }
    }
}
