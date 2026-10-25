import Foundation

// MARK: - Canonical ProseMirror JSON

/// The note content as canonical ProseMirror JSON (test-vectors README, «Канонический JSON»):
/// `{ type, attrs?, content?, text?, marks? }`; null attributes are absent; marks without
/// attributes have no `attrs`. Mark order follows attribute order (not significant).
public enum ProseMirrorJSON {
    public static func document(_ nodes: [XmlNode]) -> [String: Any] {
        ["type": "doc", "content": children(nodes)]
    }

    static func children(_ nodes: [XmlNode]) -> [[String: Any]] {
        nodes.flatMap { node -> [[String: Any]] in
            switch node {
            case .text(let chunks):
                return chunks.compactMap { chunk in
                    guard chunk.embed == nil, !chunk.text.isEmpty else { return nil }
                    var out: [String: Any] = ["type": "text", "text": chunk.text]
                    let marks = chunk.attributes.sorted { $0.key < $1.key }.compactMap { key, value -> [String: Any]? in
                        guard let mark = Mark(attributeKey: key, value: value) else { return nil }
                        var m: [String: Any] = ["type": mark.name]
                        if !mark.attrs.isEmpty { m["attrs"] = mark.attrs.mapValues(\.jsonObject) }
                        return m
                    }
                    if !marks.isEmpty { out["marks"] = marks }
                    return out
                }
            case .element(let name, let attributes, let kids):
                var out: [String: Any] = ["type": name]
                if !attributes.isEmpty { out["attrs"] = attributes.mapValues(\.jsonObject) }
                let content = children(kids)
                if !content.isEmpty { out["content"] = content }
                return [out]
            }
        }
    }
}

extension NoteDocument {
    /// Canonical ProseMirror JSON of `content`.
    public func contentJSON() throws -> [String: Any] {
        ProseMirrorJSON.document(try crdt.xmlChildren())
    }

    /// Markdown export (Obsidian flavour). Margin strokes (`anchorKind: block`) add
    /// handwriting placeholders after their blocks.
    public func markdown(options: MarkdownExport.Options = .init()) throws -> String {
        var opts = options
        if opts.blocksWithHandwriting == nil {
            opts.blocksWithHandwriting = Set(strokes().filter { $0.anchorKind == .block }.compactMap(\.blockId))
        }
        return MarkdownExport.render(try blocks(), options: opts)
    }
}

// MARK: - Markdown

/// Note → Markdown (Obsidian-flavoured: `[[links]]`, `#tags`, callouts, Tasks-plugin dates).
/// Port of `packages/shared/src/document/markdown.ts`; must produce identical bytes
/// (vector `document/note.json`).
public enum MarkdownExport {
    public struct Options: Sendable {
        public var attachmentURL: @Sendable (String) -> String = { "attachment:\($0)" }
        public var handwritingURL: @Sendable (String) -> String = { "handwriting:\($0)" }
        public var noteTitle: (@Sendable (String) -> String?)?
        public var blocksWithHandwriting: Set<String>?

        public init(blocksWithHandwriting: Set<String>? = nil, noteTitle: (@Sendable (String) -> String?)? = nil) {
            self.blocksWithHandwriting = blocksWithHandwriting
            self.noteTitle = noteTitle
        }
    }

    public static func render(_ blocks: [Block], options: Options = .init()) -> String {
        let parts = blocks.compactMap { block($0, options) }
        var out = parts.joined(separator: "\n\n")
        while out.contains("\n\n\n") { out = out.replacingOccurrences(of: "\n\n\n", with: "\n\n") }
        while let last = out.last, last.isWhitespace { out.removeLast() }
        return out + "\n"
    }

    static let calloutKinds: Set<String> = ["note", "info", "success", "warning", "danger"]

    static func str(_ b: Block, _ key: String) -> String? {
        guard let v = b.attrs[key], !v.isNull else { return nil }
        switch v {
        case .string(let s): return s
        case .number(let n): return n == n.rounded() ? String(Int(n)) : String(n)
        case .bool(let x): return String(x)
        default: return nil
        }
    }

    static func num(_ b: Block, _ key: String) -> Double? { b.attrs[key]?.doubleValue }

    static func prefixLines(_ text: String, _ first: String, _ rest: String? = nil) -> String {
        let rest = rest ?? first
        return text.components(separatedBy: "\n").enumerated()
            .map { i, line in
                var l = (i == 0 ? first : rest) + line
                while let c = l.last, c == " " || c == "\t" { l.removeLast() }
                return l
            }
            .joined(separator: "\n")
    }

