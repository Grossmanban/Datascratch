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

    /// spec/07 «Выход из аккаунта»: signing out keeps the keys of notebooks the server has not
    /// received yet, so after signing in to the same account they upload and stay readable.
    @Test func unsentNotebookKeysSurviveSignOut() throws {
        let secrets = InMemorySecretStore()
        let keys = KeyRing(store: secrets)
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: keys)
        let library = LibraryStore(backend: core)
        library.seedIfEmpty()
        let notebooks = library.notebooks(in: library.activeSpace?.id)
        let notebook = try #require(notebooks.first)
        let note = library.createNote(in: notebook.id, folder: nil, title: "Offline")
        library.setBody(NoteBody(blocks: [.paragraph("Written before sign-out")]), ofNote: note.id)

        #expect(core.unsentNotebookIds.contains(notebook.id))
        #expect(core.unsentChangeCount > 0)
        let kept = core.unsentNotebookKeys()
        let key = try #require(kept[notebook.id])

        try keys.clear()
        core.restoreNotebookKeys(kept)

        let fresh = KeyRing(store: secrets)
        #expect(try fresh.notebookKey(notebook.id) == key)
        let reloaded = LibraryStore(backend: try CoreLibrary(store: store, keys: fresh))
        #expect(reloaded.body(note.id).blocks.map(\.text) == ["Written before sign-out"])
    }

    /// Prod, 2026-10-26: a notebook made on another device reached the iPad without its key; the
    /// first note written there made the app invent a key the server never saw, and the notebook
    /// got sealed with it. Now no key is invented for an existing notebook.
    @Test func noKeyIsInventedForANotebookWithoutOne() throws {
        let secrets = InMemorySecretStore()
        let keys = KeyRing(store: secrets)
        let core = try CoreLibrary(store: try LocalStore.inMemory(), keys: keys)
        let library = LibraryStore(backend: core)
        let space = library.createSpace(name: "S")
        let notebook = library.createNotebook(in: space.id, name: "Ии", mode: .private)
        let master = try #require(try keys.masterKey())
        try keys.clear()
        try keys.setMasterKey(master)
        #expect(core.notebooksWithoutKey == [notebook.id])

        _ = library.createNote(in: notebook.id, title: "Written without the key")
        #expect(try keys.notebookKey(notebook.id) == nil)
        #expect(core.notebooksWithoutKey == [notebook.id])
    }

    /// A key an earlier build invented is replaced by the server's; the notes it wrapped are
    /// re-wrapped, so they open with the server's key, and the notebook's state is sent again.
    @Test func serverNotebookKeyReplacesAnInventedOne() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: keys)
        let library = LibraryStore(backend: core)
        let space = library.createSpace(name: "S")
        let notebook = library.createNotebook(in: space.id, name: "Ии", mode: .agent)
        let serverKey = try #require(try keys.notebookKey(notebook.id))
        let invented = DSCrypto.newKey()
        try keys.setNotebookKey(invented, notebookId: notebook.id)
        let note = library.createNote(in: notebook.id, title: "Sealed with the invented key")
        let before = try store.outboxCount()

        #expect(core.adoptServerNotebookKeys([notebook.id: serverKey]) == [notebook.id])
        #expect(try keys.notebookKey(notebook.id) == serverKey)
        let meta = try #require(try core.notebookDocument(notebook.id).note(id: note.id))
        let wrapped = try #require(DSCore.Base64URL.decode(meta.wrappedKey))
        #expect((try? DSCrypto.unwrapKey(wrapped, with: serverKey, ad: CryptoAD.noteKey(note.id))) != nil)
        #expect(try store.outboxCount() > before)
        // Matching keys: nothing to do.
        #expect(core.adoptServerNotebookKeys([notebook.id: serverKey]).isEmpty)
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

    /// Build 4 feedback (iPad, local account): after a new space «Тест» with a notebook and a
    /// document, the welcome document vanished from «Личное». It must stay, starred and tagged,
    /// also after a relaunch.
    @Test func newSpaceKeepsTheWelcomeDocument() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let library = LibraryStore(backend: try CoreLibrary(store: store, keys: keys))
        library.seedIfEmpty()
        let personal = try #require(library.activeSpace)
        let welcome = library.documents.map(\.id)
        let starred = library.starredNotes.map(\.id)
        let tags = library.tags.map(\.name)
        #expect(!welcome.isEmpty)

        let test = library.createSpace(name: "Тест")
        library.activateSpace(test.id)
        let notebook = library.createNotebook(in: test.id, name: "Черновики", mode: .private)
        _ = library.createNote(in: notebook.id, folder: nil, title: "Начало пути")
        #expect(library.documents.map(\.title) == ["Начало пути"])

        library.activateSpace(personal.id)
        #expect(library.documents.map(\.id) == welcome)
        #expect(library.starredNotes.map(\.id) == starred)
        #expect(library.tags.map(\.name) == tags)

        let relaunched = LibraryStore(backend: try CoreLibrary(store: store, keys: keys))
        relaunched.activateSpace(personal.id)
        #expect(relaunched.documents.map(\.id) == welcome)
        #expect(relaunched.starredNotes.map(\.id) == starred)
    }

    /// Build 5 (iPad): signing in after working «On this device» switched to the server's account
    /// document and left the device library behind; its notebooks were never created on the
    /// server, so POST /docs answered 404 and sync hung. Now the library is carried in.
    @Test func signingInCarriesTheDeviceLibrary() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: keys)
        let library = LibraryStore(backend: core)
        library.seedIfEmpty()
        let test = library.createSpace(name: "Тест")
        let notebook = library.createNotebook(in: test.id, name: "Заметки", mode: .private)
        _ = library.createNote(in: notebook.id, folder: nil, title: "Начало пути")
        let notes = Set(library.data.notes.map(\.id))
        let notebooks = Set(library.data.notebooks.map(\.id))
        let starred = library.starredNotes.map(\.id)
        let localAccount = core.account.accountDocId

        // Sign in: the account's master key replaces the device one.
        try keys.setMasterKey(DSCrypto.newKey())
        let carried = try core.adoptAccount(docId: DSCore.EntityID.make(), isNew: true)
        #expect(Set(carried.map(\.id)) == notebooks)
        #expect(Set(library.data.notebooks.map(\.id)) == notebooks)
        #expect(Set(library.data.notes.map(\.id)) == notes)
        #expect(library.starredNotes.map(\.id) == starred)
        #expect(library.spaces.contains { $0.name == "Тест" })
        // The device-only account document is gone and is not carried twice.
        #expect(try store.document(localAccount) == nil)
        #expect(try core.carryDeviceLibraries().isEmpty)
        // No second welcome document after sign-up seeding.
        library.seedIfEmpty()
        #expect(Set(library.data.notes.map(\.id)) == notes)
    }

    /// Build 5 signed up without carrying: the new account got first-run content of its own, the
    /// device library stayed behind. The next launch carries it in and merges what doubled up.
    @Test func carryingAfterAnEarlierSignUpLeavesNoDuplicates() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: keys)
        let library = LibraryStore(backend: core)
        library.seedIfEmpty()
        let test = library.createSpace(name: "Тест")
        let personal = try #require(library.spaces.first)
        let notes = try #require(library.notebooks(in: personal.id).first)
        let mine = ["Начало пути", "Идеи", "План"].map { library.createNote(in: notes.id, folder: nil, title: $0).id }
        let localAccount = core.account.accountDocId

        // Build 5: sign-up switched documents without carrying, and seeded the new account.
        try store.setRegistered(localAccount)
        try keys.setMasterKey(DSCrypto.newKey())
        let accountId = DSCore.EntityID.make()
        _ = try core.adoptAccount(docId: accountId, isNew: true)
        library.seedIfEmpty()
        #expect(!library.data.notes.contains { mine.contains($0.id) })

        // Build 6: the device library comes in on the next start, then the duplicates merge.
        try store.setRegistered(localAccount, false)
        let carried = try core.adoptAccount(docId: accountId, isNew: false)
        #expect(!carried.isEmpty)
        #expect(core.needsCarriedMerge)
        library.mergeCarriedDuplicates()

        let names = library.spaces.map(\.name)
        #expect(names.count == Set(names).count, "spaces doubled: \(names)")
        #expect(library.spaces.contains { $0.id == test.id })
        for space in library.spaces {
            let notebookNames = library.notebooks(in: space.id).map(\.name)
            #expect(notebookNames.count == Set(notebookNames).count, "notebooks doubled in \(space.name): \(notebookNames)")
        }
        let live = library.data.notes.filter { !$0.isTrashed }
        #expect(Set(mine).isSubset(of: Set(live.map(\.id))))
        #expect(live.filter { $0.title == LibraryStore.welcomeTitle }.count == 1)
        #expect(live.filter { $0.kind == .inbox }.count == 1)
        let daily = try #require(library.dailyNotebook)
        #expect(live.contains { $0.notebookId == daily.id && mine.contains($0.id) })
    }

    /// Build 6 carried without merging; the next start (build 8) merges the first-run twins but
    /// leaves spaces a person named alike on purpose.
    @Test func startAfterABuild6CarryMergesTheTwins() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: keys)
        let library = LibraryStore(backend: core)
        library.seedIfEmpty()
        let personal = try #require(library.spaces.first)
        let notes = try #require(library.notebooks(in: personal.id).first)
        let mine = ["Начало пути", "Идеи"].map { library.createNote(in: notes.id, folder: nil, title: $0).id }
        let localAccount = core.account.accountDocId

        // Build 5 sign-up seeded the account; build 6 carried the device library, no merge.
        try store.setRegistered(localAccount)
        try keys.setMasterKey(DSCrypto.newKey())
        let accountId = DSCore.EntityID.make()
        _ = try core.adoptAccount(docId: accountId, isNew: true)
        library.seedIfEmpty()
        let twinA = library.createSpace(name: "Проекты")
        let twinB = library.createSpace(name: "Проекты")
        try store.setRegistered(localAccount, false)
        _ = try core.adoptAccount(docId: accountId, isNew: false)
        core.needsCarriedMerge = false
        #expect(library.spaces.filter { $0.name == String(localized: "Personal") }.count == 2)

        // Build 8 start: not a fresh carry.
        library.mergeCarriedDuplicates(anyName: false)
        #expect(library.spaces.filter { $0.name == String(localized: "Personal") }.count == 1)
        #expect(library.spaces.filter { $0.name == String(localized: "Work") }.count == 1)
        #expect(library.spaces.contains { $0.id == twinA.id } && library.spaces.contains { $0.id == twinB.id })
        let live = library.data.notes.filter { !$0.isTrashed }
        #expect(Set(mine).isSubset(of: Set(live.map(\.id))))
        #expect(live.filter { $0.title == LibraryStore.welcomeTitle }.count == 1)
        let kept = try #require(library.spaces.first { $0.name == String(localized: "Personal") })
        let notebookNames = library.notebooks(in: kept.id).map(\.name)
        #expect(notebookNames.count == Set(notebookNames).count, "notebooks doubled: \(notebookNames)")
        // Idempotent.
        let before = library.data
        library.mergeCarriedDuplicates(anyName: false)
        #expect(library.data.spaces == before.spaces && library.data.notebooks == before.notebooks)
    }

    /// Both «Notes» twins hold the person's notes (some written in the account after build 5):
    /// the notes move into one notebook, one Inbox stays.
    @Test func twinNotebooksWithNotesBecomeOne() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: keys)
        let library = LibraryStore(backend: core)
        library.seedIfEmpty()
        let localSpace = try #require(library.spaces.first)
        let localNotes = try #require(library.notebooks(in: localSpace.id).first)
        let early = library.createNote(in: localNotes.id, folder: nil, title: "До входа").id
        let localAccount = core.account.accountDocId

        try store.setRegistered(localAccount)
        try keys.setMasterKey(DSCrypto.newKey())
        let accountId = DSCore.EntityID.make()
        _ = try core.adoptAccount(docId: accountId, isNew: true)
        library.seedIfEmpty()
        let accountSpace = try #require(library.spaces.first)
        let accountNotes = try #require(library.notebooks(in: accountSpace.id).first)
        let later = library.createNote(in: accountNotes.id, folder: nil, title: "После входа").id
        try store.setRegistered(localAccount, false)
        _ = try core.adoptAccount(docId: accountId, isNew: false)
        core.needsCarriedMerge = false

        library.mergeCarriedDuplicates(anyName: false)
        let personal = try #require(library.spaces.first { $0.name == String(localized: "Personal") })
        let notebooks = library.notebooks(in: personal.id).filter { $0.name == String(localized: "Notes") }
        #expect(notebooks.count == 1)
        let kept = try #require(notebooks.first)
        let live = library.data.notes.filter { !$0.isTrashed }
        #expect(live.first { $0.id == early }?.notebookId == kept.id)
        #expect(live.first { $0.id == later }?.notebookId == kept.id)
        #expect(live.filter { $0.kind == .inbox }.count == 1)
        #expect(live.filter { $0.title == LibraryStore.welcomeTitle }.count == 1)
        #expect(library.dailyNotebook?.id == kept.id)
    }

    /// spec/07: «Delete data from this device» (and signing in to another account) leaves an
    /// empty library, new keys and nothing to send.
    @Test func wipingLocalDataLeavesNothingBehind() throws {
        let keys = KeyRing(store: InMemorySecretStore())
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: keys)
        let library = LibraryStore(backend: core)
        library.seedIfEmpty()
        let space = try #require(library.spaces.first)
        let notebook = try #require(library.notebooks(in: space.id).first)
        let note = library.createNote(in: notebook.id, folder: nil, title: "Секрет")
        let oldAccount = core.account.accountDocId
        let oldMaster = try keys.masterKey()

        try core.wipeLocalData()
        #expect(library.data.notes.isEmpty)
        #expect(library.data.spaces.isEmpty)
        #expect(try store.document(note.id) == nil)
        #expect(try store.document(notebook.id) == nil)
        #expect(try store.document(oldAccount) == nil)
        #expect(core.account.accountDocId != oldAccount)
        #expect(try keys.notebookKey(notebook.id) == nil)
        #expect(try keys.masterKey() != oldMaster)
        #expect(core.pendingMoves.isEmpty)
        // Nothing of the old library is carried into the next account.
        #expect(try core.carryDeviceLibraries().isEmpty)
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
        // The colour is copied too (document-model §3), and a space rename reaches the copy.
        library.updateNotebook(notebook.id) { $0.color = .green }
        #expect(doc.metaCopy?.color == Datascratch.Tint.green.rawValue)
        library.updateSpace(space.id) { $0.name = "Job" }
        #expect(doc.metaCopy?.spaceName == "Job")
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

    /// A move tells the server (`PATCH /docs/:id`) and stays pending until it answers; the local
    /// record follows the note to the new notebook.
    @Test func movingANoteTellsTheServer() throws {
        let store = try LocalStore.inMemory()
        let core = try CoreLibrary(store: store, keys: KeyRing(store: InMemorySecretStore()))
        let remote = RecordingRemote()
        core.remote = remote
        let library = LibraryStore(backend: core)
        let space = library.createSpace(name: "S")
        let a = library.createNotebook(in: space.id, name: "A", mode: .private)
        let b = library.createNotebook(in: space.id, name: "B", mode: .private)
        let note = library.createNote(in: a.id, title: "Moving")
        library.move(note: note.id, toNotebook: b.id, folder: nil)
        #expect(remote.moved.map(\.noteId) == [note.id])
        #expect(remote.moved.first?.notebookId == b.id)
        #expect(try store.document(note.id)?.notebookId == b.id)
        #expect(core.pendingMoves == [note.id: b.id])
        // An answer for an older move does not clear a newer one.
        core.moveDelivered(note.id, toNotebook: a.id)
        #expect(core.pendingMoves == [note.id: b.id])
        core.moveDelivered(note.id, toNotebook: b.id)
        #expect(core.pendingMoves.isEmpty)
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
    var deletedDocs: [String] = []

    func notebookCreated(id: String, mode: Datascratch.NotebookMode, wrappedKey: Data, key: Data) { created.append((id, mode)) }
    func notebookModeChanged(id: String, mode: Datascratch.NotebookMode, key: Data?) { modeChanges.append((id, mode, key != nil)) }
    func notebookDeleted(id: String) { deleted.append(id) }
    func documentDeleted(_ docId: String) { deletedDocs.append(docId) }
    var moved: [(noteId: String, notebookId: String)] = []
    func noteMoved(_ noteId: String, toNotebook notebookId: String) { moved.append((noteId, notebookId)) }
    func documentOpened(_ crdt: CRDTDocument, notebookId: String?) { opened.append(crdt.docId) }
    var keysMissing = 0
    func notebookKeysMissing() { keysMissing += 1 }
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
