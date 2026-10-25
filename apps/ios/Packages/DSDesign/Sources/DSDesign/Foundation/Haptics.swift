import SwiftUI
import UIKit

/// Design-system haptic events (token `haptic.*`).
public enum DSFeedback: Sendable, Hashable {
    /// Selection change (`haptic.selection`).
    case selection
    /// Task completed (`haptic.taskComplete` → success).
    case taskComplete
    /// Destructive action (`haptic.delete` → warning).
    case delete

    public var sensoryFeedback: SensoryFeedback {
        switch self {
        case .selection: .selection
        case .taskComplete: .success
        case .delete: .warning
        }
    }
}

/// Imperative haptics for UIKit code paths (the editor, gestures).
@MainActor
public enum DSHaptics {
    public static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }

    public static func taskComplete() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    public static func delete() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    public static func play(_ feedback: DSFeedback) {
        switch feedback {
        case .selection: selection()
        case .taskComplete: taskComplete()
        case .delete: delete()
        }
    }
}

extension View {
    /// Declarative haptic tied to a value change.
    public func dsFeedback<Trigger: Equatable>(_ feedback: DSFeedback, trigger: Trigger) -> some View {
        sensoryFeedback(feedback.sensoryFeedback, trigger: trigger)
    }
}
