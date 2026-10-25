import Foundation

/// Collects write operations for `CRDTDocument.transact`. Operations apply in order; each sees
/// the effects of the previous ones.
///
/// XML paths are child indices from the XML root (`[2, 0]` = first child of the third block).
/// Map paths are keys of nested shared maps (`["<noteId>"]` = the NoteMeta map).
/// Text indices are UTF-16 code units (`NSString` / `NSRange` semantics).
public struct CRDTTransaction: Sendable {
    public private(set) var ops: [YOp] = []

    public init() {}

    public mutating func append(_ op: YOp) { ops.append(op) }

    // MARK: Maps

    /// Sets `key` in the (nested) map at `path` of root map `root`.
    public mutating func set(_ root: String, _ path: [String] = [], key: String, _ value: YValue) {
        ops.append(.mapSet(root: root, path: path, key: key, value: value))
    }

    public mutating func delete(_ root: String, _ path: [String] = [], key: String) {
        ops.append(.mapDelete(root: root, path: path, key: key))
    }

    // MARK: Arrays

    public mutating func arrayInsert(_ root: String, at index: UInt32, _ items: [YValue]) {
        ops.append(.arrayInsert(root: root, index: index, items: items))
    }

    public mutating func arrayDelete(_ root: String, at index: UInt32, count: UInt32) {
        ops.append(.arrayDelete(root: root, index: index, len: count))
    }

    // MARK: XML

    public mutating func insertNodes(_ nodes: [XmlNode], into parent: [UInt32], at index: UInt32, root: String = "content") {
        ops.append(.xmlInsert(root: root, parent: parent, index: index, nodes: nodes))
    }

    public mutating func deleteNodes(in parent: [UInt32], at index: UInt32, count: UInt32 = 1, root: String = "content") {
        ops.append(.xmlDelete(root: root, parent: parent, index: index, len: count))
    }

    public mutating func setAttribute(_ key: String, _ value: YValue, at path: [UInt32], root: String = "content") {
        ops.append(.xmlSetAttribute(root: root, path: path, key: key, value: value))
    }

    public mutating func removeAttribute(_ key: String, at path: [UInt32], root: String = "content") {
        ops.append(.xmlRemoveAttribute(root: root, path: path, key: key))
    }

    /// Inserts text with exactly `marks` (marks active at `index` but absent here are not
    /// inherited).
    public mutating func insertText(_ text: String, marks: [String: YValue] = [:], at index: UInt32, in path: [UInt32], root: String = "content") {
        ops.append(.textInsert(root: root, path: path, index: index, chunks: [TextChunk(text: text, embed: nil, attributes: marks)]))
    }

    public mutating func insertChunks(_ chunks: [TextChunk], at index: UInt32, in path: [UInt32], root: String = "content") {
        ops.append(.textInsert(root: root, path: path, index: index, chunks: chunks))
    }

    public mutating func deleteText(at index: UInt32, length: UInt32, in path: [UInt32], root: String = "content") {
        ops.append(.textDelete(root: root, path: path, index: index, len: length))
    }

    /// Applies marks to a range; a `.null` value removes that mark.
    public mutating func format(at index: UInt32, length: UInt32, marks: [String: YValue], in path: [UInt32], root: String = "content") {
        ops.append(.textFormat(root: root, path: path, index: index, len: length, attributes: marks))
    }
}
