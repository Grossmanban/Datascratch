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
    /// D-54: invitations to this account.
    case invitations
    /// D-54: one invitation, opened from its link.
    case invitationLink(String)
    /// A web page inside the app (another server's link, opened on purpose).
    case webPage(URL)
    case taskDate(noteId: String, blockId: String, field: TaskDateField)

    var id: Self { self }
}

/// Why a link did not open (`SceneModel.linkProblem`).
enum LinkProblem: Hashable {
    /// The link is of `host`, and this account is on another server (or on none).
    case otherServer(host: String, url: URL)
    /// A document link to a note this account does not have (or no longer has).
    case missingDocument
}

/// Per-window navigation state (every window/Stage Manager scene has its own).
@Observable
final class SceneModel {
    let app: AppModel

    var sidebar: SidebarItem? = .allDocuments {
        didSet {
            guard oldValue != sidebar else { return }
            searchText = ""
        }
    }
    var selectedNoteId: String? {
        didSet {
            if let fresh = freshNoteId, oldValue == fresh, selectedNoteId != fresh { leaveFreshNote(fresh) }
        }
    }

    /// A note just made with «New Note» in this window (spec/04, like Apple Notes): its title gets
    /// the caret; when it is left, an empty title takes the default («Note Oct 26, 2026») if the
    /// note has text, and a note left with nothing in it is dropped.
    var freshNoteId: String?

    private func leaveFreshNote(_ id: String) {
        freshNoteId = nil
        let isEmpty: Bool
        if let editor = editor(for: id) as? ClosingEditor {
            isEmpty = editor.finishNewNote()
        } else {
            isEmpty = library.note(id)?.title.isEmpty == true && library.body(id).blocks.allSatisfy { $0.text.isEmpty }
        }
        guard isEmpty, let note = library.note(id), note.title.isEmpty else { return }
        editors.removeAll { $0.noteId == id }
        library.deleteForever(id)
    }

    // MARK: iPad levels (D-47): 1 sidebar → 2 list (Tasks, Calendar) → 3 document
    //
    // At most two neighbouring levels on screen: sidebar | list, or list | document — never the
    // sidebar with a document. Opening a document slides the sidebar away; the sidebar button
    // slides it back (the document stays open and returns when picked); × closes the document;
    // «Full Screen» belongs to the document alone.

    enum PadLevel { case list, document }
    enum FullScreen { case document, content }

    /// The rightmost level shown: `.list` = sidebar | list, `.document` = list | document.
    var padLevel: PadLevel = .list
    /// The document alone on the screen.
    var fullScreen: FullScreen?

    var isDocumentFullScreen: Bool { fullScreen == .document }
    var isContentFullScreen: Bool { fullScreen == .content }

    /// What the iPad split view shows (sidebar | workspace).
    var padColumnVisibility: NavigationSplitViewVisibility {
        get { fullScreen != nil || (padLevel == .document && selectedNoteId != nil) ? .detailOnly : .all }
        set {
            // The sidebar button or the edge swipe.
            if fullScreen != nil {
                if newValue != .detailOnly { fullScreen = nil; padLevel = .list }
                return
            }
            padLevel = newValue == .detailOnly && selectedNoteId != nil ? .document : .list
        }
    }

    /// iPhone (and the compact width of a narrow window): the system's three-column stack.
    var columnVisibility: NavigationSplitViewVisibility = .all
    var preferredCompactColumn: NavigationSplitViewColumn = .sidebar {
        didSet {
            // iPhone: «Back» leaves the document without changing the selection.
            if !isPad, oldValue == .detail, preferredCompactColumn != .detail,
               let fresh = freshNoteId, selectedNoteId == fresh {
                leaveFreshNote(fresh)
            }
        }
    }

