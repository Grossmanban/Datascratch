#if canImport(UIKit)
import DSEditorModel
import DSInk
import UIKit

/// Glyph geometry over TextKit 2 for the pen layer: where a character is, which character is under
/// a point, frames of atom blocks. All public results are in text view content coordinates.
@MainActor
final class TextGeometry {
    unowned let textView: UITextView
    private var placementCache: [Int: GlyphPlacement] = [:]

    init(textView: UITextView) { self.textView = textView }

    var layoutManager: NSTextLayoutManager { textView.textLayoutManager! }
    var contentManager: NSTextContentManager { layoutManager.textContentManager! }

    /// Offset between text container and view content coordinates.
    var origin: CGPoint { CGPoint(x: textView.textContainerInset.left, y: textView.textContainerInset.top) }

    func invalidate() { placementCache.removeAll(keepingCapacity: true) }

    func location(at offset: Int) -> NSTextLocation? {
        contentManager.location(contentManager.documentRange.location, offsetBy: offset)
    }

    func offset(of location: NSTextLocation) -> Int {
        contentManager.offset(from: contentManager.documentRange.location, to: location)
    }

    func textRange(_ range: Range<Int>) -> NSTextRange? {
        guard let s = location(at: range.lowerBound), let e = location(at: range.upperBound) else { return nil }
        return NSTextRange(location: s, end: e)
    }

    /// Frame of the first text segment of a range, in content coordinates.
    func segmentFrame(_ range: Range<Int>) -> CGRect? {
        guard let r = textRange(range) else { return nil }
        var result: CGRect?
        layoutManager.enumerateTextSegments(in: r, type: .standard, options: []) { _, frame, _, _ in
            result = frame
            return false
        }
        return result.map { $0.offsetBy(dx: origin.x, dy: origin.y) }
    }

    /// Layout fragment containing a character offset, laid out.
    func fragment(at offset: Int) -> NSTextLayoutFragment? {
        guard let loc = location(at: offset), let frag = layoutManager.textLayoutFragment(for: loc) else { return nil }
        if frag.state != .layoutAvailable { layoutManager.ensureLayout(for: frag.rangeInElement) }
        return frag
    }

    /// Current glyph placement of the character at `offset` (leading edge on the baseline).
    func placement(at offset: Int) -> GlyphPlacement? {
        if let cached = placementCache[offset] { return cached }
        guard let frag = fragment(at: offset) else { return nil }
        let paraStart = self.offset(of: frag.rangeInElement.location)
        let local = offset - paraStart
        let lines = frag.textLineFragments
        guard !lines.isEmpty else { return nil }
        var lineIndex = lines.count - 1
        for (i, line) in lines.enumerated() where NSLocationInRange(local, line.characterRange) {
            lineIndex = i
            break
        }
        let line = lines[lineIndex]
        let frame = frag.layoutFragmentFrame
        // x from the segment API (robust), baseline from the line fragment.
        let x: CGFloat
        if let seg = segmentFrame(offset..<(offset + 1)) {
            x = seg.minX
        } else {
            x = frame.minX + line.typographicBounds.minX + line.locationForCharacter(at: local).x + origin.x
        }
        let baseline = frame.minY + line.typographicBounds.minY + line.glyphOrigin.y + origin.y
        var fontSize: CGFloat = 17
        let attrs = line.attributedString
        if attrs.length > 0 {
            let i = max(0, min(local, attrs.length - 1))
            if let font = attrs.attribute(.font, at: i, effectiveRange: nil) as? UIFont { fontSize = font.pointSize }
        }
        let p = GlyphPlacement(origin: CGPoint(x: x, y: baseline), fontSize: fontSize, lineKey: paraStart &* 4096 &+ lineIndex)
        placementCache[offset] = p
        return p
    }

    /// The text character nearest to a point (`strokes.md` §4: the line whose bounds contain the point,
    /// else the nearest line; then the nearest character on it). Skips attachments and empty lines.
    func characterHit(at point: CGPoint) -> CharacterHit? {
        let p = CGPoint(x: point.x - origin.x, y: point.y - origin.y)
        for dy in Self.searchOffsets {
            guard let frag = layoutManager.textLayoutFragment(for: CGPoint(x: max(1, p.x), y: p.y + dy)) else { continue }
            if let hit = nearestCharacter(in: frag, to: p) { return hit }
        }
        return nil
    }

    static let searchOffsets: [CGFloat] = {
        var out: [CGFloat] = [0]
        var d: CGFloat = 3
        while d <= 90 {
            out.append(d)
            out.append(-d)
            d += 3
        }
        return out
    }()

