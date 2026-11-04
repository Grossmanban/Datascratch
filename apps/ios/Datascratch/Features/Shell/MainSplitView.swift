import SwiftUI

struct MainSplitView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        @Bindable var scene = scene
        @Bindable var sync = app.sync
        Group {
            if UIDevice.current.userInterfaceIdiom == .pad, sizeClass == .regular {
                // iPad (D-60): sidebar | list | document at once in landscape, list | document
                // in portrait — as in Notesnook. Navigation never closes the document.
                GeometryReader { proxy in
                    let landscape = proxy.size.width > proxy.size.height
                    NavigationSplitView(columnVisibility: Binding(
                        get: { scene.padColumnVisibility(landscape: landscape) },
                        set: { scene.setPadColumnVisibility($0) })) {
                        SidebarView()
                            .navigationSplitViewColumnWidth(min: 220, ideal: 260, max: 320)
                            // One sidebar button, ours (it shows or hides the sidebar).
                            .toolbar(removing: .sidebarToggle)
                    } content: {
                        ContentColumn()
                            .navigationSplitViewColumnWidth(min: 300, ideal: 340, max: 440)
                            .toolbar {
                                ToolbarItem(placement: .topBarLeading) { SidebarToggleButton() }
                            }
                            .accessibilityElement(children: .contain)
                            .accessibilityIdentifier("workspace.list")
                    } detail: {
                        PadDocumentColumn()
                    }
                    .navigationSplitViewStyle(.balanced)
                    .onChange(of: landscape, initial: true) { _, value in scene.isPadLandscape = value }
                }
            } else {
                NavigationSplitView(columnVisibility: $scene.columnVisibility,
                                    preferredCompactColumn: $scene.preferredCompactColumn) {
                    SidebarView()
                        .navigationSplitViewColumnWidth(min: 240, ideal: 280, max: 340)
                } content: {
                    ContentColumn()
                        .navigationSplitViewColumnWidth(min: 320, ideal: 400, max: 560)
                } detail: {
                    NavigationStack {
                        if let noteId = scene.selectedNoteId, app.library.note(noteId) != nil {
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
            }
        }
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
        .modifier(MissingNoteAlert())
        .modifier(LinkProblemAlert())
        // The server ended this device's session: say so, and offer to sign in again.
        .sheet(isPresented: $sync.showsSessionEnded) {
            SessionEndedView()
                .tint(Theme.Palette.accent)
        }
        .background(Theme.Palette.canvas)
    }
}

/// iPad document column (D-60): the open document with its tab strip, or «Nothing open».
struct PadDocumentColumn: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var width: CGFloat = 1000

    var body: some View {
        NavigationStack {
            if let noteId = scene.selectedNoteId, app.library.note(noteId) != nil {
                DocumentScreen(noteId: noteId)
                    .id(noteId)
                    // Open documents as tabs once there are two (spec/12 §12.6).
                    .safeAreaInset(edge: .top, spacing: 0) {
                        if Features.tabs, !scene.isNoteWindow, app.library.openTabs.count > 1 { TabStrip() }
                    }
                    .toolbar {
                        // The list hidden (the document alone): the way back to the columns.
                        if scene.padColumnVisibility(landscape: scene.isPadLandscape) == .detailOnly, !scene.isDocumentFullScreen {
                            ToolbarItem(placement: .topBarLeading) { SidebarToggleButton() }
                        }
                    }
            } else {
                EmptyDetailView()
            }
        }
        .background(Theme.Palette.canvas.ignoresSafeArea())
        // Takes the width that is left, never more (iPad mini portrait).
        .frame(minWidth: 0, maxWidth: .infinity)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
        // A narrow column (iPad mini, portrait): Insert and Share fold into «…».
        .environment(\.isNarrowDocumentColumn, width < 480)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("workspace.document")
    }
}

/// iPad (D-60): shows or hides the sidebar.
struct SidebarToggleButton: View {
    @Environment(SceneModel.self) private var scene

    var body: some View {
        if UIDevice.current.userInterfaceIdiom == .pad, !scene.isDocumentFullScreen {
            Button { scene.toggleSidebar() } label: {
                Image(systemName: "sidebar.left")
            }
            .accessibilityLabel(Text("Show Sidebar"))
            .accessibilityIdentifier("workspace.sidebar")
        }
    }
}

/// Middle column: depends on the sidebar selection.
struct ContentColumn: View {
    @Environment(SceneModel.self) private var scene

    var body: some View {
        switch scene.sidebar ?? .allDocuments {
        case .tasks where Features.tasks:
            TasksView()
        case .calendar where Features.calendar:
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

/// A `[[Title]]` was tapped and there is no such note: offer to create it (spec/04).
struct MissingNoteAlert: ViewModifier {
    @Environment(SceneModel.self) private var scene

    func body(content: Content) -> some View {
        let title = scene.missingNoteTitle ?? ""
        let isPresented = Binding(get: { scene.missingNoteTitle != nil },
                                  set: { if !$0 { scene.missingNoteTitle = nil } })
        content.alert(Text("No note called “\(title)”"), isPresented: isPresented) {
            Button("Create Note") {
                scene.missingNoteTitle = nil
                scene.newNote(title: title)
            }
            .accessibilityIdentifier("missingNote.create")
            Button("Cancel", role: .cancel) { scene.missingNoteTitle = nil }
        }
    }
}

/// A link that cannot open here (D-49, D-54): another server's, or a document this account
/// does not have. Another server's link can still be opened in the browser inside the app.
struct LinkProblemAlert: ViewModifier {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene

    func body(content: Content) -> some View {
        let problem = scene.linkProblem
        let isPresented = Binding(get: { scene.linkProblem != nil }, set: { if !$0 { scene.linkProblem = nil } })
        content.alert(title(problem), isPresented: isPresented, presenting: problem) { problem in
            if case .otherServer(_, let url?) = problem {
                Button("Open in Browser") {
                    scene.linkProblem = nil
                    scene.sheet = .webPage(url)
                }
                .accessibilityIdentifier("linkProblem.browser")
            }
            Button("OK", role: .cancel) { scene.linkProblem = nil }
        } message: { problem in
            Text(message(problem))
        }
    }

    private func title(_ problem: LinkProblem?) -> String {
        switch problem {
        case .otherServer: String(localized: "This link is from another server")
        case .missingNotebook: String(localized: "This notebook isn’t here")
        case .missingDocument, nil: String(localized: "This document isn’t here")
        }
    }

    private func message(_ problem: LinkProblem) -> String {
        switch problem {
        case .otherServer(let host, _):
            guard let current = app.linkServer else {
                return String(localized: "It points to \(host), and you aren’t signed in to a server. Open it in the browser, or sign in to that server in Settings.")
            }
            return String(localized: "It points to \(host), and this account is on \(current). Open it in the browser, or sign in to that server.")
        case .missingDocument, .missingNotebook:
            return String(localized: "It isn’t in this account or shared with it. If someone shared it with you, accept the invitation first.")
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

extension EnvironmentValues {
    /// The document column is narrow (beside the list on an iPad mini in portrait): its toolbar
    /// folds secondary actions into «…».
    @Entry var isNarrowDocumentColumn = false
}