    /// A document is on screen (on iPhone the selection outlives «Back»).
    var isDocumentShown: Bool {
        selectedNoteId != nil && (isPad || preferredCompactColumn == .detail)
    }
    var isCommandPalettePresented = false
    var sheet: SceneSheet?
    var searchText = ""
    var taskBucket: TaskIndex.Bucket = .today
    var calendarDay: String = DayKey.from(Date())
    var pendingModeChange: (notebookId: String, mode: NotebookMode)?
    /// A `[[Title]]` with no note behind it: the document offers to create one.
    var missingNoteTitle: String?
    /// A link that cannot open here: another server's, or a document this account does not have.
    var linkProblem: LinkProblem?
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
        // `-ui-testing-folders`: start on the seeded notebook (its folder strip).
        if let id = app.notebookForTesting {
            sidebar = .notebook(id)
            preferredCompactColumn = .content
        }
        if let id = app.noteForTesting {
            selectedNoteId = id
            padLevel = .document
            preferredCompactColumn = .detail
        }
    }

    private var isPad: Bool { UIDevice.current.userInterfaceIdiom == .pad }

    var library: LibraryStore { app.library }

    /// Notebook + folder where "New note" puts a note, based on what is selected.
    /// Where «New Note» puts the note (spec/05): the open notebook or folder, else where the open
    /// document lies; in All Documents, a tag or search — the notebook last written or opened in
    /// this space (remembered on this device), else the space's first notebook.
    var newNoteDestination: (notebookId: String, folderId: String?)? {
        switch sidebar {
        case .notebook(let id) where canCreate(in: id): return (id, nil)
        case .folder(let id):
            if let folder = library.folder(id), canCreate(in: folder.notebookId) { return (folder.notebookId, folder.id) }
        default: break
        }
        if isDocumentShown, let current = selectedNoteId.flatMap({ library.note($0) }), current.kind == .note,
           canCreate(in: current.notebookId) {
            return (current.notebookId, current.folderId)
        }
        let notebooks = library.notebooks(in: library.activeSpace?.id).filter { canCreate(in: $0.id) }
        if let space = library.activeSpace?.id, let last = Self.lastNotebook(inSpace: space),
           notebooks.contains(where: { $0.id == last }), !library.isLocked(notebook: last) {
            return (last, nil)
        }
        guard let notebook = notebooks.first(where: { !library.isLocked(notebook: $0.id) }) ?? notebooks.first else { return nil }
        return (notebook.id, nil)
    }

    /// D-54: notes are made in this account's notebooks and in those shared with it to edit — not
    /// in «view only» ones, nor among notes shared on their own.
    func canCreate(in notebookId: String) -> Bool {
        guard notebookId != Notebook.sharedNotesId else { return false }
        return app.accountSharing.role(for: ShareTarget(kind: .notebook, id: notebookId)) != .viewer
    }

    /// Whether the list shown is a notebook or folder (then the «New Note» button needs no «in …»).
    var isShowingAContainer: Bool {
        switch sidebar {
        case .notebook, .folder: true
        default: false
        }
    }

    /// The notebook a new note goes to, named when the list shown is not that notebook.
    var newNoteDestinationName: String? {
        guard !isShowingAContainer, !isDocumentShown, let destination = newNoteDestination else { return nil }
        return library.notebook(destination.notebookId)?.name
    }

    private static let lastNotebookKey = "newNote.lastNotebookBySpace"

    static func lastNotebook(inSpace spaceId: String) -> String? {
        (UserDefaults.standard.dictionary(forKey: lastNotebookKey) as? [String: String])?[spaceId]
    }

    private func rememberNotebook(of note: NoteMeta) {
        guard let space = library.data.spaceId(ofNotebook: note.notebookId) else { return }
        var map = (UserDefaults.standard.dictionary(forKey: Self.lastNotebookKey) as? [String: String]) ?? [:]
        guard map[space] != note.notebookId else { return }
        map[space] = note.notebookId
        UserDefaults.standard.set(map, forKey: Self.lastNotebookKey)
    }

    /// «New Note»; `notebookId` when the person picked another notebook (long press on the button).
    @discardableResult
    func newNote(title: String = "", in notebookId: String? = nil) -> NoteMeta? {
        if newNoteDestination == nil, let space = library.activeSpace {
            library.createNotebook(in: space.id, name: String(localized: "Notes"), mode: .private)
        }
        let picked: (notebookId: String, folderId: String?)? = notebookId.map { (notebookId: $0, folderId: nil) }
        guard let destination = picked ?? newNoteDestination,
              !library.isLocked(notebook: destination.notebookId) else { return nil }
        let note = library.createNote(in: destination.notebookId, folder: destination.folderId, title: title)
        // In a tag's list the note gets the tag at once.
        if case .tag(let tag) = sidebar {
            library.setBody(NoteBody(blocks: [.paragraph("#\(tag) ")]), ofNote: note.id)
        }
        open(note.id)
        if title.isEmpty { freshNoteId = note.id }
        return note
    }

    func open(_ noteId: String) {
        // D-48: a document of another space (an old link) opens in its own space.
        if let space = library.data.spaceId(ofNote: noteId), space != library.activeSpace?.id {
            switchSpace(to: space, restoringTab: false)
        }
        withAnimation(Theme.Motion.snappy) {
            selectedNoteId = noteId
            preferredCompactColumn = .detail
            // List | document: the sidebar slides away (D-47).
            if fullScreen == .content { fullScreen = nil }
            padLevel = .document
        }
        // The notes-only app (D-51) neither shows nor writes tabs.
        if Features.tabs { library.openTab(noteId) }
        if let note = library.note(noteId), note.kind == .note { rememberNotebook(of: note) }
    }

    /// A window showing one document (no columns to hide).
    var isNoteWindow = false

    /// iPad: the document alone on screen, and back to what was there before.
    func toggleDocumentFullScreen() {
        withAnimation(Theme.Motion.smooth) {
            fullScreen = fullScreen == .document ? nil : .document
        }
    }

    /// Closes the open document and its tab (⌘W).
    func closeTab() {
        guard let id = selectedNoteId else { return }
        closeDocument()
        if Features.tabs { library.closeTab(id) }
    }

    func closeDocument() {
        if let id = selectedNoteId { library.recordVersion(ofNote: id) }
        withAnimation(Theme.Motion.smooth) {
            selectedNoteId = nil
            preferredCompactColumn = .content
            // Back to sidebar | list.
            fullScreen = nil
            padLevel = .list
        }
    }

    /// D-48: another space — its own tabs, its own active tab (restored), its own lists.
    func switchSpace(to id: String, restoringTab: Bool = true) {
        guard id != library.activeSpace?.id else { return }
        library.activateSpace(id)
        withAnimation(Theme.Motion.snappy) {
            switch sidebar {
            case .notebook, .folder, .tag: sidebar = .allDocuments
            default: break
            }
            selectedNoteId = restoringTab && Features.tabs ? library.activeTab : nil
            if selectedNoteId == nil {
                padLevel = .list
                preferredCompactColumn = .content
            }
        }
    }

    func show(_ item: SidebarItem) {
        withAnimation(Theme.Motion.snappy) {
            if fullScreen == .content { fullScreen = nil }
            sidebar = item
            preferredCompactColumn = .content
        }
    }

    func openToday() {
        guard Features.calendar else { return }
        let today = DayKey.from(Date())
        calendarDay = today
        if let note = library.ensureDailyNote(for: today) {
            sidebar = .calendar
            open(note.id)
        }
    }

    func toggleSidebar() {
        withAnimation(Theme.Motion.smooth) {
            if isPad {
                padColumnVisibility = padColumnVisibility == .detailOnly ? .all : .detailOnly
            } else {
                columnVisibility = columnVisibility == .detailOnly ? .all : .detailOnly
            }
        }
    }

    func handle(_ route: AppRoute) {
        switch route {
        case .note(let id):
            if library.note(id) != nil { open(id) } else { linkProblem = .missingDocument }
        case .noteTitled(let title):
            let key = title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let matches = { (note: NoteMeta) in
                !note.isTrashed && note.title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == key
            }
            // This space first (D-48); an old link to another space's document still opens it there.
            if let note = library.activeSpaceNotes.first(where: matches) ?? library.data.notes.first(where: matches) {
                open(note.id)
            } else {
                missingNoteTitle = title
            }
        case .today:
            openToday()
        case .share(let shareId, let key):
            sheet = .sharedLink(shareId: shareId, key: key)
        case .invitation(let id):
            sheet = .invitationLink(id)
        case .otherServer(let host, let url):
            linkProblem = .otherServer(host: host, url: url)
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

/// The editor of a note being left (`SceneModel.freshNoteId`).
@MainActor
protocol ClosingEditor: AnyObject {
    /// Gives an empty title its default if the note has text; returns whether nothing is in it.
    func finishNewNote() -> Bool
}

