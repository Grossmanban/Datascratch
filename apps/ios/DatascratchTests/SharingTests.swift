#if canImport(DSCore)
import DSCore
#endif
import Foundation
import Testing
@testable import Datascratch

/// D-54: sharing with other accounts.
@MainActor
struct SharingTests {
    // MARK: History comparison

    @Test func comparisonMarksAddedAndRemovedLines() {
        let lines = TextDiff.compare(["Plan", "Buy milk", "Call Anna"], ["Plan", "Call Anna", "Book tickets"])
        #expect(lines.map(\.change) == [.same, .removed, .same, .added])
        #expect(lines[1].segments == [TextDiff.Segment(text: "Buy milk", change: .removed)])
        #expect(lines[3].segments == [TextDiff.Segment(text: "Book tickets", change: .added)])
    }

    @Test func aChangedLineIsComparedWordByWord() {
        let lines = TextDiff.compare(["Meet on Monday at noon"], ["Meet on Friday at noon"])
        #expect(lines.count == 1)
        let segments = lines[0].segments
        #expect(segments.contains(TextDiff.Segment(text: "Monday ", change: .removed)))
        #expect(segments.contains(TextDiff.Segment(text: "Friday ", change: .added)))
        #expect(segments.first == TextDiff.Segment(text: "Meet on ", change: .same))
        #expect(segments.last == TextDiff.Segment(text: "at noon", change: .same))
    }

    @Test func theFirstVersionIsAllNew() {
        let lines = TextDiff.compare([], ["One", "Two"])
        #expect(lines.allSatisfy { $0.change == .added })
        #expect(TextDiff.compare([], []).isEmpty)
    }

    @Test func tasksShowTheirBoxInTheComparison() {
        let body = NoteBody(blocks: [.paragraph("Intro"), .task("Ship it"), .paragraph("")])
        #expect(TextDiff.lines(of: body) == ["Intro", "☐ Ship it"])
    }

    // MARK: Roles

    @Test func invitationsAcceptedLandInSharedWithMe() async throws {
        let sharing = LocalAccountSharingService(webHost: "notes.example.org", demo: true)
        let notebook = Datascratch.ShareTarget(kind: .notebook, id: UUIDv7.make())
        sharing.seedForTesting(invitedTo: notebook, viewOnly: nil, owned: nil)
        let invite = try #require(sharing.incoming.first)
        try await sharing.accept(invite)
        #expect(sharing.incoming.isEmpty)
        #expect(sharing.role(for: notebook) == .editor)
        #expect(sharing.role(forNote: "any-note", notebookId: notebook.id) == .editor)
        try await sharing.leave(notebook)
        #expect(sharing.role(for: notebook) == nil)
    }

    @Test func theOwnerInvitesAndRevokes() async throws {
        let sharing = LocalAccountSharingService(webHost: "notes.example.org", demo: true)
        let note = Datascratch.ShareTarget(kind: .note, id: UUIDv7.make())
        let invite = try await sharing.invite("kate@example.org", role: .viewer, to: note)
        #expect(invite.link?.absoluteString == "https://notes.example.org/invite/\(invite.id)")
        #expect(try await sharing.people(of: note).invites == [invite])
        try await sharing.revokeInvite(invite, of: note)
        #expect(try await sharing.people(of: note).invites.isEmpty)
    }

    // MARK: Library

    #if canImport(DSCore)
    /// A notebook shared with this account shows under its own space and is never written into
    /// this account's document.
    @Test func sharedNotebooksJoinTheLibraryWithoutBecomingOwn() throws {
        let core = try CoreLibrary.inMemory()
        let id = UUIDv7.make()
        try core.notebookDocument(id).setMetaCopy(.init(name: "Team plans", icon: "person.2", color: "green",
                                                       spaceId: "", spaceName: "", spaceIcon: nil))
        core.setShared(notebooks: [id], notes: [])
        let snapshot = core.loadSnapshot()
        let notebook = try #require(snapshot.notebooks.first { $0.id == id })
        #expect(notebook.isSharedWithMe)
        #expect(notebook.name == "Team plans")
        #expect(!core.account.notebooks().contains { $0.id == id })

        core.setShared(notebooks: [], notes: [])
        #expect(!core.loadSnapshot().notebooks.contains { $0.id == id })
    }

    /// prod 2026-10-28: a member saw a shared notebook without its notes, and a note they made in
    /// it left their list once closed — the lists kept only the active space's notebooks.
    @Test func notesOfASharedNotebookAreListedInEverySpace() throws {
        let store = LibraryStore(persistence: .inMemory)
        store.seedIfEmpty()
        let own = try #require(store.notebooks(in: store.activeSpace?.id).first)
        let shared = store.createNotebook(in: Notebook.sharedSpaceId, name: "Team plans", mode: .private)
        let theirs = store.createNote(in: shared.id, title: "Roadmap")
        #expect(store.documents(inNotebook: shared.id).map(\.id) == [theirs.id])
        #expect(store.documents.contains { $0.id == theirs.id })
        #expect(store.search("Roadmap").contains { $0.id == theirs.id })

        // A note the member makes stays listed (closing it reads the list again).
        let mine = store.createNote(in: shared.id, title: "My idea")
        #expect(Set(store.documents(inNotebook: shared.id).map(\.id)) == [theirs.id, mine.id])

        // Another space shows them too («Shared with me» is in every space).
        let other = store.createSpace(name: "Work", icon: "briefcase", color: .blue)
        store.activateSpace(other.id)
        #expect(store.documents(inNotebook: shared.id).count == 2)
        #expect(!store.documents.contains { $0.notebookId == own.id })

        // The owner's trash is theirs to empty: not in the member's.
        store.activateSpace(own.spaceId)
        store.trash(note: theirs.id)
        #expect(!store.trashed.contains { $0.id == theirs.id })
    }

    @Test func notesSharedOnTheirOwnHaveNoNotebookDocument() throws {
        let core = try CoreLibrary.inMemory()
        #expect(throws: (any Error).self) { _ = try core.notebookDocument(Notebook.sharedNotesId) }
        #expect(CoreLibrary.recordNotebook(Notebook.sharedNotesId) == nil)
        #expect(CoreLibrary.recordNotebook("nb") == "nb")
    }

    /// D-54 key versions: a note's key is looked up with its version and chain.
    @Test func noteKeysKeepTheirVersion() {
        let index = WrappedKeyIndex()
        index.set(noteId: "n1", notebookId: "nb", wrapped: "w", keyVersion: 3, keyChain: ["a", "b"])
        let meta = index.meta(noteId: "n1", notebookId: "nb")
        #expect(meta?.keyVersion == 3)
        #expect(meta?.keyChain == ["a", "b"])
        #expect(meta?.wrappedKey == "w")
        #expect(index.meta(noteId: "n1", notebookId: "other") == nil)
    }
    #endif
}