    static func children(_ b: Block, _ o: Options, sep: String = "\n\n") -> String {
        b.children.compactMap { block($0, o) }.joined(separator: sep)
    }

    static func block(_ b: Block, _ o: Options) -> String? {
        guard let md = body(b, o) else { return nil }
        if let id = b.blockId, o.blocksWithHandwriting?.contains(id) == true {
            return "\(md)\n\n![Рукописная заметка](\(o.handwritingURL(id)))"
        }
        return md
    }

    static func body(_ b: Block, _ o: Options) -> String? {
        switch b.type {
        case BlockType.title:
            let t = inline(b.inline, o)
            return t.isEmpty ? nil : "# \(t)"
        case BlockType.paragraph:
            return escapeBlockStart(inline(b.inline, o))
        case BlockType.heading:
            let level = Int(min(max(num(b, "level") ?? 1, 1), 3))
            return String(repeating: "#", count: level + 1) + " " + inline(b.inline, o)
        case BlockType.bulletList:
            return listItems(b, o) { _, _ in "- " }
        case BlockType.orderedList:
            let start = Int(num(b, "start") ?? 1)
            return listItems(b, o) { i, _ in "\(start + i). " }
        case BlockType.taskList:
            return listItems(b, o) { _, item in
                let state = str(item, "state")
                return "- [\(state == "done" ? "x" : state == "cancelled" ? "-" : " ")] "
            }
        case BlockType.listItem, BlockType.taskItem:
            return children(b, o)
        case BlockType.blockquote:
            return prefixLines(children(b, o), "> ")
        case BlockType.callout:
            let tone = str(b, "tone") ?? "note"
            let kind = calloutKinds.contains(tone) ? tone : "note"
            let emoji = str(b, "emoji")
            let head = "[!\(kind)]" + ((emoji?.isEmpty == false) ? " \(emoji!)" : "")
            let content = children(b, o)
            return prefixLines(content.isEmpty ? head : "\(head)\n\(content)", "> ")
        case BlockType.codeBlock:
            let text = plain(b.inline)
            let fence = text.contains("```") ? "````" : "```"
            return "\(fence)\(str(b, "language") ?? "")\n\(text)\n\(fence)"
        case BlockType.mathBlock:
            return "$$\n\(str(b, "latex") ?? "")\n$$"
        case BlockType.mermaid:
            return "```mermaid\n\(str(b, "source") ?? "")\n```"
        case BlockType.horizontalRule:
            return "---"
        case BlockType.table:
            return table(b, o)
        case BlockType.image:
            let alt = escapeText(str(b, "alt") ?? "")
            let img = str(b, "attachmentId").map { "![\(alt)](\(o.attachmentURL($0)))" } ?? ""
            if let caption = str(b, "caption"), !caption.isEmpty { return "\(img)\n*\(escapeText(caption))*" }
            return img
        case BlockType.file:
            let name = escapeText(str(b, "name") ?? "file")
            return str(b, "attachmentId").map { "[\(name)](\(o.attachmentURL($0)))" } ?? name
        case BlockType.drawing:
            return b.blockId.map { "![Рисунок](\(o.handwritingURL($0)))" }
        case BlockType.pageCard:
            return str(b, "noteId").map { id in "[[\(o.noteTitle?(id) ?? "note:\(id)")]]" }
        default:
            let content = !b.inline.isEmpty ? inline(b.inline, o) : children(b, o)
            return content.isEmpty ? "<!-- \(b.type) -->" : "<!-- \(b.type) -->\n\(content)"
        }
    }

    static func listItems(_ b: Block, _ o: Options, marker: (Int, Block) -> String) -> String {
        b.children.enumerated().map { i, item in
            let m = marker(i, item)
            var content = children(item, o, sep: "\n")
            if item.type == BlockType.taskItem {
                var dates: [String] = []
                if let s = str(item, "scheduled"), !s.isEmpty { dates.append("⏳ \(s)") }
                if let d = str(item, "deadline"), !d.isEmpty { dates.append("📅 \(d)") }
                if !dates.isEmpty {
                    if let nl = content.firstIndex(of: "\n") {
                        content = String(content[..<nl]) + " " + dates.joined(separator: " ") + String(content[nl...])
                    } else {
                        content += " " + dates.joined(separator: " ")
                    }
                }
            }
            return prefixLines(content, m, String(repeating: " ", count: m.count))
        }.joined(separator: "\n")
    }

