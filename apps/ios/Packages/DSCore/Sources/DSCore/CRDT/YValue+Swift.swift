import Foundation

extension YValue {
    public var stringValue: String? {
        switch self {
        case .string(let v): v
        case .sharedText(let t): t
        default: nil
        }
    }

    public var doubleValue: Double? {
        switch self {
        case .number(let v): v
        case .bigInt(let v): Double(v)
        default: nil
        }
    }

    public var intValue: Int? { doubleValue.map { Int($0) } }

    public var boolValue: Bool? {
        if case .bool(let v) = self { return v }
        return nil
    }

    public var dataValue: Data? {
        if case .bytes(let v) = self { return v }
        return nil
    }

    /// Entries of a plain object or a shared map.
    public var entries: [String: YValue]? {
        switch self {
        case .object(let e), .sharedMap(let e): e
        default: nil
        }
    }

    /// Items of a plain list or a shared array.
    public var items: [YValue]? {
        switch self {
        case .list(let i), .sharedArray(let i): i
        default: nil
        }
    }

    public var isNull: Bool {
        switch self {
        case .null, .undefined: true
        default: false
        }
    }

    public subscript(key: String) -> YValue? { entries?[key] }

    /// `nil` → `.null`, otherwise a string.
    public static func optionalString(_ s: String?) -> YValue { s.map { .string(value: $0) } ?? .null }

    public static func optionalNumber(_ n: Double?) -> YValue { n.map { .number(value: $0) } ?? .null }

    /// An empty plain object (`{}`) — the value y-prosemirror stores for marks without
    /// attributes (`bold`, `italic`, ...).
    public static let emptyObject: YValue = .object(entries: [:])

    /// Converts a JSON-compatible Swift value (`String`, `Bool`, numbers, `nil`/`NSNull`,
    /// arrays, dictionaries, `Data`) into a plain value.
    public static func json(_ any: Any?) -> YValue {
        switch any {
        case nil: return .null
        case is NSNull: return .null
        case let v as Bool: return .bool(value: v)
        case let v as Int: return .number(value: Double(v))
        case let v as Double: return .number(value: v)
        case let v as Float: return .number(value: Double(v))
        case let v as String: return .string(value: v)
        case let v as Data: return .bytes(value: v)
        case let v as [Any?]: return .list(items: v.map { json($0) })
        case let v as [String: Any?]: return .object(entries: v.mapValues { json($0) })
        case let v as YValue: return v
        default: return .undefined
        }
    }

    /// Converts a `JSONSerialization` result, telling booleans from numbers (both arrive as
    /// `NSNumber`).
    public static func fromJSONObject(_ any: Any) -> YValue {
        switch any {
        case let n as NSNumber:
            if String(cString: n.objCType) == "c" { return .bool(value: n.boolValue) }
            return .number(value: n.doubleValue)
        case let s as String: return .string(value: s)
        case is NSNull: return .null
        case let a as [Any]: return .list(items: a.map(fromJSONObject))
        case let d as [String: Any]: return .object(entries: d.mapValues(fromJSONObject))
        default: return .undefined
        }
    }

    /// JSON-compatible representation (bytes become base64url strings).
    public var jsonObject: Any {
        switch self {
        case .undefined, .null, .unsupported: return NSNull()
        case .bool(let v): return v
        case .number(let v): return v
        case .bigInt(let v): return v
        case .string(let v): return v
        case .sharedText(let t): return t
        case .bytes(let v): return Base64URL.encode(v)
        case .list(let items), .sharedArray(let items): return items.map(\.jsonObject)
        case .object(let e), .sharedMap(let e): return e.mapValues(\.jsonObject)
        }
    }
}

extension YValue: ExpressibleByStringLiteral, ExpressibleByBooleanLiteral, ExpressibleByFloatLiteral, ExpressibleByIntegerLiteral, ExpressibleByNilLiteral {
    public init(stringLiteral value: String) { self = .string(value: value) }
    public init(booleanLiteral value: Bool) { self = .bool(value: value) }
    public init(floatLiteral value: Double) { self = .number(value: value) }
    public init(integerLiteral value: Int) { self = .number(value: Double(value)) }
    public init(nilLiteral: ()) { self = .null }
}

extension XmlNode {
    public var elementName: String? {
        if case .element(let name, _, _) = self { return name }
        return nil
    }

    public var attributes: [String: YValue] {
        if case .element(_, let attributes, _) = self { return attributes }
        return [:]
    }

    public var children: [XmlNode] {
        if case .element(_, _, let children) = self { return children }
        return []
    }

    /// Concatenated text of this node and its subtree (embeds and inline atoms skipped).
    public var textContent: String {
        switch self {
        case .text(let chunks): chunks.map(\.text).joined()
        case .element(_, _, let children): children.map(\.textContent).joined()
        }
    }
}
