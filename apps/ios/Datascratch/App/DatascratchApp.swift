import SwiftUI

@main
struct DatascratchApp: App {
    @State private var app = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    @ViewBuilder private var mainContent: some View {
        #if canImport(DSEditor)
        if BareEditorProbe.isRequested {
            BareEditorProbe().ignoresSafeArea(.container)
        } else {
            RootView()
        }
        #else
        RootView()
        #endif
    }

    var body: some Scene {
        WindowGroup(id: "main") {
            mainContent
                .environment(app)
                .onAppear { app.mainWindowCount += 1 }
                .onDisappear { app.mainWindowCount -= 1 }
        }
        .commands { AppCommands() }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { app.library.flush() }
            if phase == .active {
                app.settings.applyAppearanceToWindows()
                app.refreshRecoveryKeyState()
            }
            // iOS drops the sync socket while the app is suspended, and a socket that looks alive
            // may no longer deliver: coming back checks it and replaces a dead one at once
            // (remote edits showed only after a relaunch, 2026-10-26).
            #if canImport(DSCore)
            if phase == .active { app.connection?.checkConnection() }
            #endif
        }

        // A single document in its own window (Stage Manager, split view).
        WindowGroup(id: "note", for: String.self) { $noteId in
            if let noteId {
                NoteWindow(noteId: noteId)
                    .environment(app)
                    .preferredColorScheme(app.settings.colorScheme)
                    .onAppear { app.settings.applyAppearanceToWindows() }
            }
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        Group {
            switch app.phase {
            case .onboarding:
                OnboardingFlow()
                    .transition(.opacity)
            case .ready:
                MainWindow()
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            }
        }
        .animation(Theme.Motion.smooth, value: app.phase)
        .preferredColorScheme(app.settings.colorScheme)
        .tint(Theme.Palette.accent)
        .onAppear { app.settings.applyAppearanceToWindows() }
        .onOpenURL { url in
            app.pendingRoute = AppRoute.parse(url, webHost: app.webHost)
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
            if let url = activity.webpageURL {
                app.pendingRoute = AppRoute.parse(url, webHost: app.webHost)
            }
        }
    }
}

/// Main window: split view + palette + sheets. One `SceneModel` per window.
struct MainWindow: View {
    @Environment(AppModel.self) private var app
    @State private var scene: SceneModel?

    var body: some View {
        Group {
            if let scene {
                MainSplitView()
                    .environment(scene)
                    .focusedSceneValue(\.sceneModel, scene)
                    .onChange(of: app.pendingRoute, initial: true) { _, route in
                        guard let route else { return }
                        scene.handle(route)
                        app.pendingRoute = nil
                    }
            } else {
                Theme.Palette.canvas.ignoresSafeArea()
            }
        }
        .onAppear {
            if scene == nil { scene = SceneModel(app: app) }
        }
    }
}

/// A secondary window showing one document.
struct NoteWindow: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismissWindow) private var dismissWindow
    @Environment(\.openWindow) private var openWindow
    let noteId: String
    @State private var scene: SceneModel?

    var body: some View {
        Group {
            if let scene {
                NavigationStack {
                    DocumentScreen(noteId: noteId)
                }
                .environment(scene)
                .focusedSceneValue(\.sceneModel, scene)
                .sheet(item: Binding(get: { scene.sheet }, set: { scene.sheet = $0 })) { sheet in
                    SceneSheetView(sheet: sheet)
                        .environment(scene)
                }
            } else {
                // Something has to be on screen for onAppear to run: an empty Group never
                // appears, and the new window stayed black.
                Theme.Palette.canvas.ignoresSafeArea()
            }
        }
        .background(Theme.Palette.canvas.ignoresSafeArea())
        .tint(Theme.Palette.accent)
        .onAppear {
            // A window the system restored for a note that is gone (deleted, or a fresh UI-test
            // library) closes instead of staying empty; the library window comes back if the system
            // restored only this one.
            guard app.library.note(noteId) != nil else {
                // Next turn: a library window restored alongside has appeared by then.
                DispatchQueue.main.async {
                    if app.mainWindowCount == 0 { openWindow(id: "main") }
                    dismissWindow()
                }
                return
            }
            if scene == nil {
                let model = SceneModel(app: app)
                model.selectedNoteId = noteId
                model.isNoteWindow = true
                scene = model
            }
        }
    }
}
