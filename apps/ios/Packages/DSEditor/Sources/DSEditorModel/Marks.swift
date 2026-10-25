import Foundation

/// Inline marks as y-prosemirror stores them: formatting attributes on text, `name -> {attrs}`
/// (`{}` for marks without attributes; readers also accept `true`) — `document-model.md` §4.1.
public struct MarkSet: Hashable, Sendable, Codable {
    public private(set) var values: [String: JSONValue]

    public init(_ values: [String: JSONValue] = [:]) { self.values = values }

    public static let empty = MarkSet()
    /// Value written for marks without attributes.
    public static let plain: JSONValue = .object([:])

    public func contains(_ name: String) -> Bool { values[name] != nil }
    public subscript(name: String) -> JSONValue? { values[name] }
    public var isEmpty: Bool { values.isEmpty }
    public var names: [String] { values.keys.sorted() }

    public func setting(_ name: String, _ value: JSONValue?) -> MarkSet {
        var copy = self
        copy.values[name] = value
        return copy
    }

    public mutating func set(_ name: String, _ value: JSONValue?) { values[name] = value }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(values)
    }

    public init(from decoder: Decoder) throws {
        values = try decoder.singleValueContainer().decode([String: JSONValue].self)
    }
}

/// Mark names from the document contract.
public enum MarkName {
    public static let bold = "bold"
    public static let italic = "italic"
    public static let underline = "underline"
    public static let strike = "strike"
    public static let code = "code"
    public static let link = "link"
    public static let highlight = "highlight"
    public static let textColor = "textColor"
    public static let agentEdit = "agentEdit"
}
