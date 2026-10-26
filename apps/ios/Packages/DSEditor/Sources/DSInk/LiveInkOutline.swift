#if canImport(CoreGraphics)
import CoreGraphics
#endif
import Foundation

/// Outline of the stroke being drawn, built incrementally so a frame costs the same at the
/// thousandth sample as at the tenth. The stable part of the stroke is frozen into chunk
/// polygons that are never recomputed; only the tail (recent and predicted samples) is outlined
/// again on each update. Chunks overlap by one segment and end in round caps, so filled together
/// (non-zero winding, one path) they read as one continuous stroke.
public struct LiveInkOutline: Sendable {
    /// Samples per frozen chunk.
    public let chunkSize: Int
    /// Polygons of the frozen part.
    public private(set) var frozen: [[CGPoint]] = []
    /// Index of the first width point not yet in a frozen chunk.
    public private(set) var frozenEnd = 0

    public init(chunkSize: Int = 32) {
        self.chunkSize = max(4, chunkSize)
    }

    /// Updates the outline. `points` is the whole stroke so far (committed then predicted);
    /// the first `stableCount` of them will not change any more.
    /// - Returns: the frozen polygons followed by the polygon of the tail.
    public mutating func update(_ points: [WidthPoint], stableCount: Int) -> [[CGPoint]] {
        let stable = min(stableCount, points.count)
        // Freeze whole chunks whose points (plus one of context on each side) are stable.
        while frozenEnd + chunkSize + 1 < stable {
            let lo = max(frozenEnd - 1, 0), hi = frozenEnd + chunkSize + 1
            frozen.append(InkOutline.polygon(Array(points[lo...hi])))
            frozenEnd += chunkSize
        }
        let lo = max(frozenEnd - 1, 0)
        guard lo < points.count else { return frozen }
        return frozen + [InkOutline.polygon(Array(points[lo...]))]
    }

    public mutating func reset() {
        frozen = []
        frozenEnd = 0
    }
}
