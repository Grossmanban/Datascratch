import SwiftUI
#if canImport(DSDesign)
import DSDesign
#endif

/// Grid of cover cards (Craft-style) or a compact list, for any sidebar source.
struct DocumentCollectionView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let source: SidebarItem

    private var library: LibraryStore { app.library }

    var body: some View {
        @Bindable var scene = scene
        @Bindable var settings = app.settings
        let notes = filtered
        Group {
            if notes.isEmpty && subfolders.isEmpty {
                emptyState
            } else if settings.libraryLayout == .grid {
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.s4) {
                        header
                        // Cards start at the leading edge, as on the web.
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 168, maximum: 260), spacing: Theme.Space.s4,
                                                     alignment: .top)],
                                  alignment: .leading, spacing: Theme.Space.s4) {
                            ForEach(notes) { note in
                                DocumentCard(note: note, isSelected: scene.selectedNoteId == note.id)
                                    .onTapGesture { scene.open(note.id) }
                                    .documentActions(note)
                            }
                        }
                        .animation(Theme.Motion.smooth, value: notes.map(\.id))
                    }
                    .padding(Theme.Space.s4)
                }
            } else {
                List {
                    header
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    ForEach(notes) { note in
                        Button { scene.open(note.id) } label: { DocumentRow(note: note) }
                            .buttonStyle(.plain)
                            .listRowBackground(scene.selectedNoteId == note.id ? Theme.Palette.textPrimary.opacity(0.08) : Theme.Palette.canvas)
                            .documentActions(note)
                            .swipeActions(edge: .trailing) {
                                Button("Trash", systemImage: "trash", role: .destructive) { library.trash(note: note.id) }
                            }
                            .swipeActions(edge: .leading) {
                                Button("Star", systemImage: "star") { library.toggleStar(.note, note.id) }
                                    .tint(Theme.Palette.warning)
                            }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .background(Theme.Palette.canvas)
        .navigationTitle(title)
        // The title is set in the serif face in the content (Quiet paper), not as an SF large title.
        .navigationBarTitleDisplayMode(.inline)
        // No system title in the bar (an empty principal item showed «Empty» behind sheets).
        .toolbar(removing: .title)
        .searchable(text: $scene.searchText, prompt: Text("Search documents"))
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Menu {
                    Picker("Layout", selection: $settings.libraryLayout) {
                        Label("Cards", systemImage: "square.grid.2x2").tag(AppSettings.LibraryLayout.grid)
                        Label("List", systemImage: "list.bullet").tag(AppSettings.LibraryLayout.list)
                    }
                } label: {
                    Image(systemName: settings.libraryLayout == .grid ? "square.grid.2x2" : "list.bullet")
                }
                .accessibilityLabel("Layout")
                // One «New» button (D-38): the toolbar on iPad, the floating button on iPhone.
                // (By idiom: the iPad split-view columns report a compact size class.)
                if canCreate, !isPhone {
                    NewNoteMenu {
                        HStack(spacing: Theme.Space.s1) {
                            Image(systemName: "square.and.pencil")
                            if let name = scene.newNoteDestinationName {
                                Text("in “\(name)”")
                                    .font(Theme.Typography.footnote)
                                    .lineLimit(1)
                            }
                        }
                    }
                    .accessibilityIdentifier("library.newNote")
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if isPhone, canCreate {
                // One-handed use on iPhone: the main action sits under the thumb.
                HStack(spacing: Theme.Space.s2) {
                    Spacer()
                    // Where the note goes, when the list is not that notebook (All Documents, a tag).
                    if let name = scene.newNoteDestinationName {
                        Text("in “\(name)”")
                            .font(Theme.Typography.footnote)
                            .foregroundStyle(Theme.Palette.textSecondary)
                            .lineLimit(1)
                            .padding(.horizontal, Theme.Space.s3)
                            .padding(.vertical, Theme.Space.s2)
                            .background(.regularMaterial, in: Capsule())
                            .accessibilityHidden(true)
                    }
                    NewNoteMenu {
                        Image(systemName: "square.and.pencil")
                            .font(.title2.weight(.medium))
                            .frame(width: 56, height: 56)
                    }
                    .menuStyle(.button)
                    .prominentGlass()
                    .buttonBorderShape(.circle)
                    .accessibilityIdentifier("library.newNote.floating")
                }
                .padding(.horizontal, Theme.Space.s5)
                .padding(.bottom, Theme.Space.s2)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s3) {
            if case .folder(let id) = source { FolderBreadcrumb(folderId: id) }
            Text(title)
                .font(Theme.Typography.title)
                .foregroundStyle(Theme.Palette.textPrimary)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, Theme.Space.s2)
                .accessibilityAddTraits(.isHeader)
            if !subfolders.isEmpty { FolderStrip(folders: subfolders) }
            #if canImport(DSDesign)
            if isLocked {
                DSCallout(tone: .info, title: String(localized: "Getting this notebook ready"),
                          message: String(localized: "It was made on another device. You can write here once its key arrives."),
                          systemImage: "key")
                    .accessibilityIdentifier("library.notebookLocked")
            } else if let id = notebookId, app.sync.unreadableNotebookIds.contains(id) {
                UnreadableNotice(notebookId: id, signature: app.sync.unreadableSignatures[id] ?? "")
            }
            #endif
        }
    }

    /// Folders of the level this list shows (D-15: the folder strip above the documents).
    private var subfolders: [Folder] {
        switch source {
        case .notebook(let id): library.folders(in: id, parent: nil)
        case .folder(let id): library.folder(id).map { library.folders(in: $0.notebookId, parent: id) } ?? []
        default: []
        }
    }

    /// The notebook this list shows (a folder's notebook too).
    private var notebookId: String? {
        switch source {
        case .notebook(let id): id
        case .folder(let id): library.folder(id)?.notebookId
        default: nil
        }
    }

    /// A notebook from another device whose key has not arrived yet.
    private var isLocked: Bool {
        switch source {
        case .notebook(let id): library.isLocked(notebook: id)
        case .folder(let id): library.folder(id).map { library.isLocked(notebook: $0.notebookId) } ?? false
        default: false
        }
    }

    private var isPhone: Bool { UIDevice.current.userInterfaceIdiom == .phone }

    private var canCreate: Bool {
        switch source {
        case .starred: false
        default: !isLocked
        }
    }

    private var title: String {
        switch source {
        case .allDocuments: String(localized: "All Documents")
        case .starred: String(localized: "Starred")
        case .notebook(let id): library.notebook(id)?.name ?? ""
        case .folder(let id): library.folder(id)?.name ?? ""
        case .tag(let name): "#" + name
        default: ""
        }
    }

    private var filtered: [NoteMeta] {
        let base: [NoteMeta] = switch source {
        case .allDocuments: library.documents
        case .starred: library.starredNotes
        case .notebook(let id): library.documents(inNotebook: id)
        case .folder(let id): library.documents(inFolder: id)
        case .tag(let name): library.documents(tagged: name)
        default: []
        }
        let query = scene.searchText.trimmingCharacters(in: .whitespaces).lowercased()
        guard !query.isEmpty else { return base }
        let matches = Set(library.search(query).map(\.id))
        return base.filter { matches.contains($0.id) }
    }

    @ViewBuilder private var emptyState: some View {
        if !scene.searchText.isEmpty {
            ContentUnavailableView.search(text: scene.searchText)
        } else if isLocked {
            ContentUnavailableView("Getting this notebook ready", systemImage: "key",
                                   description: Text("It was made on another device. You can write here once its key arrives."))
                .accessibilityIdentifier("library.notebookLocked")
        } else {
            ContentUnavailableView {
                Label(emptyTitle, systemImage: source == .starred ? "star" : "doc.text")
            } description: {
                Text(source == .starred
                     ? LocalizedStringKey("Star documents to keep them at hand.")
                     : "Start writing — then mark it up with Apple Pencil.")
            } actions: {
                if canCreate {
                    Button("New Note") { scene.newNote() }
                        .prominentGlass()
                }
            }
        }
    }

    private var emptyTitle: LocalizedStringKey {
        source == .starred ? "Nothing starred" : "No documents yet"
    }
}

struct DocumentCard: View {
    @Environment(AppModel.self) private var app
    let note: NoteMeta
    var isSelected = false

    var body: some View {
        #if canImport(DSDesign)
        designSystemCard
        #else
        standInCard
        #endif
    }

    #if canImport(DSDesign)
    /// `DSDocCard`: without a cover a compact card (emoji tile, serif title); with one, the
    /// thumbnail (spec/12 §12.7). A build-1 gradient cover still shows as its backdrop.
    private var designSystemCard: some View {
        let _ = app.covers.revision
        let thumbId = note.coverThumb ?? note.coverImage?.attachmentId
        let image = thumbId.flatMap { app.covers.image($0, noteId: note.id) }.map { Image(uiImage: $0) }
        var detail = note.updatedAt.formatted(.relative(presentation: .named))
        if let notebook = app.library.notebook(note.notebookId) { detail += " · " + notebook.name }
        return DSDocCard(title: note.title.isEmpty ? String(localized: "Untitled") : note.title,
                         subtitle: note.snippet.isEmpty ? String(localized: "No text") : note.snippet,
                         detail: detail,
                         icon: note.icon,
                         cover: image,
                         coverOffsetY: note.coverImage?.offsetY ?? 0.5,
                         backdrop: image == nil ? note.cover.flatMap { DSBackdropToken(rawValue: $0.rawValue) } : nil)
            .overlay {
                if isSelected {
                    RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                        .strokeBorder(Theme.Palette.accent.opacity(0.6), lineWidth: 1.5)
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.lg))
            .draggable(note.id)
            .accessibilityAddTraits(.isButton)
            .accessibilityIdentifier("document.card")
    }
    #endif

    private var standInCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            // With a cover: its thumbnail makes the document recognisable (spec/12 §12.7).
            // Without one: no band at all — a compact card, the emoji on top.
            if CoverHeader.hasCover(note) {
                ZStack(alignment: .bottomLeading) {
                    if let thumb = note.coverThumb ?? note.coverImage?.attachmentId {
                        CoverImageView(noteId: note.id, attachmentId: thumb, offsetY: note.coverImage?.offsetY ?? 0.5)
                    } else if let cover = note.cover {
                        cover.gradient
                    }
                    if let icon = note.icon {
                        Text(icon)
                            .font(.system(size: 30))
                            .padding(Theme.Space.s3)
                    }
                }
                .frame(height: 92)
                .clipped()
            } else if let icon = note.icon {
                Text(icon)
                    .font(.system(size: 26))
                    .padding([.top, .horizontal], Theme.Space.s3)
            }

            VStack(alignment: .leading, spacing: Theme.Space.s1) {
                Text(note.title.isEmpty ? String(localized: "Untitled") : note.title)
                    .font(.system(.headline, design: note.style.font.design))
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .lineLimit(2)
                Text(note.snippet.isEmpty ? String(localized: "No text") : note.snippet)
                    .font(Theme.Typography.footnote)
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .lineLimit(3, reservesSpace: true)
                HStack(spacing: Theme.Space.s1) {
                    Text(note.updatedAt, format: .relative(presentation: .named))
                    if let notebook = app.library.notebook(note.notebookId) {
                        Text("·")
                        Image(systemName: notebook.icon).foregroundStyle(notebook.color.foreground)
                        Text(notebook.name).lineLimit(1)
                    }
                }
                .font(Theme.Typography.caption)
                .foregroundStyle(Theme.Palette.textTertiary)
                .padding(.top, Theme.Space.s1)
            }
            .padding(Theme.Space.s3)
        }
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                .strokeBorder(isSelected ? Theme.Palette.accent.opacity(0.6) : Theme.Palette.separator,
                              lineWidth: isSelected ? 1.5 : 1)
        }
        // The shadow is cast by a plain shape behind the card: Core Animation draws it from
        // the path instead of rendering the whole card offscreen on every frame (120 Hz scrolling).
        .background {
            RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                .fill(Theme.Palette.surface)
                .shadow(color: .black.opacity(0.06), radius: 16, y: 6)
        }
        .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.lg))
        .hoverEffect(.lift)
        .draggable(note.id)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier("document.card")
    }
}

