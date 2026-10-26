import Foundation
import Testing
@testable import Datascratch

@MainActor
struct SyncCenterTests {
    @Test func engineSummaryDrivesThePhase() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        sync.apply(summary: .syncing, pending: 2)
        #expect(sync.phase == .syncing)
        sync.apply(summary: .failed(documents: 3, reason: "403"), pending: 0)
        #expect(sync.phase == .notSent(documents: 3, reason: "403"))
        sync.apply(summary: .synced, pending: 0)
        guard case .upToDate = sync.phase else { Issue.record("expected upToDate"); return }
    }

    @Test func retryAsksTheEngineOnlyWhenSomethingWasNotSent() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        var retries = 0
        sync.onRetry = { retries += 1 }
        sync.retryFailed()
        #expect(retries == 0)
        sync.apply(summary: .failed(documents: 1, reason: "refused"), pending: 0)
        sync.retryFailed()
        #expect(retries == 1)
        #expect(sync.phase == .syncing)
    }
}
