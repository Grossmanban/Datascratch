import Foundation

/// Markdown-style typing shortcuts (`# `, `- `, `1. `, `[] `, `> `, ```` ``` ````, `---`, `**bold**`, …).
@MainActor
public struct MarkdownShortcuts {
    public let commands: EditorCommands

    public init(commands: EditorCommands) { self.commands = commands }

    var document: EditorDocument { commands.document }

    /// Call after a space was typed at `pos` (caret after the space). Converts a block prefix.
    /// - Returns: new caret position when a shortcut fired.
    public func handleSpace(at pos: TextPosition) -> TextPosition? {
        guard let node = document.block(pos.block), node.type == NodeType.paragraph else { return nil }
        let text = document.flatText(of: pos.block)
        let prefix = String(text.utf16.prefix(pos.offset)) ?? ""
        guard prefix.hasSuffix(" ") else { return nil }
        let marker = String(prefix.dropLast())
        let kind: BlockKind?
        switch marker {
        case "#": kind = .heading(1)
        case "##": kind = .heading(2)
        case "###": kind = .heading(3)
        case "-", "*", "•", "+": kind = .bulletList
        case "[]", "[ ]": kind = .taskList(done: false)
        case "[x]", "[X]": kind = .taskList(done: true)
        case ">": kind = .blockquote
        case "!": kind = .callout(tone: "note")
        default:
            if marker.hasPrefix("```") {
                let lang = String(marker.dropFirst(3))
                kind = .codeBlock(language: lang.isEmpty ? nil : lang)
            } else if marker.count <= 4, marker.hasSuffix("."), let n = Int(marker.dropLast()) {
                kind = .orderedList(start: n)
            } else {
                kind = nil
            }
        }
        guard let kind else { return nil }
        let markerLength = prefix.utf16.count
        document.stopCapturing()
        document.transact {
            document.deleteText(block: pos.block, range: 0..<markerLength)
            commands.setBlockKind(kind, at: TextPosition(block: pos.block, offset: 0))
        }
        return TextPosition(block: pos.block, offset: 0)
    }

    /// Call after Return in a paragraph whose whole text is `---`, `***` or ```` ```lang ````.
    /// - Returns: caret position when the paragraph was converted.
    public func handleReturn(at pos: TextPosition) -> TextPosition? {
        guard let node = document.block(pos.block), node.type == NodeType.paragraph else { return nil }
        let text = document.flatText(of: pos.block)
        if text == "---" || text == "***" || text == "___" {
            var caret: TextPosition?
            document.transact {
                document.deleteText(block: pos.block, range: 0..<text.utf16.count)
                caret = commands.insertBlock(.rule(), after: pos)
            }
            return caret
        }
        if text.hasPrefix("```") {
            let lang = String(text.dropFirst(3)).trimmingCharacters(in: .whitespaces)
            document.transact {
                document.deleteText(block: pos.block, range: 0..<text.utf16.count)
                commands.setBlockKind(.codeBlock(language: lang.isEmpty ? nil : lang), at: TextPosition(block: pos.block, offset: 0))
            }
            return TextPosition(block: pos.block, offset: 0)
        }
        if text.hasPrefix("$$"), text.hasSuffix("$$"), text.count > 4 {
            let latex = String(text.dropFirst(2).dropLast(2))
            var caret: TextPosition?
            document.transact {
                document.deleteText(block: pos.block, range: 0..<text.utf16.count)
                caret = commands.insertBlock(.math(latex), after: pos)
            }
            return caret
        }
        return nil
    }

    /// Inline patterns, checked after a closing delimiter is typed: `**b**`, `__b__`, `*i*`, `_i_`,
    /// `` `c` ``, `~~s~~`, `==h==`. Only delimiters are deleted, so the text keeps its anchors.
    /// - Returns: caret position when a pattern fired.
    public func handleInline(at pos: TextPosition) -> TextPosition? {
        guard let node = document.block(pos.block), node.type != NodeType.codeBlock else { return nil }
        let units = Array(document.inline(of: pos.block, range: 0..<pos.offset).flatMap { el -> [UInt16] in
            switch el {
            case .text(let s, _): Array(s.utf16)
            case .atom: [0xFFFC]
            }
        })
        let patterns: [(String, String, JSONValue)] = [
            ("**", MarkName.bold, MarkSet.plain), ("__", MarkName.bold, MarkSet.plain), ("~~", MarkName.strike, MarkSet.plain),
            ("==", MarkName.highlight, .object(["color": "highlight.yellow"])),
            ("*", MarkName.italic, MarkSet.plain), ("_", MarkName.italic, MarkSet.plain), ("`", MarkName.code, MarkSet.plain),
        ]
        for (delim, mark, value) in patterns {
            let d = Array(delim.utf16)
            guard units.count > d.count * 2, Array(units.suffix(d.count)) == d else { continue }
            let end = units.count - d.count
            // Search the opening delimiter on the same paragraph.
            var start = end - 1
            var found: Int?
            while start - d.count + 1 >= 0 {
                let s = start - d.count + 1
                if Array(units[s...start]) == d {
                    found = s
                    break
                }
                start -= 1
            }
            guard let open = found else { continue }
            let innerStart = open + d.count
            guard end > innerStart else { continue }
            // Avoid `**` being taken as two `*`, and require non-space right inside delimiters.
            if d.count == 1, open > 0, units[open - 1] == d[0] { continue }
            if units[innerStart] == 0x20 || units[end - 1] == 0x20 { continue }
            document.stopCapturing()
            document.transact {
                document.deleteText(block: pos.block, range: end..<(end + d.count))
                document.setMark(mark, value: value, block: pos.block, range: innerStart..<end)
                document.deleteText(block: pos.block, range: open..<innerStart)
            }
            document.stopCapturing()
            return TextPosition(block: pos.block, offset: end - d.count)
        }
        return nil
    }
}
