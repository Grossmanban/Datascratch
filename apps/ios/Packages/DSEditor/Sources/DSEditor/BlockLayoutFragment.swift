#if canImport(UIKit)
import DSEditorModel
import UIKit

/// Supplies `BlockLayoutFragment`s to TextKit 2 so paragraphs can draw block decorations.
final class FragmentProvider: NSObject, NSTextLayoutManagerDelegate {
    func textLayoutManager(_ textLayoutManager: NSTextLayoutManager, textLayoutFragmentFor location: NSTextLocation,
                           in textElement: NSTextElement) -> NSTextLayoutFragment {
        BlockLayoutFragment(textElement: textElement, range: textElement.elementRange)
    }
}

/// Layout fragment that draws list markers, task check boxes and date chips, quote bars,
/// callout and code backgrounds around the paragraph text.
final class BlockLayoutFragment: NSTextLayoutFragment {
    var decoration: ParagraphDecoration? {
        guard let p = textElement as? NSTextParagraph, p.attributedString.length > 0 else { return nil }
        return p.attributedString.attribute(.dsDecoration, at: 0, effectiveRange: nil) as? ParagraphDecoration
    }

    private var containerWidth: CGFloat {
        textLayoutManager?.textContainer?.size.width ?? layoutFragmentFrame.width
    }

    override var renderingSurfaceBounds: CGRect {
        let base = super.renderingSurfaceBounds
        guard let d = decoration else { return base }
        if d.callout != nil || d.isCode || d.quoteDepth > 0 || d.marker != nil {
            let frame = CGRect(x: -layoutFragmentFrame.minX, y: -16, width: containerWidth + 8,
                               height: layoutFragmentFrame.height + 32)
            return base.union(frame)
        }
        return base
    }

    override func draw(at point: CGPoint, in context: CGContext) {
        guard let d = decoration else {
            super.draw(at: point, in: context)
            return
        }
        context.saveGState()
        context.translateBy(x: point.x, y: point.y)
        drawBackground(d, in: context)
        context.restoreGState()
        super.draw(at: point, in: context)
        context.saveGState()
        context.translateBy(x: point.x, y: point.y)
        drawForeground(d, in: context)
        context.restoreGState()
    }

    /// Vertical extent of the text lines inside the fragment.
    private var textBounds: (top: CGFloat, bottom: CGFloat) {
        let lines = textLineFragments
        guard let f = lines.first, let l = lines.last else { return (0, layoutFragmentFrame.height) }
        return (f.typographicBounds.minY, l.typographicBounds.maxY)
    }

