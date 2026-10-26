import SwiftUI

struct NotebookRow: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let notebook: Notebook
    @State private var isExpanded = true

    var body: some View {
        let library = app.library
        let hasFolders = !library.folders(in: notebook.id, parent: nil).isEmpty
        Group {
            if hasFolders {
                DisclosureGroup(isExpanded: $isExpanded) {
                    FolderRows(notebookId: notebook.id, parentId: nil)
                } label: {
                    label
                }
            } else {
                label
            }
        }
        .tag(SidebarItem.notebook(notebook.id))
    }

    private var label: some View {
        let library = app.library
        return Label {
            HStack(spacing: Theme.Space.s2) {
                Text(notebook.name).lineLimit(1)
                if notebook.mode == .agent {
                    Image(systemName: "sparkles")
                        .font(.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                        .accessibilityLabel("Open to agents")
                }
            }
        } icon: {
            Image(systemName: notebook.icon)
                .foregroundStyle(notebook.color.foreground)
        }
        .dropDestination(for: String.self) { ids, _ in
            for id in ids where library.note(id) != nil {
                library.move(note: id, toNotebook: notebook.id, folder: nil)
            }
            return !ids.isEmpty
        }
        .contextMenu {
            Button("New Note", systemImage: "square.and.pencil") {
                scene.sidebar = .notebook(notebook.id)
                scene.newNote()
            }
            Button("New Folder", systemImage: "folder.badge.plus") {
                scene.sheet = .newFolder(notebookId: notebook.id, parentId: nil)
            }
            Divider()
            Button("Edit Notebook…", systemImage: "pencil") { scene.sheet = .editNotebook(notebook.id) }
            Button("Share…", systemImage: "square.and.arrow.up") {
                scene.sheet = .share(ShareTarget(kind: .notebook, id: notebook.id))
            }
            Menu("Encryption Mode", systemImage: "lock") {
                Button("Private", systemImage: notebook.mode == .private ? "checkmark" : "lock") {
                    scene.requestModeChange(notebook.id, to: .private)
                }
                Button("Open to Agents", systemImage: notebook.mode == .agent ? "checkmark" : "sparkles") {
                    scene.requestModeChange(notebook.id, to: .agent)
                }
            }
            Button(library.isStarred(.notebook, notebook.id) ? LocalizedStringKey("Remove from Starred") : "Add to Starred",
                   systemImage: "star") {
                library.toggleStar(.notebook, notebook.id)
            }
            Divider()
            Button("Delete Notebook", systemImage: "trash", role: .destructive) {
                if scene.sidebar == .notebook(notebook.id) { scene.sidebar = .allDocuments }
                library.deleteNotebook(notebook.id)
            }
        }
    }
}

struct FolderRows: View {
    @Environment(AppModel.self) private var app
    let notebookId: String
    let parentId: String?

    var body: some View {
        ForEach(app.library.folders(in: notebookId, parent: parentId)) { folder in
            FolderRow(folder: folder)
        }
    }
}

struct FolderRow: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let folder: Folder
    @State private var isExpanded = false

    var body: some View {
        let library = app.library
        let hasChildren = !library.folders(in: folder.notebookId, parent: folder.id).isEmpty
        Group {
            if hasChildren {
                DisclosureGroup(isExpanded: $isExpanded) {
                    // AnyView breaks the recursive opaque type FolderRows → FolderRow → FolderRows.
                    AnyView(FolderRows(notebookId: folder.notebookId, parentId: folder.id))
                } label: {
                    label
                }
            } else {
                label
            }
        }
        .tag(SidebarItem.folder(folder.id))
    }

    private var label: some View {
        let library = app.library
        return Label {
            Text(folder.name).lineLimit(1)
        } icon: {
            Image(systemName: folder.icon)
                .foregroundStyle(folder.color.foreground)
        }
        .dropDestination(for: String.self) { ids, _ in
            for id in ids where library.note(id) != nil {
                library.move(note: id, toNotebook: folder.notebookId, folder: folder.id)
            }
            return !ids.isEmpty
        }
        .contextMenu { FolderMenuItems(folder: folder) }
    }
}

/// The folder's menu, the same in the sidebar tree and on the folder strip of a list.
struct FolderMenuItems: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let folder: Folder

    var body: some View {
        let library = app.library
        Button("New Note", systemImage: "square.and.pencil") {
            scene.sidebar = .folder(folder.id)
            scene.newNote()
        }
        Button("New Subfolder", systemImage: "folder.badge.plus") {
            scene.sheet = .newFolder(notebookId: folder.notebookId, parentId: folder.id)
        }
        Button("Edit Folder…", systemImage: "pencil") { scene.sheet = .editFolder(folder.id) }
        Button(library.isStarred(.folder, folder.id) ? LocalizedStringKey("Remove from Starred") : "Add to Starred",
               systemImage: "star") {
            library.toggleStar(.folder, folder.id)
        }
        Divider()
        Button("Delete Folder", systemImage: "trash", role: .destructive) {
            if scene.sidebar == .folder(folder.id) { scene.sidebar = .notebook(folder.notebookId) }
            library.deleteFolder(folder.id)
        }
    }
}

struct TagRow: View {
    @Environment(AppModel.self) private var app
    let name: String
    let count: Int

    var body: some View {
        let color = app.library.data.tagColors[name] ?? .gray
        Label {
            HStack {
                Text(name).lineLimit(1)
                Spacer()
                Text(count, format: .number)
                    .font(Theme.Typography.footnote.monospacedDigit())
                    .foregroundStyle(Theme.Palette.textTertiary)
            }
        } icon: {
            Image(systemName: "number")
                .foregroundStyle(color.foreground)
        }
        .tag(SidebarItem.tag(name))
        .contextMenu {
            Menu("Color", systemImage: "paintpalette") {
                ForEach(Tint.allCases, id: \.self) { tint in
                    Button(tint.localizedName) { app.library.setTagColor(tint, for: name) }
                }
            }
        }
    }
}
