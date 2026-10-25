#if canImport(CoreGraphics)
import CoreGraphics
#endif
import Foundation

/// Current placement of a character glyph, as reported by the text layout.
public struct GlyphPlacement: Equatable, Sendable {
    /// Leading edge of the glyph (x) on the baseline (y), in layout coordinates.
    public var origin: CGPoint
    /// Font size of the character, in points.
    public var fontSize: CGFloat
    /// Identity of the line fragment the glyph is on; differs between lines.
    public var lineKey: Int

    public init(origin: CGPoint, fontSize: CGFloat, lineKey: Int) {
        self.origin = origin
        self.fontSize = fontSize
        self.lineKey = lineKey
    }
}

/// A character found under (or nearest to) a pen point while drawing.
public struct CharacterHit: Equatable, Sendable {
    /// Position of the character in the editor's text (any stable integer key, e.g. storage offset).
    public var offset: Int
    public var placement: GlyphPlacement

    public init(offset: Int, placement: GlyphPlacement) {
        self.offset = offset
        self.placement = placement
    }
}

/// Raw input sample in layout coordinates.
public struct InkSample: Equatable, Sendable {
    public var location: CGPoint
    public var pressure: CGFloat
    public var altitude: CGFloat
    public var azimuth: CGFloat
    public var roll: CGFloat
    /// Seconds since stroke start.
    public var time: TimeInterval

    public init(location: CGPoint, pressure: CGFloat = 1, altitude: CGFloat = .pi / 2, azimuth: CGFloat = 0,
                roll: CGFloat = 0, time: TimeInterval = 0) {
        self.location = location
        self.pressure = pressure
        self.altitude = altitude
        self.azimuth = azimuth
        self.roll = roll
        self.time = time
    }
}

/// Builds the text-anchored representation of a stroke (`strokes.md` §4): every point gets
/// the nearest character as an anchor and an offset from its glyph origin in em.
public struct TextAnchorBuilder: Sendable {
    /// Character offsets referenced by `points[i].a`, in first-use order.
    public private(set) var anchorOffsets: [Int] = []
    public private(set) var points: [StrokePoint] = []
    private var indexByOffset: [Int: Int] = [:]

    public init() {}

    public mutating func append(_ sample: InkSample, hit: CharacterHit) {
        let index: Int
        if let existing = indexByOffset[hit.offset] {
            index = existing
        } else {
            index = anchorOffsets.count
            indexByOffset[hit.offset] = index
            anchorOffsets.append(hit.offset)
        }
        let em = max(hit.placement.fontSize, 1)
        points.append(StrokePoint(
            a: Float(index),
            x: Float((sample.location.x - hit.placement.origin.x) / em),
            y: Float((sample.location.y - hit.placement.origin.y) / em),
            pressure: Float(sample.pressure),
            altitude: Float(sample.altitude),
            azimuth: Float(sample.azimuth),
            roll: Float(sample.roll),
            t: Float(sample.time * 1000)))
    }
}

/// Builds a block/image/drawing-anchored stroke: coordinates in fractions of the block width.
public struct BlockAnchorBuilder: Sendable {
    public let blockOrigin: CGPoint
    public let blockWidth: CGFloat
    public private(set) var points: [StrokePoint] = []

    public init(blockOrigin: CGPoint, blockWidth: CGFloat) {
        self.blockOrigin = blockOrigin
        self.blockWidth = max(blockWidth, 1)
    }

    public mutating func append(_ sample: InkSample) {
        points.append(StrokePoint(
            a: -1,
            x: Float((sample.location.x - blockOrigin.x) / blockWidth),
            y: Float((sample.location.y - blockOrigin.y) / blockWidth),
            pressure: Float(sample.pressure),
            altitude: Float(sample.altitude),
            azimuth: Float(sample.azimuth),
            roll: Float(sample.roll),
            t: Float(sample.time * 1000)))
    }
}

/// A point of a stroke placed in layout coordinates, ready to render.
public struct ResolvedInkPoint: Equatable, Sendable {
    public var location: CGPoint
    public var pressure: CGFloat
    public var altitude: CGFloat
    public var azimuth: CGFloat
    public var roll: CGFloat
    /// `fontSize / 17` or `blockWidth / 600`.
    public var scale: CGFloat
    /// Index of the source point in `Stroke.points`.
    public var sourceIndex: Int

    public init(location: CGPoint, pressure: CGFloat, altitude: CGFloat, azimuth: CGFloat, roll: CGFloat,
                scale: CGFloat, sourceIndex: Int) {
        self.location = location
        self.pressure = pressure
        self.altitude = altitude
        self.azimuth = azimuth
        self.roll = roll
        self.scale = scale
        self.sourceIndex = sourceIndex
    }
}

/// Places stored strokes into the current layout (`strokes.md` §4, rendering steps 1–4).
public enum LivingStrokeResolver {
    /// Splits a text stroke into independent segments.
    /// - Parameter placements: current glyph placement per anchor index; `nil` when the
    ///   anchored character is deleted (D-35) or cannot be resolved.
    /// - Returns: segments of at least 2 points; a break happens at line changes and deleted anchors.
    public static func segments(points: [StrokePoint], placements: [GlyphPlacement?]) -> [[ResolvedInkPoint]] {
        var result: [[ResolvedInkPoint]] = []
        var current: [ResolvedInkPoint] = []
        var currentLine: Int?

        func flush() {
            if current.count >= 2 { result.append(current) }
            current = []
            currentLine = nil
        }

        for (i, p) in points.enumerated() {
            guard let ai = p.anchorIndex, ai < placements.count, let g = placements[ai] else {
                flush()
                continue
            }
            if let line = currentLine, line != g.lineKey { flush() }
            currentLine = g.lineKey
            current.append(ResolvedInkPoint(
                location: CGPoint(x: g.origin.x + CGFloat(p.x) * g.fontSize,
                                  y: g.origin.y + CGFloat(p.y) * g.fontSize),
                pressure: CGFloat(p.pressure), altitude: CGFloat(p.altitude), azimuth: CGFloat(p.azimuth),
                roll: CGFloat(p.roll), scale: g.fontSize / CGFloat(InkWidth.referenceFontSize), sourceIndex: i))
        }
        flush()
        return result
    }

    /// Places a block/image/drawing stroke inside a block frame.
    public static func blockSegment(points: [StrokePoint], blockOrigin: CGPoint, blockWidth: CGFloat) -> [ResolvedInkPoint] {
        let scale = blockWidth / CGFloat(InkWidth.referenceBlockWidth)
        return points.enumerated().map { i, p in
            ResolvedInkPoint(
                location: CGPoint(x: blockOrigin.x + CGFloat(p.x) * blockWidth,
                                  y: blockOrigin.y + CGFloat(p.y) * blockWidth),
                pressure: CGFloat(p.pressure), altitude: CGFloat(p.altitude), azimuth: CGFloat(p.azimuth),
                roll: CGFloat(p.roll), scale: scale, sourceIndex: i)
        }
    }

    /// True when every anchor of a text stroke is deleted, so the stroke is not drawn at all (D-35).
    public static func isFullyDetached(_ placements: [GlyphPlacement?]) -> Bool {
        !placements.isEmpty && placements.allSatisfy { $0 == nil }
    }
}
