import Foundation

public enum StrokeCodecError: Error, Equatable {
    case invalidLength(Int)
}

/// Packs points as consecutive records of 8 little-endian Float32 values (32 bytes) — `strokes.md` §3.
public enum StrokePointCodec {
    public static let valuesPerPoint = 8
    public static let bytesPerPoint = 32

    public static func encode(_ points: [StrokePoint]) -> Data {
        var data = Data(capacity: points.count * bytesPerPoint)
        for p in points {
            for value in [p.a, p.x, p.y, p.pressure, p.altitude, p.azimuth, p.roll, p.t] {
                var le = value.bitPattern.littleEndian
                withUnsafeBytes(of: &le) { data.append(contentsOf: $0) }
            }
        }
        return data
    }

    public static func decode(_ data: Data) throws -> [StrokePoint] {
        guard data.count % bytesPerPoint == 0 else { throw StrokeCodecError.invalidLength(data.count) }
        let bytes = [UInt8](data)
        var result: [StrokePoint] = []
        result.reserveCapacity(bytes.count / bytesPerPoint)
        func float(at offset: Int) -> Float {
            let bits = UInt32(bytes[offset]) | UInt32(bytes[offset + 1]) << 8
                | UInt32(bytes[offset + 2]) << 16 | UInt32(bytes[offset + 3]) << 24
            return Float(bitPattern: bits)
        }
        var o = 0
        while o < bytes.count {
            result.append(StrokePoint(a: float(at: o), x: float(at: o + 4), y: float(at: o + 8),
                                      pressure: float(at: o + 12), altitude: float(at: o + 16),
                                      azimuth: float(at: o + 20), roll: float(at: o + 24), t: float(at: o + 28)))
            o += bytesPerPoint
        }
        return result
    }
}

/// UUIDv7 in lowercase with dashes (`document-model.md` §1).
public enum UUIDv7 {
    public static func generate(now: Date = Date()) -> String {
        let ms = UInt64(max(0, now.timeIntervalSince1970 * 1000))
        var bytes = [UInt8](repeating: 0, count: 16)
        for i in 0..<6 { bytes[i] = UInt8((ms >> (8 * UInt64(5 - i))) & 0xff) }
        var rng = SystemRandomNumberGenerator()
        for i in 6..<16 { bytes[i] = UInt8.random(in: 0...255, using: &rng) }
        bytes[6] = (bytes[6] & 0x0f) | 0x70
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        let hex = bytes.map { String(format: "%02x", $0) }.joined()
        let c = Array(hex)
        return String(c[0..<8]) + "-" + String(c[8..<12]) + "-" + String(c[12..<16]) + "-"
            + String(c[16..<20]) + "-" + String(c[20..<32])
    }
}