struct DocumentRow: View {
    let note: NoteMeta

    var body: some View {
        HStack(spacing: Theme.Space.s3) {
            // A thumbnail only for a cover the user chose (spec/12 §12.7); otherwise just the emoji.
            if CoverHeader.hasCover(note) {
                RoundedRectangle(cornerRadius: Theme.Radius.sm)
                    .fill(note.cover.map { AnyShapeStyle($0.gradient) } ?? AnyShapeStyle(Theme.Palette.sidebar))
                    .overlay {
                        if let thumb = note.coverThumb ?? note.coverImage?.attachmentId {
                            CoverImageView(noteId: note.id, attachmentId: thumb, offsetY: note.coverImage?.offsetY ?? 0.5)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.sm))
                    .frame(width: 40, height: 40)
                    .overlay { if let icon = note.icon { Text(icon) } }
            } else if let icon = note.icon {
                Text(icon).font(.system(size: 22)).frame(width: 32)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(note.title.isEmpty ? String(localized: "Untitled") : note.title)
                    .font(.headline)
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .lineLimit(1)
                Text(note.snippet.isEmpty ? String(localized: "No text") : note.snippet)
                    .font(Theme.Typography.footnote)
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .lineLimit(1)
            }
            Spacer()
            Text(note.updatedAt, format: .dateTime.day().month(.abbreviated))
                .font(Theme.Typography.caption)
                .foregroundStyle(Theme.Palette.textTertiary)
        }
        .padding(.vertical, Theme.Space.s1)
        .contentShape(Rectangle())
        .draggable(note.id)
        .accessibilityIdentifier("document.row")
    }
}

