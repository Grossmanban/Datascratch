import Foundation

/// How a flattened paragraph is decorated by the containers around it.
public enum ListMarker: Hashable, Sendable {
    case bullet
    case ordered(Int)
    case task(state: String, scheduled: String?, deadline: String?)
}

public struct CalloutInfo: Hashable, Sendable {
    public var tone: String
    public var emoji: String?
}

public struct ParagraphContext: Hashable, Sendable {
    /// Number of enclosing list items (indentation level).
    public var listDepth = 0
    /// Marker shown before the first paragraph of a list/task item; nil for continuation paragraphs.
    public var marker: ListMarker?
    /// Enclosing list or task item.
    public var itemBlockId: BlockID?
    public var quoteDepth = 0
    public var callout: CalloutInfo?
    public var calloutBlockId: BlockID?
    /// Enclosing container chain, innermost last (for commands).
    public var containers: [BlockID] = []

    public init() {}
}

public enum ParagraphKind: Hashable, Sendable {
    /// A textblock (`paragraph`, `heading`, `title`, `codeBlock`).
    case text(String)
    /// A block shown as one object (`image`, `mathBlock`, …, or an unknown node).
    case atom(String)

    public var type: String {
        switch self {
        case .text(let t), .atom(let t): t
        }
    }

    public var isText: Bool { if case .text = self { true } else { false } }
}

/// One line of the flattened document as the text view shows it.
public struct ProjectedParagraph: Hashable, Sendable {
    public var blockId: BlockID
    public var kind: ParagraphKind
    public var attrs: [String: JSONValue]
    public var context: ParagraphContext
    /// Length without the trailing paragraph separator (atoms are 1).
    public var length: Int
    /// Inline content for text paragraphs.
    public var inline: [InlineElement]
    /// The full node for atoms (tables keep their rows here).
    public var node: BlockNode?
}

/// The document flattened into paragraphs separated by one newline each, and the mapping between
/// text-view offsets and document positions.
public struct Projection: Sendable {
    public private(set) var paragraphs: [ProjectedParagraph]
    /// Start offset of each paragraph in the flattened text.
    public private(set) var starts: [Int]
    public private(set) var indexByBlock: [BlockID: Int]

    public init(paragraphs: [ProjectedParagraph]) {
        self.paragraphs = paragraphs
        var starts: [Int] = []
        starts.reserveCapacity(paragraphs.count)
        var o = 0
        var index: [BlockID: Int] = [:]
        for (i, p) in paragraphs.enumerated() {
            starts.append(o)
            o += p.length + 1
            index[p.blockId] = i
        }
        self.starts = starts
        self.indexByBlock = index
    }

    /// Total length of the flattened text (no separator after the last paragraph).
    public var length: Int {
        guard let last = paragraphs.indices.last else { return 0 }
        return starts[last] + paragraphs[last].length
    }

    public func range(ofParagraph i: Int) -> Range<Int> { starts[i]..<(starts[i] + paragraphs[i].length) }

    /// Paragraph index and offset inside it for a flattened offset (a separator maps to the end of its paragraph).
    public func position(at offset: Int) -> (index: Int, offset: Int) {
        guard !paragraphs.isEmpty else { return (0, 0) }
        let o = max(0, min(offset, length))
        var lo = 0, hi = starts.count - 1
        while lo < hi {
            let mid = (lo + hi + 1) / 2
            if starts[mid] <= o { lo = mid } else { hi = mid - 1 }
        }
        return (lo, min(o - starts[lo], paragraphs[lo].length))
    }

    public func offset(block: BlockID, offset: Int) -> Int? {
        guard let i = indexByBlock[block] else { return nil }
        return starts[i] + min(offset, paragraphs[i].length)
    }

    public func textPosition(at offset: Int) -> TextPosition? {
        let (i, o) = position(at: offset)
        guard paragraphs.indices.contains(i) else { return nil }
        return TextPosition(block: paragraphs[i].blockId, offset: o)
    }

    // MARK: Building

    public static func build(_ blocks: [BlockNode]) -> Projection {
        var out: [ProjectedParagraph] = []
        var ctx = ParagraphContext()
        flatten(blocks, ctx: &ctx, into: &out)
        if out.isEmpty {
            out.append(ProjectedParagraph(blockId: "", kind: .text(NodeType.paragraph), attrs: [:], context: ParagraphContext(),
                                          length: 0, inline: [], node: nil))
        }
        return Projection(paragraphs: out)
    }

    private static func flatten(_ nodes: [BlockNode], ctx: inout ParagraphContext, into out: inout [ProjectedParagraph]) {
        for node in nodes {
            if node.isTextblock {
                var c = ctx
                c.containers = ctx.containers
                out.append(ProjectedParagraph(blockId: node.id, kind: .text(node.type), attrs: node.attrs, context: c,
                                              length: node.textLength, inline: node.inline ?? [], node: nil))
                ctx.marker = nil
                continue
            }
            switch node.type {
            case NodeType.bulletList, NodeType.orderedList, NodeType.taskList:
                var number = Int(node.attrs["start"]?.numberValue ?? 1)
                for item in node.children {
                    var c = ctx
                    c.listDepth += 1
                    c.itemBlockId = item.id
                    c.containers.append(node.id)
                    c.containers.append(item.id)
                    switch node.type {
                    case NodeType.bulletList: c.marker = .bullet
                    case NodeType.orderedList:
                        c.marker = .ordered(number)
                        number += 1
                    default:
                        c.marker = .task(state: item.attrs["state"]?.stringValue ?? "open",
                                         scheduled: item.attrs["scheduled"]?.stringValue,
                                         deadline: item.attrs["deadline"]?.stringValue)
                    }
                    let before = out.count
                    flatten(item.children, ctx: &c, into: &out)
                    if out.count == before {
                        // An item without content still needs a line to be editable; it is shown empty.
                        continue
                    }
                }
            case NodeType.blockquote:
                var c = ctx
                c.quoteDepth += 1
                c.containers.append(node.id)
                flatten(node.children, ctx: &c, into: &out)
            case NodeType.callout:
                var c = ctx
                c.callout = CalloutInfo(tone: node.attrs["tone"]?.stringValue ?? "note", emoji: node.attrs["emoji"]?.stringValue)
                c.calloutBlockId = node.id
                c.containers.append(node.id)
                flatten(node.children, ctx: &c, into: &out)
            case NodeType.listItem, NodeType.taskItem:
                // Item outside a list (malformed); show its content.
                flatten(node.children, ctx: &ctx, into: &out)
            default:
                var c = ctx
                c.marker = nil
                out.append(ProjectedParagraph(blockId: node.id, kind: .atom(node.type), attrs: node.attrs, context: c,
                                              length: 1, inline: [], node: node))
            }
            ctx.marker = nil
        }
    }

    /// Flattened plain text: inline atoms become U+FFFC, atom blocks U+FFFC.
    public var text: String {
        var s = ""
        for (i, p) in paragraphs.enumerated() {
            if i > 0 { s += "\n" }
            if p.kind.isText {
                for el in p.inline {
                    switch el {
                    case .text(let t, _): s += t
                    case .atom: s += "\u{FFFC}"
                    }
                }
            } else {
                s += "\u{FFFC}"
            }
        }
        return s
    }
}
