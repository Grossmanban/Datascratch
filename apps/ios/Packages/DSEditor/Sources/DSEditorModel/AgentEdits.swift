import Foundation

/// Agent edits (D-10, `spec/04-editor.md`): text an agent wrote carries the `agentEdit` mark until
/// a person accepts it. Accepting removes the mark; the text stays. Shared logic, mirrored by the
/// web editor.
@MainActor
public enum AgentEdits {
    /// Text blocks with agent-marked content, in document order.
    public static func blocks(in document: EditorDocument) -> [BlockID] {
        var out: [BlockID] = []
        func walk(_ nodes: [BlockNode]) {
            for node in nodes {
                if let inline = node.inline, inline.contains(where: { $0.marks.contains(MarkName.agentEdit) }) {
                    out.append(node.id)
                }
                walk(node.children)
            }
        }
        walk(document.blocks)
        return out
    }

    public static func hasEdits(in document: EditorDocument) -> Bool { !blocks(in: document).isEmpty }

    /// Offsets of agent-marked runs in `block` (adjacent runs merged).
    public static func ranges(in document: EditorDocument, block: BlockID) -> [Range<Int>] {
        var out: [Range<Int>] = []
        var offset = 0
        for el in document.inline(of: block, range: nil) {
            let end = offset + el.length
            if el.marks.contains(MarkName.agentEdit) {
                if let last = out.last, last.upperBound == offset {
                    out[out.count - 1] = last.lowerBound..<end
                } else {
                    out.append(offset..<end)
                }
            }
            offset = end
        }
        return out
    }

    /// Accepts the agent's edits in one block (one undo step).
    public static func accept(block: BlockID, in document: EditorDocument) {
        let ranges = ranges(in: document, block: block)
        guard !ranges.isEmpty else { return }
        document.stopCapturing()
        document.transact(origin: .local) {
            for r in ranges { document.setMark(MarkName.agentEdit, value: nil, block: block, range: r) }
        }
        document.stopCapturing()
    }

    /// Accepts every agent edit in the note (one undo step).
    public static func acceptAll(in document: EditorDocument) {
        let targets = blocks(in: document).map { ($0, ranges(in: document, block: $0)) }
        guard !targets.isEmpty else { return }
        document.stopCapturing()
        document.transact(origin: .local) {
            for (block, ranges) in targets {
                for r in ranges { document.setMark(MarkName.agentEdit, value: nil, block: block, range: r) }
            }
        }
        document.stopCapturing()
    }
}

/// A `[[Title]]` written as plain text (an agent's Markdown with a note that did not exist yet, or
/// typed without the autocomplete). Shown and tapped like a note link; the host resolves the title.
public struct WikiLinkMatch: Hashable, Sendable {
    /// UTF-16 range of the whole `[[…]]`, brackets included.
    public var range: Range<Int>
    public var title: String

    public init(range: Range<Int>, title: String) {
        self.range = range
        self.title = title
    }
}

public enum WikiLinks {
    nonisolated(unsafe) private static let pattern = try! NSRegularExpression(pattern: "\\[\\[([^\\[\\]\\n]+)\\]\\]")

    /// Literal `[[Title]]` spans in `text` (offsets in UTF-16). Empty or blank titles are skipped.
    public static func matches(in text: String) -> [WikiLinkMatch] {
        let ns = text as NSString
        return pattern.matches(in: text, range: NSRange(location: 0, length: ns.length)).compactMap { m in
            let title = ns.substring(with: m.range(at: 1)).trimmingCharacters(in: .whitespaces)
            guard !title.isEmpty else { return nil }
            return WikiLinkMatch(range: m.range.location..<(m.range.location + m.range.length), title: title)
        }
    }
}
