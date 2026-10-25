import Foundation

/// A task from the tasks index (document-model.md §5).
public struct TaskEntry: Hashable, Sendable, Codable {
    public var noteId: String
    public var taskId: String
    public var blockId: String?
    public var text: String
    public var state: TaskState
    public var scheduled: String?
    public var deadline: String?
    public var completedAt: String?
    /// Position among the note's tasks in document order (0-based).
    public var order: Int

    public init(noteId: String, taskId: String, blockId: String?, text: String, state: TaskState, scheduled: String?, deadline: String?,
                completedAt: String?, order: Int = 0) {
        self.noteId = noteId
        self.taskId = taskId
        self.blockId = blockId
        self.text = text
        self.state = state
        self.scheduled = scheduled
        self.deadline = deadline
        self.completedAt = completedAt
        self.order = order
    }
}

/// A `[[link]]` from one note to another.
public struct NoteLinkEntry: Hashable, Sendable, Codable {
    public var sourceNoteId: String
    public var targetNoteId: String
    public var blockId: String?
    public var label: String
}

/// Data computed locally from a note (never synced: the server cannot read content).
/// Rules match `packages/shared/src/document/extract.ts` (vector `document/note.json`).
public struct NoteDerivedData: Hashable, Sendable {
    public var noteId: String
    public var title: String
    /// One line per text block (title, paragraph, heading, code) and per math/mermaid/
    /// image (alt + caption)/file (name) block — for search and previews.
    public var plainText: String
    /// Task items with both `taskId` and `blockId`.
    public var tasks: [TaskEntry]
    /// `noteLink` inline nodes and `pageCard` blocks (label "").
    public var links: [NoteLinkEntry]
    /// Tag names without `#`, unique, in order of first appearance.
    public var tags: [String]

    static let inlineTextBlocks: Set<String> = [BlockType.title, BlockType.paragraph, BlockType.heading, BlockType.codeBlock]

    public init(noteId: String, blocks: [Block]) {
        self.noteId = noteId
        var lines: [String] = []
        var tasks: [TaskEntry] = []
        var links: [NoteLinkEntry] = []
        var tags: [String] = []
        var seenTags = Set<String>()

        func nonEmpty(_ s: String?) -> String? { (s?.isEmpty ?? true) ? nil : s }

        func visitInline(_ items: [Inline], blockId: String?) {
            for item in items {
                guard case .node(let name, let attrs) = item else { continue }
                if name == "noteLink", let target = nonEmpty(attrs["noteId"]?.stringValue) {
                    links.append(NoteLinkEntry(sourceNoteId: noteId, targetNoteId: target, blockId: blockId, label: attrs["label"]?.stringValue ?? ""))
                } else if name == "tag", let tag = nonEmpty(attrs["name"]?.stringValue), seenTags.insert(tag).inserted {
                    tags.append(tag)
                }
            }
        }

        func visit(_ block: Block, enclosingBlockId: String?) {
            let blockId = block.blockId ?? enclosingBlockId
            let line: String
            switch block.type {
            case _ where Self.inlineTextBlocks.contains(block.type): line = block.text
            case BlockType.mathBlock: line = block.attrs["latex"]?.stringValue ?? ""
            case BlockType.mermaid: line = block.attrs["source"]?.stringValue ?? ""
            case BlockType.image: line = [block.attrs["alt"]?.stringValue, block.attrs["caption"]?.stringValue].compactMap(nonEmpty).joined(separator: " ")
            case BlockType.file: line = block.attrs["name"]?.stringValue ?? ""
            default: line = ""
            }
            if !line.isEmpty { lines.append(line) }
            visitInline(block.inline, blockId: blockId)
            if block.type == BlockType.pageCard, let target = nonEmpty(block.attrs["noteId"]?.stringValue) {
                links.append(NoteLinkEntry(sourceNoteId: noteId, targetNoteId: target, blockId: blockId, label: ""))
            }
            if block.type == BlockType.taskItem, let taskId = nonEmpty(block.attrs["taskId"]?.stringValue), let ownId = nonEmpty(block.blockId) {
                // Task text = its first paragraph (nested blocks are subtasks/notes).
                let text = block.children.first { $0.type == BlockType.paragraph }?.text ?? ""
                tasks.append(TaskEntry(
                    noteId: noteId, taskId: taskId, blockId: ownId, text: text,
                    state: block.attrs["state"]?.stringValue.flatMap(TaskState.init(rawValue:)) ?? .open,
                    scheduled: nonEmpty(block.attrs["scheduled"]?.stringValue),
                    deadline: nonEmpty(block.attrs["deadline"]?.stringValue),
                    completedAt: nonEmpty(block.attrs["completedAt"]?.stringValue), order: tasks.count))
            }
            for child in block.children { visit(child, enclosingBlockId: blockId) }
        }
        for block in blocks { visit(block, enclosingBlockId: nil) }

        if let first = blocks.first, first.type == BlockType.title {
            title = first.text
        } else {
            title = ""
        }
        self.plainText = lines.joined(separator: "\n")
        self.tasks = tasks
        self.links = links
        self.tags = tags
    }
}
