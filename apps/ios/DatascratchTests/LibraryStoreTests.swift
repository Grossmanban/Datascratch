import Foundation
import Testing
import UIKit
@testable import Datascratch

@MainActor
struct LibraryStoreTests {
    private func makeStore() -> (LibraryStore, Notebook) {
        let store = LibraryStore(persistence: .inMemory)
        let space = store.createSpace(name: "Personal")
        let notebook = store.createNotebook(in: space.id, name: "Notes", mode: .private)
        return (store, notebook)
    }

    @Test func seedsOnce() {
        let store = LibraryStore(persistence: .inMemory)
        store.seedIfEmpty()
        let count = store.data.notes.count
        #expect(store.spaces.count == 2)
        #expect(!store.documents.isEmpty)
        store.seedIfEmpty()
        #expect(store.data.notes.count == count)
    }

    @Test func createsNotesInFoldersAndCountsSubtree() {
        let (store, notebook) = makeStore()
        let parent = store.createFolder(in: notebook.id, parent: nil, name: "Projects")
        let child = store.createFolder(in: notebook.id, parent: parent.id, name: "App")
        let note = store.createNote(in: notebook.id, folder: child.id, title: "Spec")
        #expect(store.folderSubtree(parent.id) == [parent.id, child.id])
        #expect(store.documents(inFolder: parent.id).map(\.id) == [note.id])
        #expect(store.documents(inNotebook: notebook.id).isEmpty)
    }

    @Test func deletingFolderTrashesItsNotes() {
        let (store, notebook) = makeStore()
        let folder = store.createFolder(in: notebook.id, parent: nil, name: "Old")
        let note = store.createNote(in: notebook.id, folder: folder.id, title: "Draft")
        store.deleteFolder(folder.id)
        #expect(store.folder(folder.id) == nil)
        #expect(store.note(note.id)?.isTrashed == true)
        #expect(store.note(note.id)?.folderId == nil)
    }

    @Test func trashLifecycleAndThirtyDayPurge() {
        let (store, notebook) = makeStore()
        var clock = Date(timeIntervalSince1970: 1_800_000_000)
        store.now = { clock }
        let note = store.createNote(in: notebook.id, title: "Temp")
        store.trash(note: note.id)
        #expect(store.trashed.map(\.id) == [note.id])
        #expect(store.daysLeftInTrash(store.note(note.id)!) == 30)
        #expect(!store.documents.contains { $0.id == note.id })

        store.restoreFromTrash(note.id)
        #expect(store.trashed.isEmpty)

        store.trash(note: note.id)
        clock = clock.addingTimeInterval(29 * 86_400)
        store.purgeExpiredTrash()
        #expect(store.note(note.id) != nil)
        clock = clock.addingTimeInterval(2 * 86_400)
        store.purgeExpiredTrash()
        #expect(store.note(note.id) == nil)
    }

    @Test func bodyUpdatesDerivedMeta() {
        let (store, notebook) = makeStore()
        let note = store.createNote(in: notebook.id, title: "Tagged")
        store.setBody(NoteBody(blocks: [.paragraph("Hello #Work")]), ofNote: note.id)
        #expect(store.note(note.id)?.tags == ["work"])
        #expect(store.note(note.id)?.snippet == "Hello #Work")
        #expect(store.documents(tagged: "work").count == 1)
    }

    @Test func backlinksByTitle() {
        let (store, notebook) = makeStore()
        let target = store.createNote(in: notebook.id, title: "Roadmap")
        let source = store.createNote(in: notebook.id, title: "Meeting",
                                      body: NoteBody(blocks: [.paragraph("See [[roadmap]]")]))
        #expect(store.backlinks(to: target.id).map(\.id) == [source.id])
    }

    @Test func dailyNotesAreCreatedOnDemandOnce() {
        let (store, _) = makeStore()
        let first = store.ensureDailyNote(for: "2026-10-25")
        let second = store.ensureDailyNote(for: "2026-10-25")
        #expect(first?.id == second?.id)
        #expect(first?.kind == .daily)
    }

