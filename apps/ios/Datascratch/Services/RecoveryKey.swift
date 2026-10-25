import Foundation

/// Recovery key presentation (contracts/crypto.md §4): 32 random bytes shown as
/// Crockford Base32 (52 characters) in groups of 4 with the `DS1-` prefix.
nonisolated struct RecoveryKey: Hashable, Sendable {
    static let byteCount = 32
    static let prefix = "DS1"
    private static let alphabet = Array("0123456789ABCDEFGHJKMNPQRSTVWXYZ")

    let bytes: [UInt8]

    init?(bytes: [UInt8]) {
        guard bytes.count == Self.byteCount else { return nil }
        self.bytes = bytes
    }

    static func random() -> RecoveryKey {
        var generator = SystemRandomNumberGenerator()
        let bytes = (0..<byteCount).map { _ in UInt8.random(in: 0...255, using: &generator) }
        return RecoveryKey(bytes: bytes)!
    }

    /// 52 characters without separators.
    var base32: String {
        var result = ""
        var buffer: UInt32 = 0
        var bits = 0
        for byte in bytes {
            buffer = (buffer << 8) | UInt32(byte)
            bits += 8
            while bits >= 5 {
                bits -= 5
                result.append(Self.alphabet[Int((buffer >> UInt32(bits)) & 0x1F)])
            }
        }
        if bits > 0 {
            result.append(Self.alphabet[Int((buffer << UInt32(5 - bits)) & 0x1F)])
        }
        return result
    }

    /// Groups of four characters: `DS1-XXXX-XXXX-…`.
    var groups: [String] {
        let chars = Array(base32)
        return stride(from: 0, to: chars.count, by: 4).map { String(chars[$0..<min($0 + 4, chars.count)]) }
    }

    var formatted: String { ([Self.prefix] + groups).joined(separator: "-") }

    /// Parses user input leniently: case, spaces, dashes, the prefix and the
    /// Crockford aliases (O→0, I/L→1) are accepted.
    init?(_ text: String) {
        var cleaned = text.uppercased().filter { !$0.isWhitespace && $0 != "-" }
        if cleaned.hasPrefix(Self.prefix), cleaned.count == 52 + Self.prefix.count {
            cleaned.removeFirst(Self.prefix.count)
        }
        guard cleaned.count == 52 else { return nil }
        var buffer: UInt32 = 0
        var bits = 0
        var bytes: [UInt8] = []
        for raw in cleaned {
            let ch: Character = switch raw {
            case "O": "0"
            case "I", "L": "1"
            default: raw
            }
            guard let value = Self.alphabet.firstIndex(of: ch) else { return nil }
            buffer = (buffer << 5) | UInt32(value)
            bits += 5
            if bits >= 8 {
                bits -= 8
                bytes.append(UInt8((buffer >> UInt32(bits)) & 0xFF))
            }
        }
        guard bytes.count == Self.byteCount, buffer & ((1 << UInt32(bits)) - 1) == 0 else { return nil }
        self.bytes = bytes
    }
}
