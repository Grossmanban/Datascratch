#if canImport(DSEditor)
import DSEditor
import SwiftUI
import UIKit

/// Experiment for ios-editor (`-bareEditorProbe`): a bare `EditorView` over an in-memory
/// document, with no navigation, palette or app state, to tell whether a crash comes from the
/// editor itself or from the screen around it. `-bareEditorProbeLong` gives it a long note and
/// shows the scroll offset and the drift after the last lift (selection autoscroll UI tests).
struct BareEditorProbe: View {
    static var isRequested: Bool { ProcessInfo.processInfo.arguments.contains("-bareEditorProbe") }
    static var isLong: Bool { ProcessInfo.processInfo.arguments.contains("-bareEditorProbeLong") }

    @State private var readings = BareEditorReadings()

    var body: some View {
        BareEditorRepresentable(readings: readings)
            .overlay(alignment: .topTrailing) {
                if Self.isLong {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(verbatim: "\(Int(readings.offset.rounded()))")
                            .accessibilityIdentifier("bareEditor.offset")
                        Text(verbatim: "\(Int(readings.drift.rounded()))")
                            .accessibilityIdentifier("bareEditor.drift")
                    }
                    .font(.caption2.monospacedDigit())
                    .padding(.top, 64)
                    .padding(.trailing, 8)
                    .allowsHitTesting(false)
                }
            }
    }
}

@Observable
final class BareEditorReadings {
    var offset: CGFloat = 0
    var drift: CGFloat = 0
}

private struct BareEditorRepresentable: UIViewRepresentable {
    let readings: BareEditorReadings

    func makeUIView(context: Context) -> EditorView {
        // Lowercase single words: not UI text for the string catalog check.
        var blocks: [BlockNode] = [.title("probe"), .paragraph("ink")]
        if BareEditorProbe.isLong {
            let line = Array(repeating: "ink", count: 24).joined(separator: " ")
            blocks += (0..<80).map { _ in BlockNode.paragraph(line) }
        }
        let editor = EditorView(document: InMemoryEditorDocument(blocks: blocks))
        editor.accessibilityIdentifier = "bareEditor"
        editor.onScroll = { [weak editor, readings] y in
            readings.offset = y
            readings.drift = editor?.scrollDriftSinceLift ?? 0
        }
        return editor
    }

    func updateUIView(_ uiView: EditorView, context: Context) {}
}
#endif
