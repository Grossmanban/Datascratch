import SwiftUI
import UIKit

/// The cold-start screen (spec/10 «Запуск», D-15): the Datascratch mark is written with one live
/// pen stroke — pressure and a slight unevenness, like Apple Pencil — the ink settles, the mark
/// shrinks into its place and the interface comes up underneath. It covers the look-up of a stored
/// session (no flash of the welcome screen) and never holds the app back: it plays while the data
/// loads and is cut short gracefully when everything is ready earlier. Reduce Motion: the mark
/// stands still and fades out. Cold start only: the app model remembers it played.
nonisolated enum LaunchTiming {
    /// Writing the mark.
    static let draw: CFTimeInterval = 0.55
    /// The ink settling.
    static let settle: CFTimeInterval = 0.15
    /// Shrinking into place while the interface fades in.
    static let handoff: CFTimeInterval = 0.35
    /// The whole animation when the data takes at least that long (≤ 1.1 s, spec/10).
    static var total: CFTimeInterval { draw + settle + handoff }
    /// What is left of the writing when everything is ready early: finished quickly.
    static let hurry: CFTimeInterval = 0.18
    /// Reduce Motion: a plain cross-fade.
    static let crossFade: Double = 0.25
    /// Ready before the writing began: the whole mark, quickly.
    static let quick: CFTimeInterval = 0.32
}

struct LaunchOverlay: View {
    /// The data and the session are ready: finish (at once with Reduce Motion).
    let isReady: Bool
    /// UI tests force the Reduce Motion path.
    var forceReduceMotion = false
    /// The mark starts moving into place: the interface underneath fades in.
    let onHandoff: () -> Void
    /// The animation is over: remove the overlay.
    let onFinished: () -> Void
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion

    private var reduceMotion: Bool { systemReduceMotion || forceReduceMotion }

    var body: some View {
        InkMarkRepresentable(isReady: isReady, reduceMotion: reduceMotion, onHandoff: onHandoff, onFinished: onFinished)
            .ignoresSafeArea()
            .accessibilityElement()
            .accessibilityLabel(Text(verbatim: "Datascratch"))
            .accessibilityValue(Text(verbatim: reduceMotion ? "crossfade" : "ink"))
            .accessibilityIdentifier("launch.screen")
    }
}

private struct InkMarkRepresentable: UIViewRepresentable {
    let isReady: Bool
    let reduceMotion: Bool
    let onHandoff: () -> Void
    let onFinished: () -> Void

    func makeUIView(context: Context) -> InkLaunchView {
        let view = InkLaunchView(reduceMotion: reduceMotion)
        view.onHandoff = onHandoff
        view.onFinished = onFinished
        return view
    }

    func updateUIView(_ view: InkLaunchView, context: Context) {
        view.onHandoff = onHandoff
        view.onFinished = onFinished
        if isReady { view.markReady() }
    }
}

/// Core Animation all the way (120 Hz, no timers): a filled outline of the stroke whose width
/// follows a pressure curve, revealed by a mask stroking its centre line (`strokeEnd`).
final class InkLaunchView: UIView {
    var onHandoff: (() -> Void)?
    var onFinished: (() -> Void)?

    private enum Stage { case idle, drawing, settled, handingOff, done }
    private var stage = Stage.idle
    private var isReady = false
    private let reduceMotion: Bool

    private let mark = CALayer()
    private let ink = CAShapeLayer()
    private let reveal = CAShapeLayer()
    private var drawStart: CFTimeInterval = 0
    private var laidOut = false

