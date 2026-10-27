import DSInk
import Foundation

/// Markdown → document blocks, with the block mapping of the agents' importer
/// (`packages/agents/src/doc/markdown-import.ts`): headings (levels above 3 become 3), paragraphs
/// (line breaks are hard breaks), bold, italic, strike, inline code, links, `==highlight==`,
/// `[[Title]]` (when it resolves), `#tag`, `<u>…</u>`, bullet / numbered / task lists with nesting
/// (runs of task and plain items become separate lists; `⏳`/`📅` dates; `[-]` cancelled), quotes,
/// callouts (`> [!warning] ⚠️`), fenced code (`mermaid` and `math` fences become their blocks),
/// `$$…$$` math, GFM tables with column alignment, horizontal rules.
///
/// Used for pasting Markdown text (`spec/04-editor.md`, «Вставка»).
public enum MarkdownImport {
    public struct Options {
        /// Note id for `[[Title]]`; nil keeps the literal text.
        public var resolveNoteLink: ((String) -> String?)?
        /// A paragraph that is a single `![alt](https://…)` becomes a pasted image (the host
        /// downloads it); the agents' importer keeps the alt text instead.
        public var remoteImages: Bool

        public init(resolveNoteLink: ((String) -> String?)? = nil, remoteImages: Bool = false) {
            self.resolveNoteLink = resolveNoteLink
            self.remoteImages = remoteImages
        }
    }

    public static func blocks(_ markdown: String, options: Options = Options()) -> PasteFragment {
        var parser = MarkdownBlockParser(options: options)
        let lines = markdown.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
            .components(separatedBy: "\n")
        var blocks = parser.parse(lines)
        // An empty paragraph at the end is noise.
        while blocks.count > 1, let last = blocks.last, last.isEmptyParagraph { blocks.removeLast() }
        return PasteFragment(blocks: blocks, images: parser.images)
    }

