import DSInk
import Foundation
import Testing

@Suite struct StrokeCodecTests {
    @Test func roundTrip() throws {
        let points = [
            StrokePoint(a: 0, x: 0.25, y: -0.5, pressure: 0.7, altitude: 1.2, azimuth: 3.1, roll: 0.4, t: 0),
            StrokePoint(a: 1, x: 1.5, y: 0.125, pressure: 1, altitude: .pi / 2, azimuth: 0, roll: 0, t: 16.5),
        ]
        let data = StrokePointCodec.encode(points)
        #expect(data.count == 64)
        #expect(try StrokePointCodec.decode(data) == points)
    }

    @Test func littleEndianLayout() {
        let data = StrokePointCodec.encode([StrokePoint(a: 1, x: 2, y: 0, pressure: 0, altitude: 0, azimuth: 0, roll: 0, t: 0)])
        // 1.0f = 0x3F800000, 2.0f = 0x40000000, little endian.
        #expect(Array(data.prefix(8)) == [0x00, 0x00, 0x80, 0x3F, 0x00, 0x00, 0x00, 0x40])
    }

    @Test func rejectsBadLength() {
        #expect(throws: StrokeCodecError.invalidLength(31)) { try StrokePointCodec.decode(Data(count: 31)) }
    }

    @Test func uuidV7Format() {
        let id = UUIDv7.generate(now: Date(timeIntervalSince1970: 1_700_000_000))
        let parts = id.split(separator: "-")
        #expect(parts.map(\.count) == [8, 4, 4, 4, 12])
        #expect(parts[2].first == "7")
        #expect("89ab".contains(parts[3].first!))
        #expect(id == id.lowercased())
        // 1_700_000_000_000 ms = 0x018BCFE56800
        #expect(id.hasPrefix("018bcfe5-6800"))
    }

    @Test func sliceCompactsAnchors() {
        let s = Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text,
                       anchors: [Data([1]), Data([2]), Data([3])],
                       points: [StrokePoint(a: 0, x: 0, y: 0), StrokePoint(a: 1, x: 1, y: 0),
                                StrokePoint(a: 2, x: 2, y: 0), StrokePoint(a: 2, x: 3, y: 0)])
        let piece = s.slice(2..<4)
        #expect(piece.anchors == [Data([3])])
        #expect(piece.points.map(\.a) == [0, 0])
        #expect(piece.id != s.id)
    }
}

@Suite struct InkWidthTests {
    @Test func pressureCurve() {
        #expect(abs(InkWidth.pressureCurve(0) - 0.35) < 1e-9)
        #expect(abs(InkWidth.pressureCurve(1) - 1.0) < 1e-9)
        #expect(abs(InkWidth.pressureCurve(0.5) - (0.35 + 0.65 * pow(0.5, 0.8))) < 1e-9)
    }

    @Test func tiltOnlyForPencilAndMarker() {
        let flat = InkWidth.width(base: 2, tool: .pen, pressure: 1, altitude: 0, scale: 1)
        #expect(abs(flat - 2) < 1e-9)
        let pencil = InkWidth.width(base: 2, tool: .pencil, pressure: 1, altitude: 0, scale: 1)
        #expect(abs(pencil - 5) < 1e-9)
        let upright = InkWidth.width(base: 2, tool: .marker, pressure: 1, altitude: .pi / 2, scale: 1)
        #expect(abs(upright - 2) < 1e-9)
    }

    @Test func scalesWithFontSize() {
        let w = InkWidth.width(base: 2, tool: .pen, pressure: 1, altitude: .pi / 2, scale: InkWidth.textScale(fontSize: 34))
        #expect(abs(w - 4) < 1e-9)
    }
}
