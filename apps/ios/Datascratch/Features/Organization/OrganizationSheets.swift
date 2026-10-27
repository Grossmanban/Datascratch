import SwiftUI

/// Create or edit a notebook; when creating, the user picks the mode (D-09, D-36).
struct NotebookEditor: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.dismiss) private var dismiss

    let spaceId: String
    let notebook: Notebook?

    @State private var name = ""
    @State private var icon = "book.closed"
    @State private var color: Tint = .blue
    @State private var mode: NotebookMode = .private
    @State private var spaceSelection = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: Theme.Space.s3) {
                        Image(systemName: icon)
                            .font(.title2)
                            .foregroundStyle(color.foreground)
                            .frame(width: 44, height: 44)
                            .background(color.background, in: RoundedRectangle(cornerRadius: Theme.Radius.md))
                        TextField("Notebook name", text: $name)
                            .font(Theme.Typography.h3)
                            .accessibilityIdentifier("notebook.name")
                    }
                }
                Section("Color") { TintPicker(selection: $color) }
                Section("Icon") { SymbolPicker(selection: $icon, tint: color) }
                if notebook == nil {
                    Section {
                        ModeOption(mode: .private, selection: $mode)
                        ModeOption(mode: .agent, selection: $mode)
                    } header: {
                        Text("Encryption")
                    } footer: {
                        Text("You can change this later in the notebook menu.")
                    }
                } else if app.library.spaces.count > 1 {
                    Section("Space") {
                        Picker("Space", selection: $spaceSelection) {
                            ForEach(app.library.spaces) { space in
                                Text(space.name).tag(space.id)
                            }
                        }
                    }
                }
            }
            .navigationTitle(notebook == nil ? LocalizedStringKey("New Notebook") : "Edit Notebook")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(notebook == nil ? LocalizedStringKey("Create") : "Done") { save() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                        .accessibilityIdentifier("notebook.save")
                }
            }
            .onAppear {
                spaceSelection = notebook?.spaceId ?? spaceId
                guard let notebook else { return }
                name = notebook.name
                icon = notebook.icon
                color = notebook.color
                mode = notebook.mode
            }
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if let notebook {
            app.library.updateNotebook(notebook.id) {
                $0.name = trimmed
                $0.icon = icon
                $0.color = color
                $0.spaceId = spaceSelection
            }
        } else {
            let created = app.library.createNotebook(in: spaceId, name: trimmed, icon: icon, color: color, mode: mode)
            scene.show(.notebook(created.id))
        }
        Haptics.success()
        dismiss()
    }
}

struct ModeOption: View {
    let mode: NotebookMode
    @Binding var selection: NotebookMode

    var body: some View {
        Button {
            withAnimation(Theme.Motion.snappy) { selection = mode }
        } label: {
            HStack(alignment: .top, spacing: Theme.Space.s3) {
                Image(systemName: mode == .private ? "lock.fill" : "sparkles")
                    .font(.title3)
                    .foregroundStyle(mode == .private ? Theme.Palette.accent : Tint.purple.foreground)
                    .frame(width: 28)
                VStack(alignment: .leading, spacing: Theme.Space.s1) {
                    Text(mode == .private ? LocalizedStringKey("Private") : "Open to agents")
                        .font(.headline)
                        .foregroundStyle(Theme.Palette.textPrimary)
                    Text(mode == .private
                         ? LocalizedStringKey("End-to-end encrypted. Only your devices can read it; agents have no access.")
                         : "AI agents with a token can read and edit it. The key is kept on the server, so the server can technically read these notes.")
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Image(systemName: selection == mode ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(selection == mode ? Theme.Palette.accent : Theme.Palette.textTertiary)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("notebook.mode.\(mode.rawValue)")
        .accessibilityAddTraits(selection == mode ? .isSelected : [])
    }
}

struct SpaceEditor: View {
    @Environment(SceneModel.self) private var scene
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let space: Space?

    @State private var name = ""
    @State private var icon = "square.stack"
    @State private var color: Tint = .blue
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Space name", text: $name)
                        .font(Theme.Typography.h3)
                        .accessibilityIdentifier("space.name")
                } footer: {
                    Text("Spaces keep contexts apart — for example Personal, Work and Study.")
                }
                Section("Color") { TintPicker(selection: $color) }
                Section("Icon") { SymbolPicker(selection: $icon, tint: color) }
                if let space, app.library.spaces.count > 1 {
                    Section {
                        Button("Delete Space", role: .destructive) { confirmDelete = true }
                    }
                    .confirmationDialog("Delete this space?", isPresented: $confirmDelete, titleVisibility: .visible) {
                        Button("Delete Space and Its Notebooks", role: .destructive) {
                            app.library.deleteSpace(space.id)
                            dismiss()
                        }
                    } message: {
                        Text("All notebooks in this space and their notes will be deleted.")
                    }
                }
            }
            .navigationTitle(space == nil ? LocalizedStringKey("New Space") : "Edit Space")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(space == nil ? LocalizedStringKey("Create") : "Done") {
                        let trimmed = name.trimmingCharacters(in: .whitespaces)
                        if let space {
                            app.library.updateSpace(space.id) {
                                $0.name = trimmed
                                $0.icon = icon
                                $0.color = color
                            }
                        } else {
                            let created = app.library.createSpace(name: trimmed, icon: icon, color: color)
                            scene.switchSpace(to: created.id)
                        }
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .accessibilityIdentifier("space.save")
                }
            }
            .onAppear {
                guard let space else { return }
                name = space.name
                icon = space.icon
                color = space.color
            }
        }
    }
}