    @Test func versionsRecordOnlyChanges() {
        let (store, notebook) = makeStore()
        let note = store.createNote(in: notebook.id, title: "V")
        store.recordVersion(ofNote: note.id)
        store.recordVersion(ofNote: note.id)
        #expect(store.versions(of: note.id).count == 1)
        store.setBody(NoteBody(blocks: [.paragraph("changed")]), ofNote: note.id)
        store.recordVersion(ofNote: note.id)
        let versions = store.versions(of: note.id)
        #expect(versions.count == 2)
        store.restore(version: versions.last!, ofNote: note.id)
        #expect(store.body(note.id).plainText.isEmpty)
    }

    @Test func deletingNotebookRemovesEverything() {
        let (store, notebook) = makeStore()
        let note = store.createNote(in: notebook.id, title: "Gone")
        store.toggleStar(.note, note.id)
        store.openTab(note.id)
        store.deleteNotebook(notebook.id)
        #expect(store.note(note.id) == nil)
        #expect(store.data.starred.isEmpty)
        #expect(store.data.tabs.isEmpty)
    }

    @Test func persistsAndReloads() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("lib-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: url) }
        let persistence = LibraryPersistence(fileURL: url)
        let store = LibraryStore(persistence: persistence)
        store.seedIfEmpty()
        store.flush()
        let reloaded = LibraryStore(persistence: persistence)
        #expect(reloaded.data.notes.count == store.data.notes.count)
        #expect(reloaded.spaces.map(\.name) == store.spaces.map(\.name))
    }

    @Test func movingTasksBetweenNotes() throws {
        let (store, notebook) = makeStore()
        let task = NoteBlock.task("Call")
        let a = store.createNote(in: notebook.id, title: "A", body: NoteBody(blocks: [task]))
        let b = store.createNote(in: notebook.id, title: "B")
        store.moveTask(from: a.id, blockId: task.id, to: b.id)
        #expect(!store.body(a.id).blocks.contains { $0.id == task.id })
        #expect(store.body(b.id).blocks.contains { $0.id == task.id })
    }
}

@MainActor
struct CoverImagesTests {
    private func pngData(width: Int, height: Int) -> Data {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format).pngData { context in
            UIColor.orange.setFill()
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        }
    }

    @Test func addingAnImageStoresACoverAndAThumbnail() async throws {
        let images = CoverImages.temporary()
        let added = try await images.add(pngData(width: 3000, height: 1500), noteId: "n1")
        let cover = try #require(images.image(added.cover, noteId: "n1"))
        let thumb = try #require(images.image(added.thumb, noteId: "n1"))
        #expect(cover.size.width * cover.scale <= CoverImages.maxCoverPixels)
        #expect(thumb.size.width * thumb.scale <= CoverImages.thumbPixels)

        let library = LibraryStore(persistence: .inMemory)
        library.seedIfEmpty()
        let documents = library.documents
        let note = try #require(documents.first)
        library.setCover(added, ofNote: note.id, images: images)
        #expect(library.note(note.id)?.coverImage?.attachmentId == added.cover)
        #expect(library.note(note.id)?.coverThumb == added.thumb)
        library.removeCover(ofNote: note.id, images: images)
        #expect(library.note(note.id)?.coverImage == nil)
        #expect(images.image(added.cover, noteId: "n1") == nil)
    }

    @Test func rejectsDataThatIsNotAnImage() async {
        await #expect(throws: CoverImages.CoverError.self) {
            _ = try await CoverImages.temporary().add(Data("hello".utf8), noteId: "n1")
        }
    }
}

@MainActor
struct SpaceSwitchTests {
    @Test func switchingSpacesKeepsTheDocuments() throws {
        let library = LibraryStore(persistence: .inMemory)
        library.seedIfEmpty()
        let first = try #require(library.activeSpace)
        let before = library.documents.map(\.id)
        #expect(!before.isEmpty)
        let other = library.createSpace(name: "Work")
        library.activateSpace(other.id)
        #expect(library.documents.isEmpty)
        library.activateSpace(first.id)
        #expect(library.documents.map(\.id) == before)
    }
}
