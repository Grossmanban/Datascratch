import Foundation
import UIKit

/// «Диагностика» (spec/10): what sync is doing and what went wrong recently, for the person and
/// for a support report. The report never carries note text, names, e-mail addresses, server
/// addresses or keys — only codes, document ids, times, the app version and the device model.

/// One thing that went wrong (or changed state) in sync.
nonisolated struct DiagnosticEvent: Identifiable, Equatable, Sendable {
    let id = UUID()
    let date: Date
    /// A code such as `sync.not_sent.register.forbidden` (see `DiagnosticCode`).
    let code: String
    /// The document it is about (an id, never a title).
    let documentId: String?

    static func == (l: DiagnosticEvent, r: DiagnosticEvent) -> Bool {
        l.date == r.date && l.code == r.code && l.documentId == r.documentId
    }
}

nonisolated enum DiagnosticCode {
    /// Second parts of DSCore's failure reasons that are codes, not free text.
    static let knownDetails: Set<String> = [
        "forbidden", "not_found", "unauthorized", "payload_too_large", "rate_limited", "conflict",
        "invalid", "invalid_payload", "too_large", "gone", "timeout", "offline", "revoked", "no_key",
        "decrypt", "bad_request", "server_error", "unavailable",
    ]

    /// A code from a failure reason (`register: forbidden` → `register.forbidden`). Free text
    /// (an error description that may hold a name or an address) becomes `other`.
    static func from(reason: String) -> String {
        let trimmed = reason.trimmingCharacters(in: .whitespaces)
        guard !trimmed.contains("@") else { return "other" }
        // A bare code: `payload_too_large`.
        if isCode(trimmed) { return trimmed }
        // `stage: detail`: the stage is a code; the detail only when it is a known one.
        let pieces = trimmed.split(separator: ":", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespaces) }
        guard pieces.count == 2, isCode(pieces[0]) else { return "other" }
        let detail = pieces[1].split(separator: " ").first.map(String.init) ?? ""
        return knownDetails.contains(detail) ? "\(pieces[0]).\(detail)" : pieces[0]
    }

    private static func isCode(_ s: String) -> Bool {
        (2...32).contains(s.count) && s.allSatisfy { ($0.isLetter && $0.isASCII && $0.isLowercase) || $0 == "_" }
    }

    /// A short explanation in plain words for the list in settings.
    static func explanation(_ code: String) -> String {
        if code.hasPrefix("sync.not_sent") {
            if code.contains("forbidden") || code.contains("unauthorized") {
                return String(localized: "The server refused changes: this account may have lost access to the notebook.")
            }
            if code.contains("too_large") { return String(localized: "A change was too large for the server.") }
            if code.contains("rate_limited") { return String(localized: "The server asked to slow down; changes will be sent again.") }
            return String(localized: "Some changes could not be delivered; they stay on this device and are sent again.")
        }
        switch code {
        case "sync.start_failed": return String(localized: "Sync could not start; it is retried on the next connection.")
        case "network.offline": return String(localized: "The device went offline; changes wait on the device.")
        case "session.ended": return String(localized: "The server ended this device's session; sign in again to sync.")
        case "keys.waiting": return String(localized: "Changes wait for a notebook key from another device.")
        case "keys.unreadable": return String(localized: "Some changes from other devices could not be read with the keys on this device.")
        case "check.manual": return String(localized: "Checked now.")
        default: return String(localized: "Something went wrong in sync.")
        }
    }
}

/// What «Диагностика» shows, frozen for the report.
nonisolated struct DiagnosticsSnapshot: Sendable {
    /// From the sync state and the app's version (the rest of the app is not needed: tests).
    @MainActor
    static func make(sync: SyncCenter, recoveryKeyConfirmed: Bool, info: [String: Any] = Bundle.main.infoDictionary ?? [:],
                     now: Date = Date()) -> DiagnosticsSnapshot {
        var notSent = 0
        if case .notSent(let documents, _) = sync.phase { notSent = documents }
        let t = sync.transfers
        return DiagnosticsSnapshot(
            appVersion: info["CFBundleShortVersionString"] as? String ?? "-",
            build: info["CFBundleVersion"] as? String ?? "-",
            system: "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)",
            device: deviceModel(),
            date: now,
            connection: sync.phaseCode,
            isOnline: sync.isOnline,
            hasServer: !sync.isLocalOnly,
            pendingChanges: sync.pendingChanges,
            heldChanges: sync.awaited.changes,
            notSentDocuments: notSent,
            failedDocumentIds: sync.failedDocumentIds,
            unreadableNotebookIds: sync.unreadableNotebookIds.sorted(),
            uploads: (t.sent, t.toSend, t.received, t.toReceive),
            recoveryKeyConfirmed: recoveryKeyConfirmed,
            events: sync.recentEvents)
    }

    var appVersion: String
    var build: String
    var system: String
    var device: String
    var date: Date
    /// `local_only`, `offline`, `syncing`, `up_to_date`, `failed`, `not_sent`, `session_ended`.
    var connection: String
    var isOnline: Bool
    var hasServer: Bool
    var pendingChanges: Int
    var heldChanges: Int
    var notSentDocuments: Int
    var failedDocumentIds: [String]
    var unreadableNotebookIds: [String]
    var uploads: (sent: Int, toSend: Int, received: Int, toReceive: Int)
    var recoveryKeyConfirmed: Bool
    var events: [DiagnosticEvent]

    /// The text for «Скопировать отчёт» / «Поделиться отчётом».
    func report() -> String {
        let iso = ISO8601DateFormatter()
        var lines = [
            "Datascratch diagnostics",
            "date: \(iso.string(from: date))",
            "app: \(appVersion) (\(build))",
            "system: \(system)",
            "device: \(device)",
            "",
            "connection: \(connection)",
            "network: \(isOnline ? "online" : "offline")",
            "server: \(hasServer ? "configured" : "none")",
            "outbox.pending: \(pendingChanges)",
            "outbox.held_for_key: \(heldChanges)",
            "outbox.not_sent_documents: \(notSentDocuments)",
            "outbox.failed_document_ids: \(failedDocumentIds.isEmpty ? "-" : failedDocumentIds.joined(separator: ","))",
            "keys.unreadable_notebook_ids: \(unreadableNotebookIds.isEmpty ? "-" : unreadableNotebookIds.joined(separator: ","))",
            "keys.recovery_key_checked: \(recoveryKeyConfirmed ? "yes" : "no")",
            "uploads.sent: \(uploads.sent)/\(uploads.toSend)",
            "uploads.received: \(uploads.received)/\(uploads.toReceive)",
            "",
            "events (newest first):",
        ]
        if events.isEmpty { lines.append("-") }
        for e in events {
            lines.append("\(iso.string(from: e.date)) \(e.code)\(e.documentId.map { " doc=\($0)" } ?? "")")
        }
        return lines.joined(separator: "\n") + "\n"
    }

    /// The device model (`iPad14,1`), never its name (which holds the owner's name).
    static func deviceModel() -> String {
        var info = utsname()
        uname(&info)
        let machine = withUnsafeBytes(of: &info.machine) { raw in
            String(decoding: raw.prefix { $0 != 0 }, as: UTF8.self)
        }
        return machine.isEmpty ? "unknown" : machine
    }
}
