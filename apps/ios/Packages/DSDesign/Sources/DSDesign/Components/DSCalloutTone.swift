import SwiftUI

/// Callout tones of the document model mapped onto tints.
public enum DSCalloutTone: String, CaseIterable, Sendable, Hashable {
    case note
    case info
    case success
    case warning
    case danger

    public var tint: DSTintToken {
        switch self {
        case .note: .gray
        case .info: .blue
        case .success: .green
        case .warning: .yellow
        case .danger: .red
        }
    }

    public var background: Color { tint.background }
    public var foreground: Color { tint.foreground }

    public var systemImage: String {
        switch self {
        case .note: "lightbulb"
        case .info: "info.circle"
        case .success: "checkmark.circle"
        case .warning: "exclamationmark.triangle"
        case .danger: "xmark.octagon"
        }
    }
}
