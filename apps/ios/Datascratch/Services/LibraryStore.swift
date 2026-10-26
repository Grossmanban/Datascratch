import Foundation
import Observation

/// Everything the account + notebook documents hold, as one persisted value.
nonisolated struct LibrarySnapshot: Codable, Sendable {
    var formatVersion = 1
    var spaces: [Space] = []
    var notebooks: [Notebook] = []
    var folders: [Folder] = []
    var notes: [NoteMeta] = []
    var bodies: [String: NoteBody] = [:]
    var versions: [String: [NoteVersion]] = [:]
    var starred: [StarRef] = []
    var tabs: [String] = []
    var activeSpaceId: String?
    var dailyNotebookId: String?
    var tagColors: [String: Tint] = [:]
}

/// Where the snapshot lives. `nil` file = in memory only (previews, UI tests).
nonisolated struct LibraryPersistence: Sendable {
    let fileURL: URL?

    static let inMemory = LibraryPersistence(fileURL: nil)

    static func appSupport(named name: String = "Library.json") -> LibraryPersistence {
        let dir = (try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                                appropriateFor: nil, create: true))
            ?? FileManager.default.temporaryDirectory
        return LibraryPersistence(fileURL: dir.appendingPathComponent(name))
    }

    func load() -> LibrarySnapshot? {
        guard let fileURL, let data = try? Data(contentsOf: fileURL) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(LibrarySnapshot.self, from: data)
    }

    func save(_ snapshot: LibrarySnapshot) {
        guard let fileURL else { return }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(snapshot) else { return }
        try? data.write(to: fileURL, options: [.atomic, .completeFileProtection])
    }

    func erase() {
        guard let fileURL else { return }
        try? FileManager.default.removeItem(at: fileURL)
    }
}

/// Where the library lives besides memory. With DSCore linked this is the Yrs
/// documents + GRDB store (`CoreLibrary`); otherwise the JSON file.
protocol LibraryBackend: AnyObject {
    func loadSnapshot() -> LibrarySnapshot
    /// Writes the difference between two snapshots (called after every mutation).
    func persist(from old: LibrarySnapshot, to new: LibrarySnapshot)
    /// Called with a fresh snapshot when documents change from outside (sync).
    var onExternalChange: ((LibrarySnapshot) -> Void)? { get set }
    /// Notebooks this device can't write into yet (their key has not arrived).
    var lockedNotebookIds: Set<String> { get }
}

extension LibraryBackend {
    var lockedNotebookIds: Set<String> { [] }
}

/// The library as one observable value for the UI. All mutations go through
/// here; a `LibraryBackend` (DSCore documents) or a JSON file persists them.
@Observable
final class LibraryStore {
    static let trashRetentionDays = 30
    static let maxVersionsPerNote = 50

    private(set) var data: LibrarySnapshot
    @ObservationIgnored private let persistence: LibraryPersistence
    @ObservationIgnored private let backend: (any LibraryBackend)?
    @ObservationIgnored private var saveTask: Task<Void, Never>?
    @ObservationIgnored var now: () -> Date = { Date() }
    /// Called after every local mutation (the sync engine queues an update).
    @ObservationIgnored var onLocalChange: (() -> Void)?

    init(persistence: LibraryPersistence) {
        self.persistence = persistence
        self.backend = nil
        self.data = persistence.load() ?? LibrarySnapshot()
    }

    init(backend: any LibraryBackend) {
        self.persistence = .inMemory
        self.backend = backend
        self.data = backend.loadSnapshot()
        self.lockedNotebookIds = backend.lockedNotebookIds
        backend.onExternalChange = { [weak self, weak backend] snapshot in
            self?.data = snapshot
            self?.lockedNotebookIds = backend?.lockedNotebookIds ?? []
        }
    }

    /// Notebooks made on another device whose key this device is still fetching: shown, but
    /// nothing can be written into them until the key is here.
    private(set) var lockedNotebookIds: Set<String> = []

    func isLocked(notebook id: String) -> Bool { lockedNotebookIds.contains(id) }

    // MARK: - Reading

    var spaces: [Space] { data.spaces.sorted { $0.order < $1.order } }

