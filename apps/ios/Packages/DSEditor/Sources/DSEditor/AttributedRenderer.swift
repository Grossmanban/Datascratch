#if canImport(UIKit)
import DSEditorModel
import UIKit

extension NSAttributedString.Key {
    /// `ParagraphDecoration` of the paragraph (set on every character, including the separator).
    static let dsDecoration = NSAttributedString.Key("ds.decoration")
    /// Marks of a text run (`MarkSet`, boxed) — lets typing attributes round-trip to the model.
    static let dsMarks = NSAttributedString.Key("ds.marks")
}

/// Immutable description of how a paragraph is decorated; read by `BlockLayoutFragment` when drawing.
final class ParagraphDecoration: NSObject, @unchecked Sendable {
    let blockId: BlockID
    let kind: ParagraphKind
    let marker: ListMarker?
    let itemBlockId: BlockID?
    let indent: CGFloat
    let quoteDepth: Int
    let quoteIndentStep: CGFloat
    let callout: CalloutInfo?
    let calloutIsFirst: Bool
    let calloutIsLast: Bool
    let isCode: Bool
    let codeIsFirst: Bool
    let codeIsLast: Bool
    let markerFont: UIFont
    let markerColor: UIColor
    let accentColor: UIColor
    let quoteColor: UIColor
    let calloutColor: UIColor?
    let codeColor: UIColor
    let chipColor: UIColor
    let secondaryColor: UIColor
    let fontSize: CGFloat

    init(blockId: BlockID, kind: ParagraphKind, marker: ListMarker?, itemBlockId: BlockID?, indent: CGFloat, quoteDepth: Int,
         quoteIndentStep: CGFloat, callout: CalloutInfo?, calloutIsFirst: Bool, calloutIsLast: Bool, isCode: Bool,
         codeIsFirst: Bool, codeIsLast: Bool, markerFont: UIFont, fontSize: CGFloat) {
        self.blockId = blockId
        self.kind = kind
        self.marker = marker
        self.itemBlockId = itemBlockId
        self.indent = indent
        self.quoteDepth = quoteDepth
        self.quoteIndentStep = quoteIndentStep
        self.callout = callout
        self.calloutIsFirst = calloutIsFirst
        self.calloutIsLast = calloutIsLast
        self.isCode = isCode
        self.codeIsFirst = codeIsFirst
        self.codeIsLast = codeIsLast
        self.markerFont = markerFont
        self.markerColor = EditorTheme.secondaryText
        self.accentColor = EditorTheme.accent
        self.quoteColor = EditorTheme.quoteBar
        self.calloutColor = callout.map { EditorTheme.callout($0.tone) }
        self.codeColor = EditorTheme.codeBackground
        self.chipColor = EditorTheme.chipBackground
        self.secondaryColor = EditorTheme.secondaryText
        self.fontSize = fontSize
    }

    /// Width reserved for the list marker in front of the text.
    static let markerWidth: CGFloat = 28
    static let calloutPadding: CGFloat = 14

    var taskState: String? {
        if case .task(let state, _, _) = marker { return state }
        return nil
    }
}

/// Boxed `MarkSet` so it can live in attributes.
final class MarksBox: NSObject, @unchecked Sendable {
    let marks: MarkSet
    init(_ marks: MarkSet) { self.marks = marks }
    override func isEqual(_ object: Any?) -> Bool { (object as? MarksBox)?.marks == marks }
    override var hash: Int { marks.hashValue }
}

/// Turns the flattened document into attributed text for TextKit 2.
@MainActor
struct AttributedRenderer {
    var theme: EditorTheme
    var attachments: AttachmentFactory

    /// Attributed text of paragraphs `range` (each followed by "\n" except the document's last).
    func render(_ p: Projection, paragraphs range: Range<Int>) -> NSAttributedString {
        let out = NSMutableAttributedString()
        for i in range {
            out.append(paragraph(p, index: i))
            if i < p.paragraphs.count - 1 {
                out.append(NSAttributedString(string: "\n", attributes: paragraphAttributes(p, index: i)))
            }
        }
        return out
    }

