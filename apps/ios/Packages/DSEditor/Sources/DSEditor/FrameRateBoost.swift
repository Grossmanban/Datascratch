#if canImport(UIKit)
import UIKit

/// Asks the display for ProMotion rates (80–120 Hz) while the pen is down and releases the request
/// when it lifts, so the idle editor does not keep the panel at 120 Hz. Touch delivery and the pen
/// layer's redraws follow the display rate. On iPhone this needs `CADisableMinimumFrameDurationOnPhone`
/// in the app's Info.plist; without it the system caps everything at 60 Hz.
@MainActor
final class FrameRateBoost {
    static let drawingRange = CAFrameRateRange(minimum: 80, maximum: 120, preferred: 120)

    private var link: CADisplayLink?

    var isActive: Bool { link?.isPaused == false }

    func begin() {
        if link == nil {
            let l = CADisplayLink(target: Tick.shared, selector: #selector(Tick.tick(_:)))
            l.preferredFrameRateRange = Self.drawingRange
            l.add(to: .main, forMode: .common)
            link = l
        }
        link?.isPaused = false
    }

    func end() { link?.isPaused = true }

    func invalidate() {
        link?.invalidate()
        link = nil
    }

    /// The link exists only for its rate request; it must not retain the boost or the editor.
    @MainActor
    private final class Tick: NSObject {
        static let shared = Tick()
        @objc func tick(_ link: CADisplayLink) {}
    }
}
#endif