    init(reduceMotion: Bool) {
        self.reduceMotion = reduceMotion
        super.init(frame: .zero)
        // The system launch screen is this colour: no step between the two.
        backgroundColor = UIColor(named: "LaunchBackground") ?? UIColor(Theme.Palette.canvas)
        isUserInteractionEnabled = false
        ink.mask = reveal
        mark.addSublayer(ink)
        layer.addSublayer(mark)
        registerForTraitChanges([UITraitUserInterfaceStyle.self]) { (self: InkLaunchView, _: UITraitCollection) in
            self.applyColors()
        }
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    // MARK: Geometry

    /// The mark's centre line (the web logo's path, `Splash.tsx`, in its 64-unit box), as cubic
    /// segments.
    nonisolated static let segments: [(CGPoint, CGPoint, CGPoint, CGPoint)] = [
        (CGPoint(x: 18, y: 44), CGPoint(x: 24, y: 42), CGPoint(x: 28, y: 30), CGPoint(x: 34, y: 24)),
        (CGPoint(x: 34, y: 24), CGPoint(x: 40, y: 18), CGPoint(x: 44, y: 20), CGPoint(x: 42, y: 26)),
        (CGPoint(x: 42, y: 26), CGPoint(x: 40, y: 32), CGPoint(x: 32, y: 40), CGPoint(x: 38, y: 42)),
        (CGPoint(x: 38, y: 42), CGPoint(x: 44, y: 44), CGPoint(x: 48, y: 34), CGPoint(x: 50, y: 32)),
    ]
    nonisolated static let box = CGRect(x: 16, y: 16, width: 36, height: 30)

    /// Pen pressure along the stroke (0…1 of its length): a quick press, a lively middle with a
    /// little unevenness, a lift at the end.
    nonisolated static func width(at t: CGFloat) -> CGFloat {
        func smooth(_ a: CGFloat, _ b: CGFloat, _ x: CGFloat) -> CGFloat {
            let u = min(max((x - a) / (b - a), 0), 1)
            return u * u * (3 - 2 * u)
        }
        let press = 0.38 + 0.62 * smooth(0, 0.14, t)
        let lift = 1 - 0.6 * smooth(0.8, 1, t)
        let wobble = 1 + 0.07 * sin(t * 17) + 0.045 * sin(t * 41 + 1.3)
        return press * lift * wobble
    }

    /// Points of the centre line in box units, evenly in parameter.
    nonisolated static func samples(perSegment n: Int = 48) -> [CGPoint] {
        var points: [CGPoint] = []
        for (i, s) in segments.enumerated() {
            for k in (i == 0 ? 0 : 1)...n {
                let t = CGFloat(k) / CGFloat(n), u = 1 - t
                let a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
                points.append(CGPoint(x: a * s.0.x + b * s.1.x + c * s.2.x + d * s.3.x,
                                      y: a * s.0.y + b * s.1.y + c * s.2.y + d * s.3.y))
            }
        }
        return points
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard bounds.width > 0 else { return }
        let side = min(bounds.width, bounds.height)
        let scale = min(max(side * 0.34, 110), 168) / Self.box.width
        let size = CGSize(width: Self.box.width * scale, height: Self.box.height * scale)
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        mark.bounds = CGRect(origin: .zero, size: size)
        mark.position = CGPoint(x: bounds.midX, y: bounds.midY - side * 0.03)
        ink.frame = mark.bounds
        reveal.frame = mark.bounds
        buildPaths(scale: scale)
        applyColors()
        CATransaction.commit()
        if !laidOut {
            laidOut = true
            start()
        }
    }

    private func buildPaths(scale: CGFloat) {
        let points = Self.samples().map { CGPoint(x: ($0.x - Self.box.minX) * scale, y: ($0.y - Self.box.minY) * scale) }
        var lengths: [CGFloat] = [0]
        for i in 1..<points.count { lengths.append(lengths[i - 1] + hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)) }
        let total = max(lengths.last ?? 1, 1)
        let base = 4.6 * scale
        var left: [CGPoint] = [], right: [CGPoint] = []
        for i in points.indices {
            let a = points[max(0, i - 1)], b = points[min(points.count - 1, i + 1)]
            let dx = b.x - a.x, dy = b.y - a.y, len = max(hypot(dx, dy), 0.0001)
            let nx = -dy / len, ny = dx / len
            let half = base * Self.width(at: lengths[i] / total) / 2
            left.append(CGPoint(x: points[i].x + nx * half, y: points[i].y + ny * half))
            right.append(CGPoint(x: points[i].x - nx * half, y: points[i].y - ny * half))
        }
        let outline = UIBezierPath()
        outline.move(to: left[0])
        for p in left.dropFirst() { outline.addLine(to: p) }
        // Round ends, as a nib leaves them.
        if let end = points.last, let l = left.last, let r = right.last {
            outline.addQuadCurve(to: r, controlPoint: CGPoint(x: end.x * 2 - (l.x + r.x) / 2 + (end.x - points[points.count - 2].x),
                                                             y: end.y * 2 - (l.y + r.y) / 2 + (end.y - points[points.count - 2].y)))
        }
        for p in right.reversed().dropFirst() { outline.addLine(to: p) }
        outline.addQuadCurve(to: left[0], controlPoint: CGPoint(x: points[0].x * 2 - (left[0].x + right[0].x) / 2 - (points[1].x - points[0].x),
                                                                y: points[0].y * 2 - (left[0].y + right[0].y) / 2 - (points[1].y - points[0].y)))
        outline.close()
        ink.path = outline.cgPath

        let centre = UIBezierPath()
        centre.move(to: points[0])
        for p in points.dropFirst() { centre.addLine(to: p) }
        reveal.path = centre.cgPath
        reveal.fillColor = nil
        reveal.strokeColor = UIColor.black.cgColor
        reveal.lineWidth = base * 1.8
        reveal.lineCap = .round
        reveal.lineJoin = .round
    }

    private func applyColors() {
        let accent = UIColor(Theme.Palette.accent).resolvedColor(with: traitCollection)
        ink.fillColor = accent.cgColor
        backgroundColor = (UIColor(named: "LaunchBackground") ?? UIColor(Theme.Palette.canvas)).resolvedColor(with: traitCollection)
    }

    // MARK: Animation

