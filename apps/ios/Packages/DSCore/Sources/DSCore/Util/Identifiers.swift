import Foundation

/// Entity identifiers: UUIDv7, lowercase with dashes, generated on the client
/// (document-model.md §1).
public enum EntityID {
    /// A new UUIDv7 string (`0192f3c4-...`).
    public static func make(now: Date = Date()) -> String {
        make(milliseconds: UInt64(max(0, now.timeIntervalSince1970 * 1000)))
    }

    static func make(milliseconds ms: UInt64) -> String {
        var random = SystemRandomNumberGenerator()
        return make(milliseconds: ms, random: (0..<10).map { _ in UInt8.random(in: 0...255, using: &random) })
    }

    /// Layout of `packages/test-vectors/vectors/ids/uuidv7.json`: bytes 0–5 = ms big-endian,
    /// 6 = 0x70 | (r[0] & 0x0f), 7 = r[1], 8 = 0x80 | (r[2] & 0x3f), 9–15 = r[3…9].
    static func make(milliseconds ms: UInt64, random r: [UInt8]) -> String {
        precondition(r.count >= 10)
        var b = [UInt8](repeating: 0, count: 16)
        for i in 0..<6 { b[i] = UInt8(truncatingIfNeeded: ms >> (8 * (5 - UInt64(i)))) }
        b[6] = 0x70 | (r[0] & 0x0F)
        b[7] = r[1]
        b[8] = 0x80 | (r[2] & 0x3F)
        for i in 9..<16 { b[i] = r[i - 6] }
        let hex = b.map { String(format: "%02x", $0) }.joined()
        let parts = [hex.prefix(8), hex.dropFirst(8).prefix(4), hex.dropFirst(12).prefix(4), hex.dropFirst(16).prefix(4), hex.dropFirst(20)]
        return parts.joined(separator: "-")
    }

    /// Whether `string` is a lowercase UUIDv7 (`^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`).
    public static func isValid(_ string: String) -> Bool {
        let u = Array(string.utf8)
        guard u.count == 36 else { return false }
        func hex(_ c: UInt8) -> Bool { (c >= 48 && c <= 57) || (c >= 97 && c <= 102) }
        for (i, c) in u.enumerated() {
            switch i {
            case 8, 13, 18, 23: if c != 45 { return false }
            case 14: if c != 55 { return false } // '7'
            case 19: if !(c == 56 || c == 57 || c == 97 || c == 98) { return false } // 8 9 a b
            default: if !hex(c) { return false }
            }
        }
        return true
    }
}

/// Dates as stored in documents (document-model.md §1).
public enum DSDate {
    /// `2026-10-25T12:00:00.000Z`.
    public static func iso(_ date: Date) -> String {
        isoFormatter().string(from: date)
    }

    public static func parseISO(_ string: String) -> Date? {
        isoFormatter().date(from: string) ?? ISO8601DateFormatter().date(from: string)
    }

    /// `YYYY-MM-DD` in the given (user's local) calendar.
    public static func day(_ date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// Parses `YYYY-MM-DD` into components (no time zone involved).
    public static func parseDay(_ string: String) -> DateComponents? {
        let parts = string.split(separator: "-")
        guard parts.count == 3, parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
              let y = Int(parts[0]), let m = Int(parts[1]), let d = Int(parts[2]),
              (1...12).contains(m), (1...31).contains(d) else { return nil }
        return DateComponents(year: y, month: m, day: d)
    }

    /// Unix milliseconds (strokes only).
    public static func milliseconds(_ date: Date) -> Double {
        (date.timeIntervalSince1970 * 1000).rounded()
    }

    private static func isoFormatter() -> ISO8601DateFormatter {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }
}
