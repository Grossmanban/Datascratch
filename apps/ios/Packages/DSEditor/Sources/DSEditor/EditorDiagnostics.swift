#if canImport(UIKit)
import Foundation

/// Log lines for UI-test triage (demo launched with `-uiTesting`); silent otherwise.
enum EditorDiagnostics {
    static let enabled = ProcessInfo.processInfo.arguments.contains("-uiTesting")

    /// Crash bisection (experiment branch only): `DS_DISABLE=ink,hover,…` or `all` switches parts off.
    static let disabled: Set<String> = Set((ProcessInfo.processInfo.environment["DS_DISABLE"] ?? "")
        .split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) })
    static func off(_ name: String) -> Bool { disabled.contains(name) || disabled.contains("all") }

    static func log(_ message: @autoclosure () -> String) {
        guard enabled else { return }
        NSLog("DIAG editor %@", message())
    }
}
#endif