    private func start() {
        if reduceMotion {
            // A still mark; the overlay fades out once ready.
            reveal.strokeEnd = 1
            stage = .settled
            if isReady { finishReduced() }
            return
        }
        stage = .drawing
        drawStart = CACurrentMediaTime()
        reveal.strokeEnd = 1
        let write = CABasicAnimation(keyPath: "strokeEnd")
        write.fromValue = 0
        write.toValue = 1
        write.duration = isReady ? LaunchTiming.quick : LaunchTiming.draw
        // A hand speeds up through the middle of a stroke and slows at its end.
        write.timingFunction = CAMediaTimingFunction(controlPoints: 0.45, 0.05, 0.3, 1)
        write.delegate = AnimationEnd { [weak self] finished in if finished { self?.writingEnded() } }
        reveal.add(write, forKey: "write")
        // Fresh ink is a touch lighter until it settles.
        let wet = CABasicAnimation(keyPath: "opacity")
        wet.fromValue = 0.82
        wet.toValue = 1
        wet.duration = LaunchTiming.draw + LaunchTiming.settle
        ink.add(wet, forKey: "wet")
    }

    /// Everything is ready: finish now, gracefully.
    func markReady() {
        guard !isReady else { return }
        isReady = true
        switch stage {
        case .idle: break // `start` sees it
        case .drawing: hurryWriting()
        case .settled: reduceMotion ? finishReduced() : handOff()
        case .handingOff, .done: break
        }
    }

    private func hurryWriting() {
        guard let presented = reveal.presentation()?.strokeEnd, presented < 0.97 else { return }
        reveal.removeAnimation(forKey: "write")
        let rest = CABasicAnimation(keyPath: "strokeEnd")
        rest.fromValue = presented
        rest.toValue = 1
        rest.duration = LaunchTiming.hurry * Double(1 - presented)
        rest.timingFunction = CAMediaTimingFunction(name: .easeOut)
        rest.delegate = AnimationEnd { [weak self] finished in if finished { self?.writingEnded() } }
        reveal.add(rest, forKey: "write")
    }

    private func writingEnded() {
        guard stage == .drawing else { return }
        stage = .settled
        // The ink settles: a breath of spread, then rest.
        let settle = CAKeyframeAnimation(keyPath: "transform.scale")
        settle.values = [1, 1.018, 1]
        settle.keyTimes = [0, 0.4, 1]
        settle.duration = isReady ? LaunchTiming.settle * 0.5 : LaunchTiming.settle
        mark.add(settle, forKey: "settle")
        DispatchQueue.main.asyncAfter(deadline: .now() + settle.duration) { [weak self] in
            guard let self, self.isReady else { return }
            self.handOff()
        }
    }

    /// The mark shrinks into the top-leading corner (where the space tile sits) and fades while
    /// the interface fades in underneath.
    private func handOff() {
        guard stage == .settled else { return }
        stage = .handingOff
        onHandoff?()
        let target = CGPoint(x: safeAreaInsets.left + 36, y: safeAreaInsets.top + 26)
        let duration = LaunchTiming.handoff
        let curve = CAMediaTimingFunction(controlPoints: 0.4, 0, 0.2, 1)
        let move = CABasicAnimation(keyPath: "position")
        move.fromValue = mark.position
        move.toValue = target
        let shrink = CABasicAnimation(keyPath: "transform.scale")
        shrink.fromValue = 1
        shrink.toValue = 0.18
        let fade = CAKeyframeAnimation(keyPath: "opacity")
        fade.values = [1, 1, 0]
        fade.keyTimes = [0, 0.45, 1]
        let group = CAAnimationGroup()
        group.animations = [move, shrink, fade]
        group.duration = duration
        group.timingFunction = curve
        group.fillMode = .forwards
        group.isRemovedOnCompletion = false
        group.delegate = AnimationEnd { [weak self] _ in self?.done() }
        mark.add(group, forKey: "handoff")
        // The paper fades with it, so the interface is seen through it.
        let paper = CABasicAnimation(keyPath: "backgroundColor")
        paper.fromValue = backgroundColor?.cgColor
        paper.toValue = backgroundColor?.withAlphaComponent(0).cgColor
        paper.duration = duration
        paper.timingFunction = curve
        paper.fillMode = .forwards
        paper.isRemovedOnCompletion = false
        layer.add(paper, forKey: "paper")
    }

    private func finishReduced() {
        guard stage == .settled else { return }
        stage = .handingOff
        onHandoff?()
        // The overlay itself cross-fades out (SwiftUI transition).
        done()
    }

    private func done() {
        guard stage != .done else { return }
        stage = .done
        onFinished?()
    }
}

/// `CAAnimationDelegate` as a closure.
private final class AnimationEnd: NSObject, @preconcurrency CAAnimationDelegate {
    let action: (Bool) -> Void
    init(_ action: @escaping (Bool) -> Void) { self.action = action }
    func animationDidStop(_ anim: CAAnimation, finished flag: Bool) { action(flag) }
}