    func paragraph(_ p: Projection, index i: Int) -> NSAttributedString {
        let para = p.paragraphs[i]
        let base = paragraphAttributes(p, index: i)
        switch para.kind {
        case .atom:
            var attrs = base
            attrs[.attachment] = attachments.blockAttachment(for: para)
            return NSAttributedString(string: "\u{FFFC}", attributes: attrs)
        case .text(let type):
            let out = NSMutableAttributedString()
            let isCode = type == NodeType.codeBlock
            for el in para.inline {
                switch el {
                case .text(let s, let marks):
                    let text = isCode ? s.replacingOccurrences(of: "\n", with: "\u{2028}") : s
                    out.append(NSAttributedString(string: text, attributes: textAttributes(marks: marks, base: base, kind: para.kind, attrs: para.attrs)))
                case .atom(let atom, let marks):
                    var attrs = textAttributes(marks: marks, base: base, kind: para.kind, attrs: para.attrs)
                    if atom.type == NodeType.hardBreak {
                        out.append(NSAttributedString(string: "\u{2028}", attributes: attrs))
                    } else {
                        let font = attrs[.font] as? UIFont ?? theme.bodyFont
                        attrs[.attachment] = attachments.inlineAttachment(for: atom, font: font)
                        out.append(NSAttributedString(string: "\u{FFFC}", attributes: attrs))
                    }
                }
            }
            if isCode { highlight(out, language: para.attrs["language"]?.stringValue) }
            return out
        }
    }

    /// Attributes shared by every character of a paragraph (and its separator).
    func paragraphAttributes(_ p: Projection, index i: Int) -> [NSAttributedString.Key: Any] {
        let para = p.paragraphs[i]
        let ctx = para.context
        let size = theme.fontSize(for: para.kind, attrs: para.attrs)
        let isCode = para.kind.type == NodeType.codeBlock
        let font = isCode ? theme.font(size: size, design: .monospaced) : theme.font(size: size, weight: theme.weight(for: para.kind, attrs: para.attrs))

        let quoteStep: CGFloat = 20
        var indent = CGFloat(ctx.listDepth) * ParagraphDecoration.markerWidth + CGFloat(ctx.quoteDepth) * quoteStep
        if ctx.callout != nil { indent += ParagraphDecoration.calloutPadding + 26 }
        if isCode { indent += 14 }

        func sameCallout(_ j: Int) -> Bool {
            p.paragraphs.indices.contains(j) && p.paragraphs[j].context.calloutBlockId == ctx.calloutBlockId && ctx.calloutBlockId != nil
        }

        let style = NSMutableParagraphStyle()
        style.firstLineHeadIndent = indent
        style.headIndent = indent
        if ctx.callout != nil || isCode { style.tailIndent = -(isCode ? 14 : ParagraphDecoration.calloutPadding) }
        style.lineHeightMultiple = isCode ? 1.15 : (para.kind.type == NodeType.title ? 1.05 : 1.22)
        switch para.kind.type {
        case NodeType.title:
            style.paragraphSpacing = 18
        case NodeType.heading:
            style.paragraphSpacingBefore = i > 0 ? 14 : 0
            style.paragraphSpacing = 6
        case NodeType.codeBlock:
            style.paragraphSpacingBefore = 10
            style.paragraphSpacing = 14
        default:
            style.paragraphSpacing = ctx.listDepth > 0 ? 4 : 10
        }
        if ctx.callout != nil {
            if !sameCallout(i - 1) { style.paragraphSpacingBefore = max(style.paragraphSpacingBefore, 14) }
            if !sameCallout(i + 1) { style.paragraphSpacing = max(style.paragraphSpacing, 18) }
        }
        if let align = para.attrs["textAlign"]?.stringValue {
            style.alignment = align == "center" ? .center : align == "right" ? .right : align == "justify" ? .justified : .natural
        }

        let deco = ParagraphDecoration(
            blockId: para.blockId, kind: para.kind, marker: ctx.marker, itemBlockId: ctx.itemBlockId, indent: indent,
            quoteDepth: ctx.quoteDepth, quoteIndentStep: quoteStep, callout: ctx.callout,
            calloutIsFirst: !sameCallout(i - 1), calloutIsLast: !sameCallout(i + 1), isCode: isCode,
            codeIsFirst: true, codeIsLast: true,
            markerFont: theme.font(size: size, weight: .regular, design: .default), fontSize: size)

        var color = theme.style.textColor.map(EditorTheme.color(token:)) ?? EditorTheme.text
        if para.kind.type == NodeType.title || para.kind.type == NodeType.heading { color = EditorTheme.text }
        if deco.taskState == "done" || deco.taskState == "cancelled" { color = EditorTheme.secondaryText }
        var attrs: [NSAttributedString.Key: Any] = [
            .font: font, .paragraphStyle: style, .foregroundColor: color, .dsDecoration: deco,
        ]
        if deco.taskState == "cancelled" { attrs[.strikethroughStyle] = NSUnderlineStyle.single.rawValue }
        return attrs
    }

