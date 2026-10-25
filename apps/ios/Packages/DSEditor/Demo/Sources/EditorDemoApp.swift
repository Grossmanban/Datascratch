import DSEditor
import SwiftUI

@main
struct EditorDemoApp: App {
    @State private var model = DemoModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            DemoView(model: model)
                .onChange(of: scenePhase) { _, phase in
                    if phase == .background { model.save() }
                }
        }
    }
}
