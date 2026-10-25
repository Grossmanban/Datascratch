#if canImport(DSCore)
import DSCore
import Foundation

/// Converts the stand-in editor's flat `NoteBody` to the contract block tree
/// (document-model.md §4.2) and back. `#tag` and `[[Title]]` become `tag` and
/// `noteLink` inline nodes so the web client and agents see them as such.
///
/// Mapping: paragraph ↔ `paragraph`, heading1–3 ↔ `heading(level)`, consecutive
/// bullets ↔ one `bulletList` of `listItem`s, consecutive tasks ↔ one `taskList` of
/// `taskItem`s, quote ↔ `blockquote > paragraph`, divider ↔ `horizontalRule`.
/// The `NoteBlock.id` is the `blockId` of the item (`listItem`/`taskItem`/block).
nonisolated enum NoteBodyCodec {
    /// Resolves `[[Title]]` to a note id when writing (nil keeps plain text).
    typealias LinkResolver = (String) -> String?

    static func blocks(from body: NoteBody, resolveLink: LinkResolver = { _ in nil }) -> [DSCore.Block] {
        var out: [DSCore.Block] = []
        var index = 0
        let items = body.blocks
        while index < items.count {
            let item = items[index]
            switch item.kind {
            case .bullet, .task:
                let kind = item.kind
                var group: [DSCore.Block] = []
                var groupId: String?
                while index < items.count, items[index].kind == kind {
                    let current = items[index]
                    if kind == .bullet {
                        group.append(.container(BlockType.listItem, [paragraph(current, id: childId(current.id), resolveLink)],
                                                blockId: current.id))
                    } else {
                        group.append(taskItem(current, resolveLink))
                    }
                    groupId = groupId ?? listId(current.id)
                    index += 1
                }
                out.append(.container(kind == .bullet ? BlockType.bulletList : BlockType.taskList, group,
                                      blockId: groupId ?? DSCore.EntityID.make()))
                continue
            case .paragraph:
                out.append(paragraph(item, id: item.id, resolveLink))
            case .heading1, .heading2, .heading3:
                let level = item.kind == .heading1 ? 1 : item.kind == .heading2 ? 2 : 3
                var block = DSCore.Block(type: BlockType.heading,
                                         attrs: ["blockId": .string(value: item.id), "level": .number(value: Double(level))])
                block.inline = inline(item.text, resolveLink)
                out.append(block)
            case .quote:
                out.append(.container(BlockType.blockquote, [paragraph(item, id: childId(item.id), resolveLink)], blockId: item.id))
            case .divider:
                out.append(.atom(BlockType.horizontalRule, attrs: ["style": .string(value: "line")], blockId: item.id))
            }
            index += 1
        }
        return out
    }

    /// Reads the blocks after the title. Unknown blocks are skipped here (the document
    /// keeps them; `CoreLibrary` never rewrites blocks it did not produce).
    static func body(from blocks: [DSCore.Block]) -> NoteBody {
        var out: [NoteBlock] = []
        for block in blocks where block.type != BlockType.title {
            let id = block.blockId ?? DSCore.EntityID.make()
            switch block.type {
            case BlockType.paragraph:
                out.append(NoteBlock(id: id, kind: .paragraph, text: plain(block.inline), task: nil))
            case BlockType.heading:
                let level = block.attrs["level"]?.intValue ?? 1
                out.append(NoteBlock(id: id, kind: level == 1 ? .heading1 : level == 2 ? .heading2 : .heading3,
                                     text: plain(block.inline), task: nil))
            case BlockType.bulletList, BlockType.orderedList:
                for item in block.children {
                    out.append(NoteBlock(id: item.blockId ?? DSCore.EntityID.make(), kind: .bullet,
                                         text: firstText(item), task: nil))
                }
            case BlockType.taskList:
                for item in block.children where item.type == BlockType.taskItem {
                    let attrs = item.attrs
                    let task = TaskAttributes(
                        taskId: attrs["taskId"]?.stringValue ?? DSCore.EntityID.make(),
                        state: attrs["state"]?.stringValue.flatMap(TaskState.init(rawValue:)) ?? .open,
                        scheduled: attrs["scheduled"]?.stringValue,
                        deadline: attrs["deadline"]?.stringValue,
                        completedAt: attrs["completedAt"]?.stringValue.flatMap(DSCore.DSDate.parseISO))
                    out.append(NoteBlock(id: item.blockId ?? DSCore.EntityID.make(), kind: .task,
                                         text: firstText(item), task: task))
                }
            case BlockType.blockquote, BlockType.callout:
                out.append(NoteBlock(id: id, kind: .quote, text: block.children.map(firstText).joined(separator: " "), task: nil))
            case BlockType.horizontalRule:
                out.append(NoteBlock(id: id, kind: .divider, text: "", task: nil))
            default:
                continue
            }
        }
        return out.isEmpty ? .empty : NoteBody(blocks: out)
    }

    // MARK: - Pieces

    private static func paragraph(_ item: NoteBlock, id: String, _ resolve: LinkResolver) -> DSCore.Block {
        .paragraph(inline(item.text, resolve), blockId: id)
    }

    private static func taskItem(_ item: NoteBlock, _ resolve: LinkResolver) -> DSCore.Block {
        let task = item.task ?? TaskAttributes(taskId: DSCore.EntityID.make())
        var block = DSCore.Block.taskItem("", state: DSCore.TaskState(rawValue: task.state.rawValue) ?? .open,
                                          scheduled: task.scheduled, deadline: task.deadline,
                                          taskId: task.taskId, blockId: item.id)
        block.attrs["completedAt"] = .optionalString(task.completedAt.map(DSCore.DSDate.iso))
        block.children = [paragraph(item, id: childId(item.id), resolve)]
        return block
    }

    /// Stable id of the paragraph inside an item, derived from the item id so that
    /// rewriting a block does not churn ids.
    static func childId(_ id: String) -> String { derivedId(id, salt: 1) }
    static func listId(_ id: String) -> String { derivedId(id, salt: 2) }

    private static func derivedId(_ id: String, salt: UInt8) -> String {
        // Keep the UUIDv7 time prefix, vary the random tail deterministically.
        var chars = Array(id)
        guard chars.count == 36 else { return DSCore.EntityID.make() }
        let hex = Array("0123456789abcdef")
        for i in stride(from: 24, to: 36, by: 1) {
            if let v = hex.firstIndex(of: chars[i]) { chars[i] = hex[(v + Int(salt) * 7 + i) % 16] }
        }
        return String(chars)
    }

    private static func firstText(_ block: DSCore.Block) -> String {
        if block.isTextBlock { return plain(block.inline) }
        return block.children.first.map(firstText) ?? ""
    }

    /// Text with inline nodes spelled out the way the stand-in editor shows them.
    static func plain(_ inline: [DSCore.Inline]) -> String {
        inline.map { item -> String in
            switch item {
            case .text(let s, _): return s
            case .node(let name, let attrs):
                switch name {
                case "tag": return "#" + (attrs["name"]?.stringValue ?? "")
                case "noteLink": return "[[" + (attrs["label"]?.stringValue ?? "") + "]]"
                case "hardBreak": return " "
                default: return ""
                }
            }
        }.joined()
    }

    /// Splits text into runs, `tag` nodes (`#name`) and `noteLink` nodes (`[[Title]]`).
    static func inline(_ text: String, _ resolve: LinkResolver) -> [DSCore.Inline] {
        var out: [DSCore.Inline] = []
        var run = ""
        func flush() {
            if !run.isEmpty { out.append(.text(run, marks: [])) }
            run = ""
        }
        let chars = Array(text)
        var i = 0
        while i < chars.count {
            let ch = chars[i]
            if ch == "[", i + 1 < chars.count, chars[i + 1] == "[",
               let close = Self.find("]]", in: chars, from: i + 2) {
                let label = String(chars[(i + 2)..<close]).trimmingCharacters(in: .whitespaces)
                if !label.isEmpty, let noteId = resolve(label) {
                    flush()
                    out.append(.noteLink(noteId: noteId, label: label))
                    i = close + 2
                    continue
                }
            }
            if ch == "#", i == 0 || chars[i - 1].isWhitespace || chars[i - 1] == "(" {
                var j = i + 1
                while j < chars.count, chars[j].isLetter || chars[j].isNumber || "/-_".contains(chars[j]) { j += 1 }
                let name = String(chars[(i + 1)..<j]).trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased()
                if !name.isEmpty {
                    flush()
                    out.append(.tag(name))
                    i = j
                    continue
                }
            }
            run.append(ch)
            i += 1
        }
        flush()
        return out
    }

    private static func find(_ needle: String, in chars: [Character], from start: Int) -> Int? {
        let n = Array(needle)
        guard chars.count >= n.count, start <= chars.count - n.count else { return nil }
        for i in start...(chars.count - n.count) where Array(chars[i..<(i + n.count)]) == n { return i }
        return nil
    }
}
#endif
