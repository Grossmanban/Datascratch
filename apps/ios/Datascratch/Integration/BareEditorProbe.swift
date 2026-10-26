#if canImport(DSEditor)
import DSEditor
import SwiftUI
import UIKit

/// Experiment for ios-editor (`-bareEditorProbe`): a bare `EditorView` over an in-memory
/// document, with no navigation, palette or app state, to tell whether a crash comes from the
/// editor itself or from the screen around it.
struct BareEditorProbe: UIViewRepresentable {
    static var isRequested: Bool { ProcessInfo.processInfo.arguments.contains("-bareEditorProbe") }

    func makeUIView(context: Context) -> EditorView {
        let document = InMemoryEditorDocument(blocks: [.title("Probe"), .paragraph("Tap here and type.")])
        let editor = EditorView(document: document)
        editor.accessibilityIdentifier = "bareEditor"
        return editor
    }

    func updateUIView(_ uiView: EditorView, context: Context) {}
}
#endif
