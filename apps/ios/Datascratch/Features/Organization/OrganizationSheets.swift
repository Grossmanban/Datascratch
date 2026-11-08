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
    @State private var isSaving = false
    @State private var error: String?

    /// D-62: the notebook is (or will be) in a shared space.
    private var inSharedSpace: Bool {
        app.library.spaces.first { $0.id == (notebook?.spaceId ?? spaceId) }?.isShared == true
    }

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
                if let error {
                    Section { Text(error).foregroundStyle(Theme.Palette.danger) }
                }
                if notebook == nil && inSharedSpace {
                    Section {
                        Label("Everyone in this space will see it.", systemImage: "person.2")
                            .font(Theme.Typography.callout)
                            .foregroundStyle(Theme.Palette.textSecondary)
                    }
                } else if notebook == nil {
                    Section {
                        ModeOption(mode: .private, selection: $mode)
                        ModeOption(mode: .agent, selection: $mode)
                    } header: {
                        Text("Encryption")
                    } footer: {
                        Text("You can change this later in the notebook menu.")
                    }
                } else if !inSharedSpace, app.library.spaces.filter({ !$0.isShared }).count > 1 {
                    // Between personal spaces only: into a shared one is «Move to Space…», with
                    // its warning (D-62).
                    Section("Space") {
                        Picker("Space", selection: $spaceSelection) {
                            ForEach(app.library.spaces.filter { !$0.isShared }) { space in
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
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
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
        } else if inSharedSpace {
            // D-62: made on the server first (its key is under the space key).
            isSaving = true
            error = nil
            let sharing = app.accountSharing
            Task {
                do {
                    try await sharing.createNotebook(inSharedSpace: spaceId, name: trimmed, icon: icon, color: color)
                    Haptics.success()
                    dismiss()
                } catch {
                    self.error = error.localizedDescription
                }
                isSaving = false
            }
            return
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

/// Creating or editing a space (owner, 2026-11-08, D-15): one sheet. A live preview of the
/// space's chip; for a new one the kind as two large cards — Personal or Shared; the name (the
/// caret already in it, nothing made without one); its glyph and colour. A shared space goes on
/// to «Invite People» (which can be closed). «Edit Space» is the same sheet without the kind.
struct SpaceEditor: View {
    @Environment(SceneModel.self) private var scene
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let space: Space?
    /// Opened as «shared» (an older entry point): the Shared card starts chosen.
    var startsShared = false

    @State private var name = ""
    @State private var icon = SpaceEditor.letterIcon
    @State private var color: Tint = .blue
    @State private var isShared = false
    @State private var confirmDelete = false
    @FocusState private var nameFocused: Bool

    /// An SF Symbol name: the tile then shows the name's first letter (`SpaceTile`).
    static let letterIcon = "square.stack"
    static let glyphs = ["🏠", "💼", "🎓", "📚", "🎨", "💡", "🧪", "✈️", "🌱", "🎵", "❤️", "⭐️", "🧩", "🏃", "🍳", "🛠️"]

    private var trimmed: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canShare: Bool { space == nil && app.accountSharing.isAvailable }
    /// What the chip in the switcher will look like.
    private var preview: Space {
        Space(id: space?.id ?? "preview", name: trimmed.isEmpty ? String(localized: "Space name") : trimmed,
              icon: icon, color: color, order: 0, createdAt: Date(), sharing: isShared ? .owned : space?.sharing)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.s6) {
                    section("Preview") { previewChip }
                    if canShare { kindCards }
                    nameField
                    section("Icon") { glyphGrid }
                    section("Color") { TintPicker(selection: $color) }
                    deleteSection
                }
                .padding(.horizontal, Theme.Space.s5)
                .padding(.vertical, Theme.Space.s4)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.Palette.canvas)
            .navigationTitle(space != nil ? LocalizedStringKey("Space Settings") : "New Space")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(space != nil ? LocalizedStringKey("Save") : isShared ? "Create and Invite" : "Create Space") { save() }
                        .fontWeight(.semibold)
                        .disabled(trimmed.isEmpty)
                        .accessibilityIdentifier("space.save")
                }
            }
            .onAppear {
                if let space {
                    name = space.name
                    icon = space.icon
                    color = space.color
                } else {
                    isShared = startsShared && canShare
                    nameFocused = true
                }
            }
        }
        .accessibilityIdentifier("spaceEditor")
    }

    // MARK: Parts

    /// The chip as the switcher will show it, live.
    private var previewChip: some View {
        HStack(spacing: Theme.Space.s3) {
            SpaceTile(space: preview, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(preview.name)
                    .font(.system(.title3, design: .serif).weight(.semibold))
                    .foregroundStyle(trimmed.isEmpty ? Theme.Palette.textTertiary : Theme.Palette.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                Label(isShared || preview.isShared ? LocalizedStringKey("Shared space") : "Personal space",
                      systemImage: isShared || preview.isShared ? "person.2" : "lock")
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textSecondary)
            }
            Spacer(minLength: 0)
        }
        .padding(Theme.Space.s4)
        .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.xl, style: .continuous))
        .animation(Theme.Motion.snappy, value: [trimmed, icon, color.rawValue, isShared ? "shared" : "personal"])
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("space.preview")
    }

    private var kindCards: some View {
        HStack(spacing: Theme.Space.s3) {
            kindCard(shared: false, title: "Personal", detail: "Only for you. You can share it later.", symbol: "lock")
            kindCard(shared: true, title: "For Working Together", detail: "Invite people — they will see all notebooks.", symbol: "person.2")
        }
    }

    private func kindCard(shared: Bool, title: LocalizedStringKey, detail: LocalizedStringKey, symbol: String) -> some View {
        let selected = isShared == shared
        return Button {
            withAnimation(Theme.Motion.snappy) { isShared = shared }
            Haptics.selection()
        } label: {
            VStack(alignment: .leading, spacing: Theme.Space.s2) {
                Image(systemName: symbol)
                    .font(.title2)
                    .foregroundStyle(selected ? color.foreground : Theme.Palette.textSecondary)
                Text(title)
                    .font(Theme.Typography.body.weight(.semibold))
                    .foregroundStyle(Theme.Palette.textPrimary)
                Text(detail)
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading)
            .padding(Theme.Space.s4)
            .background(selected ? color.background : Theme.Palette.surface,
                        in: RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                    .strokeBorder(selected ? color.foreground : Theme.Palette.separator, lineWidth: selected ? 2 : 1)
            }
            .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier(shared ? "space.kind.shared" : "space.kind.personal")
    }

    private var nameField: some View {
        section("Name") {
            TextField("Name", text: $name, prompt: Text("For example, Work"))
                .font(Theme.Typography.h3)
                .focused($nameFocused)
                .submitLabel(.done)
                .onSubmit { if !trimmed.isEmpty { save() } }
                .padding(.horizontal, Theme.Space.s4)
                .padding(.vertical, Theme.Space.s3)
                .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
                .accessibilityIdentifier("space.name")
        }
    }

    /// The name's first letter, or an emoji.
    private var glyphGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Theme.Space.s2), count: 6), spacing: Theme.Space.s2) {
            glyphButton(Self.letterIcon) {
                Text(trimmed.first.map { String($0).uppercased() } ?? "A")
                    .font(.system(.title3, design: .serif).weight(.semibold))
            }
            ForEach(Self.glyphs, id: \.self) { glyph in
                glyphButton(glyph) { Text(glyph).font(.title3) }
            }
        }
    }

    private func glyphButton(_ value: String, @ViewBuilder label: () -> some View) -> some View {
        let selected = icon == value || (value == Self.letterIcon && icon.allSatisfy(\.isASCII))
        return Button {
            withAnimation(Theme.Motion.snappy) { icon = value }
            Haptics.selection()
        } label: {
            label()
                .foregroundStyle(selected ? color.foreground : Theme.Palette.textSecondary)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(selected ? color.background : Theme.Palette.surface,
                            in: RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    @ViewBuilder private var deleteSection: some View {
        // A shared space is not deleted from here: its people would lose it at once.
        if let space, !space.isShared, app.library.spaces.count > 1 {
            Button("Delete Space", role: .destructive) { confirmDelete = true }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Theme.Space.s3)
                .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
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

    private func section(_ title: LocalizedStringKey, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: Theme.Space.s2) {
            Text(title)
                .font(Theme.Typography.caption.weight(.semibold))
                .foregroundStyle(Theme.Palette.textTertiary)
                .textCase(.uppercase)
            content()
        }
    }

    // MARK: Saving

    private func save() {
        let name = trimmed
        guard !name.isEmpty else { return }
        if let space {
            app.library.updateSpace(space.id) {
                $0.name = name
                $0.icon = icon
                $0.color = color
            }
            dismiss()
            return
        }
        let created = app.library.createSpace(name: name, icon: icon, color: color)
        scene.switchSpace(to: created.id)
        scene.sidebar = .allDocuments
        guard isShared else {
            dismiss()
            return
        }
        // Shared at once (or, offline, with the first invitation); «Invite People» follows and
        // can be closed.
        app.library.flush()
        let sharing = app.accountSharing
        Task { _ = try? await sharing.makeShared(space: created.id) }
        scene.sheet = .inviteToNewSpace(created.id)
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