    /// Plain text that reads as Markdown: a heading, list, quote, fence, table, rule or inline
    /// formatting in a recognisable form. Ordinary prose stays plain text.
    public static func looksLikeMarkdown(_ text: String) -> Bool {
        let lines = text.components(separatedBy: .newlines)
        var score = 0
        for (i, line) in lines.enumerated() {
            let t = line.trimmingCharacters(in: .whitespaces)
            if t.range(of: #"^#{1,6}\s+\S"#, options: .regularExpression) != nil { score += 2 }
            if t.range(of: #"^([-*+]|\d{1,3}[.)])\s+\S"#, options: .regularExpression) != nil { score += 1 }
            if t.range(of: #"^[-*+]\s+\[[ xX-]\]\s"#, options: .regularExpression) != nil { score += 2 }
            if t.hasPrefix("> ") { score += 1 }
            if t.hasPrefix("```") || t.hasPrefix("~~~") || t == "$$" { score += 2 }
            if t.range(of: #"^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$"#, options: .regularExpression) != nil { score += 1 }
            if i + 1 < lines.count, t.contains("|"), MarkdownBlockParser.isDelimiterRow(lines[i + 1]) { score += 3 }
            if t.range(of: #"\*\*[^*\s][^*]*\*\*|__[^_\s][^_]*__|~~[^~\s][^~]*~~|`[^`\s][^`]*`|==[^=\s][^=]*==|\[[^\]]+\]\((https?:|mailto:)[^)]+\)"#,
                       options: .regularExpression) != nil { score += 1 }
        }
        return score >= 2
    }
}

/// Rich content to insert: blocks, plus images they refer to. An image block from a paste carries
/// `pasteImage: <index into images>` instead of an attachment id until the host stores the image.
public struct PasteFragment: Sendable {
    public var blocks: [BlockNode]
    public var images: [PastedImage]

    public init(blocks: [BlockNode], images: [PastedImage] = []) {
        self.blocks = blocks
        self.images = images
    }

    public static let pasteImageAttr = "pasteImage"
}

/// An image in pasted content: embedded bytes, or an address the host downloads.
public struct PastedImage: Hashable, Sendable {
    public enum Source: Hashable, Sendable {
        case data(Data)
        case url(URL)
    }

    public var source: Source
    public var alt: String

    public init(source: Source, alt: String = "") {
        self.source = source
        self.alt = alt
    }
}

extension BlockNode {
    var isEmptyParagraph: Bool {
        type == NodeType.paragraph && (inline ?? []).allSatisfy { el in
            if case .text(let t, _) = el { return t.trimmingCharacters(in: .whitespaces).isEmpty }
            return false
        }
    }
}

// MARK: - Blocks

struct MarkdownBlockParser {
    let options: MarkdownImport.Options
    private(set) var images: [PastedImage] = []

    init(options: MarkdownImport.Options) { self.options = options }

    static let calloutTones: [String: String] = [
        "note": "note", "info": "info", "success": "success", "warning": "warning", "danger": "danger",
        "tip": "success", "hint": "success", "check": "success", "done": "success",
        "important": "info", "abstract": "info", "summary": "info", "tldr": "info", "todo": "info",
        "question": "info", "help": "info", "faq": "info",
        "caution": "warning", "attention": "warning",
        "error": "danger", "failure": "danger", "fail": "danger", "missing": "danger", "bug": "danger",
        "example": "note", "quote": "note", "cite": "note",
    ]

    static func isDelimiterRow(_ line: String) -> Bool {
        let t = line.trimmingCharacters(in: .whitespaces)
        guard t.contains("-") else { return false }
        return t.range(of: #"^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$"#, options: .regularExpression) != nil
    }

    private static func match(_ line: String, _ pattern: String) -> [String]? {
        guard let re = try? NSRegularExpression(pattern: pattern) else { return nil }
        let ns = line as NSString
        guard let m = re.firstMatch(in: line, range: NSRange(location: 0, length: ns.length)) else { return nil }
        return (0..<m.numberOfRanges).map { i in
            let r = m.range(at: i)
            return r.location == NSNotFound ? "" : ns.substring(with: r)
        }
    }

    private static func isBlank(_ line: String) -> Bool { line.trimmingCharacters(in: .whitespaces).isEmpty }

    private static func fence(_ line: String) -> (marker: String, info: String)? {
        guard let m = match(line, #"^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)[^`]*$"#) else { return nil }
        return (m[1], m[2])
    }

    private static func heading(_ line: String) -> (level: Int, text: String)? {
        guard let m = match(line, #"^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$"#) else { return nil }
        return (m[1].count, m[2])
    }

    private static func isRule(_ line: String) -> Bool {
        match(line, #"^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$"#) != nil
    }

    /// A list item marker: indent, marker, content column, rest of the line.
    private static func listMarker(_ line: String) -> (indent: Int, ordered: Bool, start: Int, bullet: Character, content: Int, rest: String)? {
        guard let m = match(line, #"^( *)([-*+]|(\d{1,9})([.)]))([ \t]+|$)(.*)$"#) else { return nil }
        let indent = m[1].count
        let ordered = !m[3].isEmpty
        let spaces = m[5].count
        let content = indent + m[2].count + (spaces == 0 ? 1 : min(spaces, 4))
        return (indent, ordered, Int(m[3]) ?? 1, ordered ? Character(m[4]) : Character(m[2]), content, m[6])
    }

    private static func quoteContent(_ line: String) -> String? {
        guard let m = match(line, #"^ {0,3}> ?(.*)$"#) else { return nil }
        return m[1]
    }

    /// Starts a block that interrupts a paragraph.
    private static func interruptsParagraph(_ line: String) -> Bool {
        if heading(line) != nil || fence(line) != nil || isRule(line) || quoteContent(line) != nil { return true }
        if line.trimmingCharacters(in: .whitespaces).hasPrefix("$$") { return true }
        if let l = listMarker(line), !l.rest.trimmingCharacters(in: .whitespaces).isEmpty, l.indent < 4, !l.ordered || l.start == 1 { return true }
        return false
    }

    mutating func parse(_ lines: [String]) -> [BlockNode] {
        var out: [BlockNode] = []
        var i = 0
        while i < lines.count {
            let line = lines[i]
            if Self.isBlank(line) { i += 1; continue }

            if let f = Self.fence(line) {
                var body: [String] = []
                i += 1
                while i < lines.count {
                    let l = lines[i].trimmingCharacters(in: .whitespaces)
                    if l.hasPrefix(f.marker), l.allSatisfy({ $0 == f.marker.first }) { i += 1; break }
                    body.append(lines[i])
                    i += 1
                }
                out.append(Self.codeBlock(info: f.info, text: body.joined(separator: "\n")))
                continue
            }

            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("$$") {
                if trimmed.count > 4, trimmed.hasSuffix("$$") {
                    out.append(BlockNode(type: NodeType.mathBlock, attrs: ["latex": .string(String(trimmed.dropFirst(2).dropLast(2)).trimmingCharacters(in: .whitespaces))]))
                    i += 1
                    continue
                }
                var body = [String(trimmed.dropFirst(2))]
                i += 1
                while i < lines.count {
                    let l = lines[i].trimmingCharacters(in: .whitespaces)
                    if l.hasSuffix("$$") { body.append(String(l.dropLast(2))); i += 1; break }
                    body.append(lines[i])
                    i += 1
                }
                let latex = body.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                out.append(BlockNode(type: NodeType.mathBlock, attrs: ["latex": .string(latex)]))
                continue
            }

            if let h = Self.heading(line) {
                out.append(BlockNode(type: NodeType.heading, attrs: ["level": .number(Double(min(3, h.level)))],
                                     inline: inline(h.text)))
                i += 1
                continue
            }

            if Self.isRule(line) {
                out.append(BlockNode(type: NodeType.horizontalRule, attrs: ["style": "line"]))
                i += 1
                continue
            }

            if line.contains("|"), i + 1 < lines.count, Self.isDelimiterRow(lines[i + 1]) {
                var rows = [line]
                let delimiter = lines[i + 1]
                i += 2
                while i < lines.count, !Self.isBlank(lines[i]), lines[i].contains("|") {
                    rows.append(lines[i])
                    i += 1
                }
                out.append(table(header: rows[0], delimiter: delimiter, rows: Array(rows.dropFirst())))
                continue
            }

            if Self.quoteContent(line) != nil {
                var body: [String] = []
                while i < lines.count, let c = Self.quoteContent(lines[i]) {
                    body.append(c)
                    i += 1
                }
                out.append(quote(body))
                continue
            }

            if let first = Self.listMarker(line), first.indent < 4 {
                let (blocks, next) = list(lines, from: i)
                out.append(contentsOf: blocks)
                i = next
                _ = first
                continue
            }

            // Paragraph.
            var body = [line]
            i += 1
            while i < lines.count, !Self.isBlank(lines[i]), !Self.interruptsParagraph(lines[i]) {
                if lines[i].contains("|"), i + 1 < lines.count, Self.isDelimiterRow(lines[i + 1]) { break }
                body.append(lines[i])
                i += 1
            }
            out.append(paragraph(body))
        }
        return out
    }

    private static func codeBlock(info: String, text: String) -> BlockNode {
        let lang = info.lowercased()
        if lang == "mermaid" { return BlockNode(type: NodeType.mermaid, attrs: ["source": .string(text)]) }
        if ["math", "latex", "tex"].contains(lang) { return BlockNode(type: NodeType.mathBlock, attrs: ["latex": .string(text)]) }
        return BlockNode(type: NodeType.codeBlock, attrs: ["language": info.isEmpty ? .null : .string(info)],
                         inline: text.isEmpty ? [] : [.text(text, .empty)])
    }

    private mutating func paragraph(_ lines: [String]) -> BlockNode {
        let text = lines.map { $0.trimmingCharacters(in: .whitespaces) }.joined(separator: "\n")
        if options.remoteImages, let m = Self.match(text, #"^!\[([^\]]*)\]\((https?://[^)\s]+)(?:\s+"[^"]*")?\)$"#), let url = URL(string: m[2]) {
            images.append(PastedImage(source: .url(url), alt: m[1]))
            return BlockNode(type: NodeType.image, attrs: [PasteFragment.pasteImageAttr: .number(Double(images.count - 1)),
                                                          "alt": m[1].isEmpty ? .null : .string(m[1])])
        }
        if let m = Self.match(text, #"^!\[([^\]]*)\]\(attachment:([0-9a-f-]{36})(?:\s+"([^"]*)")?\)$"#) {
            return BlockNode(type: NodeType.image, attrs: ["attachmentId": .string(m[2]), "alt": .string(m[1]),
                                                          "caption": m[3].isEmpty ? .null : .string(m[3])])
        }
        return BlockNode(type: NodeType.paragraph, inline: inline(text))
    }

    private mutating func quote(_ lines: [String]) -> BlockNode {
        if let first = lines.first, let m = Self.match(first, #"^\[!([A-Za-z]+)\][+-]?[ \t]*([^\s]+)?[ \t]*(.*)$"#) {
            let tone = Self.calloutTones[m[1].lowercased()] ?? "note"
            let pictographic = m[2].unicodeScalars.contains(where: { (u: Unicode.Scalar) in u.properties.isEmoji && u.value > 0xFF })
            let emoji: String? = pictographic ? m[2] : nil
            let rest = (emoji == nil && !m[2].isEmpty ? m[2] + " " : "") + m[3]
            var body = Array(lines.dropFirst())
            if !rest.trimmingCharacters(in: .whitespaces).isEmpty { body.insert(rest, at: 0) }
            let children = parse(body)
            return BlockNode(type: NodeType.callout, attrs: ["tone": .string(tone), "emoji": emoji.map { .string($0) } ?? .null],
                             children: children.isEmpty ? [.paragraph()] : children)
        }
        let children = parse(lines)
        return BlockNode(type: NodeType.blockquote, children: children.isEmpty ? [.paragraph()] : children)
    }

    private struct Item {
        var lines: [String]
        var checked: Bool?
    }

    /// A list starting at `start`: its items (with their nested content) and the next line.
    private mutating func list(_ lines: [String], from start: Int) -> ([BlockNode], Int) {
        guard let first = Self.listMarker(lines[start]) else { return ([], start + 1) }
        var items: [Item] = []
        var i = start
        while i < lines.count, let m = Self.listMarker(lines[i]), m.indent < first.content, m.ordered == first.ordered,
              m.bullet == first.bullet || first.ordered {
            var body = [m.rest]
            let column = m.content
            i += 1
            while i < lines.count {
                let l = lines[i]
                if Self.isBlank(l) {
                    // A blank line continues the item only if indented content follows.
                    var j = i + 1
                    while j < lines.count, Self.isBlank(lines[j]) { j += 1 }
                    if j < lines.count, Self.indent(of: lines[j]) >= column { body.append(""); i += 1; continue }
                    break
                }
                if Self.indent(of: l) >= column {
                    body.append(String(l.dropFirst(min(column, Self.indent(of: l)))))
                    i += 1
                    continue
                }
                // A new item of this list, or the end of it.
                if Self.listMarker(l) != nil || Self.interruptsParagraph(l) { break }
                // Lazy continuation of the item's paragraph.
                body.append(l.trimmingCharacters(in: .whitespaces))
                i += 1
            }
            var checked: Bool?
            if let t = Self.match(body[0], #"^\[([ xX])\](?:[ \t]+(.*)|$)"#) {
                checked = t[1] != " "
                body[0] = t[2]
            }
            items.append(Item(lines: body, checked: checked))
            while i < lines.count, Self.isBlank(lines[i]) {
                // Blank lines between items of the same list.
                var j = i
                while j < lines.count, Self.isBlank(lines[j]) { j += 1 }
                if j < lines.count, let n = Self.listMarker(lines[j]), n.indent < first.content, n.ordered == first.ordered,
                   n.bullet == first.bullet || first.ordered {
                    i = j
                } else { break }
            }
        }
        // Runs of task items and plain items become separate lists.
        var out: [BlockNode] = []
        var run: [BlockNode] = []
        var runTask = false
        func flush() {
            guard !run.isEmpty else { return }
            if runTask {
                out.append(BlockNode(type: NodeType.taskList, children: run))
            } else if first.ordered {
                out.append(BlockNode(type: NodeType.orderedList, attrs: ["start": .number(Double(first.start))], children: run))
            } else {
                out.append(BlockNode(type: NodeType.bulletList, children: run))
            }
            run = []
        }
        for item in items {
            let isTask = item.checked != nil || item.lines.first?.hasPrefix("[-] ") == true
            if !run.isEmpty, isTask != runTask { flush() }
            runTask = isTask
            run.append(listItem(item, task: isTask))
        }
        flush()
        return (out, i)
    }

    private static func indent(of line: String) -> Int {
        var n = 0
        for c in line {
            if c == " " { n += 1 } else if c == "\t" { n += 4 - n % 4 } else { break }
        }
        return n
    }

    private mutating func listItem(_ item: Item, task: Bool) -> BlockNode {
        var children = parse(item.lines)
        if children.first?.type != NodeType.paragraph { children.insert(.paragraph(), at: 0) }
        guard task else { return BlockNode(type: NodeType.listItem, children: children) }
        var state = item.checked == true ? "done" : "open"
        var inl = children[0].inline ?? []
        if case .text(let t, let m)? = inl.first, t.hasPrefix("[-] ") {
            state = "cancelled"
            inl[0] = .text(String(t.dropFirst(4)), m)
        }
        // Dates in the Obsidian Tasks style: ⏳ scheduled, 📅 deadline (any order).
        var scheduled: String?
        var deadline: String?
        if case .text(var t, let m)? = inl.last {
            while let d = Self.match(t, #"^([\s\S]*?)\s*(⏳|📅)\s*(\d{4}-\d{2}-\d{2})\s*$"#) {
                if d[2] == "⏳" { scheduled = d[3] } else { deadline = d[3] }
                t = d[1]
            }
            inl[inl.count - 1] = .text(t, m)
        }
        children[0].inline = inl.filter { if case .text(let t, _) = $0 { return !t.isEmpty } else { return true } }
        return BlockNode(type: NodeType.taskItem,
                         attrs: ["taskId": .string(UUIDv7.generate()), "state": .string(state),
                                 "scheduled": scheduled.map { .string($0) } ?? .null,
                                 "deadline": deadline.map { .string($0) } ?? .null, "completedAt": .null],
                         children: children)
    }

    private static func cells(_ row: String) -> [String] {
        var t = row.trimmingCharacters(in: .whitespaces)
        if t.hasPrefix("|") { t.removeFirst() }
        if t.hasSuffix("|"), !t.hasSuffix("\\|") { t.removeLast() }
        var out: [String] = []
        var current = ""
        var escaped = false
        var inCode = false
        for c in t {
            if escaped { current.append(c); escaped = false; continue }
            if c == "\\" { escaped = true; current.append(c); continue }
            if c == "`" { inCode.toggle() }
            if c == "|", !inCode { out.append(current); current = ""; continue }
            current.append(c)
        }
        out.append(current)
        return out.map { $0.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "\\|", with: "|") }
    }

    private mutating func table(header: String, delimiter: String, rows: [String]) -> BlockNode {
        let aligns: [String?] = Self.cells(delimiter).map { d in
            switch (d.hasPrefix(":"), d.hasSuffix(":")) {
            case (true, true): "center"
            case (true, false): "left"
            case (false, true): "right"
            default: nil
            }
        }
        let columns = aligns.count
        func row(_ line: String, header: Bool) -> BlockNode {
            var texts = Self.cells(line)
            if texts.count < columns { texts += Array(repeating: "", count: columns - texts.count) }
            let cells = texts.prefix(columns).enumerated().map { c, text in
                var attrs: [String: JSONValue] = ["colspan": 1, "rowspan": 1]
                if let align = aligns[c] { attrs["align"] = .string(align) }
                return BlockNode(type: header ? NodeType.tableHeader : NodeType.tableCell, attrs: attrs,
                                 children: [BlockNode(type: NodeType.paragraph, inline: inline(text))])
            }
            return BlockNode(type: NodeType.tableRow, children: cells)
        }
        return BlockNode(type: NodeType.table, children: [row(header, header: true)] + rows.map { row($0, header: false) })
    }

    // MARK: Inline

    mutating func inline(_ text: String) -> [InlineElement] {
        var parser = MarkdownInlineParser(resolveNoteLink: options.resolveNoteLink)
        return parser.parse(text)
    }
}

// MARK: - Inline

/// Inline Markdown: escapes, code spans, verbatim `$math$`, links, autolinks, emphasis (`**`,
/// `__`, `*`, `_`, `~~`), `<u>…</u>`; then `[[Title]]`, `==highlight==` and `#tag` in plain text,
/// and line breaks as hard breaks.
struct MarkdownInlineParser {
    let resolveNoteLink: ((String) -> String?)?

    /// A run of characters with marks; `escaped` marks characters that must stay literal.
    private struct Piece {
        var text: [Character]
        var escaped: [Bool]
        var marks: MarkSet
        var atom: InlineAtom?
    }

    mutating func parse(_ text: String) -> [InlineElement] {
        let pieces = scan(Array(text), marks: .empty)
        var out: [InlineElement] = []
        var underline = false
        for p in pieces {
            if let atom = p.atom {
                out.append(.atom(atom, p.marks))
                continue
            }
            let s = String(p.text)
            // `<u>…</u>` from read_note's Markdown is the underline mark.
            if s == "<u>" { underline = true; continue }
            if s == "</u>" { underline = false; continue }
            let marks = underline ? p.marks.setting(MarkName.underline, MarkSet.plain) : p.marks
            if marks.contains(MarkName.code) {
                out.append(.text(s, marks))
            } else {
                out.append(contentsOf: specials(p.text, escaped: p.escaped, marks: marks))
            }
        }
        return Self.merged(Self.hardBreaks(out))
    }

    private static func isPunct(_ c: Character) -> Bool {
        guard let a = c.asciiValue else { return false }
        return (0x21...0x2F).contains(a) || (0x3A...0x40).contains(a) || (0x5B...0x60).contains(a) || (0x7B...0x7E).contains(a)
    }

    private func scan(_ s: [Character], marks: MarkSet) -> [Piece] {
        var out: [Piece] = []
        var text: [Character] = []
        var escaped: [Bool] = []
        func flush() {
            if !text.isEmpty { out.append(Piece(text: text, escaped: escaped, marks: marks, atom: nil)) }
            text = []
            escaped = []
        }
        var i = 0
        while i < s.count {
            let c = s[i]
            // Backslash escape.
            if c == "\\", i + 1 < s.count, Self.isPunct(s[i + 1]) {
                text.append(s[i + 1]); escaped.append(true); i += 2; continue
            }
            // Code span.
            if c == "`" {
                var n = 0
                while i + n < s.count, s[i + n] == "`" { n += 1 }
                if let end = Self.findRun(s, of: "`", count: n, from: i + n) {
                    flush()
                    var code = String(s[(i + n)..<end]).replacingOccurrences(of: "\n", with: " ")
                    if code.count > 1, code.hasPrefix(" "), code.hasSuffix(" "), code.contains(where: { $0 != " " }) {
                        code = String(code.dropFirst().dropLast())
                    }
                    out.append(Piece(text: Array(code), escaped: Array(repeating: true, count: code.count),
                                     marks: marks.setting(MarkName.code, MarkSet.plain), atom: nil))
                    i = end + n
                    continue
                }
                text.append(contentsOf: s[i..<(i + n)]); escaped.append(contentsOf: Array(repeating: false, count: n)); i += n; continue
            }
            // Inline math stays verbatim (and nothing special happens inside it).
            if c == "$", let end = Self.mathEnd(s, from: i) {
                text.append(contentsOf: s[i..<end]); escaped.append(contentsOf: Array(repeating: true, count: end - i)); i = end; continue
            }
            // Autolink.
            if c == "<", let close = s[i...].firstIndex(of: ">") {
                let inner = String(s[(i + 1)..<close])
                if inner.range(of: #"^(https?|mailto):[^\s<>]+$"#, options: .regularExpression) != nil {
                    flush()
                    out.append(Piece(text: Array(inner), escaped: Array(repeating: true, count: inner.count),
                                     marks: marks.setting(MarkName.link, .object(["href": .string(inner)])), atom: nil))
                    i = close + 1
                    continue
                }
                if inner == "u" || inner == "/u" {
                    flush()
                    out.append(Piece(text: Array("<\(inner)>"), escaped: [], marks: marks, atom: nil))
                    i = close + 1
                    continue
                }
            }
            // Image (its alt text) and link.
            if c == "[" || (c == "!" && i + 1 < s.count && s[i + 1] == "[") {
                let isImage = c == "!"
                let open = isImage ? i + 1 : i
                // `[[Title]]` is handled with the plain text.
                if !isImage, open + 1 < s.count, s[open + 1] == "[" {
                    text.append(c); escaped.append(false); i += 1; continue
                }
                if let (label, url, end) = Self.link(s, open: open) {
                    flush()
                    if isImage {
                        out.append(Piece(text: Array(label), escaped: Array(repeating: true, count: label.count), marks: marks, atom: nil))
                    } else if let m = url.range(of: #"^note:[0-9a-f-]{36}$"#, options: .regularExpression) {
                        let noteId = String(url[m].dropFirst(5))
                        out.append(Piece(text: [], escaped: [], marks: marks, atom: .noteLink(noteId: noteId, label: label)))
                    } else {
                        out.append(contentsOf: scan(Array(label), marks: marks.setting(MarkName.link, .object(["href": .string(url)]))))
                    }
                    i = end
                    continue
                }
            }
            // Emphasis and strike.
            if c == "*" || c == "_" || c == "~" {
                var n = 0
                while i + n < s.count, s[i + n] == c { n += 1 }
                if let (inner, end, mark) = emphasis(s, at: i, char: c, run: n) {
                    flush()
                    out.append(contentsOf: scan(inner, marks: marks.setting(mark.0, MarkSet.plain).merging(mark.1)))
                    i = end
                    continue
                }
                text.append(contentsOf: s[i..<(i + n)]); escaped.append(contentsOf: Array(repeating: false, count: n)); i += n; continue
            }
            text.append(c); escaped.append(false); i += 1
        }
        flush()
        return out
    }

    /// The closing run of exactly `count` `char`s after `from`.
    private static func findRun(_ s: [Character], of char: Character, count: Int, from: Int) -> Int? {
        var j = from
        while j < s.count {
            if s[j] == char {
                var n = 0
                while j + n < s.count, s[j + n] == char { n += 1 }
                if n == count { return j }
                j += n
            } else { j += 1 }
        }
        return nil
    }

    /// End (exclusive) of `$…$` or `$$…$$` starting at `i`, as the agents' importer reads it.
    private static func mathEnd(_ s: [Character], from i: Int) -> Int? {
        if i + 1 < s.count, s[i + 1] == "$" {
            var j = i + 2
            while j + 1 < s.count {
                if s[j] == "$", s[j + 1] == "$", j > i + 2 { return j + 2 }
                j += 1
            }
            return nil
        }
        guard i + 1 < s.count, s[i + 1] != " ", s[i + 1] != "$" else { return nil }
        var j = i + 1
        while j < s.count, s[j] != "\n" {
            if s[j] == "$" {
                let prev = s[j - 1]
                if j == i + 2 || (prev != " " && prev != "\\") { return j + 1 }
                return nil
            }
            j += 1
        }
        return nil
    }

    /// `[label](url "title")` with the `[` at `open`: label, url and the index after `)`.
    private static func link(_ s: [Character], open: Int) -> (String, String, Int)? {
        var depth = 0
        var j = open
        var close: Int?
        while j < s.count {
            if s[j] == "\\" { j += 2; continue }
            if s[j] == "[" { depth += 1 }
            if s[j] == "]" { depth -= 1; if depth == 0 { close = j; break } }
            j += 1
        }
        guard let close, close + 1 < s.count, s[close + 1] == "(" else { return nil }
        var k = close + 2
        var parens = 1
        while k < s.count {
            if s[k] == "(" { parens += 1 }
            if s[k] == ")" { parens -= 1; if parens == 0 { break } }
            k += 1
        }
        guard k < s.count else { return nil }
        var dest = String(s[(close + 2)..<k]).trimmingCharacters(in: .whitespaces)
        if let space = dest.firstIndex(where: { $0 == " " }), dest[space...].contains("\"") { dest = String(dest[..<space]) }
        if dest.hasPrefix("<"), dest.hasSuffix(">") { dest = String(dest.dropFirst().dropLast()) }
        return (String(s[(open + 1)..<close]), dest, k + 1)
    }

    /// An emphasis span opening at `i` with a run of `n` `char`s: its inner text, the index after
    /// the closing run, and the marks it applies.
    private func emphasis(_ s: [Character], at i: Int, char: Character, run n: Int) -> ([Character], Int, (String, MarkSet))? {
        let after = i + n < s.count ? s[i + n] : " "
        guard !after.isWhitespace else { return nil }
        if char == "_", i > 0, s[i - 1].isLetter || s[i - 1].isNumber { return nil }
        let width: Int
        let marks: (String, MarkSet)
        switch (char, n) {
        case ("~", 2): width = 2; marks = (MarkName.strike, .empty)
        case ("~", _): return nil
        case (_, 1): width = 1; marks = (MarkName.italic, .empty)
        case (_, 2): width = 2; marks = (MarkName.bold, .empty)
        default: width = 3; marks = (MarkName.bold, MarkSet([MarkName.italic: MarkSet.plain]))
        }
        var j = i + width
        while j < s.count {
            if s[j] == "\\" { j += 2; continue }
            if s[j] == "`", let end = Self.findRun(s, of: "`", count: 1, from: j + 1) { j = end + 1; continue }
            if s[j] == char {
                var m = 0
                while j + m < s.count, s[j + m] == char { m += 1 }
                let before = s[j - 1]
                let next = j + m < s.count ? s[j + m] : " "
                let closes = !before.isWhitespace && (char != "_" || !(next.isLetter || next.isNumber))
                if closes, m >= width, j > i + width {
                    return (Array(s[(i + width)..<j]), j + width, marks)
                }
                j += m
                continue
            }
            j += 1
        }
        return nil
    }

    /// `[[Title]]`, `==highlight==` and `#tag` in plain text (not where the trigger was escaped).
    private func specials(_ chars: [Character], escaped: [Bool], marks: MarkSet) -> [InlineElement] {
        var out: [InlineElement] = []
        var plain: [Character] = []
        func flush() {
            if !plain.isEmpty { out.append(.text(String(plain), marks)) }
            plain = []
        }
        var i = 0
        while i < chars.count {
            let c = chars[i]
            let lit = i < escaped.count && escaped[i]
            if !lit, c == "[", i + 1 < chars.count, chars[i + 1] == "[",
               let end = Self.close(chars, "]]", from: i + 2), end > i + 2 {
                let label = String(chars[(i + 2)..<end])
                if !label.contains("\n"), let noteId = resolveNoteLink?(label) {
                    flush()
                    out.append(.atom(.noteLink(noteId: noteId, label: label), marks))
                    i = end + 2
                    continue
                }
            }
            if !lit, c == "=", i + 1 < chars.count, chars[i + 1] == "=",
               let end = Self.close(chars, "==", from: i + 2), end > i + 2 {
                let inner = String(chars[(i + 2)..<end])
                if !inner.contains("\n"), !inner.contains("=") {
                    flush()
                    out.append(.text(inner, marks.setting(MarkName.highlight, .object(["color": "highlight.yellow"]))))
                    i = end + 2
                    continue
                }
            }
            if !lit, c == "#", i == 0 || chars[i - 1].isWhitespace || chars[i - 1] == "(" {
                var j = i + 1
                while j < chars.count, chars[j].isLetter || chars[j].isNumber || chars[j] == "_" || (j > i + 1 && (chars[j] == "/" || chars[j] == "-")) {
                    j += 1
                }
                if j > i + 1 {
                    flush()
                    out.append(.atom(.tag(String(chars[(i + 1)..<j])), marks))
                    i = j
                    continue
                }
            }
            plain.append(c)
            i += 1
        }
        flush()
        return out
    }

    private static func close(_ s: [Character], _ marker: String, from: Int) -> Int? {
        let m = Array(marker)
        var j = from
        while j + m.count <= s.count {
            if Array(s[j..<(j + m.count)]) == m { return j }
            j += 1
        }
        return nil
    }

    /// Line breaks inside a paragraph are hard breaks (not in code).
    private static func hardBreaks(_ items: [InlineElement]) -> [InlineElement] {
        var out: [InlineElement] = []
        for item in items {
            guard case .text(let t, let marks) = item, t.contains("\n"), !marks.contains(MarkName.code) else {
                out.append(item)
                continue
            }
            for (i, part) in t.components(separatedBy: "\n").enumerated() {
                if i > 0 { out.append(.atom(.hardBreak, marks)) }
                var line = part
                if i < t.components(separatedBy: "\n").count - 1, line.hasSuffix("\\") { line.removeLast() }
                if !line.isEmpty { out.append(.text(line, marks)) }
            }
        }
        return out
    }

    static func merged(_ items: [InlineElement]) -> [InlineElement] {
        var out: [InlineElement] = []
        for item in items {
            if case .text(let t, let m) = item {
                if t.isEmpty { continue }
                if case .text(let prev, let pm)? = out.last, pm == m {
                    out[out.count - 1] = .text(prev + t, m)
                    continue
                }
            }
            out.append(item)
        }
        return out
    }
}

extension MarkSet {
    func merging(_ other: MarkSet) -> MarkSet {
        var copy = self
        for (k, v) in other.values { copy.set(k, v) }
        return copy
    }
}