    private func drawBackground(_ d: ParagraphDecoration, in ctx: CGContext) {
        let width = containerWidth - layoutFragmentFrame.minX
        let (top, bottom) = textBounds
        let listIndent = d.indent - CGFloat(d.quoteDepth) * d.quoteIndentStep
            - (d.callout != nil ? ParagraphDecoration.calloutPadding + 26 : 0) - (d.isCode ? 14 : 0)

        if let color = d.calloutColor {
            let y0 = d.calloutIsFirst ? top - 10 : 0
            let y1 = d.calloutIsLast ? bottom + 10 : layoutFragmentFrame.height
            let x0 = max(0, listIndent - layoutFragmentFrame.minX)
            let rect = CGRect(x: x0, y: y0, width: width - x0, height: y1 - y0)
            let radius: CGFloat = 12
            var corners: UIRectCorner = []
            if d.calloutIsFirst { corners.formUnion([.topLeft, .topRight]) }
            if d.calloutIsLast { corners.formUnion([.bottomLeft, .bottomRight]) }
            ctx.addPath(UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius)).cgPath)
            ctx.setFillColor(color.cgColor)
            ctx.fillPath()
        }
        if d.isCode {
            let x0 = max(0, d.indent - 14 - layoutFragmentFrame.minX)
            let rect = CGRect(x: x0, y: top - 8, width: width - x0, height: bottom - top + 16)
            ctx.addPath(UIBezierPath(roundedRect: rect, cornerRadius: 8).cgPath)
            ctx.setFillColor(d.codeColor.cgColor)
            ctx.fillPath()
        }
        if d.quoteDepth > 0 {
            ctx.setFillColor(d.quoteColor.cgColor)
            for k in 0..<d.quoteDepth {
                let x = listIndent + CGFloat(k) * d.quoteIndentStep + 3 - layoutFragmentFrame.minX
                ctx.fill(CGRect(x: x, y: -2, width: 3, height: layoutFragmentFrame.height + 4))
            }
        }
    }

    private func drawForeground(_ d: ParagraphDecoration, in ctx: CGContext) {
        guard let first = textLineFragments.first else { return }
        let baseline = first.typographicBounds.minY + first.glyphOrigin.y
        let markerRight = d.indent - layoutFragmentFrame.minX - 6
        UIGraphicsPushContext(ctx)
        defer { UIGraphicsPopContext() }

        if let callout = d.callout, d.calloutIsFirst {
            let emoji = callout.emoji ?? defaultEmoji(callout.tone)
            let font = UIFont.systemFont(ofSize: d.fontSize * 0.95)
            let s = NSAttributedString(string: emoji, attributes: [.font: font])
            let x = d.indent - 26 - layoutFragmentFrame.minX - 2
            s.draw(at: CGPoint(x: x, y: baseline - font.ascender))
        }

        switch d.marker {
        case .bullet:
            let r = max(2.5, d.fontSize * 0.15)
            let cx = markerRight - 8, cy = baseline - d.fontSize * 0.33
            ctx.setFillColor(d.markerColor.cgColor)
            ctx.fillEllipse(in: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
        case .ordered(let n):
            let s = NSAttributedString(string: "\(n).", attributes: [
                .font: d.markerFont.withSize(d.fontSize * 0.95), .foregroundColor: d.markerColor,
            ])
            let size = s.size()
            s.draw(at: CGPoint(x: markerRight - size.width, y: baseline - d.markerFont.withSize(d.fontSize * 0.95).ascender))
        case .task(let state, let scheduled, let deadline):
            let box = checkboxRect(d, baseline: baseline)
            drawCheckbox(state: state, rect: box, d: d, in: ctx)
            drawDateChips(scheduled: scheduled, deadline: deadline, d: d, in: ctx)
        case nil:
            break
        }
    }

    /// Check box frame in fragment coordinates (also used for hit testing).
    func checkboxRect(_ d: ParagraphDecoration, baseline: CGFloat) -> CGRect {
        let size = max(14, d.fontSize * 0.95)
        let markerLeft = d.indent - ParagraphDecoration.markerWidth - layoutFragmentFrame.minX
        return CGRect(x: markerLeft + 2, y: baseline - d.fontSize * 0.36 - size / 2, width: size, height: size)
    }

    private func drawCheckbox(state: String, rect: CGRect, d: ParagraphDecoration, in ctx: CGContext) {
        let path = UIBezierPath(roundedRect: rect.insetBy(dx: 0.75, dy: 0.75), cornerRadius: rect.width * 0.28)
        if state == "done" {
            ctx.setFillColor(d.accentColor.cgColor)
            ctx.addPath(path.cgPath)
            ctx.fillPath()
            let check = UIBezierPath()
            check.move(to: CGPoint(x: rect.minX + rect.width * 0.27, y: rect.midY + rect.height * 0.02))
            check.addLine(to: CGPoint(x: rect.minX + rect.width * 0.44, y: rect.maxY - rect.height * 0.28))
            check.addLine(to: CGPoint(x: rect.maxX - rect.width * 0.24, y: rect.minY + rect.height * 0.3))
            ctx.setStrokeColor(UIColor.white.cgColor)
            ctx.setLineWidth(max(1.6, rect.width * 0.12))
            ctx.setLineCap(.round)
            ctx.setLineJoin(.round)
            ctx.addPath(check.cgPath)
            ctx.strokePath()
        } else {
            ctx.setStrokeColor(d.markerColor.cgColor)
            ctx.setLineWidth(1.5)
            ctx.addPath(path.cgPath)
            ctx.strokePath()
            if state == "cancelled" {
                ctx.move(to: CGPoint(x: rect.minX + 4, y: rect.midY))
                ctx.addLine(to: CGPoint(x: rect.maxX - 4, y: rect.midY))
                ctx.strokePath()
            }
        }
    }

    /// Room the date chips take after the text (gaps included); the renderer keeps every line of
    /// a dated task this much short of the column so the chips always fit after the last line.
    static func dateChipsWidth(scheduled: String?, deadline: String?, fontSize: CGFloat) -> CGFloat {
        var texts: [String] = []
        if let s = scheduled { texts.append("◷ " + shortDate(s)) }
        if let dl = deadline { texts.append("⚑ " + shortDate(dl)) }
        guard !texts.isEmpty else { return 0 }
        let font = UIFont.systemFont(ofSize: max(11, fontSize * 0.7), weight: .medium)
        return texts.reduce(8) { $0 + NSAttributedString(string: $1, attributes: [.font: font]).size().width + 12 + 6 }
    }

    private func drawDateChips(scheduled: String?, deadline: String?, d: ParagraphDecoration, in ctx: CGContext) {
        guard let last = textLineFragments.last else { return }
        var chips: [(String, UIColor)] = []
        if let s = scheduled { chips.append(("◷ " + Self.shortDate(s), d.accentColor)) }
        if let dl = deadline { chips.append(("⚑ " + Self.shortDate(dl), UIColor.systemRed)) }
        guard !chips.isEmpty else { return }
        let font = UIFont.systemFont(ofSize: max(11, d.fontSize * 0.7), weight: .medium)
        let baseline = last.typographicBounds.minY + last.glyphOrigin.y
        var x = last.typographicBounds.minX + Self.usedWidth(of: last) + 8
        for (text, color) in chips {
            let s = NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: color])
            let size = s.size()
            let rect = CGRect(x: x, y: baseline - font.ascender - 3, width: size.width + 12, height: size.height + 4)
            ctx.setFillColor(d.chipColor.cgColor)
            ctx.addPath(UIBezierPath(roundedRect: rect, cornerRadius: rect.height / 2).cgPath)
            ctx.fillPath()
            s.draw(at: CGPoint(x: rect.minX + 6, y: rect.minY + 2))
            x = rect.maxX + 6
        }
    }

    static func usedWidth(of line: NSTextLineFragment) -> CGFloat {
        let end = line.characterRange.upperBound
        return line.locationForCharacter(at: end).x
    }

    static func shortDate(_ iso: String) -> String {
        let parts = iso.split(separator: "-")
        guard parts.count == 3, let m = Int(parts[1]), let day = Int(parts[2]) else { return iso }
        let months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
        return "\(day) \(months[max(0, min(11, m - 1))])"
    }

    private func defaultEmoji(_ tone: String) -> String {
        switch tone {
        case "info": "ℹ️"
        case "success": "✅"
        case "warning": "⚠️"
        case "danger": "⛔️"
        default: "📝"
        }
    }
}
#endif
