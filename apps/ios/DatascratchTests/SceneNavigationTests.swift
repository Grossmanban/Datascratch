import Foundation
import Testing
@testable import Datascratch

/// Owner's feedback 2026-11-01: «Back» from a document goes one level up.
@MainActor
struct SceneNavigationTests {
    @Test func closingADocumentFromAllDocumentsShowsItsFolderOrNotebook() throws {
        let app = AppModel(options: .init(uiTesting: true, signedIn: true))
        let scene = SceneModel(app: app)
        let notebook = try #require(app.library.notebooks(in: app.library.activeSpace?.id).first)
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
}
