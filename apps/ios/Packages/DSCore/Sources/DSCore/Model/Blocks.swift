import Foundation

/// A ProseMirror mark stored as an `XmlText` formatting attribute (document-model.md §4.1).
public struct Mark: Hashable, Sendable {
    public var name: String
    public var attrs: [String: YValue]

    public init(_ name: String, _ attrs: [String: YValue] = [:]) {
        self.name = name
        self.attrs = attrs
    }

    public static let bold = Mark("bold")
    public static let italic = Mark("italic")
    public static let underline = Mark("underline")
    public static let strike = Mark("strike")
    public static let code = Mark("code")
    public static func link(_ href: String) -> Mark { Mark("link", ["href": .string(value: href)]) }
    public static func highlight(_ color: String) -> Mark { Mark("highlight", ["color": .string(value: color)]) }
    public static func textColor(_ color: String) -> Mark { Mark("textColor", ["color": .string(value: color)]) }
    public static func agentEdit(agentId: String, at: String) -> Mark {
        Mark("agentEdit", ["agentId": .string(value: agentId), "at": .string(value: at)])
    }

    /// Formatting-attribute value: the attrs object (`{}` without attrs, as y-prosemirror).
    var attributeValue: YValue { .object(entries: attrs) }

    /// Reads a formatting attribute. Accepts `{...}` (y-prosemirror) and `true` (contract v1
    /// wording). y-prosemirror names overlapping marks `name--<hash>`; the suffix is dropped.
    init?(attributeKey: String, value: YValue) {
        let name = attributeKey.components(separatedBy: "--").first ?? attributeKey
        switch value {
        case .object(let e), .sharedMap(let e): self.init(name, e)
        case .bool(true): self.init(name)
        default: return nil
        }
    }
}

extension Array where Element == Mark {
    /// Formatting attributes for an `XmlText` insert.
    public var attributes: [String: YValue] {
        Dictionary(map { ($0.name, $0.attributeValue) }, uniquingKeysWith: { _, last in last })
    }
}

/// Inline content of a text block.
public enum Inline: Hashable, Sendable {
    /// A run of text (`String` — offsets are UTF-16 in all document APIs).
    case text(String, marks: [Mark])
    /// An inline node: `noteLink`, `tag`, `hardBreak`, `mention`, or unknown.
    case node(name: String, attrs: [String: YValue])

    /// Length in UTF-16 units inside the block (inline nodes count as one, like ProseMirror).
    public var utf16Length: Int {
        switch self {
        case .text(let s, _): s.utf16.count
        case .node: 1
        }
    }

    public static func noteLink(noteId: String, label: String) -> Inline {
        .node(name: "noteLink", attrs: ["noteId": .string(value: noteId), "label": .string(value: label)])
    }

    public static func tag(_ name: String) -> Inline { .node(name: "tag", attrs: ["name": .string(value: name)]) }

    public static let hardBreak = Inline.node(name: "hardBreak", attrs: [:])
}

/// Block node names of the note schema (document-model.md §4.2).
public enum BlockType {
    public static let title = "title"
    public static let paragraph = "paragraph"
    public static let heading = "heading"
    public static let bulletList = "bulletList"
    public static let orderedList = "orderedList"
    public static let listItem = "listItem"
    public static let taskList = "taskList"
    public static let taskItem = "taskItem"
    public static let blockquote = "blockquote"
    public static let callout = "callout"
    public static let codeBlock = "codeBlock"
    public static let mathBlock = "mathBlock"
    public static let mermaid = "mermaid"
    public static let horizontalRule = "horizontalRule"
    public static let table = "table"
    public static let tableRow = "tableRow"
    public static let tableHeader = "tableHeader"
    public static let tableCell = "tableCell"
    public static let image = "image"
    public static let file = "file"
    public static let drawing = "drawing"
    public static let pageCard = "pageCard"
    public static let collection = "collection"

    /// Blocks whose content is inline (text + inline nodes).
    public static let textBlocks: Set<String> = [title, paragraph, heading, codeBlock]
    /// Atom blocks (no content).
    public static let atoms: Set<String> = [mathBlock, mermaid, horizontalRule, image, file, drawing, pageCard]
    /// All block names known to this client; anything else is preserved as is.
    public static let known: Set<String> = textBlocks.union(atoms).union([
        bulletList, orderedList, listItem, taskList, taskItem, blockquote, callout,
        table, tableRow, tableHeader, tableCell,
    ])
    /// Inline node names known to this client.
    public static let inlineNodes: Set<String> = ["noteLink", "tag", "mention", "hardBreak"]
}

/// Task state of a `taskItem`.
public enum TaskState: String, Codable, Sendable, CaseIterable {
    case open, done, cancelled
}

/// A block of the note tree.
///
/// Text blocks (`paragraph`, `heading`, `title`, `codeBlock`) have `inline` content; containers
/// (`bulletList`, `taskItem`, `blockquote`, ...) have `children`; atoms have neither.
/// Unknown block types are preserved with their raw subtree (`raw`).
public struct Block: Hashable, Sendable {
    public var type: String
    public var attrs: [String: YValue]
    public var children: [Block]
    public var inline: [Inline]
    /// The original XML for nodes this client does not understand (written back untouched).
    public var raw: XmlNode?

    public init(type: String, attrs: [String: YValue] = [:], children: [Block] = [], inline: [Inline] = []) {
        self.type = type
        self.attrs = attrs
        self.children = children
        self.inline = inline
        self.raw = nil
    }

