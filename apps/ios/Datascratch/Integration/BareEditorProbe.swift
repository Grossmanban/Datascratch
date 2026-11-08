#if canImport(DSEditor)
import DSEditor
import SwiftUI
import UIKit

/// Experiment for ios-editor (`-bareEditorProbe`): a bare `EditorView` over an in-memory
/// document, with no navigation, palette or app state, to tell whether a crash comes from the
/// editor itself or from the screen around it. `-bareEditorProbeLong` gives it a long note and
/// shows the scroll offset and the drift after the last lift (selection autoscroll UI tests).
/// The readings are plain UIKit labels: SwiftUI state changed on every scroll relaid the screen
/// out under the scrolling editor and kept the main thread busy after the test (CI: the next
/// test could not terminate the app).
struct BareEditorProbe: UIViewRepresentable {
    static var isRequested: Bool { ProcessInfo.processInfo.arguments.contains("-bareEditorProbe") }
    static var isLong: Bool { ProcessInfo.processInfo.arguments.contains("-bareEditorProbeLong") }

    func makeUIView(context: Context) -> UIView {
        // Lowercase single words: not UI text for the string catalog check.
        var blocks: [BlockNode] = [.title("probe"), .paragraph("ink")]
        if Self.isLong {
            let line = Array(repeating: "ink", count: 24).joined(separator: " ")
            blocks += (0..<80).map { _ in BlockNode.paragraph(line) }
        }
        let editor = EditorView(document: InMemoryEditorDocument(blocks: blocks))
        editor.accessibilityIdentifier = "bareEditor"
        guard Self.isLong else { return editor }

        let container = UIView()
        editor.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(editor)
        let offset = Self.reading("bareEditor.offset")
        let drift = Self.reading("bareEditor.drift")
        let stack = UIStackView(arrangedSubviews: [offset, drift])
        stack.axis = .vertical
        stack.alignment = .trailing
        stack.isUserInteractionEnabled = false
        stack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            editor.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            editor.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            editor.topAnchor.constraint(equalTo: container.topAnchor),
            editor.bottomAnchor.constraint(equalTo: container.keyboardLayoutGuide.topAnchor),
            stack.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor, constant: 8),
            stack.trailingAnchor.constraint(equalTo: container.safeAreaLayoutGuide.trailingAnchor, constant: -8),
        ])
        editor.onScroll = { [weak editor, weak offset, weak drift] y in
            let o = "\(Int(y.rounded()))"
            let d = "\(Int((editor?.scrollDriftSinceLift ?? 0).rounded()))"
            if offset?.text != o { offset?.text = o }
            if drift?.text != d { drift?.text = d }
        }
        return container
    }

    func updateUIView(_ uiView: UIView, context: Context) {}

    private static func reading(_ id: String) -> UILabel {
        let label = UILabel()
        label.font = .monospacedDigitSystemFont(ofSize: 11, weight: .regular)
        label.text = "0"
        label.accessibilityIdentifier = id
        return label
    }
}
#endif
