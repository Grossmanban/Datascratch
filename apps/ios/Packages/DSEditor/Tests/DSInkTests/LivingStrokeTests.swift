import DSInk
import Foundation
import Testing

/// Simple monospaced layout: `perLine` characters per line, 10 pt advance, 20 pt line height.
struct GridLayout {
    var perLine: Int
    var fontSize: CGFloat = 17
    var advance: CGFloat = 10
    var lineHeight: CGFloat = 20

    func placement(_ offset: Int) -> GlyphPlacement {
        let line = offset / perLine
        return GlyphPlacement(origin: CGPoint(x: CGFloat(offset % perLine) * advance, y: CGFloat(line) * lineHeight + 15),
                              fontSize: fontSize, lineKey: line)
    }

    func hit(_ p: CGPoint) -> CharacterHit {
        let line = max(0, Int(p.y / lineHeight))
        let col = max(0, min(perLine - 1, Int(p.x / advance)))
        let o = line * perLine + col
        return CharacterHit(offset: o, placement: placement(o))
    }
}

@Suite struct LivingStrokeTests {
    /// Draws an underline under characters 2...7 of line 0.
    func underline(layout: GridLayout) -> TextAnchorBuilder {
        var b = TextAnchorBuilder()
        for x in stride(from: CGFloat(22), through: 78, by: 4) {
            let s = InkSample(location: CGPoint(x: x, y: 18))
            b.append(s, hit: layout.hit(s.location))
        }
        return b
    }

    @Test func anchorsAreFirstUseOrderedAndUnique() {
        let b = underline(layout: GridLayout(perLine: 40))
        #expect(b.anchorOffsets == [2, 3, 4, 5, 6, 7])
        #expect(b.points.count == 15)
        // First point: x = 22 - 20 = 2pt = 2/17 em; y = 18 - 15 = 3pt.
        #expect(abs(b.points[0].x - Float(2.0 / 17.0)) < 1e-6)
        #expect(abs(b.points[0].y - Float(3.0 / 17.0)) < 1e-6)
    }

    @Test func resolvesToSamePlaceInSameLayout() {
        let layout = GridLayout(perLine: 40)
        let b = underline(layout: layout)
        let segs = LivingStrokeResolver.segments(points: b.points, placements: b.anchorOffsets.map { layout.placement($0) })
        #expect(segs.count == 1)
        #expect(abs(segs[0][0].location.x - 22) < 1e-4)
        #expect(abs(segs[0][0].location.y - 18) < 1e-4)
    }

    @Test func followsTextWhenInsertedBefore() {
        let layout = GridLayout(perLine: 40)
        let b = underline(layout: layout)
        // Three characters inserted before: every anchor moves 3 characters right.
        let segs = LivingStrokeResolver.segments(points: b.points, placements: b.anchorOffsets.map { layout.placement($0 + 3) })
        #expect(abs(segs[0][0].location.x - 52) < 1e-4)
    }

    @Test func breaksAcrossLines() {
        let layout = GridLayout(perLine: 40)
        let b = underline(layout: layout)
        // Narrow column: 5 characters per line → chars 2,3,4 on line 0 and 5,6,7 on line 1.
        let narrow = GridLayout(perLine: 5)
        let segs = LivingStrokeResolver.segments(points: b.points, placements: b.anchorOffsets.map { narrow.placement($0) })
        #expect(segs.count == 2)
        #expect(segs.allSatisfy { seg in Set(seg.map { Int($0.location.y) / 20 }).count == 1 })
        #expect(segs[1][0].location.y > segs[0][0].location.y)
    }

    @Test func deletedAnchorsAreNotDrawn() {
        let layout = GridLayout(perLine: 40)
        let b = underline(layout: layout)
        var placements: [GlyphPlacement?] = b.anchorOffsets.map { layout.placement($0) }
        // Delete the middle characters 4 and 5 (D-35): the stroke shrinks to two pieces.
        placements[2] = nil
        placements[3] = nil
        let segs = LivingStrokeResolver.segments(points: b.points, placements: placements)
        #expect(segs.count == 2)
        let drawn = segs.flatMap { $0.map(\.sourceIndex) }
        for i in drawn { #expect(![2, 3].contains(Int(b.points[i].a))) }
        #expect(!LivingStrokeResolver.isFullyDetached(placements))
        #expect(LivingStrokeResolver.isFullyDetached(placements.map { _ in nil }))
        #expect(LivingStrokeResolver.segments(points: b.points, placements: placements.map { _ in nil }).isEmpty)
    }

    @Test func singlePointSegmentsAreDropped() {
        let pts = [StrokePoint(a: 0, x: 0, y: 0), StrokePoint(a: 1, x: 0, y: 0), StrokePoint(a: 2, x: 0, y: 0)]
        let placements: [GlyphPlacement?] = [
            GlyphPlacement(origin: .zero, fontSize: 17, lineKey: 0), nil,
            GlyphPlacement(origin: .zero, fontSize: 17, lineKey: 0),
        ]
        #expect(LivingStrokeResolver.segments(points: pts, placements: placements).isEmpty)
    }

    @Test func scalesWithFontSize() {
        let pts = [StrokePoint(a: 0, x: 1, y: 0.5), StrokePoint(a: 0, x: 2, y: 0.5)]
        let segs = LivingStrokeResolver.segments(points: pts, placements: [GlyphPlacement(origin: CGPoint(x: 100, y: 50), fontSize: 34, lineKey: 0)])
        #expect(segs[0][0].location == CGPoint(x: 134, y: 67))
        #expect(segs[0][0].scale == 2)
    }

    @Test func blockStrokesUseWidthFractions() {
        var b = BlockAnchorBuilder(blockOrigin: CGPoint(x: 10, y: 100), blockWidth: 600)
        b.append(InkSample(location: CGPoint(x: 310, y: 160)))
        #expect(b.points[0].x == 0.5)
        #expect(b.points[0].y == 0.1)
        let r = LivingStrokeResolver.blockSegment(points: b.points, blockOrigin: CGPoint(x: 0, y: 0), blockWidth: 300)
        #expect(abs(r[0].location.x - 150) < 1e-4 && abs(r[0].location.y - 30) < 1e-4)
        #expect(r[0].scale == 0.5)
    }
}

@Suite struct InkGeometryTests {
    @Test func pixelEraserSplitsStroke() {
        let resolved = (0..<10).map { i in
            ResolvedInkPoint(location: CGPoint(x: CGFloat(i) * 10, y: 0), pressure: 1, altitude: 1, azimuth: 0, roll: 0, scale: 1, sourceIndex: i)
        }
        let runs = InkGeometry.survivingRuns(pointCount: 10, resolved: resolved, eraserPath: [CGPoint(x: 45, y: -10), CGPoint(x: 45, y: 10)], radius: 6)
        #expect(runs == [0..<4, 6..<10])
    }

