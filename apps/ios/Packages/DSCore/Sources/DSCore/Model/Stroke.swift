import Foundation

/// A handwritten stroke (strokes.md). Immutable once drawn; only `hidden` may change.
public struct Stroke: Hashable, Sendable, Identifiable {
    public enum Tool: String, Sendable, CaseIterable { case pen, pencil, marker, highlighter }
    public enum AnchorKind: String, Sendable, CaseIterable { case text, block, image, drawing }
    public enum Hint: String, Sendable, CaseIterable { case free, underline, strike, circle, highlight, arrow, scribble }

    public var id: String
    public var version: Int = 1
    public var tool: Tool
    /// Ink color token (`ink.black`) or `#RRGGBB`.
    public var color: String
    /// Base width in pt at pressure 1.0 and 17 pt font.
    public var width: Double
    public var opacity: Double
    public var anchorKind: AnchorKind
    /// For `block`, `image`, `drawing` anchors.
    public var blockId: String?
    /// For `text` anchors: encoded Yjs relative positions, one per touched character.
    public var anchors: [Data]
    public var points: [StrokePoint]
    public var hint: Hint
    public var author: Author
    /// Unix ms.
    public var createdAt: Double
    public var hidden: Bool

    public init(id: String = EntityID.make(), tool: Tool, color: String, width: Double, opacity: Double = 1,
                anchorKind: AnchorKind, blockId: String? = nil, anchors: [Data] = [], points: [StrokePoint],
                hint: Hint = .free, author: Author, createdAt: Double = DSDate.milliseconds(Date()), hidden: Bool = false) {
        self.id = id
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

    /// Fields of the `Y.Map` (strokes.md §2).
    public var fields: [String: YValue] {
        var f: [String: YValue] = [
            "v": .number(value: Double(version)),
            "tool": .string(value: tool.rawValue),
            "color": .string(value: color),
            "width": .number(value: width),
            "opacity": .number(value: opacity),
            "anchorKind": .string(value: anchorKind.rawValue),
            "blockId": .optionalString(blockId),
            "anchors": .list(items: anchors.map { .bytes(value: $0) }),
            "points": .bytes(value: StrokeCodec.pack(points)),
            "hint": .string(value: hint.rawValue),
            "author": author.value,
            "createdAt": .number(value: createdAt),
        ]
        if hidden { f["hidden"] = .bool(value: true) }
        return f
    }

    public init?(id: String, fields f: [String: YValue]) {
        guard let tool = f["tool"]?.stringValue.flatMap(Tool.init(rawValue:)),
              let kind = f["anchorKind"]?.stringValue.flatMap(AnchorKind.init(rawValue:)),
              let pointsData = f["points"]?.dataValue,
              let points = try? StrokeCodec.unpack(pointsData) else { return nil }
        self.id = id
        self.version = f["v"]?.intValue ?? 1
        self.tool = tool
        self.color = f["color"]?.stringValue ?? "ink.black"
        self.width = f["width"]?.doubleValue ?? 2
        self.opacity = f["opacity"]?.doubleValue ?? 1
        self.anchorKind = kind
        self.blockId = f["blockId"]?.stringValue
        self.anchors = f["anchors"]?.items?.compactMap(\.dataValue) ?? []
        self.points = points
        self.hint = f["hint"]?.stringValue.flatMap(Hint.init(rawValue:)) ?? .free
        self.author = f["author"].flatMap(Author.init(value:)) ?? Author(kind: .user, id: "")
        self.createdAt = f["createdAt"]?.doubleValue ?? 0
        self.hidden = f["hidden"]?.boolValue ?? false
    }
}

/// Who created a stroke or comment.
public struct Author: Hashable, Sendable {
    public enum Kind: String, Sendable { case user, guest, agent }
    public var kind: Kind
    public var id: String
    /// Display name (comments only).
    public var name: String?

    public init(kind: Kind, id: String, name: String? = nil) {
        self.kind = kind
        self.id = id
        self.name = name
    }

    var value: YValue {
        var e: [String: YValue] = ["kind": .string(value: kind.rawValue), "id": .string(value: id)]
        if let name { e["name"] = .string(value: name) }
        return .object(entries: e)
    }

    init?(value: YValue) {
        guard let kind = value["kind"]?.stringValue.flatMap(Kind.init(rawValue:)), let id = value["id"]?.stringValue else { return nil }
        self.init(kind: kind, id: id, name: value["name"]?.stringValue)
    }
}

/// One point of a stroke (strokes.md §3).
public struct StrokePoint: Hashable, Sendable {
    /// Index into `anchors` for text strokes, `-1` otherwise.
    public var anchor: Int
    /// Text: offset from the glyph origin in em. Others: fractions of the block width.
    public var x: Float
    public var y: Float
    public var pressure: Float
    public var altitude: Float
    public var azimuth: Float
    public var roll: Float
    /// Milliseconds since the stroke started.
    public var t: Float

