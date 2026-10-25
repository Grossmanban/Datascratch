import SwiftUI

struct DocumentScreen: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.openWindow) private var openWindow
    @Environment(\.horizontalSizeClass) private var sizeClass
    let noteId: String
    /// Use the stand-in editor even when the native one is available.
    var forceStandIn = false

    @FocusState private var titleFocused: Bool

    private var library: LibraryStore { app.library }

    var body: some View {
        if let note = library.note(noteId) {
            #if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore)
            if !forceStandIn, app.core != nil {
                NativeDocumentScreen(noteId: noteId)
            } else {
                content(note)
            }
            #else
            content(note)
            #endif
        } else {
            ContentUnavailableView("Document not found", systemImage: "doc.questionmark")
        }
    }

    private func content(_ note: NoteMeta) -> some View {
        let width = Theme.columnWidth(note.style.width)
        let readOnly = note.isTrashed
        return ScrollView {
            VStack(spacing: 0) {
                if CoverHeader.hasCover(note) {
                    CoverHeader(note: note)
                        .contextMenu { if !readOnly { CoverMenuItems(note: note) } }
                }
                VStack(alignment: .leading, spacing: Theme.Space.s4) {
                    header(note, readOnly: readOnly)
                    EditorHost(noteId: noteId, style: note.style, readOnly: readOnly)
                    BacklinksSection(noteId: noteId)
                        .padding(.top, Theme.Space.s8)
                }
                .frame(maxWidth: width, alignment: .leading)
                .padding(.horizontal, sizeClass == .compact ? Theme.Space.s5 : Theme.Space.s10)
                .padding(.top, CoverHeader.hasCover(note) ? Theme.Space.s5 : Theme.Space.s8)
                .padding(.bottom, 120)
                .frame(maxWidth: .infinity)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background { DocumentBackground(note: note) }
        .navigationTitle(note.title.isEmpty ? String(localized: "Untitled") : note.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbar(note) }
        .toolbarBackgroundVisibility(.hidden, for: .navigationBar)
        .coverPickers()
        .userActivity("com.datascratch.app.openNote") { activity in
            activity.title = note.title
            activity.userInfo = ["noteId": note.id]
            activity.targetContentIdentifier = note.id
        }
        .onAppear {
            if note.title.isEmpty, library.body(note.id).plainText.isEmpty { titleFocused = true }
        }
        .onDisappear { library.recordVersion(ofNote: noteId) }
    }

    @ViewBuilder
    private func header(_ note: NoteMeta, readOnly: Bool) -> some View {
        if readOnly {
            Label("This document is in the trash.", systemImage: "trash")
                .font(Theme.Typography.footnote)
                .foregroundStyle(Theme.Palette.danger)
        }
        if let icon = note.icon {
            Text(icon).font(.system(size: 52))
        }
        TextField("Untitled", text: Binding(
            get: { library.note(noteId)?.title ?? "" },
            set: { library.setTitle($0, ofNote: noteId) }
        ), axis: .vertical)
        .font(.system(size: 34, weight: .semibold, design: note.style.font.design))
        .foregroundStyle(Theme.Palette.textPrimary)
        .focused($titleFocused)
        .disabled(readOnly)
        .accessibilityIdentifier("document.title")

        HStack(spacing: Theme.Space.s2) {
            if let notebook = library.notebook(note.notebookId) {
                Label(notebook.name, systemImage: notebook.icon)
                    .foregroundStyle(Theme.Palette.textSecondary)
                if notebook.mode == .agent {
                    Image(systemName: "sparkles")
                        .foregroundStyle(Tint.purple.foreground)
                        .help("Open to agents")
                }
            }
            if let folder = note.folderId.flatMap({ library.folder($0) }) {
                Image(systemName: "chevron.right").font(.caption2)
                Text(folder.name)
            }
            ForEach(note.tags, id: \.self) { tag in
                Button("#" + tag) { scene.show(.tag(tag)) }
                    .buttonStyle(.plain)
                    .foregroundStyle((library.data.tagColors[tag] ?? .gray).foreground)
            }
        }
        .font(Theme.Typography.footnote)
        .foregroundStyle(Theme.Palette.textTertiary)
        .lineLimit(1)
    }

    @ToolbarContentBuilder
    private func toolbar(_ note: NoteMeta) -> some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button {
                library.toggleStar(.note, note.id)
                if app.settings.hapticsEnabled { Haptics.selection() }
            } label: {
                Image(systemName: library.isStarred(.note, note.id) ? "star.fill" : "star")
            }
            .accessibilityLabel(library.isStarred(.note, note.id) ? Text("Remove from Starred") : Text("Add to Starred"))

            Button {
                scene.sheet = .share(ShareTarget(kind: .note, id: note.id))
            } label: {
                Image(systemName: "square.and.arrow.up")
            }
            .accessibilityLabel("Share")

            Menu {
                Button("Style…", systemImage: "textformat") { scene.sheet = .documentStyle(noteId: note.id) }
                Menu("Cover", systemImage: "photo") { CoverMenuItems(note: note) }
                Button("Version History", systemImage: "clock.arrow.circlepath") {
                    library.recordVersion(ofNote: note.id)
                    scene.sheet = .versions(noteId: note.id)
                }
                Divider()
                Button("Move To…", systemImage: "folder") { scene.sheet = .move(noteId: note.id) }
                Button("Open in New Window", systemImage: "macwindow.badge.plus") {
                    openWindow(id: "note", value: note.id)
                }
                Divider()
                if note.isTrashed {
                    Button("Restore", systemImage: "arrow.uturn.backward") { library.restoreFromTrash(note.id) }
                } else {
                    Button("Move to Trash", systemImage: "trash", role: .destructive) {
                        scene.closeDocument()
                        library.trash(note: note.id)
                    }
                }
            } label: {
                Image(systemName: "ellipsis")
            }
            .accessibilityLabel("More")
            .accessibilityIdentifier("document.more")
        }
    }
}

struct DocumentBackground: View {
    let note: NoteMeta

    var body: some View {
        ZStack {
            if note.backdrop == .none {
                Theme.Palette.canvas
            } else {
                note.backdrop.gradient
            }
            PaperPattern(paper: note.style.paper, spacing: 26)
        }
        .ignoresSafeArea()
    }
}

/// Documents linking here with `[[Title]]` (derived locally, document-model §5).
struct BacklinksSection: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let noteId: String

    var body: some View {
        let links = app.library.backlinks(to: noteId)
        if !links.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Space.s2) {
                Text("Linked from")
                    .font(Theme.Typography.footnote.weight(.semibold))
                    .foregroundStyle(Theme.Palette.textTertiary)
                    .textCase(.uppercase)
                ForEach(links) { link in
                    Button {
                        scene.open(link.id)
                    } label: {
                        HStack {
                            NoteTitleLabel(note: link)
                            Spacer()
                            Image(systemName: "arrow.up.right").font(.caption)
                        }
                        .padding(Theme.Space.s3)
                        .background(Theme.Palette.surface.opacity(0.7), in: RoundedRectangle(cornerRadius: Theme.Radius.md))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
