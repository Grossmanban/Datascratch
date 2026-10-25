#if canImport(DSCore)
import DSCore
import Foundation
import Testing
@testable import Datascratch

@MainActor
struct CoreLibraryTests {
    @Test func codecRoundTripKeepsIdsKindsAndTasks() {
        var task = NoteBlock.task("Call #work", scheduled: "2026-10-26")
        task.task?.deadline = "2026-10-30"
        let body = NoteBody(blocks: [
            .paragraph("Hello [[Plan]] #idea"),
            NoteBlock(id: UUIDv7.make(), kind: .heading2, text: "Section", task: nil),
            NoteBlock(id: UUIDv7.make(), kind: .bullet, text: "one", task: nil),
            NoteBlock(id: UUIDv7.make(), kind: .bullet, text: "two", task: nil),
            task,
            NoteBlock(id: UUIDv7.make(), kind: .quote, text: "quoted", task: nil),
            NoteBlock(id: UUIDv7.make(), kind: .divider, text: "", task: nil),
        ])
        let blocks = NoteBodyCodec.blocks(from: body) { $0 == "Plan" ? "note-1" : nil }
        // bullets are grouped into one list
        #expect(blocks.map(\.type) == ["paragraph", "heading", "bulletList", "taskList", "blockquote", "horizontalRule"])
        #expect(blocks[0].inline.contains(.noteLink(noteId: "note-1", label: "Plan")))
        #expect(blocks[0].inline.contains(.tag("idea")))
        let back = NoteBodyCodec.body(from: blocks)
        #expect(back.blocks.map(\.id) == body.blocks.map(\.id))
        #expect(back.blocks.map(\.kind) == body.blocks.map(\.kind))
        #expect(back.blocks.map(\.text) == body.blocks.map(\.text))
        #expect(back.blocks[4].task?.scheduled == "2026-10-26")
        #expect(back.blocks[4].task?.deadline == "2026-10-30")
        #expect(back.blocks[4].task?.taskId == task.task?.taskId)
    }

    @Test func libraryPersistsIntoDocumentsAndReloads() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let library = LibraryStore(backend: try CoreLibrary(store: store, keys: keys))
        library.seedIfEmpty()
        let notebooks = library.notebooks(in: library.activeSpace?.id)
        let notebook = try #require(notebooks.first)
        let folder = library.createFolder(in: notebook.id, parent: nil, name: "Projects", color: .green)
        let note = library.createNote(in: notebook.id, folder: folder.id, title: "Spec")
        var body = NoteBody(blocks: [.paragraph("First #draft"), .task("Ship it", scheduled: "2026-10-27")])
        library.setBody(body, ofNote: note.id)
        body.blocks[0].text = "First edit #draft"
        library.setBody(body, ofNote: note.id)
        library.updateNote(note.id) { $0.style.paper = .grid }
        library.toggleStar(.note, note.id)

        // A fresh backend over the same store sees everything.
        let reloaded = LibraryStore(backend: try CoreLibrary(store: store, keys: keys))
        #expect(reloaded.spaces.map(\.name) == library.spaces.map(\.name))
        #expect(reloaded.folder(folder.id)?.name == "Projects")
        #expect(reloaded.folder(folder.id)?.color == .green)
        let again = try #require(reloaded.note(note.id))
        #expect(again.title == "Spec")
        #expect(again.folderId == folder.id)
        #expect(again.style.paper == .grid)
        #expect(reloaded.body(note.id).blocks.map(\.text) == ["First edit #draft", "Ship it"])
        #expect(reloaded.isStarred(.note, note.id))
        #expect(reloaded.taskEntries.contains { $0.text == "Ship it" && $0.attributes.scheduled == "2026-10-27" })
    }

    /// The user's cover image lives in `meta.cover` and its thumbnail in `NoteMeta.coverThumb`.
    @Test func coverImageAndThumbnailPersist() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let library = LibraryStore(backend: try CoreLibrary(store: store, keys: keys))
        library.seedIfEmpty()
        let notebooks = library.notebooks(in: library.activeSpace?.id)
        let notebook = try #require(notebooks.first)
        let note = library.createNote(in: notebook.id, folder: nil, title: "Trip")
        library.updateNote(note.id) {
            $0.coverImage = NoteCover(attachmentId: "cover-1", offsetY: 0.25)
            $0.coverThumb = "thumb-1"
        }
        let reloaded = LibraryStore(backend: try CoreLibrary(store: store, keys: keys))
        let again = try #require(reloaded.note(note.id))
        #expect(again.coverImage == NoteCover(attachmentId: "cover-1", offsetY: 0.25))
        #expect(again.coverThumb == "thumb-1")

        reloaded.updateNote(note.id) { $0.coverImage = nil; $0.coverThumb = nil }
        let cleared = LibraryStore(backend: try CoreLibrary(store: store, keys: keys))
        #expect(cleared.note(note.id)?.coverImage == nil)
        #expect(cleared.note(note.id)?.coverThumb == nil)
    }

    @Test func notebookMetaCarriesNamesForAgents() throws {
        let core = try CoreLibrary.inMemory()
        let library = LibraryStore(backend: core)
        let space = library.createSpace(name: "Work")
        let notebook = library.createNotebook(in: space.id, name: "Research", icon: "book", mode: .agent)
        let doc = try core.notebookDocument(notebook.id)
        #expect(doc.crdt.mapValue("meta", ["name"])?.stringValue == "Research")
        #expect(doc.crdt.mapValue("meta", ["space"])?["name"]?.stringValue == "Work")
        library.updateNotebook(notebook.id) { $0.name = "Papers" }
        #expect(doc.crdt.mapValue("meta", ["name"])?.stringValue == "Papers")
        #expect(core.account.notebook(id: notebook.id)?.mode == .agent)
    }

    @Test func trashAndDeleteForever() throws {
        let core = try CoreLibrary.inMemory()
        let library = LibraryStore(backend: core)
        library.seedIfEmpty()
        let notebooks = library.notebooks(in: library.activeSpace?.id)
        let notebook = try #require(notebooks.first)
        let note = library.createNote(in: notebook.id, title: "Temp")
        library.trash(note: note.id)
        #expect(try core.notebookDocument(notebook.id).note(id: note.id)?.isTrashed == true)
        library.deleteForever(note.id)
        #expect(try core.notebookDocument(notebook.id).note(id: note.id) == nil)
    }

    @Test func movingANoteRewrapsItsKey() throws {
        let secrets = InMemorySecretStore()
        let core = try CoreLibrary(store: try LocalStore.inMemory(), keys: KeyRing(store: secrets))
        let library = LibraryStore(backend: core)
        let space = library.createSpace(name: "S")
        let a = library.createNotebook(in: space.id, name: "A", mode: .private)
        let b = library.createNotebook(in: space.id, name: "B", mode: .private)
        let note = library.createNote(in: a.id, title: "Moving")
        library.move(note: note.id, toNotebook: b.id, folder: nil)
        let meta = try #require(try core.notebookDocument(b.id).note(id: note.id))
        #expect(try core.notebookDocument(a.id).note(id: note.id) == nil)
        // A fresh key ring (no cache) unwraps the note key with the new notebook's key.
        _ = try KeyRing(store: secrets).noteKey(noteId: note.id, wrappedKey: meta.wrappedKey, notebookId: b.id)
    }
}
#endif

