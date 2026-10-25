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

    public init(noteId: String, taskId: String, blockId: String?, text: String, state: TaskState, scheduled: String?, deadline: String?, completedAt: String?) {
        self.noteId = noteId
        self.taskId = taskId
        self.blockId = blockId
        self.text = text
        self.state = state
        self.scheduled = scheduled
        self.deadline = deadline
        self.completedAt = completedAt
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
public struct NoteDerivedData: Hashable, Sendable {
    public var noteId: String
    public var title: String
    /// Text of all blocks, one line per text block — for search and previews.
    public var plainText: String
    public var tasks: [TaskEntry]
    public var links: [NoteLinkEntry]
    /// Tag names without `#`, unique, in order of first appearance.
    public var tags: [String]

    public init(noteId: String, blocks: [Block]) {
        self.noteId = noteId
        var title = ""
        var lines: [String] = []
        var tasks: [TaskEntry] = []
        var links: [NoteLinkEntry] = []
        var tags: [String] = []
        var seenTags = Set<String>()

        func visit(_ block: Block, enclosingBlockId: String?) {
            let blockId = block.blockId ?? enclosingBlockId
            if block.type == BlockType.title, title.isEmpty {
                title = block.text
            }
            if !block.inline.isEmpty {
                lines.append(block.text)
                for item in block.inline {
                    guard case .node(let name, let attrs) = item else { continue }
                    if name == "noteLink", let target = attrs["noteId"]?.stringValue {
                        links.append(NoteLinkEntry(sourceNoteId: noteId, targetNoteId: target, blockId: blockId, label: attrs["label"]?.stringValue ?? ""))
                    } else if name == "tag", let tag = attrs["name"]?.stringValue, !tag.isEmpty, seenTags.insert(tag).inserted {
                        tags.append(tag)
                    }
                }
            } else {
                for attrKey in ["caption", "alt", "latex", "source", "name"] {
                    if let s = block.attrs[attrKey]?.stringValue, !s.isEmpty { lines.append(s) }
                }
            }
            if block.type == BlockType.taskItem, let taskId = block.attrs["taskId"]?.stringValue {
                // Task text = its first paragraph (nested blocks are subtasks/notes).
                let text = block.children.first.map(\.text) ?? ""
                tasks.append(TaskEntry(
                    noteId: noteId,
                    taskId: taskId,
                    blockId: block.blockId,
                    text: text,
                    state: block.attrs["state"]?.stringValue.flatMap(TaskState.init(rawValue:)) ?? .open,
                    scheduled: block.attrs["scheduled"]?.stringValue,
                    deadline: block.attrs["deadline"]?.stringValue,
                    completedAt: block.attrs["completedAt"]?.stringValue
                ))
            }
            for child in block.children { visit(child, enclosingBlockId: blockId) }
        }
        for block in blocks { visit(block, enclosingBlockId: nil) }

        self.title = title
        self.plainText = lines.joined(separator: "\n")
        self.tasks = tasks
        self.links = links
        self.tags = tags
    }
}