    var activeSpace: Space? {
        data.spaces.first { $0.id == data.activeSpaceId } ?? spaces.first
    }

    func notebooks(in spaceId: String?) -> [Notebook] {
        data.notebooks.filter { spaceId == nil || $0.spaceId == spaceId }.sorted { $0.order < $1.order }
    }

    func notebook(_ id: String) -> Notebook? { data.notebooks.first { $0.id == id } }
    func folder(_ id: String) -> Folder? { data.folders.first { $0.id == id } }
    func note(_ id: String) -> NoteMeta? { data.notes.first { $0.id == id } }
    func body(_ noteId: String) -> NoteBody { data.bodies[noteId] ?? .empty }

    func folders(in notebookId: String, parent: String?) -> [Folder] {
        data.folders.filter { $0.notebookId == notebookId && $0.parentId == parent }
            .sorted { $0.order < $1.order }
    }

    /// Folder and all nested folder ids.
    func folderSubtree(_ folderId: String) -> Set<String> {
        var result: Set<String> = [folderId]
        var frontier = [folderId]
        while let next = frontier.popLast() {
            for child in data.folders where child.parentId == next && !result.contains(child.id) {
                result.insert(child.id)
                frontier.append(child.id)
            }
        }
        return result
    }

    /// Visible (not trashed, ordinary) notes of the active space.
    var documents: [NoteMeta] {
        let ids = Set(notebooks(in: activeSpace?.id).map(\.id))
        return data.notes.filter { ids.contains($0.notebookId) && !$0.isTrashed && $0.kind != .inbox }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    func documents(inNotebook id: String) -> [NoteMeta] {
        documents.filter { $0.notebookId == id && $0.folderId == nil }
    }

    func documents(inFolder id: String) -> [NoteMeta] {
        let subtree = folderSubtree(id)
        return documents.filter { $0.folderId.map { subtree.contains($0) } ?? false }
    }

    func documents(tagged tag: String) -> [NoteMeta] {
        documents.filter { note in note.tags.contains { $0 == tag || $0.hasPrefix(tag + "/") } }
    }

    var starredNotes: [NoteMeta] {
        data.starred.filter { $0.kind == .note }.compactMap { ref in note(ref.id) }.filter { !$0.isTrashed }
    }

    var trashed: [NoteMeta] {
        data.notes.filter(\.isTrashed).sorted { ($0.trashedAt ?? .distantPast) > ($1.trashedAt ?? .distantPast) }
    }

    /// Tag name → number of documents, nested tags included.
    var tags: [(name: String, count: Int)] {
        var counts: [String: Int] = [:]
        for note in documents { for tag in note.tags { counts[tag, default: 0] += 1 } }
        return counts.map { ($0.key, $0.value) }.sorted { $0.name < $1.name }
    }

    func isStarred(_ kind: StarRef.Kind, _ id: String) -> Bool {
        data.starred.contains(StarRef(kind: kind, id: id))
    }

    func backlinks(to noteId: String) -> [NoteMeta] {
        guard let target = note(noteId) else { return [] }
        let title = target.title.lowercased()
        guard !title.isEmpty else { return [] }
        return documents.filter { other in
            other.id != noteId && body(other.id).linkedTitles.contains { $0.lowercased() == title }
        }
    }

    func search(_ query: String) -> [NoteMeta] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return documents }
        return documents.filter {
            $0.title.lowercased().contains(q) || body($0.id).plainText.lowercased().contains(q)
                || $0.tags.contains { $0.contains(q) }
        }
    }

    func daysLeftInTrash(_ note: NoteMeta) -> Int {
        guard let trashedAt = note.trashedAt else { return Self.trashRetentionDays }
        let elapsed = Calendar.current.dateComponents([.day], from: trashedAt, to: now()).day ?? 0
        return max(0, Self.trashRetentionDays - elapsed)
    }

    var openTabs: [NoteMeta] { data.tabs.compactMap { note($0) }.filter { !$0.isTrashed } }

    var dailyNotebook: Notebook? {
        data.dailyNotebookId.flatMap { notebook($0) } ?? notebooks(in: activeSpace?.id).first
    }

    func dailyNote(for day: String) -> NoteMeta? {
        data.notes.first { $0.kind == .daily && $0.dailyDate == day && !$0.isTrashed }
    }

    func versions(of noteId: String) -> [NoteVersion] {
        (data.versions[noteId] ?? []).sorted { $0.id > $1.id }
    }

    // MARK: - Spaces

    @discardableResult
    func createSpace(name: String, icon: String = "square.stack", color: Tint = .blue) -> Space {
        let space = Space(id: UUIDv7.make(), name: name, icon: icon, color: color,
                          order: (data.spaces.map(\.order).max() ?? 0) + 1, createdAt: now())
        mutate {
            $0.spaces.append(space)
            if $0.activeSpaceId == nil { $0.activeSpaceId = space.id }
        }
        return space
    }

    func updateSpace(_ id: String, _ change: (inout Space) -> Void) {
        mutate { snapshot in
            guard let index = snapshot.spaces.firstIndex(where: { $0.id == id }) else { return }
            change(&snapshot.spaces[index])
        }
    }

    func activateSpace(_ id: String) {
        mutate { $0.activeSpaceId = id }
    }

    /// Deletes a space with all its notebooks (moves notes to trash first).
    func deleteSpace(_ id: String) {
        guard data.spaces.count > 1 else { return }
        for notebook in notebooks(in: id) { deleteNotebook(notebook.id) }
        mutate { snapshot in
            snapshot.spaces.removeAll { $0.id == id }
            if snapshot.activeSpaceId == id { snapshot.activeSpaceId = snapshot.spaces.first?.id }
        }
    }

    // MARK: - Notebooks

    @discardableResult
    func createNotebook(in spaceId: String, name: String, icon: String = "book.closed",
                        color: Tint = .blue, mode: NotebookMode) -> Notebook {
        let notebook = Notebook(id: UUIDv7.make(), spaceId: spaceId, name: name, icon: icon, color: color,
                                order: (data.notebooks.map(\.order).max() ?? 0) + 1,
                                mode: mode, createdAt: now())
        mutate {
            $0.notebooks.append(notebook)
            if $0.dailyNotebookId == nil { $0.dailyNotebookId = notebook.id }
        }
        return notebook
    }

    func updateNotebook(_ id: String, _ change: (inout Notebook) -> Void) {
        mutate { snapshot in
            guard let index = snapshot.notebooks.firstIndex(where: { $0.id == id }) else { return }
            change(&snapshot.notebooks[index])
        }
    }

    func setMode(_ mode: NotebookMode, forNotebook id: String) {
        updateNotebook(id) { $0.mode = mode }
    }

    func deleteNotebook(_ id: String) {
        mutate { snapshot in
            let noteIds = Set(snapshot.notes.filter { $0.notebookId == id }.map(\.id))
            snapshot.notebooks.removeAll { $0.id == id }
            snapshot.folders.removeAll { $0.notebookId == id }
            snapshot.notes.removeAll { noteIds.contains($0.id) }
            for noteId in noteIds {
                snapshot.bodies[noteId] = nil
                snapshot.versions[noteId] = nil
            }
            snapshot.starred.removeAll { $0.id == id || noteIds.contains($0.id) }
            snapshot.tabs.removeAll { noteIds.contains($0) }
            if snapshot.dailyNotebookId == id { snapshot.dailyNotebookId = snapshot.notebooks.first?.id }
        }
    }

    // MARK: - Folders

    @discardableResult
    func createFolder(in notebookId: String, parent: String?, name: String,
                      icon: String = "folder", color: Tint = .gray) -> Folder {
        let folder = Folder(id: UUIDv7.make(), notebookId: notebookId, parentId: parent, name: name,
                            icon: icon, color: color,
                            order: (folders(in: notebookId, parent: parent).map(\.order).max() ?? 0) + 1,
                            createdAt: now())
        mutate { $0.folders.append(folder) }
        return folder
    }

    func updateFolder(_ id: String, _ change: (inout Folder) -> Void) {
        mutate { snapshot in
            guard let index = snapshot.folders.firstIndex(where: { $0.id == id }) else { return }
            change(&snapshot.folders[index])
        }
    }

    /// Deletes a folder and its subfolders; their notes go to the trash.
    func deleteFolder(_ id: String) {
        let subtree = folderSubtree(id)
        let trashedAt = now()
        mutate { snapshot in
            snapshot.folders.removeAll { subtree.contains($0.id) }
            for index in snapshot.notes.indices where snapshot.notes[index].folderId.map({ subtree.contains($0) }) ?? false {
                snapshot.notes[index].folderId = nil
                if snapshot.notes[index].trashedAt == nil { snapshot.notes[index].trashedAt = trashedAt }
            }
            snapshot.starred.removeAll { $0.kind == .folder && subtree.contains($0.id) }
        }
    }

    // MARK: - Notes

    @discardableResult
    func createNote(in notebookId: String, folder: String? = nil, title: String = "",
                    kind: NoteKind = .note, dailyDate: String? = nil,
                    body: NoteBody = .empty, cover: Backdrop? = nil) -> NoteMeta {
        let date = now()
        var meta = NoteMeta(id: UUIDv7.make(date: date), notebookId: notebookId, folderId: folder,
                            parentNoteId: nil, title: title, kind: kind, dailyDate: dailyDate,
                            tags: [], icon: nil, cover: cover, backdrop: .none, style: NoteStyle(),
                            snippet: "", createdAt: date, updatedAt: date, trashedAt: nil,
                            order: (data.notes.map(\.order).max() ?? 0) + 1)
        Self.refreshDerived(&meta, body: body)
        mutate {
            $0.notes.append(meta)
            $0.bodies[meta.id] = body
        }
        return meta
    }

    func updateNote(_ id: String, _ change: (inout NoteMeta) -> Void) {
        mutate { snapshot in
            guard let index = snapshot.notes.firstIndex(where: { $0.id == id }) else { return }
            change(&snapshot.notes[index])
        }
    }

    func setTitle(_ title: String, ofNote id: String) {
        updateNote(id) { meta in
            meta.title = title
            meta.updatedAt = self.now()
        }
    }

    func setBody(_ body: NoteBody, ofNote id: String) {
        guard data.bodies[id] != body else { return }
        mutate { snapshot in
            snapshot.bodies[id] = body
            guard let index = snapshot.notes.firstIndex(where: { $0.id == id }) else { return }
            Self.refreshDerived(&snapshot.notes[index], body: body)
            snapshot.notes[index].updatedAt = self.now()
        }
    }

    /// Records a version for history (stand-in for server snapshots, `/docs/:id/versions`).
    func recordVersion(ofNote id: String) {
        guard let meta = note(id) else { return }
        let body = body(id)
        var list = data.versions[id] ?? []
        if let last = list.max(by: { $0.id < $1.id }), last.body == body, last.title == meta.title { return }
        let seq = (list.map(\.id).max() ?? 0) + 1
        list.append(NoteVersion(id: seq, createdAt: now(), title: meta.title, body: body))
        if list.count > Self.maxVersionsPerNote { list.removeFirst(list.count - Self.maxVersionsPerNote) }
        mutate { $0.versions[id] = list }
    }

    func restore(version: NoteVersion, ofNote id: String) {
        recordVersion(ofNote: id)
        setTitle(version.title, ofNote: id)
        setBody(version.body, ofNote: id)
        recordVersion(ofNote: id)
    }

    func move(note id: String, toNotebook notebookId: String, folder: String?) {
        updateNote(id) { meta in
            meta.notebookId = notebookId
            meta.folderId = folder
            meta.updatedAt = self.now()
        }
    }

    func trash(note id: String) {
        let date = now()
        mutate { snapshot in
            guard let index = snapshot.notes.firstIndex(where: { $0.id == id }) else { return }
            snapshot.notes[index].trashedAt = date
            snapshot.tabs.removeAll { $0 == id }
        }
    }

    func restoreFromTrash(_ id: String) {
        mutate { snapshot in
            guard let index = snapshot.notes.firstIndex(where: { $0.id == id }) else { return }
            snapshot.notes[index].trashedAt = nil
            let meta = snapshot.notes[index]
            if !snapshot.notebooks.contains(where: { $0.id == meta.notebookId }),
               let fallback = snapshot.notebooks.first {
                snapshot.notes[index].notebookId = fallback.id
            }
            if let folderId = meta.folderId, !snapshot.folders.contains(where: { $0.id == folderId }) {
                snapshot.notes[index].folderId = nil
            }
        }
    }

    func deleteForever(_ id: String) {
        mutate { snapshot in
            snapshot.notes.removeAll { $0.id == id }
            snapshot.bodies[id] = nil
            snapshot.versions[id] = nil
            snapshot.starred.removeAll { $0.kind == .note && $0.id == id }
            snapshot.tabs.removeAll { $0 == id }
        }
    }

    func emptyTrash() {
        for note in trashed { deleteForever(note.id) }
    }

    /// Removes notes that stayed in the trash longer than 30 days.
    func purgeExpiredTrash() {
        for note in trashed where daysLeftInTrash(note) == 0 { deleteForever(note.id) }
    }

    // MARK: - Starred, tabs, tags

    func toggleStar(_ kind: StarRef.Kind, _ id: String) {
        let ref = StarRef(kind: kind, id: id)
        mutate { snapshot in
            if let index = snapshot.starred.firstIndex(of: ref) {
                snapshot.starred.remove(at: index)
            } else {
                snapshot.starred.append(ref)
            }
        }
    }

    func openTab(_ noteId: String) {
        guard !data.tabs.contains(noteId) else { return }
        mutate { $0.tabs.append(noteId) }
    }

    func closeTab(_ noteId: String) {
        mutate { $0.tabs.removeAll { $0 == noteId } }
    }

    func setTagColor(_ color: Tint?, for tag: String) {
        mutate { $0.tagColors[tag] = color }
    }

    // MARK: - Daily notes and inbox (spec/12)

    /// Returns the daily note for `day`, creating it on demand.
    @discardableResult
    func ensureDailyNote(for day: String) -> NoteMeta? {
        if let existing = dailyNote(for: day) { return existing }
        guard let notebook = dailyNotebook else { return nil }
        let title = DayKey.date(day).map { $0.formatted(date: .complete, time: .omitted) } ?? day
        return createNote(in: notebook.id, title: title, kind: .daily, dailyDate: day,
                          body: NoteBody(blocks: [.task(""), .paragraph()]))
    }

    /// The Inbox note of the daily notebook (holds tasks written outside documents).
    @discardableResult
    func ensureInbox() -> NoteMeta? {
        guard let notebook = dailyNotebook else { return nil }
        if let inbox = data.notes.first(where: { $0.kind == .inbox && $0.notebookId == notebook.id && !$0.isTrashed }) {
            return inbox
        }
        return createNote(in: notebook.id, title: String(localized: "Inbox"), kind: .inbox,
                          body: NoteBody(blocks: []))
    }

    func addInboxTask(_ text: String, scheduled: String? = nil) {
        guard let inbox = ensureInbox() else { return }
        var body = body(inbox.id)
        body.blocks.append(.task(text, scheduled: scheduled))
        setBody(body, ofNote: inbox.id)
    }

    func updateTask(noteId: String, blockId: String, _ change: (inout TaskAttributes) -> Void) {
        var body = body(noteId)
        guard let index = body.blocks.firstIndex(where: { $0.id == blockId }),
              var task = body.blocks[index].task else { return }
        change(&task)
        if task.state == .done, task.completedAt == nil { task.completedAt = now() }
        if task.state != .done { task.completedAt = nil }
        body.blocks[index].task = task
        setBody(body, ofNote: noteId)
    }

    func deleteBlock(noteId: String, blockId: String) {
        var body = body(noteId)
        body.blocks.removeAll { $0.id == blockId }
        if body.blocks.isEmpty, note(noteId)?.kind != .inbox { body = .empty }
        setBody(body, ofNote: noteId)
    }

    /// Moves a task block to another note (end of document).
    func moveTask(from noteId: String, blockId: String, to targetNoteId: String) {
        guard noteId != targetNoteId else { return }
        var source = body(noteId)
        guard let index = source.blocks.firstIndex(where: { $0.id == blockId }) else { return }
        let block = source.blocks.remove(at: index)
        var target = body(targetNoteId)
        target.blocks.append(block)
        setBody(source.blocks.isEmpty ? .empty : source, ofNote: noteId)
        setBody(target, ofNote: targetNoteId)
    }

    // MARK: - Lifecycle

    /// First-run content: a space with a notebook and a welcome note.
    func seedIfEmpty() {
        guard data.spaces.isEmpty else { return }
        let space = createSpace(name: String(localized: "Personal"), icon: "house", color: .blue)
        let notebook = createNotebook(in: space.id, name: String(localized: "Notes"),
                                      icon: "book.closed", color: .blue, mode: .private)
        createSpace(name: String(localized: "Work"), icon: "briefcase", color: .orange)
        // No cover by default: covers are something the user adds (… → Cover).
        let welcome = createNote(in: notebook.id, title: Self.welcomeTitle, body: welcomeBody())
        toggleStar(.note, welcome.id)
        ensureInbox()
        mutate { $0.activeSpaceId = space.id }
    }

    static var welcomeTitle: String { String(localized: "Welcome to Datascratch") }

    private func welcomeBody() -> NoteBody {
        NoteBody(blocks: [
            NoteBlock(id: UUIDv7.make(), kind: .paragraph,
                      text: String(localized: "Write with the keyboard, then mark it up with Apple Pencil — strokes stay attached to the words."),
                      task: nil),
            NoteBlock(id: UUIDv7.make(), kind: .heading2, text: String(localized: "Try it"), task: nil),
            .task(String(localized: "Press ⌘K to open the command palette"), scheduled: DayKey.from(now())),
            .task(String(localized: "Create a notebook for work")),
            NoteBlock(id: UUIDv7.make(), kind: .quote, text: String(localized: "Quiet paper, deep ink. #welcome"), task: nil),
        ])
    }

    /// The welcome note exactly as `seedIfEmpty` wrote it (text and kinds; ids and dates differ).
    private func isUntouchedWelcome(_ note: NoteMeta) -> Bool {
        guard note.kind == .note, note.title == Self.welcomeTitle else { return false }
        let shape = { (body: NoteBody) in body.blocks.map { "\($0.kind.rawValue):\($0.text):\($0.task?.state == .done)" } }
        return shape(body(note.id)) == shape(welcomeBody())
    }

    /// Only first-run content: untouched welcome notes and an empty Inbox, nothing else.
    private func holdsOnlyFirstRunContent(_ notebookId: String) -> Bool {
        data.notes.filter { $0.notebookId == notebookId && !$0.isTrashed }.allSatisfy { note in
            // An empty Inbox comes back from the documents as one empty paragraph.
            isUntouchedWelcome(note) || (note.kind == .inbox && body(note.id).blocks.allSatisfy { $0.text.isEmpty })
        } && !data.folders.contains { $0.notebookId == notebookId }
    }

    /// Twins of one name that both hold notes: the notes move into the one with the most (the
    /// daily notebook first), Inboxes become one, the emptied twins go. Twins with folders stay.
    private func mergeNotebooks(_ twins: [Notebook], anyName: Bool, firstRunName: String) {
        guard twins.count > 1 else { return }
        let named = twins[0].name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard anyName || [firstRunName, "notes", "заметки"].contains(named) else { return }
        let count = { (id: String) in self.data.notes.filter { $0.notebookId == id }.count }
        let kept = twins.first { $0.id == data.dailyNotebookId }
            ?? twins.max { (count($0.id), $1.id) < (count($1.id), $0.id) }!
        for other in twins where other.id != kept.id && !data.folders.contains(where: { $0.notebookId == other.id }) {
            for note in data.notes where note.notebookId == other.id {
                if note.kind == .inbox, let inbox = data.notes.first(where: { $0.kind == .inbox && $0.notebookId == kept.id && !$0.isTrashed }) {
                    // One Inbox: its tasks join the kept one.
                    var target = body(inbox.id)
                    target.blocks += body(note.id).blocks.filter { !$0.text.isEmpty }
                    setBody(target, ofNote: inbox.id)
                    deleteForever(note.id)
                } else {
                    move(note: note.id, toNotebook: kept.id, folder: nil)
                }
            }
            if !data.notes.contains(where: { $0.notebookId == other.id }) {
                let wasDaily = data.dailyNotebookId == other.id
                deleteNotebook(other.id)
                if wasDaily { mutate { $0.dailyNotebookId = kept.id } }
            }
        }
    }

    /// After the library made on this device was carried into the account (D-43) on top of the
    /// first-run content the account got at sign-up: one space per name (notebooks move into
    /// it), no second notebook of a name that holds only first-run content, one welcome note.
    /// Idempotent; runs on every start, since build 6 carried without merging. Without a fresh
    /// carry (`anyName == false`) only spaces named like the first-run ones merge, so spaces a
    /// person named alike on purpose stay apart.
    func mergeCarriedDuplicates(anyName: Bool = true) {
        let key = { (name: String) in name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        let firstRunNames = Set([String(localized: "Personal"), String(localized: "Work"), "Personal", "Work", "Личное", "Работа"].map(key))
        for (name, spaces) in Dictionary(grouping: data.spaces, by: { key($0.name) })
        where spaces.count > 1 && (anyName || firstRunNames.contains(name)) {
            // Keep the space holding the most notebooks: the fewest moves.
            let ordered = spaces.sorted {
                (-notebooks(in: $0.id).count, $0.order, $0.id) < (-notebooks(in: $1.id).count, $1.order, $1.id)
            }
            let kept = ordered[0]
            for other in ordered.dropFirst() {
                for notebook in notebooks(in: other.id) { updateNotebook(notebook.id) { $0.spaceId = kept.id } }
                mutate { snapshot in
                    snapshot.spaces.removeAll { $0.id == other.id }
                    if snapshot.activeSpaceId == other.id { snapshot.activeSpaceId = kept.id }
                }
            }
        }
        for space in data.spaces {
            for (_, group) in Dictionary(grouping: notebooks(in: space.id), by: { key($0.name) }) where group.count > 1 {
                var disposable = group.filter { holdsOnlyFirstRunContent($0.id) }
                // Keep one: the daily notebook if it is among them.
                if disposable.count == group.count {
                    let keep = disposable.first { $0.id == data.dailyNotebookId } ?? disposable[0]
                    disposable.removeAll { $0.id == keep.id }
                }
                let kept = group.first { candidate in !disposable.contains { $0.id == candidate.id } }
                for notebook in disposable {
                    let wasDaily = data.dailyNotebookId == notebook.id
                    deleteNotebook(notebook.id)
                    if wasDaily, let kept { mutate { $0.dailyNotebookId = kept.id } }
                }
                mergeNotebooks(group.filter { candidate in !disposable.contains { $0.id == candidate.id } },
                               anyName: anyName, firstRunName: key(String(localized: "Notes")))
            }
        }
        let welcomes = data.notes.filter { !$0.isTrashed && isUntouchedWelcome($0) }
        for extra in welcomes.dropFirst() { deleteForever(extra.id) }
        if let daily = dailyNotebook,
           data.notes.filter({ $0.kind == .inbox && $0.notebookId == daily.id && !$0.isTrashed }).isEmpty {
            ensureInbox()
        }
    }

    /// Takes a note's values as they are in the documents (written by the native
    /// editor), without writing them back.
    func applyExternal(note meta: NoteMeta, body: NoteBody) {
        guard let index = data.notes.firstIndex(where: { $0.id == meta.id }) else { return }
        data.notes[index] = meta
        data.bodies[meta.id] = body
    }

    func reset() {
        saveTask?.cancel()
        data = LibrarySnapshot()
        persistence.erase()
    }

    func flush() {
        saveTask?.cancel()
        persistence.save(data)
    }

    private func mutate(_ change: (inout LibrarySnapshot) -> Void) {
        let old = data
        change(&data)
        backend?.persist(from: old, to: data)
        onLocalChange?()
        scheduleSave()
    }

    private func scheduleSave() {
        guard persistence.fileURL != nil else { return }
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled, let self else { return }
            self.persistence.save(self.data)
        }
    }

    nonisolated static func refreshDerived(_ meta: inout NoteMeta, body: NoteBody) {
        meta.tags = body.tags
        meta.snippet = String(body.blocks.filter { $0.kind != .divider }.map(\.text)
            .filter { !$0.isEmpty }.joined(separator: " ").prefix(180))
    }
}
