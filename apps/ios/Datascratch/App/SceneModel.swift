import Foundation
import Observation
import SwiftUI

enum SidebarItem: Hashable {
    case allDocuments
    case tasks
    case calendar
    case starred
    case trash
    case notebook(String)
    case folder(String)
    case tag(String)
}

enum TaskDateField: Hashable {
    case scheduled, deadline
}

enum SceneSheet: Identifiable, Hashable {
    case newNotebook(spaceId: String)
    case editNotebook(String)
    case newSpace
    case editSpace(String)
    case newFolder(notebookId: String, parentId: String?)
    case editFolder(String)
    case settings
    case share(ShareTarget)
    case versions(noteId: String)
    case documentStyle(noteId: String)
    case move(noteId: String)
    case sharedLink(shareId: String, key: String?)
    case taskDate(noteId: String, blockId: String, field: TaskDateField)

    var id: Self { self }
}

/// Per-window navigation state (every window/Stage Manager scene has its own).
@Observable
final class SceneModel {
    let app: AppModel

    var sidebar: SidebarItem? = .allDocuments {
        didSet { if oldValue != sidebar { searchText = "" } }
    }
    var selectedNoteId: String?
    /// Which columns show; remembered between launches (iPad).
    var columnVisibility: NavigationSplitViewVisibility = .all {
        didSet { app.settings.columnLayout = Self.name(of: columnVisibility) }
    }
    /// The middle screen (tasks, calendar, a list) shown on the whole width in place of the document.
    var isContentFullScreen = false
    var preferredCompactColumn: NavigationSplitViewColumn = .sidebar
    var isCommandPalettePresented = false
    var sheet: SceneSheet?
    var searchText = ""
    var taskBucket: TaskIndex.Bucket = .today
    var calendarDay: String = DayKey.from(Date())
    var pendingModeChange: (notebookId: String, mode: NotebookMode)?
    /// A cover picker or the reposition sheet requested from a document menu.
    var coverAction: CoverAction?
    /// Open native editors by note id (`NativeEditorModel`), so a document screen that SwiftUI
    /// rebuilds keeps its editor, tool and undo history instead of starting over in Text mode.
    @ObservationIgnored private var editors: [(noteId: String, model: AnyObject)] = []

    func editor(for noteId: String) -> AnyObject? {
        editors.first { $0.noteId == noteId }?.model
    }

    func keepEditor(_ model: AnyObject, for noteId: String) {
        editors.removeAll { $0.noteId == noteId }
        editors.insert((noteId, model), at: 0)
        if editors.count > 3 { editors.removeLast(editors.count - 3) }
    }

    init(app: AppModel) {
        self.app = app
        if UIDevice.current.userInterfaceIdiom == .pad {
            columnVisibility = Self.visibility(named: app.settings.columnLayout)
        }
    }

    private static func name(of visibility: NavigationSplitViewVisibility) -> String {
        switch visibility {
        case .detailOnly: "detailOnly"
        case .doubleColumn: "doubleColumn"
        default: "all"
        }
    }

    private static func visibility(named name: String) -> NavigationSplitViewVisibility {
        switch name {
        case "detailOnly": .detailOnly
        case "doubleColumn": .doubleColumn
        default: .all
        }
    }

    var library: LibraryStore { app.library }

    /// Notebook + folder where "New note" puts a note, based on what is selected.
    var newNoteDestination: (notebookId: String, folderId: String?)? {
        switch sidebar {
        case .notebook(let id): return (id, nil)
        case .folder(let id):
            if let folder = library.folder(id) { return (folder.notebookId, folder.id) }
        default: break
        }
        if let current = selectedNoteId.flatMap({ library.note($0) }), current.kind == .note {
            return (current.notebookId, current.folderId)
        }
        guard let notebook = library.notebooks(in: library.activeSpace?.id).first else { return nil }
        return (notebook.id, nil)
    }

    @discardableResult
    func newNote(title: String = "") -> NoteMeta? {
        if newNoteDestination == nil, let space = library.activeSpace {
            library.createNotebook(in: space.id, name: String(localized: "Notes"), mode: .private)
        }
        guard let destination = newNoteDestination else { return nil }
        let note = library.createNote(in: destination.notebookId, folder: destination.folderId, title: title)
        if case .tag(let tag) = sidebar {
            library.setBody(NoteBody(blocks: [.paragraph("#\(tag) ")]), ofNote: note.id)
        }
        open(note.id)
        return note
    }

    func open(_ noteId: String) {
        withAnimation(Theme.Motion.snappy) {
            selectedNoteId = noteId
            preferredCompactColumn = .detail
            isContentFullScreen = false
            // iPad: opening a document hides the sidebar (list + document), as in Notes and Craft.
            if UIDevice.current.userInterfaceIdiom == .pad, columnVisibility == .all {
                columnVisibility = .doubleColumn
            }
        }
        library.openTab(noteId)
    }

    var isDocumentFullScreen: Bool { columnVisibility == .detailOnly }
    /// A window showing one document (no columns to hide).
    var isNoteWindow = false

    /// iPad: the document alone on screen, and back to list + document.
    func toggleDocumentFullScreen() {
        withAnimation(Theme.Motion.smooth) {
            columnVisibility = isDocumentFullScreen ? .doubleColumn : .detailOnly
        }
    }

    /// iPad: tasks, the calendar or a list on the whole width, and back to the columns.
    func toggleContentFullScreen() {
        withAnimation(Theme.Motion.smooth) {
            isContentFullScreen.toggle()
            columnVisibility = isContentFullScreen ? .detailOnly : .all
        }
    }

    /// Closes the open document and its tab (⌘W).
    func closeTab() {
        guard let id = selectedNoteId else { return }
        closeDocument()
        library.closeTab(id)
    }

    func closeDocument() {
        if let id = selectedNoteId { library.recordVersion(ofNote: id) }
        selectedNoteId = nil
        preferredCompactColumn = .content
    }

    func show(_ item: SidebarItem) {
        withAnimation(Theme.Motion.snappy) {
            if isContentFullScreen { isContentFullScreen = false; columnVisibility = .all }
            sidebar = item
            preferredCompactColumn = .content
        }
    }

    func openToday() {
        let today = DayKey.from(Date())
        calendarDay = today
        if let note = library.ensureDailyNote(for: today) {
            sidebar = .calendar
            open(note.id)
        }
    }

    func toggleSidebar() {
        withAnimation(Theme.Motion.smooth) {
            columnVisibility = columnVisibility == .detailOnly ? .all : .detailOnly
        }
    }

    func handle(_ route: AppRoute) {
        switch route {
        case .note(let id):
            if library.note(id) != nil { open(id) }
        case .today:
            openToday()
        case .share(let shareId, let key):
            sheet = .sharedLink(shareId: shareId, key: key)
        }
    }

    /// Request to change a notebook's encryption mode; the UI asks for confirmation.
    func requestModeChange(_ notebookId: String, to mode: NotebookMode) {
        guard library.notebook(notebookId)?.mode != mode else { return }
        pendingModeChange = (notebookId, mode)
    }

    func confirmModeChange() {
        guard let change = pendingModeChange else { return }
        library.setMode(change.mode, forNotebook: change.notebookId)
        pendingModeChange = nil
    }
}

extension FocusedValues {
    @Entry var sceneModel: SceneModel?
}
