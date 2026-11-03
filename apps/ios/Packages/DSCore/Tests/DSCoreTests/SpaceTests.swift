import Foundation
import Testing
@testable import DSCore

/// Shared spaces (D-62, crypto.md §11) against `FakeSharingServer`.
@Suite struct SpaceTests {
    typealias Device = SharingFlowTests.Device

    func device(_ server: FakeSharingServer, email: String, userId: String = EntityID.make(), master: Data = DSCrypto.newKey()) async throws -> Device {
        let d = try await SharingFlowTests.device(server, userId: userId, email: email, master: master)
        try await d.service.ensureBoxKeyPair()
        return d
    }

    /// The owner's account with one space holding one notebook (with a note).
    func ownerLibrary(_ owner: Device, server: FakeSharingServer) async throws -> (account: AccountDocument, spaceId: String, notebook: NotebookDocument, noteId: String) {
        let account = AccountDocument(accountDocId: EntityID.make())
        try account.initialize()
        let space = Space(name: "Team", icon: "👥", order: 1)
        try account.putSpace(space)
        let notebook = NotebookDocument(notebookId: EntityID.make())
        try notebook.initialize()
        let (_, wrapped) = try owner.service.keys.createNotebookKey(notebookId: notebook.notebookId)
        server.state.withLock { $0.resources["notebook:\(notebook.notebookId)"] = .init(owner: owner.userId, ownerWrapped: Base64URL.encode(wrapped)) }
        try account.putNotebook(NotebookRef(id: notebook.notebookId, spaceId: space.id, name: "Plans", order: 1))
        let note = try await owner.service.createNote(in: notebook, title: "Roadmap")
        return (account, space.id, notebook, note.noteId)
    }

    @Test func spaceKeyAndNotebookWrapsMatchTheContract() throws {
        #expect(CryptoAD.targetKey(.space, "s1", version: 1) == "ds1|key|space|s1")
        #expect(CryptoAD.targetKey(.space, "s1", version: 3) == "ds1|key|space|s1|3")
        #expect(CryptoAD.spaceNotebookKey(spaceId: "s1", notebookId: "n1", version: 1) == "ds1|key|space-notebook|s1|n1|1")
        #expect(CryptoAD.memberKey(MemberKeyRef(kind: .space, targetId: "s1", version: 2, fromUserId: "o", toUserId: "m")) == "ds1|key|member|space|s1|2|o|m")
        #expect(CryptoAD.previousKey(.space, "s1", version: 2) == "ds1|key|prev|space|s1|2")
    }

