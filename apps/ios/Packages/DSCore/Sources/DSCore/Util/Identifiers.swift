import Foundation

/// Entity identifiers: UUIDv7, lowercase with dashes, generated on the client
/// (document-model.md §1).
public enum EntityID {
    /// A new UUIDv7 string (`0192f3c4-...`).
    public static func make(now: Date = Date()) -> String {
        make(milliseconds: UInt64(max(0, now.timeIntervalSince1970 * 1000)))
    }

    static func make(milliseconds ms: UInt64) -> String {
        var bytes = [UInt8](repeating: 0, count: 16)
        for i in 0..<6 {
            bytes[i] = UInt8(truncatingIfNeeded: ms >> (8 * (5 - UInt64(i))))
        }
        var random = SystemRandomNumberGenerator()
        for i in 6..<16 {
            bytes[i] = UInt8.random(in: 0...255, using: &random)
        }
        bytes[6] = (bytes[6] & 0x0F) | 0x70 // version 7
        bytes[8] = (bytes[8] & 0x3F) | 0x80 // RFC 4122 variant
        let uuid = UUID(uuid: (bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
                               bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]))
        return uuid.uuidString.lowercased()
    }

    /// Whether `string` is a canonical lowercase UUID.
    public static func isValid(_ string: String) -> Bool {
        string.count == 36 && string == string.lowercased() && UUID(uuidString: string) != nil
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
