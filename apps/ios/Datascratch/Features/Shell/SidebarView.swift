import SwiftUI
#if canImport(DSDesign)
import DSDesign
#endif

struct SidebarView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.openWindow) private var openWindow
    /// By idiom: on iPad the sidebar column itself can report a compact size class.
    private var isPhone: Bool { UIDevice.current.userInterfaceIdiom == .phone }

    private var library: LibraryStore { app.library }
    /// Height of the floating footer: the list ends above it (a safe-area inset alone left the
    /// last row, Trash, under the footer on iPad).
    @State private var footerHeight: CGFloat = 0

    var body: some View {
        @Bindable var scene = scene
        List(selection: $scene.sidebar) {
            Group {
                if !library.openTabs.isEmpty {
                    Section("Tabs") {
                        ForEach(library.openTabs) { note in
                            HStack(spacing: Theme.Space.s2) {
                                Button {
                                    scene.open(note.id)
                                } label: {
                                    NoteTitleLabel(note: note)
                                        .fontWeight(scene.selectedNoteId == note.id ? .semibold : .regular)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .buttonStyle(.plain)
                                // An explicit close button on every tab (also swipe, menu and ⌘W).
                                Button {
                                    if scene.selectedNoteId == note.id { scene.closeTab() } else { library.closeTab(note.id) }
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(Theme.Palette.textTertiary)
                                        .frame(width: 28, height: 28)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Close Tab")
                                .accessibilityIdentifier("tab.close")
                            }
                            .contextMenu {
                                Button("Open in New Window", systemImage: "macwindow.badge.plus") {
                                    openWindow(id: "note", value: note.id)
                                }
                                Button("Close Tab", systemImage: "xmark") { library.closeTab(note.id) }
                            }
                            .swipeActions {
                                Button("Close", systemImage: "xmark") { library.closeTab(note.id) }
                            }
                        }
                    }
                }

                Section {
                    SidebarLabel("All Documents", systemImage: "doc.on.doc")
                        .tag(SidebarItem.allDocuments)
                        .accessibilityIdentifier("sidebar.allDocuments")
                    Label {
                        HStack {
                            Text("Tasks")
                            Spacer()
                            let due = TaskIndex.filter(library.taskEntries, bucket: .today, today: DayKey.from(Date())).count
                            if due > 0 {
                                Text(due, format: .number)
                                    .font(Theme.Typography.footnote.monospacedDigit())
                                    .foregroundStyle(Theme.Palette.textSecondary)
                            }
                        }
                    } icon: {
                        Image(systemName: "checkmark.circle")
                            .foregroundStyle(Theme.Palette.textSecondary)
                    }
                    .tag(SidebarItem.tasks)
                    .accessibilityIdentifier("sidebar.tasks")
                    SidebarLabel("Calendar", systemImage: "calendar")
                        .tag(SidebarItem.calendar)
                        .accessibilityIdentifier("sidebar.calendar")
                }

                if !library.starredNotes.isEmpty {
                    Section("Starred") {
                        ForEach(library.starredNotes) { note in
                            Button {
                                scene.open(note.id)
                            } label: {
                                NoteTitleLabel(note: note)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button("Remove from Starred", systemImage: "star.slash") {
                                    library.toggleStar(.note, note.id)
                                }
                            }
                        }
                    }
                }

                Section {
                    ForEach(library.notebooks(in: library.activeSpace?.id)) { notebook in
                        NotebookRow(notebook: notebook)
                            .accessibilityIdentifier("sidebar.notebook")
                    }
                } header: {
                    HStack {
                        Text("Notebooks")
                        Spacer()
                        if let space = library.activeSpace {
                            Button {
                                scene.sheet = .newNotebook(spaceId: space.id)
                            } label: {
                                Image(systemName: "plus")
                            }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("New Notebook")
                            .accessibilityIdentifier("sidebar.newNotebook")
                        }
                    }
                }

                if !library.tags.isEmpty {
                    Section("Tags") {
                        ForEach(library.tags, id: \.name) { tag in
                            TagRow(name: tag.name, count: tag.count)
                        }
                    }
                }

                Section {
                    SidebarLabel("Trash", systemImage: "trash")
                        .tag(SidebarItem.trash)
                        .accessibilityIdentifier("sidebar.trash")
                }
            }
            .modifier(SidebarRowStyle(isCompact: isPhone))
        }
        .modifier(SidebarListStyle(isCompact: isPhone))
        .scrollContentBackground(.hidden)
        .background(Theme.Palette.sidebar)
        .navigationTitle(library.activeSpace?.name ?? "Datascratch")
        // The space tile in the toolbar names the space; no SF large title.
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(removing: .title)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                SpaceSwitcher()
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    scene.isCommandPalettePresented = true
                } label: {
                    Image(systemName: "magnifyingglass")
                }
                .accessibilityLabel("Search and Commands")
                .accessibilityIdentifier("sidebar.commandPalette")
            }
        }
        .contentMargins(.bottom, footerHeight, for: .scrollContent)
        .overlay(alignment: .bottom) {
            SidebarFooter()
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { footerHeight = $0 }
        }
        .onChange(of: scene.sidebar) { _, _ in
            if app.settings.hapticsEnabled { Haptics.selection() }
        }
    }
}