    private func nearestCharacter(in frag: NSTextLayoutFragment, to p: CGPoint) -> CharacterHit? {
        if frag.state != .layoutAvailable { layoutManager.ensureLayout(for: frag.rangeInElement) }
        let frame = frag.layoutFragmentFrame
        let paraStart = offset(of: frag.rangeInElement.location)
        // Choose the line: containing the point vertically, else the nearest.
        var best: (line: NSTextLineFragment, index: Int, distance: CGFloat)?
        for (i, line) in frag.textLineFragments.enumerated() {
            guard let chars = drawableRange(line) , !chars.isEmpty else { continue }
            let top = frame.minY + line.typographicBounds.minY, bottom = frame.minY + line.typographicBounds.maxY
            let d = p.y < top ? top - p.y : (p.y > bottom ? p.y - bottom : 0)
            if best == nil || d < best!.distance { best = (line, i, d) }
        }
        guard let (line, _, _) = best, let chars = drawableRange(line) else { return nil }
        let localX = p.x - frame.minX - line.typographicBounds.minX
        var bestIndex = chars.lowerBound
        var bestDistance = CGFloat.greatestFiniteMagnitude
        // Binary search the insertion index, then compare the two neighbours.
        let guess = line.characterIndex(for: CGPoint(x: localX, y: line.typographicBounds.height / 2))
        // Ascending order and `<=`: a point exactly on the boundary of two characters goes to the
        // right one (`strokes.md` §4), so a stroke started at a word's first letter is not anchored to
        // the space before it.
        for i in [guess - 1, guess, guess + 1] where chars.contains(i) {
            let lead = line.locationForCharacter(at: i).x
            let trail = line.locationForCharacter(at: i + 1).x
            let lo = min(lead, trail), hi = max(lead, trail)
            let d: CGFloat = localX < lo ? lo - localX : (localX > hi ? localX - hi : 0)
            if d <= bestDistance {
                bestDistance = d
                bestIndex = i
            }
        }
        if bestDistance == .greatestFiniteMagnitude {
            bestIndex = localX < 0 ? chars.lowerBound : chars.upperBound - 1
        }
        let offset = paraStart + bestIndex
        guard let placement = placement(at: offset) else { return nil }
        return CharacterHit(offset: offset, placement: placement)
    }

    /// Characters of a line that can carry ink (no separators, no attachments).
    private func drawableRange(_ line: NSTextLineFragment) -> Range<Int>? {
        let s = line.attributedString
        let r = line.characterRange
        guard r.length > 0, r.location + r.length <= s.length else { return nil }
        let ns = s.string as NSString
        var lo = r.location, hi = r.location + r.length
        func skip(_ c: unichar) -> Bool { c == 0x0A || c == 0x2028 || c == 0xFFFC || c == 0x0D }
        while hi > lo, skip(ns.character(at: hi - 1)) { hi -= 1 }
        while lo < hi, ns.character(at: lo) == 0xFFFC { lo += 1 }
        return lo < hi ? lo..<hi : nil
    }

    /// Vertical metrics of the line a character is on (for gesture classification).
    func lineMetrics(at offset: Int) -> LineMetrics? {
        guard let p = placement(at: offset) else { return nil }
        let font = (textView.textStorage.length > offset
            ? textView.textStorage.attribute(.font, at: offset, effectiveRange: nil) as? UIFont : nil) ?? UIFont.systemFont(ofSize: p.fontSize)
        return LineMetrics(baseline: p.origin.y, xHeight: font.xHeight, fontSize: p.fontSize)
    }

    /// Frame of the layout fragment (paragraph) containing `offset`.
    func paragraphFrame(at offset: Int) -> CGRect? {
        guard let frag = fragment(at: offset) else { return nil }
        return frag.layoutFragmentFrame.offsetBy(dx: origin.x, dy: origin.y)
    }

    /// Text column in content coordinates (x range where text is laid out).
    var columnFrame: CGRect {
        let pad = textView.textContainer.lineFragmentPadding
        let x = origin.x + pad
        let w = textView.textContainer.size.width - pad * 2
        return CGRect(x: x, y: 0, width: w, height: textView.contentSize.height)
    }

    /// Offsets of the text currently laid out in (or near) the viewport.
    func viewportOffsetRange() -> Range<Int>? {
        guard let r = layoutManager.textViewportLayoutController.viewportRange else { return nil }
        return offset(of: r.location)..<offset(of: r.endLocation)
    }

    /// Paragraph start offset at a point (for margin notes and block hits).
    func paragraphOffset(at point: CGPoint) -> Int? {
        let p = CGPoint(x: max(1, min(point.x - origin.x, textView.textContainer.size.width - 1)), y: point.y - origin.y)
        for dy in Self.searchOffsets {
            if let frag = layoutManager.textLayoutFragment(for: CGPoint(x: p.x, y: p.y + dy)) {
                return offset(of: frag.rangeInElement.location)
            }
        }
        return nil
    }
}
#endif
