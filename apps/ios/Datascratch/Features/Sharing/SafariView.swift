import SafariServices
import SwiftUI

/// A web page inside the app: the guest page of a share link, another server's link. Unlike
/// opening Safari, it never hands a Universal Link back to this app.
struct SafariView: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredControlTintColor = UIColor(Theme.Palette.accent)
        controller.dismissButtonStyle = .close
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {
        context.coordinator.onDone = { dismiss() }
    }

    func makeCoordinator() -> Coordinator { Coordinator(onDone: { dismiss() }) }

    final class Coordinator: NSObject, SFSafariViewControllerDelegate {
        var onDone: () -> Void

        init(onDone: @escaping () -> Void) {
            self.onDone = onDone
        }

        func safariViewControllerDidFinish(_ controller: SFSafariViewController) { onDone() }
    }
}
