import Foundation

/// Document blocks → Markdown in the agents' dialect, a port of
/// `packages/agents/src/doc/markdown-export.ts` (read_note): Obsidian callouts, Tasks-style dates,
/// `[[Title]]` note links, `==highlight==`, `<u>…</u>`, GFM tables, `$$` math, mermaid fences.
/// Plain text is backslash-escaped so that export → import gives the same text back.
///
/// Block ids (`<!-- block:ID -->`) are optional: agents need them for edit_note; voice editing
/// (D-65) sends the text without them. Handwriting is not part of this export (the agents' read_note
/// adds its own image links).
public enum MarkdownExport {
    public struct Options {
        /// Emit `<!-- block:ID -->` markers.
        public var blockIds: Bool
        /// Title of a linked note for `pageCard` blocks.
        public var noteTitle: ((String) -> String?)?

        public init(blockIds: Bool = false, noteTitle: ((String) -> String?)? = nil) {
            self.blockIds = blockIds
            self.noteTitle = noteTitle
        }
    }

    /// The Markdown body of `blocks` (a `title` block is skipped, as in read_note).
    public static func markdown(_ blocks: [BlockNode], options: Options = Options()) -> String {
        let w = Writer(options: options)
        var out: [String] = []
        for b in blocks where b.type != NodeType.title {
            out += w.block(b)
            out.append("")
        }
        var text = out.joined(separator: "\n")
        while text.contains("\n\n\n") { text = text.replacingOccurrences(of: "\n\n\n", with: "\n\n") }
        return text.trimmingCharacters(in: .whitespacesAndNewlines) + "\n"
    }

    /// Inline content; hard breaks become `\` + newline. `lineStart`: the text starts a line.
    public static func inline(_ elements: [InlineElement], lineStart: Bool = false) -> String {
        var out = ""
        var atStart = lineStart
        for el in elements {
            switch el {
            case .text(let t, let m):
                out += wrapMarks(t, m, lineStart: atStart)
            case .atom(let a, _):
                switch a.type {
                case NodeType.noteLink: out += "[[\(a.attrs["label"]?.stringValue ?? "")]]"
                case NodeType.tag: out += "#\(a.attrs["name"]?.stringValue ?? "")"
                case NodeType.hardBreak:
                    out += "\\\n"
                    atStart = true
                    continue
                default: break
                }
            }
            atStart = false
        }
        return out
    }

    // MARK: - Escaping

