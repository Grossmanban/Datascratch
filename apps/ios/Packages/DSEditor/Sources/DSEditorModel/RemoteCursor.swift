import Foundation

/// A co-author's caret or selection (`spec/08-sharing.md`, `spec/04-editor.md` «Каретки
/// соавторов»): from their awareness state, as the web's y-prosemirror cursor plugin sends it
/// (`{ user: { name, color, account? }, cursor: { anchor, head } }`, the positions being
/// `Y.relativePositionToJSON` of positions in the `content` fragment). Positions are Yjs relative
/// positions, so they stay on the same characters while the text around them changes.
public struct RemoteCursor: Hashable, Sendable, Identifiable {
    /// The awareness client id (one per device and note).
    public var id: UInt64
    /// Shown on the caret label; sanitized.
    public var name: String
    /// `#rgb`…`#rrggbbaa`; anything else becomes the default colour.
    public var color: String
    /// The person's account (`user.account`), when the client sends it; nil for guests.
    public var account: String?
    /// Encoded relative positions (`Y.encodeRelativePosition`); equal for a plain caret.
    public var anchor: Data
    public var head: Data

    public static let defaultColor = "#2E5BDB"
    public static let guestName = "Гость"
    static let maxName = 64

    public init(id: UInt64, name: String, color: String, account: String? = nil, anchor: Data, head: Data) {
        self.id = id
        self.name = Self.sanitizedName(name)
        self.color = Self.sanitizedColor(color)
        self.account = account.flatMap { $0.isEmpty ? nil : String($0.prefix(128)) }
        self.anchor = anchor
        self.head = head
    }

    /// The cursor in one awareness state (its JSON), or nil when the state has no cursor (the
    /// person is in the note but not in its text) or comes from `excludingAccount` (this person's
    /// own other devices are not shown).
    public static func parse(client: UInt64, json: String, excludingAccount: String? = nil) -> RemoteCursor? {
        guard let object = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any] else { return nil }
        return parse(client: client, state: object, excludingAccount: excludingAccount)
    }

    public static func parse(client: UInt64, state: [String: Any], excludingAccount: String? = nil) -> RemoteCursor? {
        guard let cursor = state["cursor"] as? [String: Any],
              let anchor = cursor["anchor"].flatMap(RelativePositionCodec.encode(json:)),
              let head = cursor["head"].flatMap(RelativePositionCodec.encode(json:)) else { return nil }
        let user = state["user"] as? [String: Any] ?? [:]
        let account = user["account"] as? String
        if let mine = excludingAccount, let account, account == mine { return nil }
        return RemoteCursor(id: client, name: user["name"] as? String ?? "", color: user["color"] as? String ?? "",
                            account: account, anchor: anchor, head: head)
    }

    /// As on the web (`awarenessSanitize.ts`): control and bidi-override characters removed,
    /// trimmed, at most 64 characters, «Гость» when nothing is left.
    public static func sanitizedName(_ raw: String) -> String {
        let scalars = raw.unicodeScalars.filter { s in
            let v = s.value
            return !(v <= 0x1F || (0x7F...0x9F).contains(v) || (0x202A...0x202E).contains(v) || (0x2066...0x2069).contains(v))
        }
        let name = String(String.UnicodeScalarView(scalars)).trimmingCharacters(in: .whitespacesAndNewlines)
        return name.isEmpty ? guestName : String(name.prefix(maxName))
    }

    /// Only a literal hex colour (`#rgb`…`#rrggbbaa`) is used.
    public static func sanitizedColor(_ raw: String) -> String {
        let hex = raw.dropFirst()
        guard raw.hasPrefix("#"), (3...8).contains(hex.count), hex.allSatisfy(\.isHexDigit) else { return defaultColor }
        return raw
    }

    /// Where the cursor is in the flattened text: `head` is the caret, `anchor` the other end of
    /// the selection (equal for a caret). Nil when the head cannot be placed (its text was removed,
    /// or it is in a part of the note this client does not show).
    @MainActor
    public func resolve(in document: EditorDocument, projection: Projection) -> (anchor: Int, head: Int)? {
        guard let h = document.resolveCursor(head).flatMap({ projection.offset(block: $0.block, offset: $0.offset) }) else { return nil }
        let a = anchor == head ? h : (document.resolveCursor(anchor).flatMap { projection.offset(block: $0.block, offset: $0.offset) } ?? h)
        return (a, h)
    }
}

public extension RelativePositionCodec {
    /// `Y.encodeRelativePosition` of a `Y.relativePositionToJSON` object: `{ item: {client, clock} }`,
    /// `{ tname }` or `{ type: {client, clock} }`, with an optional `assoc`. Nil for anything else.
    static func encode(json: Any) -> Data? {
        guard let o = json as? [String: Any] else { return nil }
        func id(_ v: Any?) -> (UInt64, UInt64)? {
            guard let d = v as? [String: Any], let c = uint(d["client"]), let k = uint(d["clock"]) else { return nil }
            return (c, k)
        }
        var out = Data()
        if let (client, clock) = id(o["item"]) {
            writeVarUint(&out, 0)
            writeVarUint(&out, client)
            writeVarUint(&out, clock)
        } else if let name = o["tname"] as? String, !name.isEmpty, name.utf8.count <= 256 {
            writeVarUint(&out, 1)
            writeVarUint(&out, UInt64(name.utf8.count))
            out.append(contentsOf: Array(name.utf8))
        } else if let (client, clock) = id(o["type"]) {
            writeVarUint(&out, 2)
            writeVarUint(&out, client)
            writeVarUint(&out, clock)
        } else {
            return nil
        }
        let assoc = (o["assoc"] as? Int) ?? (o["assoc"] as? Double).map { Int($0) } ?? 0
        writeVarInt(&out, assoc < 0 ? -1 : 0)
        return out
    }

    /// For a position on a nested type (`{ type }`) with assoc ≥ 0 — "the end of that text or
    /// element" in Yjs — the same position with assoc -1 (its start), which Yrs resolves to the
    /// node itself; nil for any other position. Yrs resolves both to index 0, Yjs the first to the
    /// node's length, and the web sends it for a caret at the end of a paragraph.
    public static func nestedTypeStart(of data: Data) -> Data? {
        let bytes = [UInt8](data)
        var i = 0
        guard readVarUint(bytes, &i) == 2, readVarUint(bytes, &i) != nil, readVarUint(bytes, &i) != nil else { return nil }
        let end = i
        guard (i < bytes.count ? readVarInt(bytes, &i) ?? 0 : 0) >= 0, i == bytes.count else { return nil }
        var out = Data(bytes[..<end])
        writeVarInt(&out, -1)
        return out
    }

    /// A JSON number that is a whole number within 0…2^53.
    private static func uint(_ v: Any?) -> UInt64? {
        let d: Double
        switch v {
        case let i as Int: d = Double(i)
        case let x as Double: d = x
        case let n as NSNumber: d = n.doubleValue
        default: return nil
        }
        guard d >= 0, d <= 9_007_199_254_740_992, d == d.rounded() else { return nil }
        return UInt64(d)
    }
}