    /// Attributes for a run with marks inside a paragraph.
    func textAttributes(marks: MarkSet, base: [NSAttributedString.Key: Any], kind: ParagraphKind, attrs: [String: JSONValue]) -> [NSAttributedString.Key: Any] {
        var a = base
        a[.dsMarks] = MarksBox(marks)
        guard !marks.isEmpty, kind.type != NodeType.codeBlock else { return a }
        let size = theme.fontSize(for: kind, attrs: attrs)
        let bold = marks.contains(MarkName.bold)
        let italic = marks.contains(MarkName.italic)
        if marks.contains(MarkName.code) {
            a[.font] = theme.font(size: size * 0.9, design: .monospaced)
            a[.backgroundColor] = EditorTheme.codeBackground
        } else if bold || italic {
            let base = theme.weight(for: kind, attrs: attrs)
            let w: UIFont.Weight = bold ? (base == .regular ? .bold : .heavy) : base
            a[.font] = theme.font(size: size, weight: w, italic: italic)
        }
        if marks.contains(MarkName.underline) { a[.underlineStyle] = NSUnderlineStyle.single.rawValue }
        if marks.contains(MarkName.strike) { a[.strikethroughStyle] = NSUnderlineStyle.single.rawValue }
        if let link = marks[MarkName.link]?.objectValue?["href"]?.stringValue, let url = URL(string: link) {
            a[.link] = url
        }
        if let hl = marks[MarkName.highlight] {
            let token = hl.objectValue?["color"]?.stringValue ?? "highlight.yellow"
            a[.backgroundColor] = EditorTheme.color(token: token)
        }
        if let tc = marks[MarkName.textColor]?.objectValue?["color"]?.stringValue {
            a[.foregroundColor] = EditorTheme.color(token: tc)
        }
        if marks.contains(MarkName.agentEdit) {
            a[.backgroundColor] = EditorTheme.agentEdit
            a[.underlineStyle] = NSUnderlineStyle.single.union(.patternDot).rawValue
            a[.underlineColor] = EditorTheme.accent
        }
        return a
    }

    /// Typing attributes for new text with `marks` in paragraph `index`.
    func typingAttributes(_ p: Projection, index: Int, marks: MarkSet) -> [NSAttributedString.Key: Any] {
        guard p.paragraphs.indices.contains(index) else { return [.font: theme.bodyFont, .foregroundColor: EditorTheme.text] }
        let para = p.paragraphs[index]
        return textAttributes(marks: marks, base: paragraphAttributes(p, index: index), kind: para.kind, attrs: para.attrs)
    }

    func highlight(_ s: NSMutableAttributedString, language: String?) {
        let palette: [CodeTokenKind: UInt32] = [
            .keyword: 0xA6366C, .string: 0x3E7A4F, .comment: 0x8C8577, .number: 0x9A5B16, .type: 0x2F5D8A,
            .function: 0x6B4C9A, .punctuation: 0x6F685E,
        ]
        let dark: [CodeTokenKind: UInt32] = [
            .keyword: 0xE58AB2, .string: 0x8CCB98, .comment: 0x8A8478, .number: 0xE0A867, .type: 0x8DB4DD,
            .function: 0xB79CE0, .punctuation: 0xA49D92,
        ]
        for t in CodeHighlighter.tokenize(s.string, language: language) where t.range.upperBound <= s.length {
            let color = EditorTheme.dynamic(palette[t.kind] ?? 0x1F1D1A, dark[t.kind] ?? 0xECE7DF)
            s.addAttribute(.foregroundColor, value: color, range: NSRange(location: t.range.lowerBound, length: t.range.count))
            if t.kind == .comment {
                s.addAttribute(.font, value: theme.font(size: 15, italic: true, design: .monospaced),
                               range: NSRange(location: t.range.lowerBound, length: t.range.count))
            }
        }
    }
}
#endif
