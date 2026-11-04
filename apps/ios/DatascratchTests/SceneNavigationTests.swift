import Foundation
import Testing
@testable import Datascratch

/// Owner's feedback 2026-11-01: «Back» from a document goes one level up.
@MainActor
struct SceneNavigationTests {
    @Test func closingADocumentFromAllDocumentsShowsItsFolderOrNotebook() throws {
        let app = AppModel(options: .init(uiTesting: true, signedIn: true))
        let scene = SceneModel(app: app)
        let notebooks = app.library.notebooks(in: app.library.activeSpace?.id)
        let notebook = try #require(notebooks.first)
        let folder = app.library.createFolder(in: notebook.id, parent: nil, name: "Projects", icon: "folder", color: .blue)
        let inFolder = app.library.createNote(in: notebook.id, folder: folder.id, title: "Plan")
        let loose = app.library.createNote(in: notebook.id, folder: nil, title: "Loose")

        scene.show(.allDocuments)
        scene.open(inFolder.id)
        scene.closeDocument()
        #expect(scene.sidebar == .folder(folder.id))

        scene.show(.allDocuments)
        scene.open(loose.id)
        scene.closeDocument()
        #expect(scene.sidebar == .notebook(notebook.id))

        // A list chosen on purpose stays.
        scene.show(.starred)
        scene.open(loose.id)
        scene.closeDocument()
        #expect(scene.sidebar == .starred)
    }

    /// Owner's feedback 2026-11-03: closing a tab opens the tab next to it; the last one closed
    /// shows the document's folder or notebook.
    @Test func closingATabOpensItsNeighbour() throws {
        let app = AppModel(options: .init(uiTesting: true, signedIn: true))
        let scene = SceneModel(app: app)
        let notebooks = app.library.notebooks(in: app.library.activeSpace?.id)
        let notebook = try #require(notebooks.first)
        let a = app.library.createNote(in: notebook.id, folder: nil, title: "A")
        let b = app.library.createNote(in: notebook.id, folder: nil, title: "B")
        let c = app.library.createNote(in: notebook.id, folder: nil, title: "C")
        for note in [a, b, c] { scene.open(note.id) }
        let others = app.library.openTabs.map(\.id).filter { ![a.id, b.id, c.id].contains($0) }
        for id in others { app.library.closeTab(id) }

        scene.open(b.id)
        scene.closeTab()
        #expect(scene.selectedNoteId == c.id, "the next tab")
        scene.closeTab()
        #expect(scene.selectedNoteId == a.id, "the previous one when the closed tab was last")
        scene.show(.allDocuments)
        scene.closeTab()
        #expect(scene.selectedNoteId == nil)
        #expect(scene.sidebar == .notebook(notebook.id), "the last tab: back to its notebook")
        #expect(app.library.openTabs.isEmpty)
    }

    /// «Show in Folder»: the list shows the document's folder (or notebook) and it stays open.
    @Test func revealShowsTheFolderAndKeepsTheDocument() throws {
        let app = AppModel(options: .init(uiTesting: true, signedIn: true))
        let scene = SceneModel(app: app)
        let notebooks = app.library.notebooks(in: app.library.activeSpace?.id)
        let notebook = try #require(notebooks.first)
        let folder = app.library.createFolder(in: notebook.id, parent: nil, name: "Projects", icon: "folder", color: .blue)
        let inFolder = app.library.createNote(in: notebook.id, folder: folder.id, title: "Plan")
        let loose = app.library.createNote(in: notebook.id, folder: nil, title: "Loose")

        scene.show(.allDocuments)
        scene.open(inFolder.id)
        scene.reveal(inFolder.id)
        #expect(scene.sidebar == .folder(folder.id))
        #expect(scene.selectedNoteId == inFolder.id)

        scene.reveal(loose.id)
        #expect(scene.sidebar == .notebook(notebook.id))
    }
}
