import SwiftUI

struct SidebarView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.openWindow) private var openWindow

    private var library: LibraryStore { app.library }

    var body: some View {
        @Bindable var scene = scene
        List(selection: $scene.sidebar) {
            if !library.openTabs.isEmpty {
                Section("Tabs") {
                    ForEach(library.openTabs) { note in
                        Button {
                            scene.open(note.id)
                        } label: {
                            NoteTitleLabel(note: note)
                                .fontWeight(scene.selectedNoteId == note.id ? .semibold : .regular)
                        }
                        .buttonStyle(.plain)
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
                Label("All Documents", systemImage: "doc.on.doc")
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
                }
                .tag(SidebarItem.tasks)
                .accessibilityIdentifier("sidebar.tasks")
                Label("Calendar", systemImage: "calendar")
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
                Label("Trash", systemImage: "trash")
                    .tag(SidebarItem.trash)
                    .accessibilityIdentifier("sidebar.trash")
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .background(Theme.Palette.sidebar)
        .navigationTitle(library.activeSpace?.name ?? "Datascratch")
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
        .safeAreaInset(edge: .bottom) {
            SidebarFooter()
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
                    Image(systemName: space.icon)
                        .foregroundStyle(space.color.foreground)
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
        .padding(.horizontal, Theme.Space.s3)
        .padding(.bottom, Theme.Space.s2)
    }
}

struct SyncStatusBadge: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        let (icon, text, color) = describe(app.sync.phase)
        Label {
            Text(text)
                .font(Theme.Typography.footnote)
                .foregroundStyle(Theme.Palette.textSecondary)
        } icon: {
            Image(systemName: icon)
                .foregroundStyle(color)
                .symbolEffect(.pulse, isActive: app.sync.phase == .syncing)
        }
        .accessibilityElement(children: .combine)
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
        }
    }
}
