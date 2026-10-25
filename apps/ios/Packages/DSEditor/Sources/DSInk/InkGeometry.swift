#if canImport(CoreGraphics)
import CoreGraphics
#endif
import Foundation

/// Hit testing used by the eraser and lasso.
public enum InkGeometry {
    /// Distance from `p` to segment `a`–`b`.
    public static func distance(from p: CGPoint, toSegment a: CGPoint, _ b: CGPoint) -> CGFloat {
        let dx = b.x - a.x, dy = b.y - a.y
        let len2 = dx * dx + dy * dy
        if len2 < 1e-9 { return hypot(p.x - a.x, p.y - a.y) }
        let t = max(0, min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
        return hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
    }

    /// Distance between segments `a1–a2` and `b1–b2` (0 when they cross).
    public static func distance(segment a1: CGPoint, _ a2: CGPoint, segment b1: CGPoint, _ b2: CGPoint) -> CGFloat {
        if segmentsIntersect(a1, a2, b1, b2) { return 0 }
        return min(distance(from: a1, toSegment: b1, b2), distance(from: a2, toSegment: b1, b2),
                   distance(from: b1, toSegment: a1, a2), distance(from: b2, toSegment: a1, a2))
    }

    public static func segmentsIntersect(_ p1: CGPoint, _ p2: CGPoint, _ p3: CGPoint, _ p4: CGPoint) -> Bool {
        func cross(_ o: CGPoint, _ a: CGPoint, _ b: CGPoint) -> CGFloat { (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x) }
        let d1 = cross(p3, p4, p1), d2 = cross(p3, p4, p2), d3 = cross(p1, p2, p3), d4 = cross(p1, p2, p4)
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    }

    /// Whether an eraser path of the given radius touches any segment of the stroke.
    /// Segments are the already-resolved, line-split pieces of the stroke.
    public static func eraserTouches(segments: [[ResolvedInkPoint]], eraserPath: [CGPoint], radius: CGFloat) -> Bool {
        guard !eraserPath.isEmpty else { return false }
        for seg in segments {
            for i in 0..<seg.count {
                let a = seg[i].location, b = seg[min(i + 1, seg.count - 1)].location
                if eraserPath.count == 1 {
                    if distance(from: eraserPath[0], toSegment: a, b) <= radius { return true }
                } else {
                    for j in 0..<(eraserPath.count - 1)
                    where distance(segment: a, b, segment: eraserPath[j], eraserPath[j + 1]) <= radius {
                        return true
                    }
                }
            }
        }
        return false
    }

    /// Pixel eraser: indices of source points that survive, grouped into runs.
    /// A point is removed when the eraser path passes within `radius` of it.
    /// Runs shorter than 2 points are dropped.
    public static func survivingRuns(pointCount: Int, resolved: [ResolvedInkPoint], eraserPath: [CGPoint],
                                     radius: CGFloat) -> [Range<Int>] {
        var erased = [Bool](repeating: false, count: pointCount)
        for p in resolved where p.sourceIndex < pointCount {
            if isNear(p.location, path: eraserPath, radius: radius) { erased[p.sourceIndex] = true }
        }
        // Points that could not be placed (deleted anchors) are kept as they are.
        var runs: [Range<Int>] = []
        var start: Int?
        for i in 0..<pointCount {
            if erased[i] {
                if let s = start, i - s >= 2 { runs.append(s..<i) }
                start = nil
            } else if start == nil {
                start = i
            }
        }
        if let s = start, pointCount - s >= 2 { runs.append(s..<pointCount) }
        return runs
    }

    public static func isNear(_ p: CGPoint, path: [CGPoint], radius: CGFloat) -> Bool {
        guard let first = path.first else { return false }
        if path.count == 1 { return hypot(p.x - first.x, p.y - first.y) <= radius }
        for j in 0..<(path.count - 1) where distance(from: p, toSegment: path[j], path[j + 1]) <= radius { return true }
        return false
    }

    /// Even–odd point-in-polygon.
    public static func contains(polygon: [CGPoint], point: CGPoint) -> Bool {
        guard polygon.count >= 3 else { return false }
        var inside = false
        var j = polygon.count - 1
        for i in 0..<polygon.count {
            let pi = polygon[i], pj = polygon[j]
            if (pi.y > point.y) != (pj.y > point.y),
               point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x {
                inside.toggle()
            }
            j = i
        }
        return inside
    }

    /// Lasso selects a stroke when most of its drawn points are inside the loop.
    public static func lassoSelects(polygon: [CGPoint], points: [CGPoint], threshold: CGFloat = 0.6) -> Bool {
        guard !points.isEmpty else { return false }
        let inside = points.reduce(0) { $0 + (contains(polygon: polygon, point: $1) ? 1 : 0) }
        return CGFloat(inside) / CGFloat(points.count) >= threshold
    }
}
