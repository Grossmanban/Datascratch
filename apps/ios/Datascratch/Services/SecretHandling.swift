import LocalAuthentication
import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Secrets copied to the clipboard (the recovery key, an agent token, a share link with its key
/// after `#k=`): this device only (not Universal Clipboard) and gone after a minute.
enum SecretPasteboard {
    static let lifetime: TimeInterval = 60

    static func copy(_ text: String, now: Date = Date()) {
        UIPasteboard.general.setItems([[UTType.utf8PlainText.identifier: text]], options: options(now))
    }

    static func copy(_ url: URL, now: Date = Date()) {
        UIPasteboard.general.setItems([[UTType.url.identifier: url, UTType.utf8PlainText.identifier: url.absoluteString]],
                                      options: options(now))
    }

    static func options(_ now: Date) -> [UIPasteboard.OptionsKey: Any] {
        [.localOnly: true, .expirationDate: now.addingTimeInterval(lifetime)]
    }
}

/// Face ID / Touch ID / the device passcode before a secret is shown again.
enum DeviceOwner {
    /// True when the person proved they own the device. A device without a passcode has nothing
    /// to ask, so it passes (there is no protection to add there); UI tests pass too.
    static func authenticate(reason: String) async -> Bool {
        if ProcessInfo.processInfo.arguments.contains("-ui-testing") { return true }
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            return (error as? LAError)?.code == .passcodeNotSet
        }
        return (try? await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)) ?? false
    }
}

/// Hides its content while the screen is recorded, mirrored or shared (AirPlay, QuickTime).
struct HiddenWhenCaptured: ViewModifier {
    @State private var isCaptured = Self.captured()

    static func captured() -> Bool {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .contains { $0.traitCollection.sceneCaptureState == .active }
    }

    func body(content: Content) -> some View {
        content
            .opacity(isCaptured ? 0 : 1)
            .overlay {
                if isCaptured {
                    Label("Hidden while the screen is recorded or shared", systemImage: "eye.slash")
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .multilineTextAlignment(.center)
                        .accessibilityIdentifier("secret.hiddenWhileCaptured")
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIScreen.capturedDidChangeNotification)) { _ in
                isCaptured = Self.captured()
            }
    }
}

extension View {
    func hiddenWhenCaptured() -> some View { modifier(HiddenWhenCaptured()) }
}

/// Names from note content (a file block's `name`, an attachment id) are data, never paths.
nonisolated enum SafeFileName {
    /// The last path component with separators and dot-only names removed; `fallback` when
    /// nothing usable is left.
    static func sanitize(_ name: String, fallback: String) -> String {
        var last = (name as NSString).lastPathComponent
        last = last.replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "\\", with: "_")
            .replacingOccurrences(of: "\0", with: "")
        let trimmed = last.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.trimmingCharacters(in: CharacterSet(charactersIn: ".")).isEmpty == false else {
            return fallback
        }
        return String(trimmed.prefix(200))
    }
}
