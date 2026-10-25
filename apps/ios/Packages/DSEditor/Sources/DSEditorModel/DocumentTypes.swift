import DSInk
import Foundation

public typealias BlockID = String

/// Node names from `document-model.md` §4.2.
public enum NodeType {
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

    // Inline atoms.
    public static let noteLink = "noteLink"
    public static let tag = "tag"
    public static let mention = "mention"
    public static let hardBreak = "hardBreak"

    /// Blocks whose content is inline text.
    public static let textblocks: Set<String> = [title, paragraph, heading, codeBlock]
    /// Blocks without content, shown as a single object.
    public static let atoms: Set<String> = [mathBlock, mermaid, horizontalRule, image, file, drawing, pageCard, table]
    /// List-like containers whose children are items.
    public static let lists: Set<String> = [bulletList, orderedList, taskList]
    public static let items: Set<String> = [listItem, taskItem]
}

/// Inline atom node (`noteLink`, `tag`, `hardBreak`, …).
public struct InlineAtom: Hashable, Sendable, Codable {
    public var type: String
    public var attrs: [String: JSONValue]

    public init(type: String, attrs: [String: JSONValue] = [:]) {
        self.type = type
        self.attrs = attrs
    }

    public static func noteLink(noteId: String, label: String) -> InlineAtom {
        InlineAtom(type: NodeType.noteLink, attrs: ["noteId": .string(noteId), "label": .string(label)])
    }

    public static func tag(_ name: String) -> InlineAtom { InlineAtom(type: NodeType.tag, attrs: ["name": .string(name)]) }
    public static let hardBreak = InlineAtom(type: NodeType.hardBreak)

    /// Text the atom stands for in plain-text export and search.
    public var plainText: String {
        switch type {
        case NodeType.noteLink: "[[\(attrs["label"]?.stringValue ?? "")]]"
        case NodeType.tag: "#\(attrs["name"]?.stringValue ?? "")"
        case NodeType.hardBreak: "\n"
        default: ""
        }
    }
}

/// A run of inline content with the same marks.
public enum InlineElement: Hashable, Sendable {
    case text(String, MarkSet)
    case atom(InlineAtom, MarkSet)

    public var length: Int {
        switch self {
        case .text(let s, _): s.utf16.count
        case .atom: 1
        }
    }

    public var marks: MarkSet {
        switch self {
        case .text(_, let m), .atom(_, let m): m
        }
    }
}

/// Immutable snapshot of a block node.
public struct BlockNode: Hashable, Sendable {
    public var id: BlockID
    public var type: String
    /// Node attributes other than `blockId`.
    public var attrs: [String: JSONValue]
    /// Inline content for textblocks, nil otherwise.
    public var inline: [InlineElement]?
    public var children: [BlockNode]

    public init(id: BlockID = UUIDv7.generate(), type: String, attrs: [String: JSONValue] = [:],
                inline: [InlineElement]? = nil, children: [BlockNode] = []) {
        self.id = id
        self.type = type
        // y-prosemirror does not store null attributes; absent means null (`document-model.md` §4.1).
        self.attrs = attrs.filter { $0.value != .null }
        self.inline = inline ?? (NodeType.textblocks.contains(type) ? [] : nil)
        self.children = children
    }

    public var isTextblock: Bool { NodeType.textblocks.contains(type) }

    public var plainText: String {
        if let inline {
            return inline.map { el in
                switch el {
                case .text(let s, _): s
                case .atom(let a, _): a.plainText
                }
            }.joined()
        }
        return children.map(\.plainText).joined(separator: "\n")
    }

    public var textLength: Int { inline?.reduce(0) { $0 + $1.length } ?? 0 }

