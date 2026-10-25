import Foundation

/// base64url without padding — the encoding of all binary fields in JSON and URLs
/// (crypto.md §3, api.md, sync-protocol.md §2).
public enum Base64URL {
    public static func encode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    /// Strict: only `A–Z a–z 0–9 - _`, no padding, canonical (zero trailing bits) — like the
    /// TS decoder. `canonical: false` accepts non-zero trailing bits, like the TS JSON schemas
    /// (which check alphabet and length only).
    public static func decode(_ string: String, canonical: Bool = true) -> Data? {
        guard string.utf8.allSatisfy({ ($0 >= 65 && $0 <= 90) || ($0 >= 97 && $0 <= 122) || ($0 >= 48 && $0 <= 57) || $0 == 45 || $0 == 95 }) else {
            return nil
        }
        var s = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = s.count % 4
        if remainder == 1 { return nil }
        if remainder > 0 { s += String(repeating: "=", count: 4 - remainder) }
        // Canonical only: unused trailing bits must be zero (re-encoding gives the input back).
        guard let data = Data(base64Encoded: s, options: canonical ? [] : [.ignoreUnknownCharacters]) ?? (canonical ? nil : lenient(s)),
              !canonical || encode(data) == string else { return nil }
        return data
    }
}

extension Base64URL {
    /// Decodes standard base64 (with padding) ignoring non-zero trailing bits.
    static func lenient(_ padded: String) -> Data? {
        let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".utf8)
        var map = [UInt8](repeating: 255, count: 256)
        for (i, c) in alphabet.enumerated() { map[Int(c)] = UInt8(i) }
        var out = Data()
        var buffer = 0
        var bits = 0
        for c in padded.utf8 where c != UInt8(ascii: "=") {
            let v = map[Int(c)]
            guard v != 255 else { return nil }
            buffer = (buffer << 6) | Int(v)
            bits += 6
            if bits >= 8 {
                bits -= 8
                out.append(UInt8((buffer >> bits) & 0xFF))
            }
            buffer &= (1 << bits) - 1
        }
        return out
    }
}

/// `Data` that encodes to/from base64url (no padding) in JSON. Decoding follows the TS JSON
/// schemas: alphabet and length are checked, trailing bits are not.
public struct Base64URLData: Codable, Hashable, Sendable {
    public var data: Data

    public init(_ data: Data) { self.data = data }

    public init(from decoder: any Decoder) throws {
        let string = try decoder.singleValueContainer().decode(String.self)
        guard let data = Base64URL.decode(string, canonical: false) else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "invalid base64url"))
        }
        self.data = data
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(Base64URL.encode(data))
    }
}

extension Data {
    /// Lowercase hex, for logs and test vectors.
    public var hexString: String { map { String(format: "%02x", $0) }.joined() }

    public init?(hex: String) {
        guard hex.count % 2 == 0 else { return nil }
        var bytes = [UInt8]()
        bytes.reserveCapacity(hex.count / 2)
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2)
            guard let b = UInt8(hex[index..<next], radix: 16) else { return nil }
            bytes.append(b)
            index = next
        }
        self.init(bytes)
    }
}