    @Test func shareInviteCreateRotateAndMoveOut() async throws {
        let server = FakeSharingServer()
        let owner = try await device(server, email: "owner@x.co")
        let anna = try await device(server, email: "anna@x.co")
        let boris = try await device(server, email: "boris@x.co")
        let (account, spaceId, notebook, noteId) = try await ownerLibrary(owner, server: server)
        let nbId = notebook.notebookId
        let nbKey = try owner.service.keys.notebookKey(nbId)!

        // The owner makes the space shared: the notebook moves into the space document, its key
        // now under the space key (no master-key wrap on the server).
        let (spaceDoc, kept) = try await owner.service.shareSpace(spaceId, in: account)
        #expect(kept.isEmpty)
        #expect(account.spaces().first?.shared == true)
        #expect(account.notebooks(inSpace: spaceId).isEmpty)
        #expect(spaceDoc.notebook(id: nbId)?.name == "Plans" && spaceDoc.name == "Team")
        #expect(try owner.service.store.document(spaceId)?.kind == .space)
        #expect(owner.service.keys.spaceOfNotebook(nbId) == spaceId)
        #expect(server.state.withLock { $0.spaceNotebooks[spaceId]?[nbId]?.version } == 1)

        // Anna (editor) and Boris (viewer) join; the owner gives the space key.
        let target = SharingTarget(kind: .space, id: spaceId)
        let invA = try await owner.service.invite("anna@x.co", role: .editor, to: target)
        let invB = try await owner.service.invite("boris@x.co", role: .viewer, to: target)
        _ = try await anna.service.acceptInvitation(id: invA)
        _ = try await boris.service.acceptInvitation(id: invB)
        let (spaceKey, v1) = try await owner.service.ownerKey(spaceId: spaceId)
        try await owner.service.grantPendingKeys(to: target, key: spaceKey, version: v1)
        for m in [anna, boris] {
            let items = try await m.service.refreshSharedWithMe()
            #expect(try m.service.keys.spaceKey(spaceId) == spaceKey)
            // Every notebook of the space from the one grant; the index registered.
            #expect(try m.service.keys.notebookKey(nbId) == nbKey)
            #expect(try m.service.store.document(nbId)?.kind == .notebook)
            #expect(try m.service.store.document(spaceId)?.kind == .space)
            #expect(try m.service.keys.noteKey(notebook.note(id: noteId)!, notebookId: nbId) == owner.service.keys.noteKey(notebook.note(id: noteId)!, notebookId: nbId))
            // Placement in the switcher.
            let memberAccount = AccountDocument(accountDocId: EntityID.make())
            #expect(try m.service.placeSharedSpaces(items, in: memberAccount).isEmpty)
            #expect(memberAccount.sharedSpaces().map(\.id) == [spaceId])
            #expect(try m.service.placeSharedSpaces([], in: memberAccount) == [spaceId])
            #expect(memberAccount.sharedSpaces().isEmpty)
        }

        // Anna (editor) creates a notebook in the space: the owner and Boris get its key.
        let annaNotebook = try await anna.service.createNotebook(name: "Ideas", in: SpaceDocument(spaceId: spaceId), order: 2)
        let annaKey = try anna.service.keys.notebookKey(annaNotebook.notebookId)
        try await owner.service.loadSpaceNotebookKeys(spaceId)
        try await boris.service.loadSpaceNotebookKeys(spaceId)
        #expect(try owner.service.keys.notebookKey(annaNotebook.notebookId) == annaKey)
        #expect(try boris.service.keys.notebookKey(annaNotebook.notebookId) == annaKey)
        // Boris (viewer) cannot.
        await #expect(throws: (any Error).self) { _ = try await boris.service.createNotebook(name: "No", in: SpaceDocument(spaceId: spaceId), order: 3) }

        // Boris is removed: the owner rotates the space key and every notebook key at once.
        try await owner.service.api.removeMember(userId: boris.userId, from: target)
        #expect(try await owner.service.resumeSpaceRotation(spaceId, notebooks: [notebook, annaNotebook]))
        #expect(server.state.withLock { $0.spaceRotations.count } == 1)
        let (spaceKey2, v2) = try await owner.service.ownerKey(spaceId: spaceId)
        #expect(v2 == 2 && spaceKey2 != spaceKey)
        let nbKey2 = try owner.service.keys.notebookKey(nbId)!
        #expect(nbKey2 != nbKey && owner.service.keys.notebookKeyVersion(nbId) == 2)
        #expect(try await owner.service.notesNeedingNewKeys(in: notebook).isEmpty)
        // Anna follows: new space key, new notebook keys; the old ones still read the history.
        _ = try await anna.service.refreshSharedWithMe()
        #expect(try anna.service.keys.spaceKey(spaceId) == spaceKey2)
        #expect(anna.service.keys.retiredSpaceKeys(spaceId).contains(spaceKey))
        #expect(try anna.service.keys.notebookKey(nbId) == nbKey2)
        #expect(anna.service.keys.retiredNotebookKeys(nbId).contains(nbKey))
        // Boris got nothing new.
        #expect(server.state.withLock { $0.resources["space:\(spaceId)"]!.members[boris.userId] } == nil)
        #expect(try await owner.service.finishSpaceRotation(spaceId, notebooks: [notebook, annaNotebook]))
        #expect(server.state.withLock { $0.resources["space:\(spaceId)"]!.pending } == false)

        // The owner moves the first notebook out into a personal space: a new key under the
        // master key; Anna no longer gets it.
        let personal = Space(name: "Mine", order: 0)
        try account.putSpace(personal)
        try await owner.service.moveNotebookOutOfSpace(notebook, space: spaceDoc, to: personal.id, account: account)
        #expect(account.notebook(id: nbId)?.spaceId == personal.id && spaceDoc.notebook(id: nbId) == nil)
        #expect(owner.service.keys.spaceOfNotebook(nbId) == nil && owner.service.keys.notebookKeyVersion(nbId) == 3)
        #expect(try await owner.service.notesNeedingNewKeys(in: notebook).isEmpty)
        let annaSees = try await anna.service.loadSpaceNotebookKeys(spaceId)
        #expect(!annaSees.contains { $0.notebookId == nbId })
        #expect(try anna.service.keys.notebookKey(nbId) == nbKey2)
    }

