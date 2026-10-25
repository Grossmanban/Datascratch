import Foundation

/// Identity of one inserted character/inline element, like a Yjs item ID (`client`, `clock`).
public struct ItemID: Hashable, Sendable, Codable, Comparable {
    public var client: UInt32
    public var clock: UInt32

    public init(client: UInt32, clock: UInt32) {
        self.client = client
        self.clock = clock
    }

    public static func < (l: ItemID, r: ItemID) -> Bool { (l.client, l.clock) < (r.client, r.clock) }
}

/// Binary encoding of relative positions, byte-compatible with Yjs `encodeRelativePosition`
/// for item-based positions: `varUint(0) varUint(client) varUint(clock) varInt(assoc)`.
public enum RelativePositionCodec {
    public static func encode(item: ItemID, assoc: Int = 0) -> Data {
        var out = Data()
        writeVarUint(&out, 0)
        writeVarUint(&out, UInt64(item.client))
        writeVarUint(&out, UInt64(item.clock))
        writeVarInt(&out, assoc)
        return out
    }

    /// Decodes an item-based relative position; returns nil for other kinds (type/tname) or bad data.
    public static func decode(_ data: Data) -> (item: ItemID, assoc: Int)? {
        let bytes = [UInt8](data)
        var i = 0
        guard let kind = readVarUint(bytes, &i), kind == 0,
              let client = readVarUint(bytes, &i), let clock = readVarUint(bytes, &i),
              client <= UInt64(UInt32.max), clock <= UInt64(UInt32.max) else { return nil }
        let assoc = i < bytes.count ? (readVarInt(bytes, &i) ?? 0) : 0
        return (ItemID(client: UInt32(client), clock: UInt32(clock)), assoc)
    }

    static func writeVarUint(_ out: inout Data, _ value: UInt64) {
        var v = value
        while v > 0x7f {
            out.append(UInt8(0x80 | (v & 0x7f)))
            v >>= 7
        }
        out.append(UInt8(v))
    }

    /// lib0 varInt: first byte holds 6 bits plus sign (0x40) and continuation (0x80) bits.
    static func writeVarInt(_ out: inout Data, _ value: Int) {
        let negative = value < 0
        var v = UInt64(abs(value))
        out.append(UInt8((v > 0x3f ? 0x80 : 0) | (negative ? 0x40 : 0) | (v & 0x3f)))
        v >>= 6
        while v > 0 {
            out.append(UInt8((v > 0x7f ? 0x80 : 0) | (v & 0x7f)))
            v >>= 7
        }
    }

    static func readVarUint(_ b: [UInt8], _ i: inout Int) -> UInt64? {
        var result: UInt64 = 0
        var shift: UInt64 = 0
        while i < b.count {
            let byte = b[i]
            i += 1
            result |= UInt64(byte & 0x7f) << shift
            if byte < 0x80 { return result }
            shift += 7
            if shift > 63 { return nil }
        }
        return nil
    }

    static func readVarInt(_ b: [UInt8], _ i: inout Int) -> Int? {
        guard i < b.count else { return nil }
        let first = b[i]
        i += 1
        var result = UInt64(first & 0x3f)
        let negative = first & 0x40 != 0
        var shift: UInt64 = 6
        if first & 0x80 != 0 {
            while i < b.count {
                let byte = b[i]
                i += 1
                result |= UInt64(byte & 0x7f) << shift
                if byte < 0x80 { break }
                shift += 7
                if shift > 63 { return nil }
            }
        }
        return negative ? -Int(result) : Int(result)
    }
}
