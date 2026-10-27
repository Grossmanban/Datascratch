#if canImport(UIKit)
import Foundation

/// Log lines for UI-test triage (demo launched with `-uiTesting`); silent otherwise.
/// The last lines are also kept in memory: unified-log arguments end up compressed in the test
/// results, so the demo shows `recent` to UI tests (they print it when they fail).
public enum EditorDiagnostics {
    static let enabled = ProcessInfo.processInfo.arguments.contains("-uiTesting")
        && !ProcessInfo.processInfo.arguments.contains("-noEditorDiag")

    /// The latest lines, oldest first (UI testing only).
    @MainActor public private(set) static var recent: [String] = []

    public static func log(_ message: @autoclosure () -> String) {
        guard enabled else { return }
        let line = message()
        NSLog("DIAG editor %@", line)
        if Thread.isMainThread {
            MainActor.assumeIsolated { remember(line) }
        } else {
            Task { @MainActor in remember(line) }
        }
    }

    @MainActor private static func remember(_ line: String) {
        recent = Array((recent + [line]).suffix(12))
    }
}
#endif
