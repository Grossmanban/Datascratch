import SwiftUI

/// Resolves a `SceneSheet` into its view.
struct SceneSheetView: View {
    @Environment(AppModel.self) private var app
    let sheet: SceneSheet

    var body: some View {
        let library = app.library
        switch sheet {
        case .newNotebook(let spaceId):
            NotebookEditor(spaceId: spaceId, notebook: nil)
        case .editNotebook(let id):
            if let notebook = library.notebook(id) {
                NotebookEditor(spaceId: notebook.spaceId, notebook: notebook)
            }
        case .newSpace:
            SpaceEditor(space: nil)
        case .editSpace(let id):
            SpaceEditor(space: library.spaces.first { $0.id == id })
        case .newFolder(let notebookId, let parentId):
            FolderEditor(notebookId: notebookId, parentId: parentId, folder: nil)
        case .editFolder(let id):
            if let folder = library.folder(id) {
                FolderEditor(notebookId: folder.notebookId, parentId: folder.parentId, folder: folder)
            }
        case .settings:
            SettingsView()
        case .share(let target):
            ShareSheet(target: target)
        case .versions(let noteId):
            VersionHistoryView(noteId: noteId)
        case .documentStyle(let noteId):
            DocumentStyleSheet(noteId: noteId)
                .presentationDetents([.medium, .large])
        case .move(let noteId):
            MoveNoteSheet(noteId: noteId)
        case .sharedLink(let shareId, let key, let server):
            SharedLinkView(shareId: shareId, key: key, server: server)
        case .invitations:
            InvitationsView()
        case .invitationLink(let id):
            InvitationLinkView(invitationId: id)
        case .webPage(let url):
            SafariView(url: url)
                .ignoresSafeArea()
        case .taskDate(let noteId, let blockId, let field):
            TaskDateSheet(noteId: noteId, blockId: blockId, field: field)
        }
    }
}
