#if canImport(UIKit)
import DSInk
import UIKit
import UIKit.UIGestureRecognizerSubclass

/// One pen sample in content coordinates.
struct PenSample {
    var location: CGPoint
    var pressure: CGFloat
    var altitude: CGFloat
    var azimuth: CGFloat
    var roll: CGFloat
    var timestamp: TimeInterval
    var estimationIndex: NSNumber?

    func inkSample(start: TimeInterval) -> InkSample {
        InkSample(location: location, pressure: pressure, altitude: altitude, azimuth: azimuth, roll: roll,
                  time: max(0, timestamp - start))
    }
}

/// Captures pen input with coalesced and predicted touches. Begins immediately on touch down
/// (no hysteresis), so text selection and scrolling never see a pen stroke.
@MainActor
final class InkInputRecognizer: UIGestureRecognizer {
    /// Decides whether a touch should draw (pen tool active, finger drawing enabled, …).
    var shouldTrack: (UITouch) -> Bool = { $0.type == .pencil }
    var onBegan: ((PenSample) -> Void)?
    /// Committed (coalesced) samples and predicted samples of one event.
    var onMoved: (([PenSample], [PenSample]) -> Void)?
    var onEnded: ((_ cancelled: Bool) -> Void)?
    /// A sample's estimated values (pressure, angles) were refined after delivery.
    var onEstimatedUpdate: ((PenSample) -> Void)?

    private weak var tracked: UITouch?

    override init(target: Any?, action: Selector?) {
        super.init(target: target, action: action)
        delaysTouchesBegan = false
        delaysTouchesEnded = false
        cancelsTouchesInView = true
        requiresExclusiveTouchType = false
    }

    func sample(_ t: UITouch) -> PenSample {
        let view = self.view
        let pressure: CGFloat
        if t.type == .pencil, t.maximumPossibleForce > 0 {
            pressure = min(1, max(0, t.force / t.maximumPossibleForce))
        } else {
            pressure = 1
        }
        var azimuth = t.type == .pencil ? t.azimuthAngle(in: view) : 0
        if azimuth < 0 { azimuth += 2 * .pi }
        return PenSample(location: t.preciseLocation(in: view), pressure: pressure,
                         altitude: t.type == .pencil ? t.altitudeAngle : .pi / 2, azimuth: azimuth,
                         roll: t.type == .pencil ? t.rollAngle : 0, timestamp: t.timestamp,
                         estimationIndex: t.estimatedPropertiesExpectingUpdates.isEmpty ? nil : t.estimationUpdateIndex)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        for t in touches {
            if tracked == nil, shouldTrack(t) {
                tracked = t
                let samples = (event.coalescedTouches(for: t) ?? [t]).map(sample)
                onBegan?(samples.first ?? sample(t))
                if samples.count > 1 { onMoved?(Array(samples.dropFirst()), []) }
                state = .began
            } else if t !== tracked {
                ignore(t, for: event)
            }
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
        guard let t = tracked, touches.contains(t) else { return }
        let committed = (event.coalescedTouches(for: t) ?? [t]).map(sample)
        let predicted = (event.predictedTouches(for: t) ?? []).map(sample)
        onMoved?(committed, predicted)
        state = .changed
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        guard let t = tracked, touches.contains(t) else { return }
        let committed = (event.coalescedTouches(for: t) ?? [t]).map(sample)
        onMoved?(committed, [])
        onEnded?(false)
        state = .ended
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
        guard let t = tracked, touches.contains(t) else { return }
        onEnded?(true)
        state = .cancelled
    }

    override func touchesEstimatedPropertiesUpdated(_ touches: Set<UITouch>) {
        for t in touches where t.estimationUpdateIndex != nil {
            var s = sample(t)
            s.estimationIndex = t.estimationUpdateIndex
            onEstimatedUpdate?(s)
        }
    }

    override func reset() {
        super.reset()
        tracked = nil
    }

    override func canPrevent(_ preventedGestureRecognizer: UIGestureRecognizer) -> Bool { true }
    override func canBePrevented(by preventingGestureRecognizer: UIGestureRecognizer) -> Bool { false }
}
#endif