#if canImport(DSCore)
@MainActor
struct CoreLibrarySafetyTests {
    /// Blocks the stand-in editor cannot show (here a code block and bold text) survive
    /// task toggles and text edits made through the library.
    @Test func editsDoNotTouchForeignBlocks() throws {
        let core = try CoreLibrary.inMemory()
        let library = LibraryStore(backend: core)
        let space = library.createSpace(name: "S")
        let notebook = library.createNotebook(in: space.id, name: "N", mode: .private)
        let task = NoteBlock.task("Ship")
        let para = NoteBlock.paragraph("Plain")
        let note = library.createNote(in: notebook.id, title: "Mixed", body: NoteBody(blocks: [para, task]))

        // Another client adds a code block and a bold paragraph.
        let doc = try core.noteDocument(note.id, notebookId: notebook.id)
        try doc.appendBlocks([
            DSCore.Block(type: BlockType.codeBlock, attrs: ["blockId": .string(value: DSCore.EntityID.make()),
                                                           "language": .string(value: "swift")],
                         inline: [.text("let x = 1", marks: [])]),
            .paragraph([.text("Bold", marks: [.bold])]),
        ])

        library.updateTask(noteId: note.id, blockId: task.id) { $0.state = .done }
        var body = library.body(note.id)
        body.blocks[0].text = "Plain, edited"
        library.setBody(body, ofNote: note.id)

        let blocks = try doc.blocks()
        #expect(blocks.contains { $0.type == BlockType.codeBlock && $0.text == "let x = 1" })
        #expect(blocks.contains { $0.inline.contains(.text("Bold", marks: [.bold])) })
        #expect(blocks.contains { $0.text == "Plain, edited" })
        let taskBlock = blocks.first { $0.type == BlockType.taskList }?.children.first
        #expect(taskBlock?.attrs["state"]?.stringValue == "done")
    }
}
#endif

#if canImport(DSCore)
/// Records what the library asks of the server side.
@MainActor
final class RecordingRemote: CoreLibraryRemote {
    var created: [(id: String, mode: Datascratch.NotebookMode)] = []
    var modeChanges: [(id: String, mode: Datascratch.NotebookMode, hasKey: Bool)] = []
    var deleted: [String] = []
    var opened: [String] = []

    func notebookCreated(id: String, mode: Datascratch.NotebookMode, wrappedKey: Data, key: Data) { created.append((id, mode)) }
    func notebookModeChanged(id: String, mode: Datascratch.NotebookMode, key: Data?) { modeChanges.append((id, mode, key != nil)) }
    func notebookDeleted(id: String) { deleted.append(id) }
    func documentOpened(_ crdt: CRDTDocument, notebookId: String?) { opened.append(crdt.docId) }
}

@MainActor
struct CoreLibraryRemoteTests {
    @Test func notebooksAndDocumentsReachTheServerSide() throws {
        let core = try CoreLibrary.inMemory()
        let remote = RecordingRemote()
        core.remote = remote
        #expect(remote.opened.contains(core.account.accountDocId))

        let library = LibraryStore(backend: core)
        let space = library.createSpace(name: "S")
        let notebook = library.createNotebook(in: space.id, name: "N", mode: .private)
        #expect(remote.created.map(\.id) == [notebook.id])
        #expect(remote.opened.contains(notebook.id))

        let note = library.createNote(in: notebook.id, title: "Hi")
        #expect(remote.opened.contains(note.id))
        // The key a share link carries is available for the note.
        #expect(try core.shareKey(for: Datascratch.ShareTarget(kind: .note, id: note.id))?.count == 32)

        library.setMode(.agent, forNotebook: notebook.id)
        #expect(remote.modeChanges.count == 1)
        #expect(remote.modeChanges.first?.hasKey == true)

        library.deleteNotebook(notebook.id)
        #expect(remote.deleted == [notebook.id])
    }
}
#endif
