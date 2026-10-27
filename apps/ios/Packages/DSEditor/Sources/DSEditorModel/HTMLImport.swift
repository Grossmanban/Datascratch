import DSInk
import Foundation

/// Pasted HTML (Safari, Mail, Notes, Word, Pages, Google Docs) → document blocks with the same
/// mapping as Markdown (`MarkdownImport`): headings (h1–h2 as they are, h3–h6 as level 3),
/// paragraphs, bold, italic, underline, strike, inline code, links, highlight (`<mark>`), lists
/// with nesting and checkboxes, quotes, code blocks (`<pre>`), tables with header cells and
/// alignment, horizontal rules and images (embedded `data:` images and http(s) addresses go to the
/// host as `PastedImage`s). Fonts, sizes and colours are dropped.
public enum HTMLImport {
    public static func blocks(_ html: String) -> PasteFragment {
        let root = HTMLTreeBuilder(html).build()
        var mapper = HTMLMapper()
        var blocks = mapper.blocks(root.children)
        while blocks.count > 1, let last = blocks.last, last.isEmptyParagraph { blocks.removeLast() }
        while blocks.count > 1, let first = blocks.first, first.isEmptyParagraph { blocks.removeFirst() }
        return PasteFragment(blocks: blocks, images: mapper.images)
    }
}

// MARK: - Tree

final class HTMLNode {
    let tag: String // "" for text
    var attrs: [String: String]
    var text: String
    var children: [HTMLNode] = []
    weak var parent: HTMLNode?

    init(tag: String, attrs: [String: String] = [:], text: String = "") {
        self.tag = tag
        self.attrs = attrs
        self.text = text
    }

    var isText: Bool { tag.isEmpty }

    var textContent: String {
        isText ? text : children.map { $0.tag == "br" ? "\n" : $0.textContent }.joined()
    }

    /// The inline style's declarations, lowercased (`font-weight` → `bold`).
    var style: [String: String] {
        guard let s = attrs["style"] else { return [:] }
        var out: [String: String] = [:]
        for decl in s.split(separator: ";") {
            let parts = decl.split(separator: ":", maxSplits: 1)
            guard parts.count == 2 else { continue }
            out[parts[0].trimmingCharacters(in: .whitespaces).lowercased()] = parts[1].trimmingCharacters(in: .whitespaces).lowercased()
        }
        return out
    }
}

/// A forgiving HTML tokenizer and tree builder: enough for clipboard HTML.
struct HTMLTreeBuilder {
    let source: [Character]

    init(_ html: String) { source = Array(html) }

    static let void: Set<String> = ["br", "img", "hr", "meta", "link", "input", "col", "wbr", "source", "area", "base", "param", "track", "embed"]
    static let skipped: Set<String> = ["script", "style", "head", "title", "template", "noscript", "svg", "math", "object", "iframe"]
    /// Tags whose start closes an open `<p>`.
    static let blockStarts: Set<String> = ["p", "div", "ul", "ol", "li", "table", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6",
                                           "hr", "section", "article", "header", "footer", "figure", "dl", "dt", "dd", "tr", "td", "th"]

