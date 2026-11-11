import UIKit
#if canImport(DSEditor)
import DSEditor
#endif

/// Only what SwiftUI has no scene API for: the orientations of a window.
final class AppDelegate: NSObject, UIApplicationDelegate {
    /// iPhone is portrait (Info.plist), but a table open full screen turns to landscape
    /// (`EditorFullScreen`, ios-editor); iPad turns everywhere.
    func application(_ application: UIApplication,
                     supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        #if canImport(DSEditor)
        if let mask = EditorFullScreen.supportedInterfaceOrientations(for: window) { return mask }
        #endif
        return UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait
    }
}
