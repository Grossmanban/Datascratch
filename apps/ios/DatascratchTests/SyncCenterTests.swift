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

    /// Waiting for a key: nothing at first, then «getting the key», then — after the patience —
    /// stuck (the giving device is offline); gone when the key came.
    @Test func keyWaitSaysWhatIsAwaited() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        let start = Date(timeIntervalSince1970: 1_000)
        sync.setHeld(2, now: start)
        #expect(sync.keyWait(now: start.addingTimeInterval(1)) == .none, "a key that comes at once says nothing")
        #expect(sync.keyWait(now: start.addingTimeInterval(SyncCenter.keyGrace + 1)) == .waiting(.init(changes: 2)))
        #expect(sync.keyWait(now: start.addingTimeInterval(SyncCenter.keyPatience + 1)) == .stuck(.init(changes: 2)))
        sync.setHeld(0, now: start.addingTimeInterval(40))
        #expect(sync.keyWait(now: start.addingTimeInterval(41)) == .none)
    }

    /// D-62: documents waiting for a key or for access count too; the wait lasts from the first
    /// thing awaited and ends when nothing is.
    @Test func waitingDocumentsAreAwaitedToo() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        let start = Date(timeIntervalSince1970: 1_000)
        sync.setAwaited(.init(accessDocuments: 3), now: start)
        let access = SyncCenter.Awaited(accessDocuments: 3)
        #expect(!access.needsKey)
        #expect(sync.keyWait(now: start.addingTimeInterval(SyncCenter.keyGrace + 1)) == .waiting(access))
        sync.setAwaited(.init(keyDocuments: 1, accessDocuments: 3), now: start.addingTimeInterval(10))
        #expect(sync.keyWait(now: start.addingTimeInterval(SyncCenter.keyPatience + 1)) == .stuck(.init(keyDocuments: 1, accessDocuments: 3)),
                "the wait counts from the first thing awaited")
        sync.setHeld(2, now: start.addingTimeInterval(32))
        #expect(sync.awaited == .init(changes: 2, keyDocuments: 1, accessDocuments: 3), "held changes keep the documents")
        sync.setAwaited(.init(), now: start.addingTimeInterval(40))
        #expect(sync.keyWait(now: start.addingTimeInterval(41)) == .none)
        #expect(sync.awaitedSince == nil)
    }

    @Test func engineSummaryDrivesThePhase() {
        let sync = SyncCenter(serverURL: URL(string: "https://example.com"), monitorNetwork: false)
        // Short work shows no «Syncing» (build 46: it flickered and never went away)…
        sync.apply(summary: .syncing, pending: 2)
        guard case .upToDate = sync.phase else { Issue.record("short work showed «Syncing»: \(sync.phase)"); return }
        // …only once the engine says it has waited long enough.
        sync.setActivity(true)
        #expect(sync.phase == .syncing)
        sync.setActivity(false)
        guard case .upToDate = sync.phase else { Issue.record("«Syncing» stayed: \(sync.phase)"); return }
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