extension NoteStyle.Font {
    var design: Font.Design {
        switch self {
        case .serif: .serif
        case .sans: .default
        case .mono: .monospaced
        }
    }
}

/// Context menu shared by cards, rows and search results.
struct DocumentActions: ViewModifier {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.openWindow) private var openWindow
    let note: NoteMeta

    func body(content: Content) -> some View {
        let library = app.library
        content.contextMenu {
            Button("Open in New Window", systemImage: "macwindow.badge.plus") {
                openWindow(id: "note", value: note.id)
            }
            Button(library.isStarred(.note, note.id) ? LocalizedStringKey("Remove from Starred") : "Add to Starred",
                   systemImage: library.isStarred(.note, note.id) ? "star.slash" : "star") {
                library.toggleStar(.note, note.id)
            }
            Button("Move To…", systemImage: "folder") { scene.sheet = .move(noteId: note.id) }
            Button("Share…", systemImage: "square.and.arrow.up") {
                scene.sheet = .share(ShareTarget(kind: .note, id: note.id))
            }
            Button("Duplicate", systemImage: "plus.square.on.square") {
                let copy = library.createNote(in: note.notebookId, folder: note.folderId,
                                              title: note.title + " " + String(localized: "(copy)"),
                                              body: library.body(note.id), cover: note.cover)
                library.updateNote(copy.id) {
                    $0.style = note.style
                    $0.icon = note.icon
                    $0.backdrop = note.backdrop
                }
            }
            Divider()
            Button("Move to Trash", systemImage: "trash", role: .destructive) {
                if scene.selectedNoteId == note.id { scene.selectedNoteId = nil }
                library.trash(note: note.id)
                if app.settings.hapticsEnabled { Haptics.warning() }
            }
        } preview: {
            DocumentCard(note: note)
                .frame(width: 260)
                .environment(app)
        }
    }
}

