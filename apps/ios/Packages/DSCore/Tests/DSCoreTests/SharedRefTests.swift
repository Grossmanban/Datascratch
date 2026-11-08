import Testing
import Foundation
@testable import DSCore

/// `account.shared` (D-54) with `openedAt` (D-63): «new» is the same on every device.
@Suite struct SharedRefTests {
    @Test func placementAndFirstOpen() throws {
        let account = AccountDocument(CRDTDocument(kind: .account, docId: EntityID.make()))
        let space = EntityID.make(), nb = EntityID.make(), note = EntityID.make()
        try account.putShared(SharedRef(kind: .notebook, targetId: nb, spaceId: space, order: 2, addedAt: "2026-11-08T10:00:00.000Z"))
        try account.putShared(SharedRef(kind: .note, targetId: note, spaceId: space, order: 1, addedAt: "2026-11-08T11:00:00.000Z"))
        #expect(account.sharedRefs().map(\.targetId) == [note, nb])
        #expect(account.sharedRef(.notebook, id: nb)?.isNew == true)
        // The same id as a note is another record.
        #expect(account.sharedRef(.note, id: nb) == nil)

        let first = Date(timeIntervalSince1970: 1_762_600_000)
        #expect(try account.markSharedOpened(.notebook, id: nb, at: first))
        #expect(try !account.markSharedOpened(.notebook, id: nb, at: first.addingTimeInterval(60)))
        #expect(account.sharedOpenedAt(.notebook, id: nb) == DSDate.iso(first))
        #expect(account.sharedRef(.notebook, id: nb)?.order == 2)
        #expect(try !account.markSharedOpened(.notebook, id: EntityID.make()))

        try account.removeShared(.note, id: note)
        #expect(account.sharedRefs().map(\.targetId) == [nb])
    }

    /// Records written by the web (`sharedRefSchema`, without `openedAt`), read through the JSON
    /// fast path and one by one; a record that names nothing is dropped.
    @Test func recordsFromTheWeb() throws {
        let doc = CRDTDocument(kind: .account, docId: EntityID.make())
        let account = AccountDocument(doc)
        let nb = EntityID.make(), space = EntityID.make()
        try doc.transact { t in
            t.set("shared", key: "notebook:\(nb)", .sharedMap(entries: ["kind": .string(value: "notebook"), "id": .string(value: nb),
                                                                         "spaceId": .string(value: space), "order": .number(value: 1),
                                                                         "addedAt": .string(value: "2026-11-08T10:00:00.000Z")]))
            t.set("shared", key: "junk", .sharedMap(entries: ["order": .number(value: 0)]))
        }
        let refs = account.sharedRefs()
        #expect(refs.count == 1)
        #expect(refs.first == SharedRef(kind: .notebook, targetId: nb, spaceId: space, order: 1, addedAt: "2026-11-08T10:00:00.000Z"))
        #expect(account.sharedRef(.notebook, id: nb)?.openedAt == nil)
        #expect(doc.mapJSON("shared", ["notebook:\(nb)"])?["openedAt"] == nil)
    }

    /// Two devices open it at the same time: one date wins everywhere, nothing else is lost; an
    /// account document made before the `shared` root existed takes it on.
    @Test func twoDevicesAgreeOnTheFirstOpen() throws {
        let a = AccountDocument(CRDTDocument(kind: .account, docId: EntityID.make()))
        let nb = EntityID.make()
        try a.putShared(SharedRef(kind: .notebook, targetId: nb, spaceId: EntityID.make(), order: 1))
        let b = AccountDocument(CRDTDocument(kind: .account, docId: a.crdt.docId))
        try b.crdt.applyUpdate(try a.crdt.encodeStateAsUpdate())
        try a.markSharedOpened(.notebook, id: nb, at: Date(timeIntervalSince1970: 1_762_600_000))
        try b.markSharedOpened(.notebook, id: nb, at: Date(timeIntervalSince1970: 1_762_600_100))
        let sa = a.crdt.stateVector(), sb = b.crdt.stateVector()
        try a.crdt.applyUpdate(try b.crdt.encodeStateAsUpdate(since: sa))
        try b.crdt.applyUpdate(try a.crdt.encodeStateAsUpdate(since: sb))
        let ra = try #require(a.sharedRef(.notebook, id: nb)), rb = try #require(b.sharedRef(.notebook, id: nb))
        #expect(ra == rb && ra.openedAt != nil && ra.order == 1)
    }
}
