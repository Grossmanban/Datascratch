import Foundation

/// Vertical metrics of the text line a stroke was drawn over, in layout coordinates.
public struct LineMetrics: Equatable, Sendable {
    public var baseline: CGFloat
    public var xHeight: CGFloat
    public var fontSize: CGFloat

    public init(baseline: CGFloat, xHeight: CGFloat, fontSize: CGFloat) {
        self.baseline = baseline
        self.xHeight = xHeight
        self.fontSize = fontSize
    }

    public var midline: CGFloat { baseline - xHeight / 2 }
}

/// Recognizes the shape of a finished stroke (`StrokeHint`). The hint is stored with the
/// stroke for agents/export, and drives pen gestures (scratch out, underline, strike).
public enum StrokeShapeClassifier {
    public static func classify(_ points: [CGPoint], tool: InkTool = .pen, line: LineMetrics? = nil) -> StrokeHint {
        if tool == .highlighter { return .highlight }
        guard points.count >= 2 else { return .free }
        let box = InkOutline.bounds(points)
        let length = pathLength(points)
        let w = box.width, h = box.height
        let span = max(w, h)
        guard span > 4 else { return .free }

        if isScribble(points, box: box, length: length) { return .scribble }

        let closeness = hypot(points[0].x - points[points.count - 1].x, points[0].y - points[points.count - 1].y)
        if closeness < 0.3 * span, length > 1.8 * (w + h) * 0.5, w > 8, h > 8, length < 4 * (w + h) {
            return .circle
        }

        if w > 12, h < max(0.3 * w, 8), length < 1.35 * w {
            guard let line else { return .underline }
            let meanY = points.reduce(0) { $0 + $1.y } / CGFloat(points.count)
            let tolerance = max(line.xHeight * 0.55, line.fontSize * 0.2)
            if abs(meanY - line.midline) < tolerance { return .strike }
            if meanY > line.midline { return .underline }
            return .free
        }

        if isArrow(points, box: box) { return .arrow }
        return .free
    }

    static func pathLength(_ pts: [CGPoint]) -> CGFloat {
        var l: CGFloat = 0
        for i in 1..<pts.count { l += hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) }
        return l
    }

    /// Zigzag: several horizontal direction reversals, and a path much longer than its width.
    static func isScribble(_ pts: [CGPoint], box: CGRect, length: CGFloat) -> Bool {
        guard box.width > 10, length > 2.5 * box.width else { return false }
        var reversals = 0
        var lastSign: CGFloat = 0
        var anchorX = pts[0].x
        let minTravel = max(box.width * 0.2, 4)
        for p in pts.dropFirst() {
            let d = p.x - anchorX
            guard abs(d) >= minTravel else { continue }
            let sign: CGFloat = d > 0 ? 1 : -1
            if lastSign != 0, sign != lastSign { reversals += 1 }
            lastSign = sign
            anchorX = p.x
        }
        return reversals >= 3 && box.height < box.width * 1.2
    }

    /// Long mostly straight shaft ending in a short hook back towards the shaft.
    static func isArrow(_ pts: [CGPoint], box: CGRect) -> Bool {
        guard pts.count >= 6 else { return false }
        let span = max(box.width, box.height)
        guard span > 30 else { return false }
        // Find the point farthest from the start: the tip.
        var tipIndex = 0
        var best: CGFloat = 0
        for (i, p) in pts.enumerated() {
            let d = hypot(p.x - pts[0].x, p.y - pts[0].y)
            if d > best { best = d; tipIndex = i }
        }
        guard tipIndex > pts.count / 3, tipIndex < pts.count - 2 else { return false }
        let shaft = Array(pts[0...tipIndex])
        let straightness = best / pathLength(shaft)
        let hook = pathLength(Array(pts[tipIndex...]))
        return straightness > 0.9 && hook > span * 0.08 && hook < span * 0.6
    }
}
