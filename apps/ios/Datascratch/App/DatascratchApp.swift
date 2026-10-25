import SwiftUI

@main
struct DatascratchApp: App {
    @State private var app = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
        }
        .commands { AppCommands() }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { app.library.flush() }
        }

        // A single document in its own window (Stage Manager, split view).
        WindowGroup(id: "note", for: String.self) { $noteId in
            if let noteId {
                NoteWindow(noteId: noteId)
                    .environment(app)
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
            }
        }
        .onAppear {
            if scene == nil {
                let model = SceneModel(app: app)
                model.selectedNoteId = noteId
                scene = model
            }
        }
    }
}
