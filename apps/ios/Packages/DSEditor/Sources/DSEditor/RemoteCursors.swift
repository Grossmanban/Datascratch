#if canImport(UIKit)
import DSDesign
import DSEditorModel
import UIKit

// Co-authors' carets in the text (`spec/04-editor.md`, «Каретки соавторов»; `spec/08-sharing.md`).

/// One co-author's caret as drawn: content coordinates of the text view.
struct RemoteCaretFrame: Equatable {
    var id: UInt64
    var name: String
    var color: String
    var caret: CGRect
    var selection: [CGRect]
}

/// The carets, selections and name labels, over the text (in the text view's content).
@MainActor
final class RemoteCursorLayerView: UIView {
    /// The name label disappears after this long without the caret moving; the caret stays.
    static let labelDelay: TimeInterval = 3

    private var carets: [UInt64: RemoteCaretView] = [:]
    private var selections: [UInt64: CAShapeLayer] = [:]

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        accessibilityIdentifier = "editor.remoteCursors"
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    /// Draws `frames`; the labels of `moved` show again (and fade later).
    func update(_ frames: [RemoteCaretFrame], moved: Set<UInt64>) {
        let ids = Set(frames.map(\.id))
        for (id, view) in carets where !ids.contains(id) {
            view.removeFromSuperview()
            carets[id] = nil
        }
        for (id, layer) in selections where !ids.contains(id) {
            layer.removeFromSuperlayer()
            selections[id] = nil
        }
        for f in frames {
            let color = Self.color(f.color)
            let selection = selections[f.id] ?? {
                let l = CAShapeLayer()
                l.actions = ["path": NSNull(), "fillColor": NSNull()]
                self.layer.insertSublayer(l, at: 0)
                self.selections[f.id] = l
                return l
            }()
            let path = CGMutablePath()
            for r in f.selection {
                let corner = min(2, r.width / 2, r.height / 2)
                path.addRoundedRect(in: r, cornerWidth: corner, cornerHeight: corner)
            }
            selection.path = f.selection.isEmpty ? nil : path
            selection.fillColor = color.withAlphaComponent(0.22).resolvedColor(with: traitCollection).cgColor

            let view = carets[f.id] ?? {
                let v = RemoteCaretView()
                self.addSubview(v)
                self.carets[f.id] = v
                return v
            }()
            view.configure(name: f.name, color: color, caret: f.caret, in: bounds)
            if moved.contains(f.id) { view.showLabel(hidingAfter: Self.labelDelay) }
        }
    }

    /// Whether the label of a caret is showing (tests).
    func isLabelVisible(_ id: UInt64) -> Bool { (carets[id]?.labelAlpha ?? 0) > 0.5 }
    func caretFrame(_ id: UInt64) -> CGRect? { carets[id].map { $0.caretFrame } }
    func selectionPath(_ id: UInt64) -> CGPath? { selections[id]?.path }

    /// `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` (already checked by `RemoteCursor`).
    static func color(_ hex: String) -> UIColor {
        var digits = String(hex.dropFirst())
        if digits.count == 3 || digits.count == 4 { digits = digits.map { "\($0)\($0)" }.joined() }
        guard let v = UInt64(digits, radix: 16), digits.count == 6 || digits.count == 8 else {
            return color(RemoteCursor.defaultColor)
        }
        let rgba = digits.count == 6 ? (v << 8) | 0xff : v
        return UIColor(red: CGFloat((rgba >> 24) & 0xff) / 255, green: CGFloat((rgba >> 16) & 0xff) / 255,
                       blue: CGFloat((rgba >> 8) & 0xff) / 255, alpha: CGFloat(rgba & 0xff) / 255)
    }
}

/// A thin caret line in the person's colour with a small name label above it.
@MainActor
final class RemoteCaretView: UIView {
    private let line = UIView()
    private let label = RemoteCaretLabel()
    private var hideWork: DispatchWorkItem?
    static let lineWidth: CGFloat = 2
    static let labelHeight: CGFloat = 18