struct NoteTitleLabel: View {
    let note: NoteMeta

    var body: some View {
        Label {
            Text(note.title.isEmpty ? String(localized: "Untitled") : note.title)
                .lineLimit(1)
        } icon: {
            if let icon = note.icon {
                Text(icon)
            } else {
                Image(systemName: note.kind == .daily ? "sun.max" : "doc.text")
                    .foregroundStyle(Theme.Palette.textSecondary)
            }
        }
    }
}

/// A fixed sidebar row: neutral icon, primary text (selection shows in ink, not accent).
struct SidebarLabel: View {
    let title: LocalizedStringKey
    let systemImage: String

    init(_ title: LocalizedStringKey, systemImage: String) {
        self.title = title
        self.systemImage = systemImage
    }

    var body: some View {
        Label {
            Text(title)
        } icon: {
            Image(systemName: systemImage)
                .foregroundStyle(Theme.Palette.textSecondary)
        }
    }
}

/// iPad: the system sidebar. iPhone: a flat list on the sidebar paper with section
/// titles, no inset-grouped boxes (DSSidebarSection / DSSidebarItem look).
struct SidebarListStyle: ViewModifier {
    let isCompact: Bool

    func body(content: Content) -> some View {
        if isCompact {
            content
                .listStyle(.plain)
                .environment(\.defaultMinListRowHeight, 40)
        } else {
            content.listStyle(.sidebar)
        }
    }
}

/// Rows of the flat iPhone sidebar: no boxes, no separators.
struct SidebarRowStyle: ViewModifier {
    let isCompact: Bool

    func body(content: Content) -> some View {
        if isCompact {
            content
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listSectionSeparator(.hidden)
        } else {
            content
        }
    }
}

struct SpaceSwitcher: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene

    var body: some View {
        let library = app.library
        Menu {
            ForEach(library.spaces) { space in
                Button {
                    withAnimation(Theme.Motion.smooth) {
                        library.activateSpace(space.id)
                        scene.sidebar = .allDocuments
                    }
                } label: {
                    if space.id == library.activeSpace?.id {
                        Label(space.name, systemImage: "checkmark")
                    } else {
                        Label(space.name, systemImage: space.icon)
                    }
                }
            }
            Divider()
            Button("New Space…", systemImage: "plus") { scene.sheet = .newSpace }
            if let space = library.activeSpace {
                Button("Edit Space…", systemImage: "pencil") { scene.sheet = .editSpace(space.id) }
            }
        } label: {
            HStack(spacing: Theme.Space.s2) {
                if let space = library.activeSpace {
                    // A 26 pt tile in the space colour (its emoji or first letter), then its name.
                    SpaceTile(space: space)
                    Text(space.name)
                        .font(.system(.callout, design: .serif).weight(.semibold))
                        .foregroundStyle(Theme.Palette.textPrimary)
                        .lineLimit(1)
                }
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Theme.Palette.textTertiary)
            }
        }
        .accessibilityLabel("Switch Space")
        .accessibilityIdentifier("sidebar.spaceSwitcher")
    }
}

/// `DSSpaceTile`: the space's emoji, or the first letter of its name when the icon is an
/// SF Symbol, on the space colour.
struct SpaceTile: View {
    let space: Space
    var size: CGFloat = 26