    public init(anchor: Int, x: Float, y: Float, pressure: Float = 1, altitude: Float = .pi / 2, azimuth: Float = 0, roll: Float = 0, t: Float) {
        self.anchor = anchor
        self.x = x
        self.y = y
        self.pressure = pressure
        self.altitude = altitude
        self.azimuth = azimuth
        self.roll = roll
        self.t = t
    }
}

public enum StrokeCodecError: Error, Equatable {
    case invalidLength(Int)
}

/// Packing of stroke points: 8 × Float32 little-endian per point (strokes.md §3).
public enum StrokeCodec {
    public static let bytesPerPoint = 32

    public static func pack(_ points: [StrokePoint]) -> Data {
        var data = Data(capacity: points.count * bytesPerPoint)
        for p in points {
            for v in [Float(p.anchor), p.x, p.y, p.pressure, p.altitude, p.azimuth, p.roll, p.t] {
                var bits = v.bitPattern.littleEndian
                withUnsafeBytes(of: &bits) { data.append(contentsOf: $0) }
            }
        }
        return data
    }

    public static func unpack(_ data: Data) throws -> [StrokePoint] {
        guard data.count % bytesPerPoint == 0 else { throw StrokeCodecError.invalidLength(data.count) }
        let bytes = [UInt8](data)
        var out: [StrokePoint] = []
        out.reserveCapacity(bytes.count / bytesPerPoint)
        func float(_ offset: Int) -> Float {
            let bits = UInt32(bytes[offset]) | UInt32(bytes[offset + 1]) << 8 | UInt32(bytes[offset + 2]) << 16 | UInt32(bytes[offset + 3]) << 24
            return Float(bitPattern: bits)
        }
        var o = 0
        while o < bytes.count {
            out.append(StrokePoint(anchor: Int(float(o)), x: float(o + 4), y: float(o + 8), pressure: float(o + 12),
                                   altitude: float(o + 16), azimuth: float(o + 20), roll: float(o + 24), t: float(o + 28)))
            o += bytesPerPoint
        }
        return out
    }
}

/// Rendering rules shared by all platforms (strokes.md §5).
public enum StrokeMetrics {
    /// Pressure curve `f(p) = 0.35 + 0.65 · p^0.8`.
    public static func pressureFactor(_ p: Double) -> Double {
        0.35 + 0.65 * pow(max(0, min(1, p)), 0.8)
    }

    /// Width at a point. `scaleBase` is the font size for text strokes and the block width for
    /// the others.
    public static func width(base: Double, tool: Stroke.Tool, anchorKind: Stroke.AnchorKind, pressure: Double, altitude: Double, scaleBase: Double) -> Double {
        let scale = anchorKind == .text ? scaleBase / 17 : scaleBase / 600
        var w = base * pressureFactor(pressure) * scale
        if tool == .pencil || tool == .marker {
            w *= 1 + 1.5 * (1 - altitude / (Double.pi / 2))
        }
        return w
    }
}

/// One drawable piece of a text stroke after anchor resolution (strokes.md §4).
public struct ResolvedStrokeSegment: Hashable, Sendable {
    /// Indices into `Stroke.points`.
    public var pointIndices: [Int]
}

extension Stroke {
    /// Splits a text stroke into drawable segments given each anchor's resolution and a
    /// line identifier per live anchor (D-35 + line breaking, strokes.md §4):
    /// points on deleted anchors are dropped, the stroke breaks where consecutive points lie on
    /// different lines, segments shorter than 2 points are dropped.
    ///
    /// - Parameters:
    ///   - resolved: result of `CRDTDocument.resolve(relativePositions: anchors)`.
    ///   - line: line fragment id of a live anchor (layout-specific, from the editor).
    public func segments(resolved: [ResolvedIndex?], line: (Int) -> Int?) -> [ResolvedStrokeSegment] {
        var out: [ResolvedStrokeSegment] = []
        var current: [Int] = []
        var currentLine: Int?
        func flush() {
            if current.count >= 2 { out.append(ResolvedStrokeSegment(pointIndices: current)) }
            current = []
            currentLine = nil
        }
        for (i, p) in points.enumerated() {
            guard p.anchor >= 0, p.anchor < resolved.count, let r = resolved[p.anchor], !r.deleted, let l = line(p.anchor) else {
                flush()
                continue
            }
            if let cl = currentLine, cl != l { flush() }
            current.append(i)
            currentLine = l
        }
        flush()
        return out
    }
}