    var caretFrame: CGRect { line.frame.offsetBy(dx: frame.minX, dy: frame.minY) }
    var labelAlpha: CGFloat { label.alpha }

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        line.layer.cornerRadius = Self.lineWidth / 2
        addSubview(line)
        label.font = .systemFont(ofSize: 11, weight: .semibold)
        label.textColor = .white
        label.layer.cornerRadius = 4
        label.layer.masksToBounds = true
        label.alpha = 0
        addSubview(label)
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    func configure(name: String, color: UIColor, caret: CGRect, in container: CGRect) {
        line.backgroundColor = color
        label.backgroundColor = color
        label.text = name
        // The view spans the caret and its label; the label sits above the line, or below it when
        // there is no room above (the first line of the note).
        let width = min(ceil(label.intrinsicContentSize.width) + RemoteCaretLabel.inset * 2, 180)
        let labelAbove = caret.minY - Self.labelHeight >= container.minY
        let x = min(max(caret.minX - 1, container.minX), max(container.minX, container.maxX - width))
        let lineRect = CGRect(x: caret.midX - Self.lineWidth / 2, y: caret.minY, width: Self.lineWidth, height: caret.height)
        let labelRect = CGRect(x: x, y: labelAbove ? caret.minY - Self.labelHeight : caret.maxY, width: width, height: Self.labelHeight)
        frame = lineRect.union(labelRect)
        line.frame = lineRect.offsetBy(dx: -frame.minX, dy: -frame.minY)
        label.frame = labelRect.offsetBy(dx: -frame.minX, dy: -frame.minY)
        label.layer.maskedCorners = labelAbove
            ? [.layerMinXMinYCorner, .layerMaxXMinYCorner, .layerMaxXMaxYCorner]
            : [.layerMinXMaxYCorner, .layerMaxXMinYCorner, .layerMaxXMaxYCorner]
        accessibilityLabel = name
    }

    func showLabel(hidingAfter delay: TimeInterval) {
        hideWork?.cancel()
        label.layer.removeAllAnimations()
        label.alpha = 1
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            UIView.animate(withDuration: 0.4, delay: 0, options: [.beginFromCurrentState, .allowUserInteraction]) {
                self.label.alpha = 0
            }
        }
        hideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }
}

/// The name chip: small text with a little room on both sides.
final class RemoteCaretLabel: UILabel {
    static let inset: CGFloat = 5
    override func drawText(in rect: CGRect) { super.drawText(in: rect.insetBy(dx: Self.inset, dy: 0)) }
}

/// Marks at the top and bottom edges of the editor for carets outside the visible text: a small
/// arrow in the person's colour; a tap scrolls to the caret.
@MainActor
final class RemoteCursorMarksView: UIView {
    enum Edge { case top, bottom }
    struct Mark: Equatable {
        var id: UInt64
        var name: String
        var color: String
        var edge: Edge
        var x: CGFloat
    }

    var onTap: ((UInt64) -> Void)?
    private var buttons: [UInt64: UIButton] = [:]
    private(set) var marks: [Mark] = []
    static let size = CGSize(width: 30, height: 22)

    override init(frame: CGRect) {
        super.init(frame: frame)
        accessibilityIdentifier = "editor.remoteCursorMarks"
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    /// Only the marks take touches; the text underneath keeps the rest.
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        buttons.values.contains { !$0.isHidden && $0.frame.insetBy(dx: -8, dy: -8).contains(point) }
    }

    /// Lays the marks out inside `visible` (this view's coordinates).
    func update(_ marks: [Mark], visible: CGRect) {
        self.marks = marks
        let ids = Set(marks.map(\.id))
        for (id, b) in buttons where !ids.contains(id) {
            b.removeFromSuperview()
            buttons[id] = nil
        }
        for m in marks {
            let b = buttons[m.id] ?? makeButton(m.id)
            let color = RemoteCursorLayerView.color(m.color)
            var config = b.configuration ?? .filled()
            config.baseBackgroundColor = color
            config.baseForegroundColor = .white
            config.image = UIImage(systemName: m.edge == .top ? "chevron.up" : "chevron.down",
                                   withConfiguration: UIImage.SymbolConfiguration(pointSize: 10, weight: .bold))
            config.cornerStyle = .capsule
            config.contentInsets = .zero
            b.configuration = config
            let s = Self.size
            let x = min(max(m.x - s.width / 2, visible.minX + 8), visible.maxX - s.width - 8)
            let y = m.edge == .top ? visible.minY + 6 : visible.maxY - s.height - 6
            b.frame = CGRect(origin: CGPoint(x: x, y: y), size: s)
            b.accessibilityLabel = m.edge == .top ? "\(m.name) выше" : "\(m.name) ниже"
            b.accessibilityHint = "Показать, где пишет"
            b.accessibilityIdentifier = "editor.remoteCursorMark.\(m.id)"
        }
    }

    private func makeButton(_ id: UInt64) -> UIButton {
        let b = UIButton(configuration: .filled())
        b.layer.shadowColor = UIColor.black.cgColor
        b.layer.shadowOpacity = 0.15
        b.layer.shadowRadius = 3
        b.layer.shadowOffset = CGSize(width: 0, height: 1)
        b.addAction(UIAction { [weak self] _ in self?.onTap?(id) }, for: .primaryActionTriggered)
        addSubview(b)
        buttons[id] = b
        return b
    }

    func button(_ id: UInt64) -> UIButton? { buttons[id] }
}

// MARK: - EditorView