    private var glyph: String {
        // SF Symbol names are ASCII words with dots ("square.stack"); emoji are not.
        let isSymbol = space.icon.allSatisfy { $0.isASCII }
        return isSymbol ? (space.name.first.map(String.init) ?? "·") : space.icon
    }

    var body: some View {
        #if canImport(DSDesign)
        DSSpaceTile(glyph, tint: DSTintToken(rawValue: space.color.rawValue) ?? .gray, size: size)
        #else
        Text(glyph)
            .font(.system(size: size * 0.56, weight: .semibold, design: .serif))
            .foregroundStyle(space.color.foreground)
            .frame(width: size, height: size)
            .background(space.color.background, in: RoundedRectangle(cornerRadius: size * 0.28, style: .continuous))
        #endif
    }
}

struct SidebarFooter: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene

    var body: some View {
        HStack(spacing: Theme.Space.s3) {
            SyncStatusBadge()
            Spacer()
            Button {
                scene.sheet = .settings
            } label: {
                Image(systemName: "gearshape")
                    .font(.body)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Settings")
            .accessibilityIdentifier("sidebar.settings")
        }
        .padding(.horizontal, Theme.Space.s4)
        .padding(.vertical, Theme.Space.s3)
        .glassEffect(.regular, in: .capsule)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("sidebar.footer")
        .padding(.horizontal, Theme.Space.s3)
        .padding(.bottom, Theme.Space.s2)
    }
}

struct SyncStatusBadge: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        if case .notSent(let documents, let reason) = app.sync.phase {
            notSent(documents: documents, reason: reason)
        } else if app.sync.phase == .sessionEnded {
            HStack(spacing: Theme.Space.s2) {
                let (icon, text, color) = describe(app.sync.phase)
                label(icon: icon, text: text, color: color)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("sync.status")
                Button("Sign In") { app.sync.showsSessionEnded = true }
                    .font(Theme.Typography.footnote.weight(.semibold))
                    .buttonStyle(.borderless)
                    .tint(Theme.Palette.accent)
                    .accessibilityIdentifier("sync.signIn")
            }
        } else {
            let (icon, text, color) = describe(app.sync.phase)
            label(icon: icon, text: text, color: color)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("sync.status")
        }
    }

    private func label(icon: String, text: LocalizedStringKey, color: Color) -> some View {
        Label {
            Text(text)
                .font(Theme.Typography.footnote)
                .foregroundStyle(Theme.Palette.textSecondary)
        } icon: {
            Image(systemName: icon)
                .foregroundStyle(color)
                .symbolEffect(.pulse, isActive: app.sync.phase == .syncing)
        }
    }

    /// Changes the server refused: how many documents, why, and a way to send them again.
    private func notSent(documents: Int, reason: String) -> some View {
        HStack(spacing: Theme.Space.s2) {
            VStack(alignment: .leading, spacing: 2) {
                let (icon, text, color) = describe(app.sync.phase)
                label(icon: icon, text: text, color: color)
                Text(reason)
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textTertiary)
                    .lineLimit(2)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("sync.status")
            Button("Retry") { app.sync.retryFailed() }
                .font(Theme.Typography.footnote.weight(.semibold))
                .buttonStyle(.borderless)
                .tint(Theme.Palette.accent)
                .accessibilityIdentifier("sync.retry")
        }
    }

    private func describe(_ phase: SyncCenter.Phase) -> (String, LocalizedStringKey, Color) {
        switch phase {
        case .localOnly:
            return ("iphone", "On this device", Theme.Palette.textTertiary)
        case .offline(let pending):
            let text: LocalizedStringKey = pending > 0 ? "Offline · \(pending) waiting" : "Offline"
            return ("icloud.slash", text, Theme.Palette.warning)
        case .syncing:
            return ("arrow.triangle.2.circlepath", "Syncing…", Theme.Palette.accent)
        case .upToDate:
            return ("checkmark.icloud", "Up to date", Theme.Palette.success)
        case .failed:
            return ("exclamationmark.icloud", "Sync problem", Theme.Palette.danger)
        case .sessionEnded:
            return ("person.crop.circle.badge.exclamationmark", "Signed out", Theme.Palette.danger)
        case .notSent(let documents, _):
            let text: LocalizedStringKey = "Not sent: \(documents)"
            return ("exclamationmark.icloud", text, Theme.Palette.danger)
        }
    }
}