    @Test func eraserTouch() {
        let seg = [ResolvedInkPoint(location: .zero, pressure: 1, altitude: 1, azimuth: 0, roll: 0, scale: 1, sourceIndex: 0),
                   ResolvedInkPoint(location: CGPoint(x: 100, y: 0), pressure: 1, altitude: 1, azimuth: 0, roll: 0, scale: 1, sourceIndex: 1)]
        #expect(InkGeometry.eraserTouches(segments: [seg], eraserPath: [CGPoint(x: 50, y: -20), CGPoint(x: 50, y: 20)], radius: 1))
        #expect(!InkGeometry.eraserTouches(segments: [seg], eraserPath: [CGPoint(x: 50, y: 10)], radius: 5))
    }

    @Test func lasso() {
        let square = [CGPoint(x: 0, y: 0), CGPoint(x: 10, y: 0), CGPoint(x: 10, y: 10), CGPoint(x: 0, y: 10)]
        #expect(InkGeometry.contains(polygon: square, point: CGPoint(x: 5, y: 5)))
        #expect(!InkGeometry.contains(polygon: square, point: CGPoint(x: 15, y: 5)))
        #expect(InkGeometry.lassoSelects(polygon: square, points: [CGPoint(x: 1, y: 1), CGPoint(x: 2, y: 2), CGPoint(x: 20, y: 2)]))
    }

    @Test func outlineIsClosedAndContainsCenterline() {
        let pts = (0..<20).map { WidthPoint(location: CGPoint(x: CGFloat($0) * 5, y: sin(CGFloat($0) / 3) * 10), width: 4) }
        let poly = InkOutline.polygon(pts)
        #expect(poly.count > 40)
        #expect(InkGeometry.contains(polygon: poly, point: CGPoint(x: 50, y: sin(10.0 / 3) * 10)))
        let b = InkOutline.bounds(poly)
        #expect(b.minX < 0 && b.maxX > 95)
    }

    @Test func dotStrokeIsCircle() {
        let poly = InkOutline.polygon([WidthPoint(location: CGPoint(x: 5, y: 5), width: 4)])
        #expect(poly.count == 16)
    }
}

@Suite struct ShapeClassifierTests {
    let line = LineMetrics(baseline: 100, xHeight: 8, fontSize: 17)

    @Test func underlineAndStrike() {
        let under = stride(from: CGFloat(0), through: 100, by: 5).map { CGPoint(x: $0, y: 103 + sin($0) * 0.5) }
        #expect(StrokeShapeClassifier.classify(under, line: line) == .underline)
        let strike = stride(from: CGFloat(0), through: 100, by: 5).map { CGPoint(x: $0, y: 96) }
        #expect(StrokeShapeClassifier.classify(strike, line: line) == .strike)
    }

    @Test func scribble() {
        var pts: [CGPoint] = []
        for i in 0..<8 {
            pts.append(CGPoint(x: i % 2 == 0 ? 0 : 60, y: 95 + CGFloat(i)))
        }
        #expect(StrokeShapeClassifier.classify(pts, line: line) == .scribble)
    }

    @Test func circle() {
        let pts = (0...36).map { i -> CGPoint in
            let a = CGFloat(i) / 36 * 2 * .pi
            return CGPoint(x: 50 + cos(a) * 40, y: 50 + sin(a) * 20)
        }
        #expect(StrokeShapeClassifier.classify(pts) == .circle)
    }

    @Test func highlighterHint() {
        #expect(StrokeShapeClassifier.classify([.zero, CGPoint(x: 10, y: 0)], tool: .highlighter) == .highlight)
    }
}
