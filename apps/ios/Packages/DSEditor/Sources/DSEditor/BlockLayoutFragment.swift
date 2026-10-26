#if canImport(UIKit)
import DSDesign
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

    static let agentBarWidth: CGFloat = 3
    static let agentBarGap: CGFloat = 10

    private var containerWidth: CGFloat {
        textLayoutManager?.textContainer?.size.width ?? layoutFragmentFrame.width
    }

    override var renderingSurfaceBounds: CGRect {
        let base = super.renderingSurfaceBounds
        guard let d = decoration else { return base }
        if d.callout != nil || d.isCode || d.quoteDepth > 0 || d.marker != nil || d.hasAgentEdit {
            let left = d.hasAgentEdit ? Self.agentBarGap + Self.agentBarWidth + 2 : 0
            let frame = CGRect(x: -layoutFragmentFrame.minX - left, y: -16, width: containerWidth + 8 + left,
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
        if d.hasAgentEdit {
            // Agent edits (D-10): a soft rounded bar in the margin, left of the column (and of
            // list markers), along the paragraph's lines.
            let x = -layoutFragmentFrame.minX - Self.agentBarGap - Self.agentBarWidth
            let rect = CGRect(x: x, y: top + 2, width: Self.agentBarWidth, height: max(4, bottom - top - 4))
            ctx.addPath(UIBezierPath(roundedRect: rect, cornerRadius: Self.agentBarWidth / 2).cgPath)
            ctx.setFillColor(d.agentEditColor.cgColor)
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
            drawDateChips(scheduled: scheduled, deadline: deadline, completed: state == "done" || state == "cancelled", d: d, in: ctx)
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
        // Tasks are round ("Quiet paper", like `DSTaskCheckbox`).
        let path = UIBezierPath(ovalIn: rect.insetBy(dx: 0.75, dy: 0.75))
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
            // Like `DSTaskCheckbox`: tertiary at 55 %, 1.5 pt.
            ctx.setStrokeColor(DSColorToken.textTertiary.value.uiColor.withAlphaComponent(0.55).cgColor)
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

    /// One date chip after the task text, laid out (label and tone from `DSDateChipModel`, same
    /// rules as the web: Сегодня / Завтра / Вчера / weekday / «12 ноя»).
    struct DateChip {
        let text: NSAttributedString
        let icon: UIImage?
        let color: UIColor
        let size: CGSize
    }

    static func dateChips(scheduled: String?, deadline: String?, completed: Bool, fontSize: CGFloat) -> [DateChip] {
        var models: [(DSDateChipModel, Bool)] = []
        if let s = scheduled, let date = date(s) { models.append((DSDateChipModel(date: date, isCompleted: completed), false)) }
        if let dl = deadline, let date = date(dl) { models.append((DSDateChipModel(date: date, isDeadline: true, isCompleted: completed), true)) }
        let font = UIFont.systemFont(ofSize: max(11, fontSize * 0.7), weight: .medium)
        return models.map { model, isDeadline in
            let color = color(for: model.tone)
            let text = NSAttributedString(string: model.label, attributes: [.font: font, .foregroundColor: color])
            let textSize = text.size()
            let config = UIImage.SymbolConfiguration(pointSize: font.pointSize * 0.8, weight: .semibold)
            let icon = UIImage(systemName: isDeadline ? "flag.fill" : "calendar", withConfiguration: config)?
                .withTintColor(color, renderingMode: .alwaysOriginal)
            let iconWidth = icon.map { $0.size.width + 4 } ?? 0
            return DateChip(text: text, icon: icon, color: color,
                            size: CGSize(width: iconWidth + textSize.width + 14, height: textSize.height + 4))
        }
    }

    /// Room the chips take after the text (gaps included); the renderer keeps every line of a dated
    /// task this much short of the column so the chips always fit after the last line.
    static func dateChipsWidth(scheduled: String?, deadline: String?, completed: Bool, fontSize: CGFloat) -> CGFloat {
        let chips = dateChips(scheduled: scheduled, deadline: deadline, completed: completed, fontSize: fontSize)
        guard !chips.isEmpty else { return 0 }
        return chips.reduce(8) { $0 + $1.size.width + 6 }
    }

    private func drawDateChips(scheduled: String?, deadline: String?, completed: Bool, d: ParagraphDecoration, in ctx: CGContext) {
        guard let last = textLineFragments.last else { return }
        let chips = Self.dateChips(scheduled: scheduled, deadline: deadline, completed: completed, fontSize: d.fontSize)
        guard !chips.isEmpty else { return }
        let ascender = UIFont.systemFont(ofSize: max(11, d.fontSize * 0.7), weight: .medium).ascender
        let baseline = last.typographicBounds.minY + last.glyphOrigin.y
        var x = last.typographicBounds.minX + Self.usedWidth(of: last) + 8
        for chip in chips {
            let rect = CGRect(x: x, y: baseline - ascender - 3, width: chip.size.width, height: chip.size.height)
            ctx.setFillColor(chip.color.withAlphaComponent(0.12).cgColor)
            ctx.addPath(UIBezierPath(roundedRect: rect, cornerRadius: rect.height / 2).cgPath)
            ctx.fillPath()
            let iconWidth = chip.icon.map { $0.size.width + 4 } ?? 0
            if let icon = chip.icon {
                icon.draw(at: CGPoint(x: rect.minX + 7, y: rect.midY - icon.size.height / 2))
            }
            chip.text.draw(at: CGPoint(x: rect.minX + 7 + iconWidth, y: rect.minY + 2))
            x = rect.maxX + 6
        }
    }

    /// Frames of the date chips in fragment coordinates (tests).
    func dateChipFrames() -> [CGRect] {
        guard let d = decoration, case .task(let state, let scheduled, let deadline) = d.marker, let last = textLineFragments.last else { return [] }
        let chips = Self.dateChips(scheduled: scheduled, deadline: deadline, completed: state == "done" || state == "cancelled", fontSize: d.fontSize)
        let ascender = UIFont.systemFont(ofSize: max(11, d.fontSize * 0.7), weight: .medium).ascender
        let baseline = last.typographicBounds.minY + last.glyphOrigin.y
        var x = last.typographicBounds.minX + Self.usedWidth(of: last) + 8
        return chips.map { chip in
            defer { x += chip.size.width + 6 }
            return CGRect(x: x, y: baseline - ascender - 3, width: chip.size.width, height: chip.size.height)
        }
    }

    static func color(for tone: DSDateChipModel.Tone) -> UIColor {
        switch tone {
        case .normal: DSColorToken.textSecondary.value.uiColor
        case .today: DSColorToken.accent.value.uiColor
        case .soon: DSColorToken.warning.value.uiColor
        case .overdue: DSColorToken.danger.value.uiColor
        case .done: DSColorToken.textTertiary.value.uiColor
        }
    }

    /// `YYYY-MM-DD` as a local calendar date.
    static func date(_ iso: String) -> Date? {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func usedWidth(of line: NSTextLineFragment) -> CGFloat {
        let end = line.characterRange.upperBound
        return line.locationForCharacter(at: end).x
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
