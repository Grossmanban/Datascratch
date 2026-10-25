import Foundation

/// Drawing tool of a stroke (`strokes.md` §2).
public enum InkTool: String, Codable, Sendable, CaseIterable {
    case pen, pencil, marker, highlighter

    /// Highlighter strokes are drawn under the text.
    public var drawsUnderText: Bool { self == .highlighter }
    /// Tilt widens the stroke only for pencil and marker (`strokes.md` §5).
    public var respondsToTilt: Bool { self == .pencil || self == .marker }
}

/// What a stroke is attached to (`strokes.md` §2).
public enum AnchorKind: String, Codable, Sendable {
    case text, block, image, drawing
}

/// Recognized shape of a stroke, used by agents and export.
public enum StrokeHint: String, Codable, Sendable, CaseIterable {
    case free, underline, strike, circle, highlight, arrow, scribble
}

public struct StrokeAuthor: Codable, Sendable, Hashable {
    public enum Kind: String, Codable, Sendable { case user, guest, agent }
    public var kind: Kind
    public var id: String

    public init(kind: Kind, id: String) {
        self.kind = kind
        self.id = id
    }

    public static let localUser = StrokeAuthor(kind: .user, id: "local")
}

/// One packed point record: `[a, x, y, pressure, altitude, azimuth, roll, t]` (`strokes.md` §3).
public struct StrokePoint: Equatable, Sendable, Codable {
    /// Anchor index into `Stroke.anchors` for text strokes, `-1` otherwise.
    public var a: Float
    /// Offset from the glyph origin in em (text) or fraction of block width (other kinds).
    public var x: Float
    public var y: Float
    public var pressure: Float
    public var altitude: Float
    public var azimuth: Float
    public var roll: Float
    /// Milliseconds since stroke start.
    public var t: Float

    public init(a: Float = -1, x: Float, y: Float, pressure: Float = 1, altitude: Float = .pi / 2,
                azimuth: Float = 0, roll: Float = 0, t: Float = 0) {
        self.a = a
        self.x = x
        self.y = y
        self.pressure = pressure
        self.altitude = altitude
        self.azimuth = azimuth
        self.roll = roll
        self.t = t
    }

    public var anchorIndex: Int? { a < 0 ? nil : Int(a) }
}

/// A finished handwritten stroke (`strokes.md`). Immutable after drawing except `hidden`.
public struct Stroke: Identifiable, Equatable, Sendable {
    public static let formatVersion = 1

    public var id: String
    public var v: Int
    public var tool: InkTool
    public var color: String
    public var width: Double
    public var opacity: Double
    public var anchorKind: AnchorKind
    public var blockId: String?
    /// Encoded relative positions (Yjs `encodeRelativePosition`), one per touched character.
    public var anchors: [Data]
    public var points: [StrokePoint]
    public var hint: StrokeHint
    public var author: StrokeAuthor
    public var createdAt: Double
    public var hidden: Bool

    public init(id: String = UUIDv7.generate(), v: Int = Stroke.formatVersion, tool: InkTool, color: String,
                width: Double, opacity: Double = 1, anchorKind: AnchorKind, blockId: String? = nil,
                anchors: [Data] = [], points: [StrokePoint], hint: StrokeHint = .free,
                author: StrokeAuthor = .localUser, createdAt: Double = Date().timeIntervalSince1970 * 1000,
                hidden: Bool = false) {
        self.id = id
        self.v = v
        self.tool = tool
        self.color = color
        self.width = width
        self.opacity = opacity
        self.anchorKind = anchorKind
        self.blockId = blockId
        self.anchors = anchors
        self.points = points
        self.hint = hint
        self.author = author
        self.createdAt = createdAt
        self.hidden = hidden
    }

    /// Copy with new identity and a subset of points; anchors are compacted to those still used.
    public func slice(_ range: Range<Int>) -> Stroke {
        var copy = self
        copy.id = UUIDv7.generate()
        let pts = Array(points[range])
        guard anchorKind == .text else {
            copy.points = pts
            return copy
        }
        var remap: [Int: Int] = [:]
        var newAnchors: [Data] = []
        copy.points = pts.map { p in
            var q = p
            if let i = p.anchorIndex, i < anchors.count {
                if let j = remap[i] {
                    q.a = Float(j)
                } else {
                    remap[i] = newAnchors.count
                    q.a = Float(newAnchors.count)
                    newAnchors.append(anchors[i])
                }
            }
            return q
        }
        copy.anchors = newAnchors
        return copy
    }
}