extension View {
    func documentActions(_ note: NoteMeta) -> some View { modifier(DocumentActions(note: note)) }
}

/// "Paper" backgrounds: dots, grid, lines (document style, spec/12 §12.3).
struct PaperPattern: View {
    let paper: NoteStyle.Paper
    var spacing: CGFloat = 22

    var body: some View {
        let color = Theme.Palette.separator
        Canvas { context, size in
            switch paper {
            case .plain:
                break
            case .dots:
                var y = spacing
                while y < size.height {
                    var x = spacing
                    while x < size.width {
                        context.fill(Path(ellipseIn: CGRect(x: x - 1, y: y - 1, width: 2, height: 2)), with: .color(color))
                        x += spacing
                    }
                    y += spacing
                }
            case .grid, .lines:
                var path = Path()
                var y = spacing
                while y < size.height {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                    y += spacing
                }
                if paper == .grid {
                    var x = spacing
                    while x < size.width {
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: size.height))
                        x += spacing
                    }
                }
                context.stroke(path, with: .color(color), lineWidth: 0.5)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

#if canImport(DSDesign)
/// The calm note about changes this device can't read (another key). It can be dismissed; the
/// dismissal is remembered on this device per notebook and per set of unreadable items, so only
/// new ones bring it back. Afterwards a one-line hint keeps the information at hand.
struct UnreadableNotice: View {
    let notebookId: String
    let signature: String
    @AppStorage("unreadableDismissed") private var dismissedJSON = ""
    @State private var reopened = false

    private var dismissed: [String: String] {
        (try? JSONDecoder().decode([String: String].self, from: Data(dismissedJSON.utf8))) ?? [:]
    }

    var body: some View {
        if dismissed[notebookId] == signature && !reopened {
            Button {
                withAnimation(Theme.Motion.snappy) { reopened = true }
            } label: {
                Label("Some changes can't be read here yet", systemImage: "lock.trianglebadge.exclamationmark")
                    .font(Theme.Typography.footnote)
                    .foregroundStyle(Theme.Palette.textSecondary)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("library.notebookUnreadableHint")
        } else {
            ZStack(alignment: .topTrailing) {
                DSCallout(tone: .note, title: String(localized: "Some changes can't be read here yet"),
                          message: String(localized: "They were saved with another key. The rest of the notebook is up to date."),
                          systemImage: "lock.trianglebadge.exclamationmark")
                Button {
                    var map = dismissed
                    map[notebookId] = signature
                    if let data = try? JSONEncoder().encode(map) { dismissedJSON = String(decoding: data, as: UTF8.self) }
                    withAnimation(Theme.Motion.snappy) { reopened = false }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .frame(width: 28, height: 28)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(Theme.Space.s2)
                .accessibilityLabel("Dismiss")
                .accessibilityIdentifier("library.notebookUnreadableDismiss")
            }
            .accessibilityIdentifier("library.notebookUnreadable")
        }
    }
}
#endif

/// The current level's folders as a strip of cards above the documents (spec/05): icon, name and
/// document count in the notebook's tint. A tap opens the folder, a long press gives its menu.
/// Scrolls sideways; on a wide column it wraps.
struct FolderStrip: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let folders: [Folder]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Space.s2) {
                ForEach(folders) { folder in card(folder) }
            }
            .padding(.vertical, 2)
        }
        .scrollClipDisabled()
        .accessibilityIdentifier("library.folderStrip")
    }