    /// The space rotation was interrupted after `rotate`: another device of the owner finishes it
    /// without rotating again (by `pendingSinceVersion`, or by the notes on an older server).
    @Test(arguments: [false, true])
    func spaceRotationFinishedFromASecondOwnerDevice(olderServer: Bool) async throws {
        let server = FakeSharingServer()
        server.state.withLock { $0.withoutPendingSince = olderServer }
        let ownerId = EntityID.make(), master = DSCrypto.newKey()
        let phone = try await device(server, email: "o@x.co", userId: ownerId, master: master)
        let leaving = try await device(server, email: "l@x.co")
        let (account, spaceId, notebook, _) = try await ownerLibrary(phone, server: server)
        _ = try await phone.service.shareSpace(spaceId, in: account)
        let target = SharingTarget(kind: .space, id: spaceId)
        let inv = try await phone.service.invite("l@x.co", role: .viewer, to: target)
        _ = try await leaving.service.acceptInvitation(id: inv)
        let (k, v) = try await phone.service.ownerKey(spaceId: spaceId)
        try await phone.service.grantPendingKeys(to: target, key: k, version: v)
        try await phone.service.api.removeMember(userId: leaving.userId, from: target)

        // The phone rotates (step 1) but the notes' new keys never reach the index.
        let before = try notebook.crdt.encodeStateAsUpdate()
        try await phone.service.rotateSpaceKey(spaceId, notebooks: [notebook])
        let indexAfterStep1 = NotebookDocument(notebookId: notebook.notebookId)
        try indexAfterStep1.crdt.applyUpdate(before, origin: .remote)

        let ipad = try await device(server, email: "o@x.co", userId: ownerId, master: master)
        #expect(try await ipad.service.resumeSpaceRotation(spaceId, notebooks: [indexAfterStep1]))
        #expect(server.state.withLock { $0.spaceRotations.count } == 1)
        #expect(ipad.service.keys.spaceKeyVersion(spaceId) == 2)
        #expect(try await ipad.service.notesNeedingNewKeys(in: indexAfterStep1).isEmpty)
        #expect(try await ipad.service.finishSpaceRotation(spaceId, notebooks: [indexAfterStep1]))
    }

    /// «Shared with me» never hands this account a key for one of its own spaces.
    @Test func ownSpaceFromSharedWithMeIsRefused() async throws {
        let server = FakeSharingServer()
        let me = try await device(server, email: "me@x.co")
        let other = try await device(server, email: "other@x.co")
        let account = AccountDocument(accountDocId: EntityID.make())
        try account.initialize()
        let mine = Space(name: "Mine", order: 0)
        try account.putSpace(mine)
        me.service.useTrustRecord(account)
        // The server claims another account shares "my" space with me.
        server.state.withLock {
            $0.resources["space:\(mine.id)"] = .init(owner: other.userId, ownerWrapped: "AQ",
                                                    members: [me.userId: .init(role: "editor", status: "active", createdAfter: false, wrappedKey: "AQ")])
        }
        #expect(try await me.service.refreshSharedWithMe().isEmpty)
        #expect(try me.service.keys.spaceKey(mine.id) == nil)
    }

    @Test func spaceDocumentModel() throws {
        let doc = SpaceDocument(spaceId: EntityID.make())
        try doc.initialize(from: Space(name: "Team", icon: "👥", color: "blue", order: 1))
        #expect(doc.name == "Team" && doc.icon == "👥" && doc.color == "blue" && doc.formatVersion == currentFormatVersion)
        let ref = NotebookRef(spaceId: "ignored", name: "A", order: 2)
        try doc.putNotebook(ref)
        // spaceId is not stored: it is this space.
        #expect(doc.crdt.mapValue("notebooks", [ref.id, "spaceId"]) == nil)
        #expect(doc.notebook(id: ref.id)?.spaceId == doc.spaceId)
        #expect(doc.notebooks(onServer: []).isEmpty && doc.notebooks().count == 1)
        // Space.shared is written only when set.
        let account = AccountDocument(accountDocId: EntityID.make())
        try account.putSpace(Space(name: "P", order: 0))
        #expect(account.spaces().first?.shared == false)
        #expect(account.crdt.mapValue("spaces", [account.spaces()[0].id, "shared"]) == nil)
        try account.updateSpace(id: account.spaces()[0].id, ["shared": .bool(value: true)])
        #expect(account.spaces().first?.shared == true)
    }
}