struct FolderEditor: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.dismiss) private var dismiss
    let notebookId: String
    let parentId: String?
    let folder: Folder?

    @State private var name = ""
    @State private var icon = "folder"
    @State private var color: Tint = .gray

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Folder name", text: $name)
                        .font(Theme.Typography.h3)
                        .accessibilityIdentifier("folder.name")
                }
                Section("Color") { TintPicker(selection: $color) }
                Section("Icon") { SymbolPicker(selection: $icon, tint: color) }
            }
            .navigationTitle(folder == nil ? LocalizedStringKey("New Folder") : "Edit Folder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(folder == nil ? LocalizedStringKey("Create") : "Done") {
                        let trimmed = name.trimmingCharacters(in: .whitespaces)
                        if let folder {
                            app.library.updateFolder(folder.id) {
                                $0.name = trimmed
                                $0.icon = icon
                                $0.color = color
                            }
                        } else {
                            let created = app.library.createFolder(in: notebookId, parent: parentId, name: trimmed,
                                                                   icon: icon, color: color)
                            scene.show(.folder(created.id))
                        }
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .accessibilityIdentifier("folder.save")
                }
            }
            .onAppear {
                guard let folder else { return }
                name = folder.name
                icon = folder.icon
                color = folder.color
            }
        }
    }
}

/// Move a document to another notebook/folder.
struct MoveNoteSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let noteId: String

    var body: some View {
        let library = app.library
        NavigationStack {
            List {
                ForEach(library.spaces) { space in
                    Section(space.name) {
                        ForEach(library.notebooks(in: space.id)) { notebook in
                            destination(notebook: notebook, folder: nil, depth: 0)
                            ForEach(flattenedFolders(notebook.id), id: \.folder.id) { item in
                                destination(notebook: notebook, folder: item.folder, depth: item.depth)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Move To")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }

    private func destination(notebook: Notebook, folder: Folder?, depth: Int) -> some View {
        let current = app.library.note(noteId)
        let isCurrent = current?.notebookId == notebook.id && current?.folderId == folder?.id
        return Button {
            app.library.move(note: noteId, toNotebook: notebook.id, folder: folder?.id)
            Haptics.success()
            dismiss()
        } label: {
            HStack {
                Label {
                    Text(folder?.name ?? notebook.name)
                } icon: {
                    Image(systemName: folder?.icon ?? notebook.icon)
                        .foregroundStyle((folder?.color ?? notebook.color).foreground)
                }
                .padding(.leading, CGFloat(depth) * Theme.Space.s5 + (folder == nil ? 0 : Theme.Space.s5))
                Spacer()
                if isCurrent { Image(systemName: "checkmark").foregroundStyle(Theme.Palette.accent) }
            }
        }
        .buttonStyle(.plain)
        .disabled(isCurrent)
    }

    private func flattenedFolders(_ notebookId: String) -> [(folder: Folder, depth: Int)] {
        var result: [(folder: Folder, depth: Int)] = []
        func visit(_ parent: String?, depth: Int) {
            for folder in app.library.folders(in: notebookId, parent: parent) {
                result.append((folder, depth))
                visit(folder.id, depth: depth + 1)
            }
        }
        visit(nil, depth: 0)
        return result
    }
}
