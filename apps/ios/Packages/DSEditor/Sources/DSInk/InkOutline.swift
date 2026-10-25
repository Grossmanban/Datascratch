#if canImport(CoreGraphics)
import CoreGraphics
#endif
import Foundation

/// A point on the stroke centerline with its thickness.
public struct WidthPoint: Equatable, Sendable {
    public var location: CGPoint
    public var width: CGFloat

    public init(location: CGPoint, width: CGFloat) {
        self.location = location
        self.width = width
    }
}

/// Turns stroke samples into a filled outline polygon: centripetal Catmull–Rom smoothing,
/// variable width from pressure/tilt, round caps. Shared by live and finished rendering.
public enum InkOutline {
    /// Widths for resolved points following the shared thickness rules.
    public static func widthPoints(_ points: [ResolvedInkPoint], tool: InkTool, baseWidth: Double) -> [WidthPoint] {
        var smoothed: CGFloat?
        return points.map { p in
            let w = CGFloat(InkWidth.width(base: baseWidth, tool: tool, pressure: Double(p.pressure),
                                           altitude: Double(p.altitude), scale: Double(p.scale)))
            // Light low-pass so pressure noise does not make the edge wobble.
            let s = smoothed.map { $0 * 0.4 + w * 0.6 } ?? w
            smoothed = s
            return WidthPoint(location: p.location, width: max(s, 0.3))
        }
    }

    /// Smoothed centerline sampled roughly every `spacing` points.
    public static func smooth(_ input: [WidthPoint], spacing: CGFloat = 1.5) -> [WidthPoint] {
        let pts = dedupe(input)
        guard pts.count > 2 else { return pts }
        var out: [WidthPoint] = [pts[0]]
        for i in 0..<(pts.count - 1) {
            let p0 = pts[max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[min(i + 2, pts.count - 1)]
            let len = distance(p1.location, p2.location)
            let steps = max(1, Int((len / spacing).rounded(.up)))
            for s in 1...steps {
                let t = CGFloat(s) / CGFloat(steps)
                out.append(WidthPoint(location: catmullRom(p0.location, p1.location, p2.location, p3.location, t),
                                      width: p1.width + (p2.width - p1.width) * t))
            }
        }
        return out
    }

    /// Closed outline polygon of the stroke.
    public static func polygon(_ input: [WidthPoint], capSegments: Int = 8) -> [CGPoint] {
        let pts = smooth(input)
        guard let first = pts.first else { return [] }
        if pts.count == 1 { return circle(center: first.location, radius: first.width / 2, segments: capSegments * 2) }
        var left: [CGPoint] = []
        var right: [CGPoint] = []
        left.reserveCapacity(pts.count)
        right.reserveCapacity(pts.count)
        for i in 0..<pts.count {
            let prev = pts[max(i - 1, 0)].location, next = pts[min(i + 1, pts.count - 1)].location
            var dx = next.x - prev.x, dy = next.y - prev.y
            let l = max(hypot(dx, dy), 0.0001)
            dx /= l
            dy /= l
            let r = pts[i].width / 2
            let p = pts[i].location
            left.append(CGPoint(x: p.x - dy * r, y: p.y + dx * r))
            right.append(CGPoint(x: p.x + dy * r, y: p.y - dx * r))
        }
        var poly = left
        poly += arc(center: pts[pts.count - 1].location, from: left[left.count - 1], to: right[right.count - 1],
                    segments: capSegments)
        poly += right.reversed()
        poly += arc(center: pts[0].location, from: right[0], to: left[0], segments: capSegments)
        return poly
    }

    /// Bounding box of a polygon (empty rect when empty).
    public static func bounds(_ poly: [CGPoint]) -> CGRect {
        guard let f = poly.first else { return .null }
        var minX = f.x, minY = f.y, maxX = f.x, maxY = f.y
        for p in poly {
            minX = min(minX, p.x); minY = min(minY, p.y)
            maxX = max(maxX, p.x); maxY = max(maxY, p.y)
        }
        return CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
    }

    // MARK: - Helpers

    static func dedupe(_ pts: [WidthPoint]) -> [WidthPoint] {
        var out: [WidthPoint] = []
        for p in pts {
            if let last = out.last, distance(last.location, p.location) < 0.25 {
                out[out.count - 1].width = max(last.width, p.width)
                continue
            }
            out.append(p)
        }
        return out
    }

    static func distance(_ a: CGPoint, _ b: CGPoint) -> CGFloat { hypot(a.x - b.x, a.y - b.y) }

    static func catmullRom(_ p0: CGPoint, _ p1: CGPoint, _ p2: CGPoint, _ p3: CGPoint, _ t: CGFloat) -> CGPoint {
        // Centripetal parameterization (alpha = 0.5) avoids cusps and overshoot on sharp turns.
        func tj(_ ti: CGFloat, _ a: CGPoint, _ b: CGPoint) -> CGFloat { ti + max(sqrt(distance(a, b)), 0.0001) }
        let t0: CGFloat = 0
        let t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3)
        let u = t1 + (t2 - t1) * t
        func lerp(_ a: CGPoint, _ b: CGPoint, _ ta: CGFloat, _ tb: CGFloat) -> CGPoint {
            let d = tb - ta
            if abs(d) < 1e-6 { return a }
            return CGPoint(x: (tb - u) / d * a.x + (u - ta) / d * b.x, y: (tb - u) / d * a.y + (u - ta) / d * b.y)
        }
        let a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3)
        let b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3)
        return lerp(b1, b2, t1, t2)
    }

    static func arc(center: CGPoint, from: CGPoint, to: CGPoint, segments: Int) -> [CGPoint] {
        let r = distance(center, from)
        let a0 = atan2(from.y - center.y, from.x - center.x)
        var a1 = atan2(to.y - center.y, to.x - center.x)
        // Caps always sweep half a turn in the direction that goes "outward" (clockwise in y-down space).
        while a1 > a0 { a1 -= 2 * .pi }
        if a0 - a1 < .pi * 0.5 { a1 = a0 - .pi }
        var out: [CGPoint] = []
        for i in 1..<segments {
            let a = a0 + (a1 - a0) * CGFloat(i) / CGFloat(segments)
            out.append(CGPoint(x: center.x + cos(a) * r, y: center.y + sin(a) * r))
        }
        return out
    }

    static func circle(center: CGPoint, radius: CGFloat, segments: Int) -> [CGPoint] {
        (0..<segments).map { i in
            let a = CGFloat(i) / CGFloat(segments) * 2 * .pi
            return CGPoint(x: center.x + cos(a) * radius, y: center.y + sin(a) * radius)
        }
    }
}
