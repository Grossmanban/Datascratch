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
            if notes.isEmpty {
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
        .toolbar { ToolbarItem(placement: .principal) { Color.clear.frame(width: 1, height: 1) } }
        .searchable(text: $scene.searchText, prompt: Text("Search documents"))
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                ContentFullScreenButton()
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
                    Button {
                        scene.newNote()
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .accessibilityLabel("New Note")
                    .accessibilityIdentifier("library.newNote")
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if isPhone, canCreate {
                // One-handed use on iPhone: the main action sits under the thumb.
                HStack {
                    Spacer()
                    Button {
                        scene.newNote()
                    } label: {
                        Image(systemName: "square.and.pencil")
                            .font(.title2.weight(.medium))
                            .frame(width: 56, height: 56)
                    }
                    .prominentGlass()
                    .buttonBorderShape(.circle)
                    .accessibilityLabel("New Note")
                    .accessibilityIdentifier("library.newNote.floating")
                }
                .padding(.horizontal, Theme.Space.s5)
                .padding(.bottom, Theme.Space.s2)
            }
        }
    }

    private var header: some View {
        Text(title)
            .font(Theme.Typography.title)
            .foregroundStyle(Theme.Palette.textPrimary)
            .lineLimit(2)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, Theme.Space.s2)
            .accessibilityAddTraits(.isHeader)
    }

    private var isPhone: Bool { UIDevice.current.userInterfaceIdiom == .phone }

    private var canCreate: Bool {
        switch source {
        case .starred: false
        default: true
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