    /// Spans copied verbatim: inline math, `[[…]]` links and footnote references.
    nonisolated(unsafe) static let verbatim = try! NSRegularExpression(
        pattern: #"\$\$[^$]+?\$\$|\$(?=[^\s$])[^$\n]*?[^\s$\\]\$|\$[^\s$]\$|\[\[[^\]\n]{1,300}\]\]|\[\^[^\]\s]{1,100}\]"#)
    nonisolated(unsafe) private static let blockMarker = try! NSRegularExpression(pattern: #"^(\s*)([>#+-])(?=\s|$)"#)
    nonisolated(unsafe) private static let orderedMarker = try! NSRegularExpression(pattern: #"^(\s*)(\d+)([.)])(?=\s|$)"#)
    nonisolated(unsafe) private static let entity = try! NSRegularExpression(pattern: #"^&#?\w{1,32};"#)

    private static func isWord(_ c: Character?) -> Bool { c.map { $0.isLetter || $0.isNumber } ?? false }
    private static func isASCIIPunct(_ c: Character) -> Bool {
        guard let a = c.asciiValue else { return false }
        return (33...47).contains(a) || (58...64).contains(a) || (91...96).contains(a) || (123...126).contains(a)
    }

    static func escapePlain(_ text: String) -> String {
        let chars = Array(text)
        var out = ""
        for i in chars.indices {
            let c = chars[i]
            let prev: Character? = i > 0 ? chars[i - 1] : nil
            let next: Character? = i + 1 < chars.count ? chars[i + 1] : nil
            if c == "\\" {
                out += next.map(isASCIIPunct) ?? true ? "\\\\" : "\\"
            } else if "`*[]<".contains(c) {
                out += "\\" + String(c)
            } else if c == "_", !(isWord(prev) && isWord(next)) {
                out += "\\_"
            } else if c == "~" || c == "=" || c == "$", next == c || prev == c {
                out += "\\" + String(c)
            } else if c == "#", let n = next, n.isLetter || n.isNumber || n == "_", prev == nil || prev!.isWhitespace || prev == "(" {
                out += "\\#"
            } else if c == "&", isEntity(chars, at: i) {
                out += "\\&"
            } else {
                out.append(c)
            }
        }
        return out
    }

    private static func isEntity(_ chars: [Character], at i: Int) -> Bool {
        let window = String(chars[i..<min(chars.count, i + 36)])
        return entity.firstMatch(in: window, range: NSRange(location: 0, length: (window as NSString).length)) != nil
    }

    /// Escapes Markdown syntax in plain text; `lineStart` also escapes block markers.
    public static func escapeText(_ text: String, lineStart: Bool) -> String {
        let ns = text as NSString
        var out = ""
        var last = 0
        for m in verbatim.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
            out += escapePlain(ns.substring(with: NSRange(location: last, length: m.range.location - last)))
            out += ns.substring(with: m.range)
            last = m.range.location + m.range.length
        }
        out += escapePlain(ns.substring(from: last))
        if lineStart {
            out = replaceFirst(blockMarker, in: out, template: "$1\\\\$2")
            out = replaceFirst(orderedMarker, in: out, template: "$1$2\\\\$3")
        }
        return out
    }

    private static func replaceFirst(_ re: NSRegularExpression, in s: String, template: String) -> String {
        let ns = s as NSString
        guard let m = re.firstMatch(in: s, range: NSRange(location: 0, length: ns.length)) else { return s }
        return ns.replacingCharacters(in: m.range, with: re.replacementString(for: m, in: s, offset: 0, template: template))
    }

    private static func codeSpan(_ text: String) -> String {
        var longest = 0, run = 0
        for c in text {
            run = c == "`" ? run + 1 : 0
            longest = max(longest, run)
        }
        let fence = String(repeating: "`", count: longest + 1)
        let pad = text.hasPrefix("`") || text.hasSuffix("`") ? " " : ""
        return fence + pad + text + pad + fence
    }

    private static let markOrder = [MarkName.link, MarkName.bold, MarkName.italic, MarkName.strike, MarkName.underline, MarkName.highlight]

    private static func wrapMarks(_ text: String, _ marks: MarkSet, lineStart: Bool) -> String {
        guard !text.isEmpty else { return "" }
        var names: [String: JSONValue] = [:]
        for name in marks.names {
            guard let v = marks[name], v != .null, v != .bool(false) else { continue }
            names[name] = v
        }
        if names[MarkName.code] != nil { return codeSpan(text) }
        let escaped = escapeText(text, lineStart: lineStart)
        // Whitespace stays outside the emphasis markers (`** bold**` is not bold).
        let chars = Array(escaped)
        var a = 0
        while a < chars.count, chars[a].isWhitespace { a += 1 }
        if a == chars.count { return escaped }
        var b = chars.count
        while b > a, chars[b - 1].isWhitespace { b -= 1 }
        var core = String(chars[a..<b])
        for name in markOrder.reversed() {
            guard let v = names[name] else { continue }
            switch name {
            case MarkName.bold: core = "**\(core)**"
            case MarkName.italic: core = "*\(core)*"
            case MarkName.strike: core = "~~\(core)~~"
            case MarkName.underline: core = "<u>\(core)</u>"
            case MarkName.highlight: core = "==\(core)=="
            case MarkName.link:
                var href = ""
                if case .object(let o) = v, let h = o["href"]?.stringValue { href = h }
                core = "[\(core)](\(href))"
            default: break
            }
        }
        return String(chars[0..<a]) + core + String(chars[b...])
    }

    // MARK: - Blocks

    private static let tones: Set<String> = ["note", "info", "success", "warning", "danger"]

    struct Writer {
        let options: Options

        func block(_ b: BlockNode) -> [String] {
            blockLines(b).flatMap { $0.components(separatedBy: "\n") }
        }

        private func idComment(_ b: BlockNode, extra: String = "") -> String {
            options.blockIds ? " <!-- block:\(b.id)\(extra) -->" : ""
        }

        private func attr(_ b: BlockNode, _ name: String) -> String? { b.attrs[name]?.stringValue }
        private func number(_ b: BlockNode, _ name: String) -> Double? {
            if case .number(let n)? = b.attrs[name] { return n }
            return nil
        }

        private func plain(_ b: BlockNode) -> String {
            (b.inline ?? []).map { el -> String in
                switch el {
                case .text(let t, _): t
                case .atom(let a, _): a.type == NodeType.hardBreak ? "\n" : ""
                }
            }.joined()
        }

        private func blockLines(_ b: BlockNode) -> [String] {
            let idc = idComment(b)
            switch b.type {
            case NodeType.title:
                return ["# " + MarkdownExport.inline(b.inline ?? [])]
            case NodeType.paragraph:
                return [MarkdownExport.inline(b.inline ?? [], lineStart: true) + idc]
            case NodeType.heading:
                let level = Int(min(3, max(1, number(b, "level") ?? 1)))
                return [String(repeating: "#", count: level) + " " + MarkdownExport.inline(b.inline ?? []) + idc]
            case NodeType.bulletList, NodeType.orderedList, NodeType.taskList:
                let start = Int(number(b, "start") ?? 1)
                var lines: [String] = []
                for (i, item) in b.children.enumerated() {
                    lines += listItem(item, marker: b.type == NodeType.orderedList ? "\(start + i)." : "-")
                }
                return lines.isEmpty ? ["-" + idc] : lines
            case NodeType.blockquote:
                return quoted(children(b), head: idc.isEmpty ? [] : [">" + idc])
            case NodeType.callout:
                let tone = attr(b, "tone") ?? "note"
                let emoji = attr(b, "emoji")
                let head = "> [!\(MarkdownExport.tones.contains(tone) ? tone : "note")]\(emoji.map { " " + $0 } ?? "")\(idc)"
                return [head] + quoted(children(b), head: [])
            case NodeType.codeBlock:
                let lang = attr(b, "language") ?? ""
                let text = plain(b)
                let fence = text.contains("```") ? "````" : "```"
                return [fence + lang + idc] + text.components(separatedBy: "\n") + [fence]
            case NodeType.mathBlock:
                return ["$$" + idc, attr(b, "latex") ?? "", "$$"]
            case NodeType.mermaid:
                return ["```mermaid" + idc] + (attr(b, "source") ?? "").components(separatedBy: "\n") + ["```"]
            case NodeType.horizontalRule:
                return ["---" + idc]
            case NodeType.table:
                return table(b, idc: idc)
            case NodeType.image:
                let alt = attr(b, "alt") ?? ""
                let caption = attr(b, "caption")
                let id = attr(b, "attachmentId") ?? ""
                let cap = caption.map { " \"\($0.replacingOccurrences(of: "\"", with: "'"))\"" } ?? ""
                return ["![\(alt)](attachment:\(id)\(cap))" + idc]
            case NodeType.file:
                return ["[📎 \(attr(b, "name") ?? "file")](attachment:\(attr(b, "attachmentId") ?? ""))" + idc]
            case NodeType.drawing:
                return ["*(пустой рисунок)*" + idc]
            case NodeType.pageCard:
                let noteId = attr(b, "noteId") ?? ""
                let title = options.noteTitle?(noteId) ?? "документ"
                return ["📄 [[\(title)]]" + idComment(b, extra: " note:\(noteId)")]
            default:
                return ["*(неподдерживаемый блок: \(b.type))*" + idc]
            }
        }

        private func children(_ b: BlockNode) -> [String] {
            var out: [String] = []
            for (i, c) in b.children.enumerated() {
                if i > 0 { out.append("") }
                out += block(c)
            }
            return out
        }

        private func quoted(_ lines: [String], head: [String]) -> [String] {
            head + lines.map { $0.isEmpty ? ">" : "> " + $0 }
        }

        private func listItem(_ item: BlockNode, marker: String) -> [String] {
            var prefix = marker
            var extra = ""
            var dates: [String] = []
            if item.type == NodeType.taskItem {
                let state = attr(item, "state") ?? "open"
                prefix = "\(marker) [\(state == "done" ? "x" : state == "cancelled" ? "-" : " ")]"
                if let taskId = attr(item, "taskId") { extra = " task:\(taskId)" }
                if let s = attr(item, "scheduled") { dates.append("⏳ \(s)") }
                if let d = attr(item, "deadline") { dates.append("📅 \(d)") }
            }
            let kids = item.children
            let first = kids.first
            let firstIsParagraph = first?.type == NodeType.paragraph
            let firstText = firstIsParagraph ? MarkdownExport.inline(first?.inline ?? []) : ""
            let indent = String(repeating: " ", count: marker.count + 1)
            var firstLines = firstText.components(separatedBy: "\n")
            let firstLine = firstLines.removeFirst()
            let head = "\(prefix) \(firstLine)\(dates.isEmpty ? "" : " " + dates.joined(separator: " "))\(idComment(item, extra: extra))"
            var rest = firstLines
            for c in firstIsParagraph ? Array(kids.dropFirst()) : kids { rest += block(c) }
            return [head] + rest.map { $0.isEmpty ? $0 : indent + $0 }
        }

        private func table(_ b: BlockNode, idc: String) -> [String] {
            let rows: [[String]] = b.children.map { row in
                row.children.map { cell in
                    cell.children.map { MarkdownExport.inline($0.inline ?? []).replacingOccurrences(of: "\\\n", with: "<br>") }
                        .joined(separator: "<br>")
                        .replacingOccurrences(of: "|", with: "\\|")
                }
            }
            guard let firstRow = rows.first else { return ["|  |" + idc] }
            let width = rows.map(\.count).max() ?? 0
            func line(_ r: [String]) -> String {
                "| " + (0..<width).map { $0 < r.count ? r[$0] : "" }.joined(separator: " | ") + " |"
            }
            let cells = b.children.first?.children ?? []
            let align = (0..<width).map { i -> String in
                switch (i < cells.count ? attr(cells[i], "align") : nil) ?? "" {
                case "center": " :---: |"
                case "right": " ---: |"
                case "left": " :--- |"
                default: " --- |"
                }
            }
            var out = [line(firstRow), "|" + align.joined()]
            for r in rows.dropFirst() { out.append(line(r)) }
            if !idc.isEmpty { out.insert(idc.trimmingCharacters(in: .whitespaces), at: 0) }
            return out
        }
    }
}