    func build() -> HTMLNode {
        let root = HTMLNode(tag: "#root")
        var stack = [root]
        var i = 0
        var text = ""
        func flushText() {
            guard !text.isEmpty else { return }
            let node = HTMLNode(tag: "", text: Self.decodeEntities(text))
            node.parent = stack.last
            stack.last!.children.append(node)
            text = ""
        }
        func close(_ tag: String) {
            guard let k = stack.lastIndex(where: { $0.tag == tag }), k > 0 else { return }
            stack.removeSubrange(k...)
        }
        while i < source.count {
            let c = source[i]
            guard c == "<" else { text.append(c); i += 1; continue }
            // Comment, doctype, processing instruction.
            if starts(with: "<!--", at: i) {
                flushText()
                i = (find("-->", from: i + 4) ?? source.count - 3) + 3
                continue
            }
            if starts(with: "<!", at: i) || starts(with: "<?", at: i) {
                flushText()
                i = (source[i...].firstIndex(of: ">") ?? source.count - 1) + 1
                continue
            }
            guard let end = tagEnd(from: i) else { text.append(c); i += 1; continue }
            let raw = String(source[(i + 1)..<end])
            i = end + 1
            if raw.hasPrefix("/") {
                flushText()
                let name = Self.tagName(String(raw.dropFirst()))
                if name == "p" || stack.contains(where: { $0.tag == name }) { close(name) }
                continue
            }
            let name = Self.tagName(raw)
            guard !name.isEmpty, name.first!.isLetter else { text.append("<" + raw + ">"); continue }
            flushText()
            if Self.skipped.contains(name) {
                if !raw.hasSuffix("/"), let closeAt = find("</\(name)", from: i, caseInsensitive: true) {
                    i = (source[closeAt...].firstIndex(of: ">") ?? source.count - 1) + 1
                }
                continue
            }
            // Implied ends.
            if Self.blockStarts.contains(name), stack.contains(where: { $0.tag == "p" }) { close("p") }
            if name == "li", let open = stack.last(where: { ["li", "ul", "ol"].contains($0.tag) }), open.tag == "li" { close("li") }
            if name == "td" || name == "th", let open = stack.last(where: { ["td", "th", "tr", "table"].contains($0.tag) }), open.tag == "td" || open.tag == "th" { close(open.tag) }
            if name == "tr", let open = stack.last(where: { ["tr", "table"].contains($0.tag) }), open.tag == "tr" { close("tr") }
            let node = HTMLNode(tag: name, attrs: Self.attributes(raw))
            node.parent = stack.last
            stack.last!.children.append(node)
            if !Self.void.contains(name), !raw.hasSuffix("/") { stack.append(node) }
        }
        flushText()
        return root
    }

    private func starts(with s: String, at i: Int) -> Bool {
        let a = Array(s)
        guard i + a.count <= source.count else { return false }
        return Array(source[i..<(i + a.count)]) == a
    }

    private func find(_ s: String, from: Int, caseInsensitive: Bool = false) -> Int? {
        let a = Array(caseInsensitive ? s.lowercased() : s)
        var j = from
        while j + a.count <= source.count {
            let slice = source[j..<(j + a.count)]
            if (caseInsensitive ? Array(String(slice).lowercased()) : Array(slice)) == a { return j }
            j += 1
        }
        return nil
    }

    /// The `>` closing a tag that starts at `i` (quotes respected).
    private func tagEnd(from i: Int) -> Int? {
        var quote: Character?
        var j = i + 1
        guard j < source.count, source[j].isLetter || source[j] == "/" else { return nil }
        while j < source.count {
            let c = source[j]
            if let q = quote { if c == q { quote = nil } } else if c == "\"" || c == "'" { quote = c } else if c == ">" { return j }
            j += 1
        }
        return nil
    }

    static func tagName(_ raw: String) -> String {
        String(raw.prefix { !$0.isWhitespace && $0 != "/" && $0 != ">" }).lowercased()
    }

    static func attributes(_ raw: String) -> [String: String] {
        var out: [String: String] = [:]
        let s = Array(raw)
        var i = s.firstIndex(where: { $0.isWhitespace }) ?? s.count
        while i < s.count {
            while i < s.count, s[i].isWhitespace || s[i] == "/" { i += 1 }
            let nameStart = i
            while i < s.count, !s[i].isWhitespace, s[i] != "=", s[i] != "/" { i += 1 }
            let name = String(s[nameStart..<i]).lowercased()
            while i < s.count, s[i].isWhitespace { i += 1 }
            var value = ""
            if i < s.count, s[i] == "=" {
                i += 1
                while i < s.count, s[i].isWhitespace { i += 1 }
                if i < s.count, s[i] == "\"" || s[i] == "'" {
                    let q = s[i]
                    i += 1
                    let start = i
                    while i < s.count, s[i] != q { i += 1 }
                    value = String(s[start..<min(i, s.count)])
                    i += 1
                } else {
                    let start = i
                    while i < s.count, !s[i].isWhitespace { i += 1 }
                    value = String(s[start..<i])
                }
            }
            if !name.isEmpty { out[name] = decodeEntities(value) }
        }
        return out
    }

    static let entities: [String: String] = [
        "amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "nbsp": "\u{00A0}", "mdash": "—", "ndash": "–",
        "hellip": "…", "laquo": "«", "raquo": "»", "lsquo": "‘", "rsquo": "’", "ldquo": "“", "rdquo": "”", "bdquo": "„",
        "copy": "©", "reg": "®", "trade": "™", "middot": "·", "bull": "•", "times": "×", "deg": "°", "euro": "€",
        "shy": "", "zwj": "\u{200D}", "zwnj": "\u{200C}", "thinsp": "\u{2009}", "ensp": "\u{2002}", "emsp": "\u{2003}",
    ]

