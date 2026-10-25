import DSInk
import Foundation
import Testing

/// Shared cross-platform vectors from `packages/test-vectors` (`strokes.md` §6).
enum Vectors {
    static let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .appendingPathComponent("../../../../../../packages/test-vectors/vectors")
        .standardized

    static var available: Bool { FileManager.default.fileExists(atPath: root.appendingPathComponent("strokes/points.json").path) }

    static func json(_ path: String) throws -> [String: Any] {
        let data = try Data(contentsOf: root.appendingPathComponent(path))
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }

    static func base64url(_ s: String) -> Data {
        var b = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b.count % 4 != 0 { b += "=" }
        return Data(base64Encoded: b)!
    }

    static func hex(_ s: String) -> [UInt8] {
        var out: [UInt8] = []
        var i = s.startIndex
        while i < s.endIndex {
            let j = s.index(i, offsetBy: 2)
            out.append(UInt8(s[i..<j], radix: 16)!)
            i = j
        }
        return out
    }

    static func round4(_ v: Double) -> Double { (v * 10_000).rounded() / 10_000 }
}

@Suite(.enabled(if: Vectors.available, "packages/test-vectors not found"))
struct StrokeVectorTests {
    @Test func points() throws {
        let file = try Vectors.json("strokes/points.json")
        let expected = (file["points"] as! [[String: Double]]).map {
            StrokePoint(a: Float($0["a"]!), x: Float($0["x"]!), y: Float($0["y"]!), pressure: Float($0["pressure"]!),
                        altitude: Float($0["altitude"]!), azimuth: Float($0["azimuth"]!), roll: Float($0["roll"]!), t: Float($0["t"]!))
        }
        let packed = Data(Vectors.hex(file["packedHex"] as! String))
        #expect(try StrokePointCodec.decode(packed) == expected)
        #expect(StrokePointCodec.encode(expected) == packed)
    }

    @Test func widths() throws {
        let file = try Vectors.json("strokes/width.json")
        for c in file["cases"] as! [[String: Any]] {
            let tool = InkTool(rawValue: c["tool"] as! String)!
            let scaleSpec = c["scale"] as! [String: Double]
            let scale = scaleSpec["fontSize"].map { InkWidth.textScale(fontSize: $0) } ?? InkWidth.blockScale(blockWidth: scaleSpec["blockWidth"]!)
            let p = c["pressure"] as! Double
            #expect(Vectors.round4(InkWidth.pressureCurve(p)) == c["f"] as! Double)
            let w = InkWidth.width(base: c["width"] as! Double, tool: tool, pressure: p, altitude: c["altitude"] as! Double, scale: scale)
            #expect(Vectors.round4(w) == c["result"] as! Double, "\(c)")
        }
    }

    /// Reference monospace layout from the vector description.
    static func placement(_ index: Int, perLine: Int) -> GlyphPlacement {
        GlyphPlacement(origin: CGPoint(x: CGFloat(index % perLine) * 10, y: CGFloat(index / perLine) * 24 + 17),
                       fontSize: 17, lineKey: index / perLine)
    }

    static func segments(_ points: [StrokePoint], placements: [GlyphPlacement?], tool: InkTool, width: Double) -> [[[String: Double]]] {
        LivingStrokeResolver.segments(points: points, placements: placements).map { seg in
            seg.map { p in
                ["x": Vectors.round4(Double(p.location.x)), "y": Vectors.round4(Double(p.location.y)),
                 "width": Vectors.round4(InkWidth.width(base: width, tool: tool, pressure: Double(p.pressure),
                                                        altitude: Double(p.altitude), scale: Double(p.scale)))]
            }
        }
    }

    @Test func layoutAndLineBreaks() throws {
        let file = try Vectors.json("strokes/layout.json")
        let points = try StrokePointCodec.decode(Vectors.base64url(file["points"] as! String))
        let indices = file["anchorIndices"] as! [Int]
        let strokeSpec = file["stroke"] as! [String: Any]
        let tool = InkTool(rawValue: strokeSpec["tool"] as! String)!
        let width = strokeSpec["width"] as! Double
        for c in file["cases"] as! [[String: Any]] {
            let perLine = c["perLine"] as! Int
            let got = Self.segments(points, placements: indices.map { Self.placement($0, perLine: perLine) }, tool: tool, width: width)
            let expected = c["segments"] as! [[[String: Double]]]
            #expect(got == expected, "perLine \(perLine)")
        }
        // D-35: character at index 4 deleted; later characters shift left by one.
        let after = file["afterDeletingIndex4"] as! [String: Any]
        let placements: [GlyphPlacement?] = indices.map { $0 == 4 ? nil : Self.placement($0 > 4 ? $0 - 1 : $0, perLine: 1000) }
        #expect(Self.segments(points, placements: placements, tool: tool, width: width) == after["segments"] as! [[[String: Double]]])
    }

    @Test func uuidv7() throws {
        let file = try Vectors.json("ids/uuidv7.json")
        for c in file["cases"] as! [[String: Any]] {
            let ms = (c["unixMs"] as! NSNumber).uint64Value
            #expect(UUIDv7.make(unixMs: ms, random: Vectors.hex(c["rand"] as! String)) == c["uuid"] as! String)
        }
    }
}
