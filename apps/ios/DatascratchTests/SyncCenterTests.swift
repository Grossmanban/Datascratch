import Foundation
import Testing
@testable import Datascratch

@MainActor
struct SyncCenterTests {
    /// Photos on their way are counted, uploads first; nothing when nothing moves.
    @Test func photoTransfersHaveACount() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        #expect(sync.transferLine == nil)
        sync.transfers = .init(sent: 3, toSend: 8, received: 0, toReceive: 2)
        #expect(sync.transferLine?.text == "Uploading photos: 3 of 8")
        sync.transfers = .init(sent: 8, toSend: 8, received: 1, toReceive: 2)
        #expect(sync.transferLine?.text == "Downloading photos: 1 of 2")
        sync.transfers = .init()
        #expect(sync.transferLine == nil)
    }

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

    @Test func anEndedSessionIsNotOverwrittenByTheEngine() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        sync.markSessionEnded()
        #expect(sync.phase == .sessionEnded && sync.showsSessionEnded)
        // Network flaps and stale engine updates do not hide it.
        sync.apply(summary: .synced, pending: 0)
        sync.setOnline(false)
        sync.setOnline(true)
        #expect(sync.phase == .sessionEnded)
        sync.markSessionRestored()
        #expect(!sync.isSessionEnded && !sync.showsSessionEnded)
        #expect(sync.phase == .syncing)
    }
}