    // Convenience constructors.
    public static func title(_ text: String) -> BlockNode { BlockNode(type: NodeType.title, inline: text.isEmpty ? [] : [.text(text, .empty)]) }
    public static func paragraph(_ text: String = "", marks: MarkSet = .empty) -> BlockNode {
        BlockNode(type: NodeType.paragraph, inline: text.isEmpty ? [] : [.text(text, marks)])
    }
    public static func paragraph(_ inline: [InlineElement]) -> BlockNode { BlockNode(type: NodeType.paragraph, inline: inline) }
    public static func heading(_ text: String, level: Int) -> BlockNode {
        BlockNode(type: NodeType.heading, attrs: ["level": .number(Double(level))], inline: [.text(text, .empty)])
    }
    public static func bulletList(_ items: [String]) -> BlockNode {
        BlockNode(type: NodeType.bulletList, children: items.map { BlockNode(type: NodeType.listItem, children: [.paragraph($0)]) })
    }
    public static func orderedList(_ items: [String]) -> BlockNode {
        BlockNode(type: NodeType.orderedList, attrs: ["start": 1],
                  children: items.map { BlockNode(type: NodeType.listItem, children: [.paragraph($0)]) })
    }
    public static func taskItem(_ text: String, state: String = "open", scheduled: String? = nil, deadline: String? = nil) -> BlockNode {
        BlockNode(type: NodeType.taskItem,
                  attrs: ["taskId": .string(UUIDv7.generate()), "state": .string(state),
                          "scheduled": scheduled.map { .string($0) } ?? .null,
                          "deadline": deadline.map { .string($0) } ?? .null, "completedAt": .null],
                  children: [.paragraph(text)])
    }
    public static func taskList(_ items: [BlockNode]) -> BlockNode { BlockNode(type: NodeType.taskList, children: items) }
    public static func blockquote(_ text: String) -> BlockNode { BlockNode(type: NodeType.blockquote, children: [.paragraph(text)]) }
    public static func callout(_ text: String, tone: String = "note", emoji: String? = nil) -> BlockNode {
        BlockNode(type: NodeType.callout, attrs: ["tone": .string(tone), "emoji": emoji.map { .string($0) } ?? .null],
                  children: [.paragraph(text)])
    }
    public static func code(_ text: String, language: String?) -> BlockNode {
        BlockNode(type: NodeType.codeBlock, attrs: ["language": language.map { .string($0) } ?? .null],
                  inline: text.isEmpty ? [] : [.text(text, .empty)])
    }
    public static func math(_ latex: String) -> BlockNode { BlockNode(type: NodeType.mathBlock, attrs: ["latex": .string(latex)]) }
    public static func mermaid(_ source: String) -> BlockNode { BlockNode(type: NodeType.mermaid, attrs: ["source": .string(source)]) }
    public static func rule(_ style: String = "line") -> BlockNode { BlockNode(type: NodeType.horizontalRule, attrs: ["style": .string(style)]) }
    public static func drawing(height: Double = 240) -> BlockNode { BlockNode(type: NodeType.drawing, attrs: ["height": .number(height)]) }
}

/// Document style (`meta.style`, `document-model.md` §4.3).
public struct DocumentStyle: Hashable, Sendable, Codable {
    public enum Font: String, Codable, Sendable, CaseIterable { case serif, sans, mono }
    public enum Width: String, Codable, Sendable, CaseIterable { case normal, wide, full }
    public enum Paper: String, Codable, Sendable, CaseIterable { case plain, dots, grid, lines }

    public var font: Font
    public var width: Width
    public var paper: Paper
    public var textColor: String?

    public init(font: Font = .serif, width: Width = .normal, paper: Paper = .plain, textColor: String? = nil) {
        self.font = font
        self.width = width
        self.paper = paper
        self.textColor = textColor
    }
}

/// Where a change came from. Only `.local` changes are recorded for undo.
public enum ChangeOrigin: Hashable, Sendable {
    case local
    case undo
    case redo
    case remote
    /// Local change already shown by the text view: the editor does not re-render it.
    case textInput
}

/// Coarse description of what changed in one transaction.
public struct DocumentChange: Sendable {
    public var origin: ChangeOrigin
    public var textBlocks: Set<BlockID> = []
    public var structureChanged = false
    public var strokesAdded: Set<String> = []
    public var strokesRemoved: Set<String> = []
    public var styleChanged = false

    public init(origin: ChangeOrigin) { self.origin = origin }

    public var isEmpty: Bool {
        textBlocks.isEmpty && !structureChanged && strokesAdded.isEmpty && strokesRemoved.isEmpty && !styleChanged
    }
}

/// A resolved position inside a textblock.
public struct TextPosition: Hashable, Sendable {
    public var block: BlockID
    public var offset: Int

    public init(block: BlockID, offset: Int) {
        self.block = block
        self.offset = offset
    }
}