    static func decodeEntities(_ s: String) -> String {
        guard s.contains("&") else { return s }
        var out = ""
        var i = s.startIndex
        while i < s.endIndex {
            if s[i] == "&", let semi = s[i...].prefix(12).firstIndex(of: ";") {
                let name = String(s[s.index(after: i)..<semi])
                var decoded: String?
                if name.hasPrefix("#x") || name.hasPrefix("#X") {
                    decoded = UInt32(name.dropFirst(2), radix: 16).flatMap(Unicode.Scalar.init).map { String(Character($0)) }
                } else if name.hasPrefix("#") {
                    decoded = UInt32(name.dropFirst()).flatMap(Unicode.Scalar.init).map { String(Character($0)) }
                } else {
                    decoded = entities[name]
                }
                if let decoded {
                    out += decoded
                    i = s.index(after: semi)
                    continue
                }
            }
            out.append(s[i])
            i = s.index(after: i)
        }
        return out
    }
}

// MARK: - Mapping

struct HTMLMapper {
    private(set) var images: [PastedImage] = []

    static let headings: [String: Int] = ["h1": 1, "h2": 2, "h3": 3, "h4": 3, "h5": 3, "h6": 3]
    static let containers: Set<String> = ["#root", "html", "body", "div", "section", "article", "header", "footer", "main", "nav",
                                          "aside", "figure", "figcaption", "center", "form", "fieldset", "dl", "dd", "dt", "address",
                                          "details", "summary", "tbody", "thead", "tfoot", "span", "font"]

    /// Blocks from a list of nodes; runs of inline content become paragraphs.
    mutating func blocks(_ nodes: [HTMLNode]) -> [BlockNode] {
        var out: [BlockNode] = []
        var run: [HTMLNode] = []
        func flush(_ mapper: inout HTMLMapper) {
            if !run.isEmpty {
                out.append(contentsOf: mapper.paragraphs(run))
                run = []
            }
        }
        var k = 0
        while k < nodes.count {
            let node = nodes[k]
            // Word lists are paragraphs with `mso-list` in their style.
            if Self.isWordListItem(node) {
                flush(&self)
                var group: [HTMLNode] = []
                while k < nodes.count {
                    let n = nodes[k]
                    if Self.isWordListItem(n) { group.append(n); k += 1; continue }
                    if n.isText, n.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { k += 1; continue }
                    break
                }
                out.append(contentsOf: wordList(group))
                continue
            }
            k += 1
            if node.isText || !isBlock(node) {
                run.append(node)
                continue
            }
            flush(&self)
            out.append(contentsOf: block(node))
        }
        flush(&self)
        return out
    }

    static func isWordListItem(_ node: HTMLNode) -> Bool {
        node.tag == "p" && (node.style["mso-list"].map { $0 != "ignore" } ?? false)
    }

