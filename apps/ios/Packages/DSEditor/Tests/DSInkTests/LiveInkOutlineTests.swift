#if canImport(CoreGraphics)
import CoreGraphics
#endif
import Foundation
import Testing
@testable import DSInk

@Suite struct LiveInkOutlineTests {
    func wave(_ n: Int) -> [WidthPoint] {
        (0..<n).map { i in
            let x = CGFloat(i) * 2
            return WidthPoint(location: CGPoint(x: x, y: 40 + sin(x / 15) * 20), width: 2 + CGFloat(i % 7) * 0.2)
        }
    }

    @Test func coversTheSameAreaAsTheWholeOutline() {
        let pts = wave(400)
        var live = LiveInkOutline(chunkSize: 32)
        var polys: [[CGPoint]] = []
        for n in stride(from: 2, through: pts.count, by: 3) {
            polys = live.update(Array(pts[0..<n]), stableCount: n - 2)
        }
        polys = live.update(pts, stableCount: pts.count)
        let whole = InkOutline.bounds(InkOutline.polygon(pts))
        let union = polys.map(InkOutline.bounds).reduce(CGRect.null) { $0.union($1) }
        #expect(abs(union.minX - whole.minX) < 0.5 && abs(union.maxX - whole.maxX) < 0.5)
        #expect(abs(union.minY - whole.minY) < 0.5 && abs(union.maxY - whole.maxY) < 0.5)
        #expect(live.frozen.count >= 10)
    }

    @Test func tailWorkStaysBounded() {
        let pts = wave(2000)
        var live = LiveInkOutline(chunkSize: 32)
        for n in stride(from: 2, through: pts.count, by: 1) {
            _ = live.update(Array(pts[0..<n]), stableCount: n - 2)
            // The recomputed tail never grows past a chunk plus the unstable samples.
            #expect(n - live.frozenEnd <= 32 + 4)
        }
    }

    @Test func predictedSamplesOnlyAffectTheTail() {
        let pts = wave(200)
        var live = LiveInkOutline(chunkSize: 16)
        _ = live.update(Array(pts[0..<150]), stableCount: 148)
        let frozen = live.frozen
        // Wild predicted samples beyond the stable part do not touch frozen chunks.
        var withPrediction = Array(pts[0..<150])
        withPrediction.append(WidthPoint(location: CGPoint(x: 999, y: 999), width: 3))
        _ = live.update(withPrediction, stableCount: 148)
        #expect(live.frozen == frozen)
    }
}
