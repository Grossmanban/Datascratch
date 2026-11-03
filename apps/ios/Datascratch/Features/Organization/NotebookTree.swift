import SwiftUI

struct NotebookRow: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let notebook: Notebook
    @State private var isExpanded = true
    /// D-62: a move into or out of a shared space waits for this confirmation.
    @State private var pendingMove: Space?
    @State private var moveError: String?

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
                // In a space this account joined, ✨ is the owner's choice (the badge below).
                if notebook.mode == .agent, space?.isJoined != true {
                    Image(systemName: "sparkles")
                        .font(.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                        .accessibilityLabel("Open to agents")
                } else if app.accountSharing.isOpenToAgents(ShareTarget(kind: .notebook, id: notebook.id)) {
                    SharedAgentsBadge()
                }
                let count = library.documentCount(inNotebook: notebook.id)
                if count > 0 {
                    Spacer(minLength: Theme.Space.s1)
                    SidebarCount(count)
                }
            }
        } icon: {
            Image(systemName: notebook.icon)
                .foregroundStyle(notebook.color.foreground)
        }
        .dropDestination(for: String.self) { ids, _ in
            guard sharedRole != .viewer else { return false }
            for id in ids where library.note(id) != nil {
                library.move(note: id, toNotebook: notebook.id, folder: nil)
            }
            return !ids.isEmpty
        }
        .contextMenu {
            if sharedRole == nil {
                ownerMenu
            } else {
                sharedMenu
            }
        }
        .confirmationDialog(moveTitle, isPresented: Binding(get: { pendingMove != nil }, set: { if !$0 { pendingMove = nil } }),
                            titleVisibility: .visible, presenting: pendingMove) { space in
            Button(space.isShared ? LocalizedStringKey("Move and Share") : "Move") { move(to: space) }
        } message: { space in
            if space.isShared {
                let name = space.name
                Text("Everyone in «\(name)» will see this notebook and all of its history.")
            } else {
                Text("People of the shared space will no longer see new changes. The notebook gets a new key.")
            }
        }
        .alert("The notebook was not moved", isPresented: Binding(get: { moveError != nil }, set: { if !$0 { moveError = nil } })) {
            Button("OK", role: .cancel) { moveError = nil }
        } message: {
            Text(moveError ?? "")
        }
    }

    /// D-54: the role this account has when the notebook is shared with it, on its own or
    /// through a shared space it joined (D-62); nil for its own.
    private var sharedRole: AccessRole? {
        app.accountSharing.role(forNotebook: notebook.id)
    }

    private var space: Space? { app.library.spaces.first { $0.id == notebook.spaceId } }

    private var moveTitle: LocalizedStringKey {
        pendingMove?.isShared == true ? "Move to a shared space?" : "Move out of the shared space?"
    }

    /// D-62: into or out of a shared space the server takes part (keys); between personal
    /// spaces it is the library's.
    private func move(to target: Space) {
        if scene.sidebar == .notebook(notebook.id) { scene.sidebar = .allDocuments }
        let id = notebook.id
        let sharing = app.accountSharing
        Task {
            do {
                try await sharing.moveNotebook(id, toSpace: target.id)
                Haptics.success()
            } catch {
                moveError = error.localizedDescription
            }
        }
    }

    /// Shared with this account: only the owner renames, moves, deletes it or opens it to agents.
    @ViewBuilder private var sharedMenu: some View {
        if sharedRole == .editor {
            Button("New Note", systemImage: "square.and.pencil") {
                scene.sidebar = .notebook(notebook.id)
                scene.newNote()
            }
            Button("New Folder", systemImage: "folder.badge.plus") {
                scene.sheet = .newFolder(notebookId: notebook.id, parentId: nil)
            }
            Divider()
        }
        if let space, space.isJoined {
            Button("Space Members…", systemImage: "person.2") { scene.sheet = .spaceMembers(space.id) }
        } else {
            Button("Sharing…", systemImage: "person.2") {
                scene.sheet = .share(ShareTarget(kind: .notebook, id: notebook.id))
            }
        }
    }

    @ViewBuilder private var ownerMenu: some View {
        let library = app.library
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
            // D-48: the only way between spaces; its starred notes and tabs go with it. D-62: out
            // of a shared space only to a personal one; into the owner's shared spaces, with a
            // warning (members see its history).
            let inShared = space?.isShared == true
            let others = library.spaces.filter { other in
                other.id != notebook.spaceId && !other.isJoined && !(inShared && other.isShared)
            }
            if !others.isEmpty {
                Menu("Move to Space…", systemImage: "rectangle.stack") {
                    ForEach(others) { other in
                        Button(other.name, systemImage: other.isShared ? "person.2" : "rectangle.stack") {
                            if other.isShared || inShared {
                                pendingMove = other
                            } else {
                                if scene.sidebar == .notebook(notebook.id) { scene.sidebar = .allDocuments }
                                library.moveNotebook(notebook.id, toSpace: other.id)
                            }
                        }
                    }
                }
            }
            Divider()
            Button("Delete Notebook", systemImage: "trash", role: .destructive) {
                if scene.sidebar == .notebook(notebook.id) { scene.sidebar = .allDocuments }
                library.deleteNotebook(notebook.id)
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
    /// The row's text when it is not the whole tag (the last part of `работа/клиенты` in the tree).
    var title: String? = nil

    var body: some View {
        let color = app.library.data.tagColors[name] ?? .gray
        Label {
            HStack {
                Text(title ?? name).lineLimit(1)
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
