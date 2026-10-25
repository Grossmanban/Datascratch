import SwiftUI
import UIKit

/// Sample cover photos for previews and the showcase (stand-ins for the user's
/// own images — the only kind of cover, spec 12.7).
public enum DSSampleCover: String, CaseIterable, Sendable {
    case mountains = "cover-mountains"
    case sea = "cover-sea"
    case leaves = "cover-leaves"

    public var image: Image {
        if let ui = UIImage(named: "\(rawValue).jpg", in: .module, with: nil) {
            return Image(uiImage: ui)
        }
        return Image(systemName: "photo")
    }
}
