#if canImport(UIKit)
import Foundation

/// Log lines for UI-test triage (demo launched with `-uiTesting`); silent otherwise.
enum EditorDiagnostics {
    static let enabled = ProcessInfo.processInfo.arguments.contains("-uiTesting")

    static func log(_ message: @autoclosure () -> String) {
        guard enabled else { return }
        NSLog("DIAG editor %@", message())
    }
}
#endif