public extension EditorView {
    /// Co-authors' carets and selections (`RemoteCursor`, from their awareness states); the host
    /// sets the whole list whenever presence changes, without this person's own devices. Empty
    /// hides them all.
    func setRemoteCursors(_ cursors: [RemoteCursor]) {
        let old = Dictionary(remoteCursors.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        movedRemoteCursors.formUnion(cursors.filter { old[$0.id]?.head != $0.head || old[$0.id]?.anchor != $0.anchor }.map(\.id))
        remoteCursors = cursors
        resolveRemoteCursors()
    }

    /// Scrolls so that a co-author's caret is in the middle of the visible text.
    func scrollToRemoteCursor(_ id: UInt64) {
        guard let caret = remoteCaretFrames.first(where: { $0.id == id })?.caret else { return }
        let visible = visibleTextRect()
        let minY = -textView.adjustedContentInset.top
        let maxY = max(minY, textView.contentSize.height + textView.adjustedContentInset.bottom - textView.bounds.height)
        let y = textView.contentOffset.y + caret.midY - visible.midY
        textView.setContentOffset(CGPoint(x: textView.contentOffset.x, y: min(max(y, minY), maxY)), animated: !UIAccessibility.isReduceMotionEnabled)
        movedRemoteCursors.insert(id)
        layoutRemoteCursors()
    }
}

extension EditorView {
    /// Text positions of the carets (after a document change or a new list).
    func resolveRemoteCursors() {
        remoteCursorOffsets = [:]
        for c in remoteCursors {
            if let r = c.resolve(in: model, projection: projection) { remoteCursorOffsets[c.id] = r }
        }
        layoutRemoteCursors()
    }

    /// Frames of the carets and the edge marks (after layout, scrolling or resolving).
    func layoutRemoteCursors() {
        guard geometry != nil else { return }
        let lineHeight = theme.bodyFont.lineHeight
        var frames: [RemoteCaretFrame] = []
        for c in remoteCursors {
            guard let r = remoteCursorOffsets[c.id], let line = geometry.lineFrame(at: r.head) else { continue }
            let x = geometry.caretX(at: r.head) ?? line.minX
            // An atom block (an image, a diagram) is one tall line: the caret keeps a text height.
            let height = min(line.height, lineHeight * 1.6)
            let caret = CGRect(x: x, y: line.minY, width: RemoteCaretView.lineWidth, height: height)
            let range = min(r.anchor, r.head)..<max(r.anchor, r.head)
            frames.append(RemoteCaretFrame(id: c.id, name: c.name, color: c.color, caret: caret,
                                           selection: range.isEmpty ? [] : geometry.segmentFrames(range)))
        }
        remoteCaretFrames = frames
        remoteCursorLayer.update(frames, moved: movedRemoteCursors)
        movedRemoteCursors = []
        updateRemoteCursorMarks()
    }

    /// The part of the text view's bounds where text is visible (not under the keyboard, the
    /// host's palette or bars), in content coordinates.
    func visibleTextRect() -> CGRect {
        var visible = textView.bounds.inset(by: textView.adjustedContentInset)
        visible.origin.y += overlayInsets.top
        visible.size.height -= overlayInsets.top + overlayInsets.bottom
        return visible
    }

    func updateRemoteCursorMarks() {
        if remoteCursorMarks.frame != bounds { remoteCursorMarks.frame = bounds }
        let visible = visibleTextRect()
        var marks: [RemoteCursorMarksView.Mark] = []
        for f in remoteCaretFrames {
            let edge: RemoteCursorMarksView.Edge
            if f.caret.maxY <= visible.minY { edge = .top } else if f.caret.minY >= visible.maxY { edge = .bottom } else { continue }
            let x = textView.convert(CGPoint(x: f.caret.midX, y: 0), to: self).x
            marks.append(.init(id: f.id, name: f.name, color: f.color, edge: edge, x: x))
        }
        remoteCursorMarks.update(marks, visible: textView.convert(visible, to: self))
    }
}

extension TextGeometry {
    /// The x of a caret before the character at `offset` (content coordinates).
    func caretX(at offset: Int) -> CGFloat? {
        guard let frag = fragment(at: offset) else { return nil }
        let local = offset - self.offset(of: frag.rangeInElement.location)
        let lines = frag.textLineFragments
        guard let line = lines.first(where: { NSLocationInRange(local, $0.characterRange) }) ?? lines.last else { return nil }
        let x = line.locationForCharacter(at: min(local, line.characterRange.upperBound)).x
        return frag.layoutFragmentFrame.minX + line.typographicBounds.minX + x + origin.x
    }

    /// The frames of a range's text segments, one or more per line (content coordinates).
    func segmentFrames(_ range: Range<Int>) -> [CGRect] {
        guard let r = textRange(range) else { return [] }
        var frames: [CGRect] = []
        layoutManager.enumerateTextSegments(in: r, type: .selection, options: [.rangeNotRequired]) { _, frame, _, _ in
            if frame.width > 0.5 { frames.append(frame.offsetBy(dx: self.origin.x, dy: self.origin.y)) }
            return true
        }
        return frames
    }
}
#endif