    /// Word list paragraphs → nested lists: the level from `mso-list: l0 level2`, numbered when
    /// the marker Word drew is a number or letter («1.», «a)»), bulleted otherwise («·», «o», «§»).
    private mutating func wordList(_ ps: [HTMLNode]) -> [BlockNode] {
        typealias Entry = (level: Int, ordered: Bool, inline: [InlineElement])
        let entries: [Entry] = ps.map { p in
            let spec = p.style["mso-list"] ?? ""
            let level = spec.range(of: #"level(\d+)"#, options: .regularExpression)
                .flatMap { Int(spec[$0].dropFirst(5)) } ?? 1
            let marker = Self.wordMarker(in: p)?.textContent.replacingOccurrences(of: "\u{00A0}", with: " ")
                .trimmingCharacters(in: .whitespaces) ?? ""
            let ordered = marker.range(of: #"^[0-9A-Za-z]{1,4}[.)]$"#, options: .regularExpression) != nil
            return (level, ordered, inline(p.children, marks: .empty).trimmed())
        }
        func build(_ i: inout Int, level: Int) -> [BlockNode] {
            var lists: [BlockNode] = []
            var items: [BlockNode] = []
            var ordered: Bool?
            func flush() {
                guard let o = ordered, !items.isEmpty else { return }
                lists.append(o ? BlockNode(type: NodeType.orderedList, attrs: ["start": 1], children: items)
                               : BlockNode(type: NodeType.bulletList, children: items))
                items = []
            }
            while i < entries.count, entries[i].level >= level {
                if entries[i].level > level {
                    let nested = build(&i, level: entries[i].level)
                    if var last = items.popLast() {
                        last.children.append(contentsOf: nested)
                        items.append(last)
                    } else {
                        items.append(BlockNode(type: NodeType.listItem, children: [.paragraph()] + nested))
                    }
                    continue
                }
                let e = entries[i]
                if let o = ordered, o != e.ordered { flush() }
                ordered = e.ordered
                items.append(BlockNode(type: NodeType.listItem, children: [.paragraph(e.inline)]))
                i += 1
            }
            flush()
            return lists
        }
        var i = 0
        var out: [BlockNode] = []
        while i < entries.count { out.append(contentsOf: build(&i, level: entries[i].level)) }
        return out
    }

    /// The marker Word drew for a list paragraph (`<span style="mso-list:Ignore">`).
    static func wordMarker(in node: HTMLNode) -> HTMLNode? {
        for c in node.children where !c.isText {
            if c.style["mso-list"] == "ignore" { return c }
            if let f = wordMarker(in: c) { return f }
        }
        return nil
    }

    /// A node that starts its own block (a div holding only inline content still does).
    private func isBlock(_ node: HTMLNode) -> Bool {
        if node.isText { return false }
        switch node.tag {
        case "html", "body", "p", "ul", "ol", "li", "blockquote", "pre", "table", "hr", "img", "h1", "h2", "h3", "h4", "h5", "h6",
             "div", "section", "article", "header", "footer", "main", "nav", "aside", "figure", "figcaption", "center",
             "form", "fieldset", "dl", "dd", "dt", "address", "details", "summary", "tr", "td", "th", "tbody", "thead", "tfoot":
            return true
        case "span", "font", "a", "b", "strong", "i", "em", "u", "s", "strike", "del", "ins", "mark", "code":
            // Inline wrappers around blocks (Google Docs wraps the whole paste in <b>).
            return node.children.contains { isBlock($0) }
        default:
            return false
        }
    }

    private mutating func block(_ node: HTMLNode) -> [BlockNode] {
        if let level = Self.headings[node.tag] {
            return [BlockNode(type: NodeType.heading, attrs: ["level": .number(Double(level))], inline: inline(node.children, marks: .empty).trimmed())]
        }
        switch node.tag {
        case "p":
            return paragraphs(node.children)
        case "hr":
            return [BlockNode(type: NodeType.horizontalRule, attrs: ["style": "line"])]
        case "img":
            return image(node).map { [$0] } ?? []
        case "figure":
            // An image with its caption.
            if let img = Self.first("img", in: node), var block = image(img) {
                if let caption = node.children.first(where: { $0.tag == "figcaption" })?.textContent
                    .trimmingCharacters(in: .whitespacesAndNewlines), !caption.isEmpty {
                    block.attrs["caption"] = .string(caption)
                }
                return [block]
            }
            return blocks(node.children)
        case "pre":
            let code = node.children.first { $0.tag == "code" }
            let language = (code?.attrs["class"] ?? node.attrs["class"] ?? "")
                .split(separator: " ").first { $0.hasPrefix("language-") || $0.hasPrefix("lang-") }
                .map { String($0.split(separator: "-", maxSplits: 1).last ?? "") }
            var text = node.textContent
            if text.hasSuffix("\n") { text.removeLast() }
            if language == "mermaid" { return [BlockNode(type: NodeType.mermaid, attrs: ["source": .string(text)])] }
            return [BlockNode(type: NodeType.codeBlock, attrs: ["language": language.map { .string($0) } ?? .null],
                              inline: text.isEmpty ? [] : [.text(text, .empty)])]
        case "blockquote":
            let children = blocks(node.children)
            return [BlockNode(type: NodeType.blockquote, children: children.isEmpty ? [.paragraph()] : children)]
        case "ul", "ol":
            return list(node)
        case "li":
            return list(HTMLNode(tag: "ul", attrs: [:]), items: [node])
        case "table":
            return table(node).map { [$0] } ?? []
        default:
            // Containers (and inline wrappers holding blocks): their content, with the wrapper's
            // marks for inline runs.
            let marks = Self.marks(of: node, base: .empty)
            if marks.isEmpty { return blocks(node.children) }
            return blocks(node.children).map { Self.adding(marks, to: $0) }
        }
    }

    /// Paragraphs from inline content: `<br><br>` and images split it.
    private mutating func paragraphs(_ nodes: [HTMLNode]) -> [BlockNode] {
        var out: [BlockNode] = []
        var current: [InlineElement] = []
        func flush() {
            let trimmed = current.trimmed()
            if !trimmed.isEmpty { out.append(.paragraph(trimmed)) }
            current = []
        }
        for el in inline(nodes, marks: .empty, imagesOut: true) {
            if case .atom(let a, _) = el, a.type == PasteFragment.pasteImageAttr {
                flush()
                if case .number(let index)? = a.attrs["index"] {
                    let img = images[Int(index)]
                    out.append(BlockNode(type: NodeType.image, attrs: [PasteFragment.pasteImageAttr: .number(index),
                                                                     "alt": img.alt.isEmpty ? .null : .string(img.alt)]))
                }
                continue
            }
            current.append(el)
        }
        flush()
        return out
    }

    private mutating func image(_ node: HTMLNode) -> BlockNode? {
        guard let source = imageSource(node) else { return nil }
        images.append(PastedImage(source: source, alt: node.attrs["alt"] ?? ""))
        let alt = node.attrs["alt"] ?? ""
        return BlockNode(type: NodeType.image, attrs: [PasteFragment.pasteImageAttr: .number(Double(images.count - 1)),
                                                      "alt": alt.isEmpty ? .null : .string(alt)])
    }

    static func first(_ tag: String, in node: HTMLNode) -> HTMLNode? {
        for c in node.children {
            if c.tag == tag { return c }
            if let f = first(tag, in: c) { return f }
        }
        return nil
    }

    /// Whether an `<img>` is skipped entirely: local Word paths (`file:`, `cid:`) cannot be read.
    static func isUnreadable(_ node: HTMLNode) -> Bool {
        let src = (node.attrs["src"] ?? "").lowercased()
        return src.hasPrefix("file:") || src.hasPrefix("cid:")
    }

    private func imageSource(_ node: HTMLNode) -> PastedImage.Source? {
        guard let src = node.attrs["src"]?.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
        if src.hasPrefix("data:image/"), let comma = src.firstIndex(of: ","), src[..<comma].hasSuffix(";base64"),
           let data = Data(base64Encoded: String(src[src.index(after: comma)...]), options: .ignoreUnknownCharacters) {
            return .data(data)
        }
        if src.hasPrefix("http://") || src.hasPrefix("https://"), let url = URL(string: src) { return .url(url) }
        return nil
    }

    // MARK: Lists

    private mutating func list(_ node: HTMLNode, items explicit: [HTMLNode]? = nil) -> [BlockNode] {
        let ordered = node.tag == "ol"
        let start = Int(node.attrs["start"] ?? "") ?? 1
        // Items, and lists placed right after an item (Google Docs nests that way): they belong to it.
        var nestedAfter: [Int: [HTMLNode]] = [:]
        var items: [HTMLNode] = []
        if let explicit {
            items = explicit
        } else {
            for child in node.children {
                if child.tag == "li" { items.append(child) }
                else if child.tag == "ul" || child.tag == "ol", !items.isEmpty { nestedAfter[items.count - 1, default: []].append(child) }
            }
        }
        var out: [BlockNode] = []
        var run: [BlockNode] = []
        // A list is a task list when every item has a checkbox (GitHub, Notion, Notes).
        let boxes = items.map { Self.checkbox(in: $0) }
        let runTask = !items.isEmpty && boxes.allSatisfy { $0 != nil }
        func flush() {
            guard !run.isEmpty else { return }
            if runTask { out.append(BlockNode(type: NodeType.taskList, children: run)) }
            else if ordered { out.append(BlockNode(type: NodeType.orderedList, attrs: ["start": .number(Double(start))], children: run)) }
            else { out.append(BlockNode(type: NodeType.bulletList, children: run)) }
            run = []
        }
        for (index, (li, box)) in zip(items, boxes).enumerated() {
            var children = blocks(li.children)
            if children.first?.type != NodeType.paragraph { children.insert(.paragraph(), at: 0) }
            for nested in nestedAfter[index] ?? [] { children.append(contentsOf: list(nested)) }
            if runTask, let checked = box {
                run.append(BlockNode(type: NodeType.taskItem,
                                     attrs: ["taskId": .string(UUIDv7.generate()), "state": .string(checked ? "done" : "open")],
                                     children: children))
            } else {
                run.append(BlockNode(type: NodeType.listItem, children: children))
            }
        }
        flush()
        return out
    }

    /// A checkbox at the start of a list item: whether it is checked.
    private static func checkbox(in li: HTMLNode) -> Bool? {
        func find(_ n: HTMLNode, depth: Int) -> HTMLNode? {
            if n.tag == "input", n.attrs["type"]?.lowercased() == "checkbox" { return n }
            guard depth < 3 else { return nil }
            for c in n.children.prefix(3) { if let f = find(c, depth: depth + 1) { return f } }
            return nil
        }
        if let input = find(li, depth: 0) { return input.attrs["checked"] != nil }
        if li.attrs["data-checked"] != nil { return li.attrs["data-checked"] == "true" }
        if let cls = li.attrs["class"], cls.contains("checked") || cls.contains("task") { return cls.contains("checked") && !cls.contains("unchecked") }
        return nil
    }

    // MARK: Tables

    private mutating func table(_ node: HTMLNode) -> BlockNode? {
        var rows: [HTMLNode] = []
        func collect(_ n: HTMLNode) {
            for c in n.children {
                if c.tag == "tr" { rows.append(c) } else if ["thead", "tbody", "tfoot"].contains(c.tag) { collect(c) }
            }
        }
        collect(node)
        let built: [BlockNode] = rows.compactMap { tr in
            let cells = tr.children.filter { $0.tag == "td" || $0.tag == "th" }
            guard !cells.isEmpty else { return nil }
            let inHead = tr.parent?.tag == "thead"
            return BlockNode(type: NodeType.tableRow, children: cells.map { cell in
                var attrs: [String: JSONValue] = ["colspan": .number(Double(Int(cell.attrs["colspan"] ?? "") ?? 1)),
                                                  "rowspan": .number(Double(Int(cell.attrs["rowspan"] ?? "") ?? 1))]
                let paragraphsAlign = cell.children.filter { !$0.isText }.compactMap { $0.attrs["align"] ?? $0.style["text-align"] }
                let common = paragraphsAlign.isEmpty || Set(paragraphsAlign).count > 1 ? nil : paragraphsAlign.first
                let align = (cell.attrs["align"] ?? cell.style["text-align"] ?? common)?.lowercased()
                if let align, ["left", "center", "right"].contains(align) { attrs["align"] = .string(align) }
                let inline = self.inline(cell.children, marks: .empty).trimmed()
                return BlockNode(type: cell.tag == "th" || inHead ? NodeType.tableHeader : NodeType.tableCell, attrs: attrs,
                                 children: [BlockNode(type: NodeType.paragraph, inline: inline)])
            })
        }
        return built.isEmpty ? nil : BlockNode(type: NodeType.table, children: built)
    }

    // MARK: Inline

    /// Marks a node adds (tags and the inline style); fonts, sizes and colours are dropped.
    static func marks(of node: HTMLNode, base: MarkSet) -> MarkSet {
        var m = base
        let style = node.style
        switch node.tag {
        case "b", "strong":
            // Google Docs wraps everything in <b style="font-weight:normal">.
            if let w = style["font-weight"], w == "normal" || Int(w).map({ $0 < 600 }) == true { break }
            m.set(MarkName.bold, MarkSet.plain)
        case "i", "em", "cite", "dfn", "var": m.set(MarkName.italic, MarkSet.plain)
        case "u", "ins": m.set(MarkName.underline, MarkSet.plain)
        case "s", "strike", "del": m.set(MarkName.strike, MarkSet.plain)
        case "code", "kbd", "samp", "tt": m.set(MarkName.code, MarkSet.plain)
        case "mark": m.set(MarkName.highlight, .object(["color": "highlight.yellow"]))
        case "a":
            if let href = node.attrs["href"], ["http://", "https://", "mailto:"].contains(where: { href.lowercased().hasPrefix($0) }) {
                m.set(MarkName.link, .object(["href": .string(href)]))
            }
        default: break
        }
        if let w = style["font-weight"] {
            if w == "bold" || w == "bolder" || (Int(w) ?? 0) >= 600 { m.set(MarkName.bold, MarkSet.plain) }
            else if node.tag == "span" || node.tag == "b", w == "normal" || (Int(w) ?? 700) < 600 { m.set(MarkName.bold, nil) }
        }
        if style["font-style"] == "italic" { m.set(MarkName.italic, MarkSet.plain) }
        if let d = style["text-decoration"] ?? style["text-decoration-line"] {
            if d.contains("underline") { m.set(MarkName.underline, MarkSet.plain) }
            if d.contains("line-through") { m.set(MarkName.strike, MarkSet.plain) }
        }
        return m
    }

    /// Adds marks to every text run of a block (an inline wrapper around block content).
    private static func adding(_ marks: MarkSet, to block: BlockNode) -> BlockNode {
        var b = block
        if let inline = b.inline, b.type != NodeType.codeBlock {
            b.inline = inline.map { el in
                switch el {
                case .text(let t, let m): .text(t, marks.merging(m))
                case .atom(let a, let m): .atom(a, marks.merging(m))
                }
            }
        }
        b.children = b.children.map { adding(marks, to: $0) }
        return b
    }

    /// Inline content; whitespace collapses like in a browser. With `imagesOut`, images come out
    /// as placeholder atoms (the caller makes image blocks of them); otherwise as their alt text.
    mutating func inline(_ nodes: [HTMLNode], marks: MarkSet, imagesOut: Bool = false) -> [InlineElement] {
        var out: [InlineElement] = []
        for node in nodes {
            if node.isText {
                // Non-breaking spaces stay (as on the web).
                let collapsed = node.text.replacingOccurrences(of: #"[ \t\r\n\f]+"#, with: " ", options: .regularExpression)
                if !collapsed.isEmpty { out.append(.text(collapsed, marks)) }
                continue
            }
            switch node.tag {
            case "br":
                out.append(.atom(.hardBreak, marks))
            case "img":
                if imagesOut, let source = imageSource(node) {
                    images.append(PastedImage(source: source, alt: node.attrs["alt"] ?? ""))
                    out.append(.atom(InlineAtom(type: PasteFragment.pasteImageAttr, attrs: ["index": .number(Double(images.count - 1))]), marks))
                } else if !Self.isUnreadable(node), let alt = node.attrs["alt"], !alt.isEmpty {
                    out.append(.text(alt, marks))
                }
            case "input":
                break
            case _ where node.style["mso-list"] == "ignore":
                break
            case "pre":
                out.append(.text(node.textContent, marks.setting(MarkName.code, MarkSet.plain)))
            default:
                if Self.headings[node.tag] != nil || ["p", "div", "li", "tr", "blockquote"].contains(node.tag) {
                    // A block inside inline content (a cell, a heading in a link): its text with a break.
                    if !out.isEmpty { out.append(.atom(.hardBreak, marks)) }
                }
                out.append(contentsOf: inline(node.children, marks: Self.marks(of: node, base: marks), imagesOut: imagesOut))
            }
        }
        return MarkdownInlineParser.merged(out)
    }
}

extension Array where Element == InlineElement {
    /// Without leading and trailing spaces and breaks; runs merged.
    func trimmed() -> [InlineElement] {
        var items = MarkdownInlineParser.merged(self)
        while case .atom(let a, _)? = items.first, a.type == NodeType.hardBreak { items.removeFirst() }
        while case .atom(let a, _)? = items.last, a.type == NodeType.hardBreak { items.removeLast() }
        if case .text(let t, let m)? = items.first {
            let s = String(t.drop { $0 == " " })
            if s.isEmpty { items.removeFirst() } else { items[0] = .text(s, m) }
        }
        if case .text(let t, let m)? = items.last {
            var s = t
            while s.hasSuffix(" ") { s.removeLast() }
            if s.isEmpty { items.removeLast() } else { items[items.count - 1] = .text(s, m) }
        }
        // A space at a mark boundary collapses once: "a " + " b" → "a b".
        var out: [InlineElement] = []
        for el in items {
            if case .text(let t, let m) = el, t.hasPrefix(" "), case .text(let prev, _)? = out.last, prev.hasSuffix(" ") {
                let s = String(t.dropFirst())
                if !s.isEmpty { out.append(.text(s, m)) }
                continue
            }
            out.append(el)
        }
        return out
    }
}