    private func card(_ folder: Folder) -> some View {
        let library = app.library
        let tint = library.notebook(folder.notebookId)?.color ?? folder.color
        let count = library.documents(inFolder: folder.id).count
        return Button {
            scene.show(.folder(folder.id))
        } label: {
            HStack(spacing: Theme.Space.s2) {
                Image(systemName: folder.icon)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(folder.color.foreground)
                VStack(alignment: .leading, spacing: 1) {
                    Text(folder.name)
                        .font(Theme.Typography.body.weight(.medium))
                        .foregroundStyle(Theme.Palette.textPrimary)
                        .lineLimit(1)
                    Text("\(count) documents")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textSecondary)
                }
            }
            .padding(.horizontal, Theme.Space.s3)
            .padding(.vertical, Theme.Space.s2)
            .frame(minWidth: 132, alignment: .leading)
            .background(tint.background.opacity(0.55), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(tint.foreground.opacity(0.15)))
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .contextMenu { FolderMenuItems(folder: folder) }
        .accessibilityIdentifier("folderCard.\(folder.name)")
    }
}

/// Notebook › folder › … above a nested folder's list; every part opens its level.
struct FolderBreadcrumb: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let folderId: String

    var body: some View {
        let library = app.library
        let path = chain(library)
        if let first = path.first, let notebook = library.notebook(first.notebookId), path.count > 1 {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Space.s1) {
                    crumb(notebook.name) { scene.show(.notebook(notebook.id)) }
                    ForEach(path.dropLast()) { folder in
                        Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(Theme.Palette.textTertiary)
                        crumb(folder.name) { scene.show(.folder(folder.id)) }
                    }
                }
            }
            .accessibilityIdentifier("library.breadcrumb")
        }
    }

    /// From the top-level folder down to this one.
    private func chain(_ library: LibraryStore) -> [Folder] {
        var result: [Folder] = []
        var next = library.folder(folderId)
        while let folder = next, !result.contains(where: { $0.id == folder.id }) {
            result.insert(folder, at: 0)
            next = folder.parentId.flatMap { library.folder($0) }
        }
        return result
    }

    private func crumb(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(Theme.Typography.footnote)
                .foregroundStyle(Theme.Palette.textSecondary)
                .lineLimit(1)
        }
        .buttonStyle(.plain)
    }
}

/// «New Note»: a tap makes the note where `SceneModel.newNoteDestination` says; a long press
/// picks another notebook of the space (spec/05).
struct NewNoteMenu<Label: View>: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @ViewBuilder var label: Label

    var body: some View {
        let library = app.library
        Menu {
            Section("New Note In") {
                ForEach(library.notebooks(in: library.activeSpace?.id)) { notebook in
                    Button(notebook.name, systemImage: "book.closed") {
                        scene.newNote(in: notebook.id)
                    }
                    .disabled(library.isLocked(notebook: notebook.id))
                }
            }
        } label: {
            label
        } primaryAction: {
            scene.newNote()
        }
        .accessibilityLabel("New Note")
        .accessibilityValue(scene.newNoteDestinationName.map { Text("in “\($0)”") } ?? Text(verbatim: ""))
    }
}

