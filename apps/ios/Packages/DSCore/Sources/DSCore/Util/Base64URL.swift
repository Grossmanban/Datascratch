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

    public static func decode(_ string: String) -> Data? {
        guard !string.contains("+"), !string.contains("/") else { return nil }
        var s = string
            .replacingOccurrences(of: "=", with: "")
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = s.count % 4
        if remainder == 1 { return nil }
        if remainder > 0 { s += String(repeating: "=", count: 4 - remainder) }
        return Data(base64Encoded: s)
    }
}

/// `Data` that encodes to/from base64url (no padding) in JSON.
public struct Base64URLData: Codable, Hashable, Sendable {
    public var data: Data

    public init(_ data: Data) { self.data = data }

    public init(from decoder: any Decoder) throws {
        let string = try decoder.singleValueContainer().decode(String.self)
        guard let data = Base64URL.decode(string) else {
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
