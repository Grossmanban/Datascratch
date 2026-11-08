import Foundation
import Testing
@testable import Datascratch

/// «Диагностика» (spec/10): recent problems become codes, and the report holds no secrets.
@MainActor
struct DiagnosticsTests {
    @Test func failureReasonsBecomeCodes() {
        #expect(DiagnosticCode.from(reason: "register: forbidden") == "register.forbidden")
        #expect(DiagnosticCode.from(reason: "payload_too_large") == "payload_too_large")
        #expect(DiagnosticCode.from(reason: "snapshot: Anna's draft is broken") == "snapshot")
        #expect(DiagnosticCode.from(reason: "Could not reach sync.example.org") == "other")
        #expect(DiagnosticCode.from(reason: "register: anna@example.com") == "other")
        #expect(DiagnosticCode.from(reason: "Ошибка у Анны") == "other")
    }

    @Test func reportHasStatesCodesAndIdsButNoSecrets() {
        let sync = SyncCenter(serverURL: URL(string: "https://sync.example.org"), monitorNetwork: false)
        // Free text with an address and a name is not kept; only the fact is.
        sync.markFailed("Could not reach sync.example.org for anna@example.com (Anna's iPad)")
        sync.failedDocumentIds = ["01a1ac00-0000-7000-8000-00000000000a"]
        sync.apply(summary: .failed(documents: 1, reason: "register: forbidden"), pending: 3)
        sync.unreadableNotebookIds = ["nb-1"]
        sync.transfers = .init(sent: 1, toSend: 4, received: 0, toReceive: 0)
        let snapshot = DiagnosticsSnapshot.make(sync: sync, recoveryKeyConfirmed: false,
                                                info: ["CFBundleShortVersionString": "1.4", "CFBundleVersion": "212"],
                                                now: Date(timeIntervalSince1970: 1_800_000_000))
        let report = snapshot.report()
        #expect(report.contains("app: 1.4 (212)"))
        #expect(report.contains("connection: not_sent"))
        #expect(report.contains("outbox.pending: 3"))
        #expect(report.contains("sync.start_failed"))
        #expect(report.contains("sync.not_sent.register.forbidden doc=01a1ac00-0000-7000-8000-00000000000a"))
        #expect(report.contains("keys.unreadable doc=nb-1"))
        #expect(report.contains("uploads.sent: 1/4"))
        #expect(report.contains("keys.recovery_key_checked: no"))
        for secret in ["anna", "Anna", "@", "example.org", "iPad's", "https://"] {
            #expect(!report.contains(secret), "the report contains \(secret)")
        }
    }

    @Test func eventsAreBoundedAndRepeatsCollapse() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        let t = Date(timeIntervalSince1970: 1_800_000_000)
        sync.record("network.offline", at: t)
        sync.record("network.offline", at: t.addingTimeInterval(5))
        #expect(sync.recentEvents.count == 1, "the same problem within a minute is one entry")
        for i in 0..<80 { sync.record("code.\(i)", at: t.addingTimeInterval(Double(100 + i))) }
        #expect(sync.recentEvents.count == SyncCenter.maxEvents)
        #expect(sync.recentEvents.first?.code == "code.79", "newest first")
    }

    @Test func launchFitsTheBudget() {
        #expect(LaunchTiming.total <= 1.1)
        #expect(LaunchTiming.quick + LaunchTiming.handoff < LaunchTiming.total, "ready early is shorter")
        // Pressure stays positive and lifts at the end.
        #expect(InkLaunchView.width(at: 0) > 0.2)
        #expect(InkLaunchView.width(at: 1) < InkLaunchView.width(at: 0.5))
    }
}