    static func table(_ b: Block, _ o: Options) -> String {
        let rows: [[String]] = b.children.map { row in
            row.children.map { cell in
                cell.children
                    .map { p in p.type == BlockType.paragraph ? inline(p.inline, o) : (block(p, o) ?? "") }
                    .joined(separator: "<br>")
                    .replacingOccurrences(of: "|", with: "\\|")
                    .replacingOccurrences(of: "\n", with: "<br>")
            }
        }
        guard let first = rows.first else { return "" }
        let width = max(rows.map(\.count).max() ?? 1, 1)
        func line(_ cells: [String]) -> String {
            "| " + (0..<width).map { $0 < cells.count ? cells[$0] : "" }.joined(separator: " | ") + " |"
        }
        return ([line(first), line(Array(repeating: "---", count: width))] + rows.dropFirst().map(line)).joined(separator: "\n")
    }

    static func plain(_ items: [Inline]) -> String {
        items.map { item -> String in
            switch item {
            case .text(let s, _): return s
            case .node(let name, _): return name == "hardBreak" ? "\n" : ""
            }
        }.joined()
    }

    // MARK: Inline with nested marks

    static let markOrder = ["link", "bold", "italic", "strike", "underline", "highlight", "code"]

    static func key(_ m: Mark) -> String {
        m.name == "link" ? "link:\(m.attrs["href"]?.stringValue ?? "")" : m.name
    }

    static func open(_ m: Mark) -> String {
        switch m.name {
        case "bold": "**"
        case "italic": "*"
        case "strike": "~~"
        case "underline": "<u>"
        case "highlight": "=="
        case "code": "`"
        case "link": "["
        default: ""
        }
    }

    static func close(_ m: Mark) -> String {
        switch m.name {
        case "underline": "</u>"
        case "link": "](\(m.attrs["href"]?.stringValue ?? ""))"
        default: open(m)
        }
    }

    static func inline(_ items: [Inline], _ o: Options) -> String {
        var out = ""
        var stack: [Mark] = []
        func closeTo(_ depth: Int) {
            while stack.count > depth { out += close(stack.removeLast()) }
        }
        for item in items {
            var marks: [Mark] = []
            if case .text(_, let m) = item {
                marks = m.filter { markOrder.contains($0.name) }
                    .sorted { markOrder.firstIndex(of: $0.name)! < markOrder.firstIndex(of: $1.name)! }
            }
            let keys = marks.map(key)
            var keep = 0
            while keep < stack.count, keys.contains(key(stack[keep])) { keep += 1 }
            closeTo(keep)
            for m in marks where !stack.contains(where: { key($0) == key(m) }) {
                out += open(m)
                stack.append(m)
            }
            let inCode = stack.contains { $0.name == "code" }
            switch item {
            case .text(let s, _):
                out += inCode ? s : escapeText(s)
            case .node(let name, let attrs):
                switch name {
                case "noteLink":
                    let id = attrs["noteId"]?.stringValue
                    let label = attrs["label"]?.stringValue ?? id.flatMap { o.noteTitle?($0) } ?? "note:\(id ?? "")"
                    out += "[[\(label)]]"
                case "tag": out += "#\(attrs["name"]?.stringValue ?? "")"
                case "hardBreak": out += "\\\n"
                case "mention": out += attrs["label"]?.stringValue ?? ""
                default: break
                }
            }
        }
        closeTo(0)
        return out
    }

    static let escaped: Set<Character> = ["\\", "`", "*", "_", "[", "]", "<", ">", "~", "=", "#"]

    static func escapeText(_ text: String) -> String {
        var out = ""
        for c in text {
            if escaped.contains(c) { out.append("\\") }
            out.append(c)
        }
        return out
    }

    /// Escapes `- `, `+ `, `1. `, `1) ` at line starts so a paragraph stays a paragraph.
    static func escapeBlockStart(_ text: String) -> String {
        text.components(separatedBy: "\n").map { line -> String in
            let ws = line.prefix { $0 == " " || $0 == "\t" || $0.isWhitespace && $0 != "\n" }
            var rest = line.dropFirst(ws.count)
            if let f = rest.first, f == "-" || f == "+", rest.dropFirst().first?.isWhitespace == true {
                rest.removeFirst()
                return String(ws) + "\\\(f)" + rest
            }
            let digits = rest.prefix { $0.isASCII && $0.isNumber }
            if !digits.isEmpty {
                let after = rest.dropFirst(digits.count)
                if let p = after.first, p == "." || p == ")", after.dropFirst().first?.isWhitespace == true {
                    return String(ws) + digits + "\\\(p)" + after.dropFirst()
                }
            }
            return line
        }.joined(separator: "\n")
    }
}
