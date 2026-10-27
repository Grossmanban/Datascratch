import Foundation

/// Block style of the paragraph with the caret, as a format bar shows it (`spec/04-editor.md`).
public enum BlockStyle: String, CaseIterable, Sendable {
    case title, heading1, heading2, heading3, paragraph, bulletList, orderedList, taskList, quote, code, other

    public init(_ p: ProjectedParagraph) {
        switch p.kind {
        case .atom:
            self = .other
        case .text(let type):
            switch type {
            case NodeType.title: self = .title
            case NodeType.codeBlock: self = .code
            case NodeType.heading:
                switch Int(p.attrs["level"]?.numberValue ?? 1) {
                case 1: self = .heading1
                case 2: self = .heading2
                default: self = .heading3
                }
            default:
                switch p.context.marker {
                case .bullet: self = .bulletList
                case .ordered: self = .orderedList
                case .task: self = .taskList
                case nil: self = p.context.quoteDepth > 0 ? .quote : .paragraph
                }
            }
        }
    }
}

/// Formatting at the selection or caret (`EditorView.formatState`): which marks are on and the
/// block style. A mark is on for a selection when all of it has the mark; at a caret it is the mark
/// the next typed text gets (including ones switched on with nothing typed yet).
public struct FormatState: Equatable, Sendable {
    public var marks: Set<String>
    public var block: BlockStyle
    /// The selection is not empty.
    public var hasSelection: Bool

    public init(marks: Set<String> = [], block: BlockStyle = .paragraph, hasSelection: Bool = false) {
        self.marks = marks
        self.block = block
        self.hasSelection = hasSelection
    }

    public func has(_ mark: String) -> Bool { marks.contains(mark) }
}

/// One entry of the "/" block menu: same entries and wording as the web `SuggestionMenu`.
public struct SlashCommand: Hashable, Sendable {
    public var id: String
    public var title: String
    public var systemImage: String
    /// Markdown shortcut that does the same ("#", "-", "[]").
    public var hint: String?
    /// Extra words the filter matches (Russian and English).
    public var keywords: [String]
    /// Group heading ("Текст", "Списки", "Вставка").
    public var group: String

    public init(id: String, title: String, systemImage: String, hint: String? = nil, keywords: [String] = [], group: String) {
        self.id = id
        self.title = title
        self.systemImage = systemImage
        self.hint = hint
        self.keywords = keywords
        self.group = group
    }
}

public enum SlashCommands {
    public static let all: [SlashCommand] = [
        SlashCommand(id: "paragraph", title: "Текст", systemImage: "text.alignleft", keywords: ["text", "paragraph", "абзац"], group: "Текст"),
        SlashCommand(id: "heading1", title: "Заголовок 1", systemImage: "textformat.size.larger", hint: "#", keywords: ["h1", "heading", "title"], group: "Текст"),
        SlashCommand(id: "heading2", title: "Заголовок 2", systemImage: "textformat.size", hint: "##", keywords: ["h2", "heading"], group: "Текст"),
        SlashCommand(id: "heading3", title: "Заголовок 3", systemImage: "textformat.size.smaller", hint: "###", keywords: ["h3", "heading"], group: "Текст"),
        SlashCommand(id: "quote", title: "Цитата", systemImage: "text.quote", hint: ">", keywords: ["quote", "blockquote"], group: "Текст"),
        SlashCommand(id: "bulletList", title: "Список", systemImage: "list.bullet", hint: "-", keywords: ["bullet", "list", "маркированный"], group: "Списки"),
        SlashCommand(id: "orderedList", title: "Нумерованный список", systemImage: "list.number", hint: "1.", keywords: ["numbered", "ordered", "list"], group: "Списки"),
        SlashCommand(id: "taskList", title: "Задача", systemImage: "checkmark.circle", hint: "[]", keywords: ["task", "todo", "чек", "дело"], group: "Списки"),
        SlashCommand(id: "code", title: "Код", systemImage: "chevron.left.forwardslash.chevron.right", hint: "```", keywords: ["code"], group: "Вставка"),
        SlashCommand(id: "math", title: "Формула", systemImage: "function", hint: "$$", keywords: ["math", "latex", "equation"], group: "Вставка"),
        SlashCommand(id: "mermaid", title: "Диаграмма", systemImage: "point.3.connected.trianglepath.dotted", keywords: ["mermaid", "diagram", "схема"], group: "Вставка"),
        SlashCommand(id: "table", title: "Таблица", systemImage: "tablecells", keywords: ["table"], group: "Вставка"),
        SlashCommand(id: "drawing", title: "Блок рисования", systemImage: "scribble", keywords: ["drawing", "sketch", "рисунок"], group: "Вставка"),
        SlashCommand(id: "rule", title: "Разделитель", systemImage: "minus", hint: "---", keywords: ["divider", "rule", "hr", "линия"], group: "Вставка"),
        SlashCommand(id: "image", title: "Фото", systemImage: "photo", keywords: ["photo", "image", "picture", "картинка", "изображение"], group: "Вставка"),
        SlashCommand(id: "file", title: "Файл", systemImage: "doc", keywords: ["file", "attachment", "документ", "вложение"], group: "Вставка"),
    ]

    /// Entries the host carries out (it picks the photo or file); offered only when it handles them.
    public static let hostHandled: Set<String> = ["image", "file"]

    public static func command(_ id: String) -> SlashCommand? { all.first { $0.id == id } }

    /// Commands whose title or keywords start a word with `query` (case- and diacritic-insensitive).
    public static func matching(_ query: String) -> [SlashCommand] {
        let q = query.trimmingCharacters(in: .whitespaces).folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
        guard !q.isEmpty else { return all }
        return all.filter { c in
            ([c.title] + c.keywords).contains { text in
                text.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
                    .split(whereSeparator: { $0 == " " || $0 == "-" }).contains { $0.hasPrefix(q) }
            }
        }
    }

    /// An open "/" menu at the end of `text` (the paragraph up to the caret): the "/" starts the
    /// paragraph or follows a space, and the query after it has no spaces. Returns the query and
    /// the UTF-16 offset of the "/".
    public static func trigger(in text: String) -> (query: String, slashOffset: Int)? {
        let units = Array(text.utf16)
        guard let slash = units.lastIndex(of: 0x2F) else { return nil }
        if slash > 0, units[slash - 1] != 0x20, units[slash - 1] != 0xA0 { return nil }
        let after = units[(slash + 1)...]
        guard after.count <= 24, !after.contains(0x20), !after.contains(0x2F) else { return nil }
        return (String(utf16CodeUnits: Array(after), count: after.count), slash)
    }
}