    public var blockId: String? {
        get { attrs["blockId"]?.stringValue }
        set { attrs["blockId"] = newValue.map { .string(value: $0) } }
    }

    public var isKnown: Bool { BlockType.known.contains(type) }
    public var isTextBlock: Bool { BlockType.textBlocks.contains(type) }

    /// Plain text of the inline content (inline nodes rendered as their label).
    public var text: String {
        inline.map { item -> String in
            switch item {
            case .text(let s, _): return s
            case .node(let name, let attrs):
                switch name {
                case "noteLink": return attrs["label"]?.stringValue ?? ""
                case "tag": return "#" + (attrs["name"]?.stringValue ?? "")
                case "hardBreak": return "\n"
                default: return ""
                }
            }
        }.joined()
    }

    // MARK: Factories (assign a fresh blockId)

    public static func paragraph(_ inline: [Inline] = [], blockId: String = EntityID.make()) -> Block {
        Block(type: BlockType.paragraph, attrs: ["blockId": .string(value: blockId)], inline: inline)
    }

    public static func paragraph(_ text: String, blockId: String = EntityID.make()) -> Block {
        paragraph(text.isEmpty ? [] : [.text(text, marks: [])], blockId: blockId)
    }

    public static func title(_ text: String, blockId: String = EntityID.make()) -> Block {
        Block(type: BlockType.title, attrs: ["blockId": .string(value: blockId)], inline: text.isEmpty ? [] : [.text(text, marks: [])])
    }

    public static func heading(_ text: String, level: Int, blockId: String = EntityID.make()) -> Block {
        Block(type: BlockType.heading, attrs: ["blockId": .string(value: blockId), "level": .number(value: Double(level))],
              inline: text.isEmpty ? [] : [.text(text, marks: [])])
    }

    public static func taskItem(_ text: String, state: TaskState = .open, scheduled: String? = nil, deadline: String? = nil,
                                taskId: String = EntityID.make(), blockId: String = EntityID.make()) -> Block {
        Block(type: BlockType.taskItem, attrs: [
            "blockId": .string(value: blockId),
            "taskId": .string(value: taskId),
            "state": .string(value: state.rawValue),
            "scheduled": .optionalString(scheduled),
            "deadline": .optionalString(deadline),
            "completedAt": .null,
        ], children: [.paragraph(text)])
    }

    public static func container(_ type: String, _ children: [Block], attrs: [String: YValue] = [:], blockId: String = EntityID.make()) -> Block {
        var a = attrs
        a["blockId"] = .string(value: blockId)
        return Block(type: type, attrs: a, children: children)
    }

    public static func atom(_ type: String, attrs: [String: YValue], blockId: String = EntityID.make()) -> Block {
        var a = attrs
        a["blockId"] = .string(value: blockId)
        return Block(type: type, attrs: a)
    }
}

// MARK: - XML conversion

extension Block {
    /// Reads a block from its XML element. Returns nil for a stray text node.
    public init?(xml: XmlNode) {
        guard case .element(let name, let attributes, let children) = xml else { return nil }
        self.init(type: name, attrs: attributes)
        if !BlockType.known.contains(name) {
            raw = xml
        }
        let hasText = children.contains { if case .text = $0 { return true } else { return false } }
        if BlockType.textBlocks.contains(name) || hasText {
            inline = Block.inline(from: children)
        } else {
            self.children = children.compactMap(Block.init(xml:))
        }
    }

    static func inline(from children: [XmlNode]) -> [Inline] {
        var out: [Inline] = []
        for child in children {
            switch child {
            case .text(let chunks):
                for chunk in chunks {
                    if let embed = chunk.embed {
                        out.append(.node(name: "embed", attrs: ["value": embed]))
                        continue
                    }
                    let marks = chunk.attributes
                        .sorted { $0.key < $1.key }
                        .compactMap { Mark(attributeKey: $0.key, value: $0.value) }
                    out.append(.text(chunk.text, marks: marks))
                }
            case .element(let name, let attributes, _):
                out.append(.node(name: name, attrs: attributes))
            }
        }
        return out
    }

    /// The XML element for this block (y-prosemirror layout). Null attributes are omitted, as
    /// y-prosemirror does.
    public var xml: XmlNode {
        if let raw { return raw }
        let attributes = attrs.filter { !$0.value.isNull }
        if !inline.isEmpty || isTextBlock {
            return .element(name: type, attributes: attributes, children: Block.xml(inline: inline))
        }
        return .element(name: type, attributes: attributes, children: children.map(\.xml))
    }

    /// Consecutive text runs become one `XmlText`; inline nodes are sibling elements.
    static func xml(inline: [Inline]) -> [XmlNode] {
        var out: [XmlNode] = []
        var chunks: [TextChunk] = []
        func flush() {
            if !chunks.isEmpty { out.append(.text(chunks: chunks)) }
            chunks = []
        }
        for item in inline {
            switch item {
            case .text(let s, let marks):
                guard !s.isEmpty else { continue }
                chunks.append(TextChunk(text: s, embed: nil, attributes: marks.attributes))
            case .node(let name, let attrs):
                flush()
                out.append(.element(name: name, attributes: attrs.filter { !$0.value.isNull }, children: []))
            }
        }
        flush()
        return out
    }

    /// Depth-first walk over this block and its descendants.
    public func forEach(_ body: (Block) -> Void) {
        body(self)
        for c in children { c.forEach(body) }
    }
}
