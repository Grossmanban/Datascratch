#if canImport(UIKit)
import DSEditorModel
import DSInk
import QuartzCore
import UIKit

/// A stroke ready to draw: outline path in content coordinates plus paint.
struct RenderedStroke {
    var id: String
    var path: CGPath
    var color: UIColor
    var opacity: Float
    var underText: Bool
    var bounds: CGRect
}

/// Core Animation ink renderer: one `CAShapeLayer` per visible stroke (vector, GPU-composited,
/// no redraw on scroll) and a dedicated layer for the stroke being drawn.
///
/// Chosen over Metal for the prototype: CA renders the live stroke in the same frame as the touch
/// update with no extra buffering on ProMotion, keeps ink crisp at any zoom and costs nothing while
/// scrolling. Metal stays the fallback if measurements on device show dropped frames
/// (`docs/spec/03-pencil.md`, "Рендер пера").
@MainActor
final class InkCanvas: UIView {
    private var layers: [String: CAShapeLayer] = [:]
    let liveLayer = CAShapeLayer()
    let selectionLayer = CAShapeLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        backgroundColor = .clear
        isOpaque = false
        layer.addSublayer(liveLayer)
        liveLayer.zPosition = 10
        selectionLayer.zPosition = 11
        selectionLayer.fillColor = nil
        selectionLayer.lineWidth = 1.5
        selectionLayer.lineDashPattern = [6, 4]
        layer.addSublayer(selectionLayer)
        disableActions(liveLayer)
        disableActions(selectionLayer)
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    private func disableActions(_ l: CALayer) {
        l.actions = ["path": NSNull(), "position": NSNull(), "bounds": NSNull(), "contents": NSNull(),
                     "opacity": NSNull(), "fillColor": NSNull(), "hidden": NSNull(), "strokeColor": NSNull()]
    }

    /// Replaces the set of drawn strokes. Layers of unchanged ids are reused.
    func apply(_ strokes: [RenderedStroke]) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        var seen: Set<String> = []
        for s in strokes {
            seen.insert(s.id)
            let l: CAShapeLayer
            if let existing = layers[s.id] {
                l = existing
            } else {
                l = CAShapeLayer()
                disableActions(l)
                layer.insertSublayer(l, below: liveLayer)
                layers[s.id] = l
            }
            l.path = s.path
            l.fillColor = s.color.resolvedColor(with: traitCollection).cgColor
            l.opacity = s.opacity
            l.fillRule = .nonZero
            if s.underText { l.compositingFilter = "multiplyBlendMode" }
        }
        for (id, l) in layers where !seen.contains(id) {
            l.removeFromSuperlayer()
            layers.removeValue(forKey: id)
        }
        CATransaction.commit()
    }

    /// Temporarily hides strokes (eraser preview, lasso move).
    func setHidden(_ ids: Set<String>) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        for (id, l) in layers { l.isHidden = ids.contains(id) }
        CATransaction.commit()
    }

    func setHighlighted(_ ids: Set<String>, color: UIColor) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        for (id, l) in layers {
            if ids.contains(id) {
                l.shadowColor = color.cgColor
                l.shadowOpacity = 0.9
                l.shadowRadius = 3
                l.shadowOffset = .zero
            } else {
                l.shadowOpacity = 0
            }
        }
        CATransaction.commit()
    }

    func updateLive(path: CGPath?, color: UIColor, opacity: Float, underText: Bool) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        liveLayer.path = path
        liveLayer.fillColor = color.resolvedColor(with: traitCollection).cgColor
        liveLayer.opacity = opacity
        liveLayer.compositingFilter = underText ? "multiplyBlendMode" : nil
        CATransaction.commit()
    }

    func updateSelection(path: CGPath?, color: UIColor) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        selectionLayer.path = path
        selectionLayer.strokeColor = color.resolvedColor(with: traitCollection).cgColor
        CATransaction.commit()
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            needsRecolor?()
        }
    }

    var needsRecolor: (() -> Void)?

    static func path(from polygons: [[CGPoint]]) -> CGPath {
        let p = CGMutablePath()
        for poly in polygons where poly.count > 2 {
            p.addLines(between: poly)
            p.closeSubpath()
        }
        return p
    }
}

/// Paper background (plain / dots / grid / lines) that scrolls with the text.
@MainActor
final class PaperView: UIView {
    var paper: DocumentStylePaper = .plain { didSet { updatePattern() } }

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        updatePattern()
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        updatePattern()
    }

    private func updatePattern() {
        let step: CGFloat = 24
        let size = CGSize(width: step, height: step)
        let paperColor = EditorTheme.paper.resolvedColor(with: traitCollection)
        let ink = EditorTheme.paperPattern.resolvedColor(with: traitCollection)
        let paper = self.paper
        let image = UIGraphicsImageRenderer(size: size).image { ctx in
            paperColor.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            ink.setFill()
            switch paper {
            case .plain: break
            case .dots: UIBezierPath(ovalIn: CGRect(x: step / 2 - 1, y: step / 2 - 1, width: 2, height: 2)).fill()
            case .grid:
                ctx.fill(CGRect(x: 0, y: 0, width: step, height: 0.5))
                ctx.fill(CGRect(x: 0, y: 0, width: 0.5, height: step))
            case .lines: ctx.fill(CGRect(x: 0, y: step - 0.5, width: step, height: 0.5))
            }
        }
        backgroundColor = UIColor(patternImage: image)
    }
}

typealias DocumentStylePaper = DSEditorModel.DocumentStyle.Paper
#endif
