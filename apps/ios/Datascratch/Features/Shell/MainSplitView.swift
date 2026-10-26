import SwiftUI

struct MainSplitView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        @Bindable var scene = scene
        @Bindable var sync = app.sync
        NavigationSplitView(columnVisibility: $scene.columnVisibility,
                            preferredCompactColumn: $scene.preferredCompactColumn) {
            SidebarView()
                .navigationSplitViewColumnWidth(min: 240, ideal: 280, max: 340)
        } content: {
            ContentColumn()
                .navigationSplitViewColumnWidth(min: 320, ideal: 400, max: 560)
        } detail: {
            NavigationStack {
                if scene.isContentFullScreen {
                    ContentColumn()
                } else if let noteId = scene.selectedNoteId, app.library.note(noteId) != nil {
                    DocumentScreen(noteId: noteId)
                        .id(noteId)
                } else {
                    EmptyDetailView()
                }
            }
            // Warm paper behind the document column too (not the system white / blue-black).
            .background(Theme.Palette.canvas.ignoresSafeArea())
        }
        .navigationSplitViewStyle(.balanced)
        // Craft-like chrome: toolbar and sidebar icons in neutral ink; the accent is
        // kept for the main action (`prominentGlass`) and for sheets.
        .tint(Theme.Palette.textPrimary)
        .overlay {
            if scene.isCommandPalettePresented {
                CommandPaletteView()
                    .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
            }
        }
        .animation(Theme.Motion.snappy, value: scene.isCommandPalettePresented)
        .sheet(item: $scene.sheet) { sheet in
            SceneSheetView(sheet: sheet)
                .environment(scene)
                .tint(Theme.Palette.accent)
        }
        .modifier(ModeChangeConfirmation())
        // The server ended this device's session: say so, and offer to sign in again.
        .sheet(isPresented: $sync.showsSessionEnded) {
            SessionEndedView()
                .tint(Theme.Palette.accent)
        }
        .background(Theme.Palette.canvas)
    }
}

/// Middle column: depends on the sidebar selection.
struct ContentColumn: View {
    @Environment(SceneModel.self) private var scene

    var body: some View {
        switch scene.sidebar ?? .allDocuments {
        case .tasks:
            TasksView()
        case .calendar:
            CalendarView()
        case .trash:
            TrashView()
        case let item:
            DocumentCollectionView(source: item)
        }
    }
}

struct EmptyDetailView: View {
    @Environment(SceneModel.self) private var scene

    var body: some View {
        ZStack {
            Theme.Palette.canvas.ignoresSafeArea()
            VStack(spacing: Theme.Space.s4) {
                Image(systemName: "pencil.and.scribble")
                    .font(.system(size: 44, weight: .light))
                    .foregroundStyle(Theme.Palette.textTertiary)
                Text("Nothing open")
                    .font(Theme.Typography.h2)
                    .foregroundStyle(Theme.Palette.textPrimary)
                Text("Pick a document or start a new one.")
                    .font(Theme.Typography.callout)
                    .foregroundStyle(Theme.Palette.textSecondary)
                HStack(spacing: Theme.Space.s3) {
                    Button {
                        scene.newNote()
                    } label: {
                        Label("New Note", systemImage: "square.and.pencil")
                    }
                    .prominentGlass()
                    Button {
                        scene.isCommandPalettePresented = true
                    } label: {
                        Label("Commands", systemImage: "command")
                    }
                    .buttonStyle(.glass)
                }
                .padding(.top, Theme.Space.s2)
            }
            .padding(Theme.Space.s8)
        }
    }
}

/// Asks before switching a notebook between private and agent modes (D-09).
struct ModeChangeConfirmation: ViewModifier {
    @Environment(SceneModel.self) private var scene

    func body(content: Content) -> some View {
        let isPresented = Binding(
            get: { scene.pendingModeChange != nil },
            set: { if !$0 { scene.pendingModeChange = nil } }
        )
        let toAgent = scene.pendingModeChange?.mode == .agent
        let title: LocalizedStringKey = toAgent ? "Open this notebook to agents?" : "Make this notebook private?"
        let action: LocalizedStringKey = toAgent ? "Open to Agents" : "Make Private"
        content.alert(title, isPresented: isPresented) {
            Button(action, role: toAgent ? .destructive : nil) {
                scene.confirmModeChange()
            }
            Button("Cancel", role: .cancel) { scene.pendingModeChange = nil }
        } message: {
            if toAgent {
                Text("The notebook key will be stored on the server so agents with a token can read and edit it. The server will technically be able to read these notes.")
            } else {
                Text("The server copy of the key will be deleted. Agents will lose access, and only your devices will be able to read these notes.")
            }
        }
    }
}
