import SwiftUI
import UIKit

extension DSSpringSpec {
    public var animation: Animation {
        .spring(response: response, dampingFraction: damping)
    }
}

extension DSMotionToken {
    public var animation: Animation { value.animation }

    /// The spring, or a short cross-fade timing when Reduce Motion is on.
    public func animation(reduceMotion: Bool) -> Animation {
        reduceMotion ? .easeInOut(duration: DSDuration.fast) : animation
    }
}

extension Animation {
    /// `withAnimation(.ds(.snappy)) { … }`
    public static func ds(_ token: DSMotionToken) -> Animation { token.animation }
}

struct DSAnimationModifier<Value: Equatable>: ViewModifier {
    let token: DSMotionToken
    let value: Value
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content.animation(token.animation(reduceMotion: reduceMotion), value: value)
    }
}

extension View {
    /// Animates changes of `value` with a motion token, honouring Reduce Motion.
    public func dsAnimation<Value: Equatable>(_ token: DSMotionToken, value: Value) -> some View {
        modifier(DSAnimationModifier(token: token, value: value))
    }
}

/// `withAnimation` using a motion token, honouring Reduce Motion.
@MainActor
public func withDSAnimation<Result>(
    _ token: DSMotionToken,
    reduceMotion: Bool = UIAccessibility.isReduceMotionEnabled,
    _ body: () throws -> Result
) rethrows -> Result {
    try withAnimation(token.animation(reduceMotion: reduceMotion), body)
}

/// Press feedback: a gentle spring scale-down while pressed.
public struct DSPressableStyle: ButtonStyle {
    public var scale: CGFloat

    public init(scale: CGFloat = 0.94) {
        self.scale = scale
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .dsAnimation(.snappy, value: configuration.isPressed)
    }
}
