#if canImport(UIKit)
import UIKit
import DSEditorModel

/// What a dictation placeholder shows.
public enum DictationPlaceholderState: Equatable, Sendable {
    /// The recording is being recognised; `seconds` is its length («Распознаю… 0:42»).
    case recognising(seconds: Int)
    /// Recognition failed («Запись не распознана»; a tap reaches `onDictationPlaceholderTap`).
    case failed(code: String)
}

/// A recording's place in the text while it is recognised (`spec/04-editor.md`, «Голос: заглушка
/// в тексте»). A chip drawn over the text at its anchor: local to this device and this editor —
/// not in the document, the sync or undo, so other devices and the saved note never see it.
final class DictationPlaceholderView: UIView {
    let id: String
    var anchor: DictationAnchor
    private(set) var state: DictationPlaceholderState
    private let icon = UIImageView()
    private let label = UILabel()
    var onTap: ((String) -> Void)?

    static let height: CGFloat = 24
    static let gap: CGFloat = 4

    init(id: String, anchor: DictationAnchor, state: DictationPlaceholderState, font: UIFont) {
        self.id = id
        self.anchor = anchor
        self.state = state
        super.init(frame: .zero)
        // Taps come through the editor's own recognizer (`EditorView.tapped`): the text view's
        // gestures would take them from a recognizer here.
        isUserInteractionEnabled = false
        layer.cornerRadius = Self.height / 2
        layer.cornerCurve = .continuous
        icon.contentMode = .scaleAspectFit
        icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: font.pointSize * 0.85, weight: .medium)
        label.font = font
        label.adjustsFontForContentSizeCategory = false
        addSubview(icon)
        addSubview(label)
        isAccessibilityElement = true
        accessibilityIdentifier = "editor.dictationPlaceholder.\(id)"
        apply(state)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    func apply(_ state: DictationPlaceholderState) {
        self.state = state
        switch state {
        case .recognising(let seconds):
            let s = max(0, seconds)
            label.text = "Распознаю… \(s / 60):" + String(format: "%02d", s % 60)
            label.textColor = EditorTheme.secondaryText
            icon.image = UIImage(systemName: "mic.fill")
            icon.tintColor = EditorTheme.accent
            backgroundColor = EditorTheme.accent.withAlphaComponent(0.10)
            accessibilityTraits = [.updatesFrequently]
            pulse(true)
        case .failed:
            label.text = "Запись не распознана"
            label.textColor = EditorTheme.error
            icon.image = UIImage(systemName: "exclamationmark.circle.fill")
            icon.tintColor = EditorTheme.error
            backgroundColor = EditorTheme.error.withAlphaComponent(0.10)
            accessibilityTraits = [.button]
            accessibilityHint = "Показать варианты"
            pulse(false)
        }
        accessibilityLabel = label.text
        setNeedsLayout()
    }

    /// A slow breath while recognising; none with Reduce Motion.
    private func pulse(_ on: Bool) {
        layer.removeAnimation(forKey: "pulse")
        guard on, !UIAccessibility.isReduceMotionEnabled else { return }
        let a = CABasicAnimation(keyPath: "opacity")
        a.fromValue = 1
        a.toValue = 0.55
        a.duration = 0.9
        a.autoreverses = true
        a.repeatCount = .infinity
        a.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        layer.add(a, forKey: "pulse")
    }

    override func sizeThatFits(_ size: CGSize) -> CGSize {
        let text = label.sizeThatFits(CGSize(width: CGFloat.greatestFiniteMagnitude, height: Self.height))
        return CGSize(width: ceil(8 + 16 + 5 + text.width + 10), height: Self.height)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        icon.frame = CGRect(x: 8, y: (bounds.height - 16) / 2, width: 16, height: 16)
        let x = icon.frame.maxX + 5
        label.frame = CGRect(x: x, y: 0, width: max(0, bounds.width - x - 10), height: bounds.height)
    }

    /// The host's callback when a failed placeholder is tapped (VoiceOver activates it too).
    @objc func tapped() {
        if case .failed = state { onTap?(id) }
    }

    override func accessibilityActivate() -> Bool {
        guard case .failed = state else { return false }
        tapped()
        return true
    }
}

extension EditorView {
    // MARK: - Dictation placeholders (D-65)

    /// Puts a placeholder for a recording at `anchor` (nil: at the caret, or the end of the note
    /// without one), showing «Распознаю…». An existing placeholder with the same id is moved.
    /// - Returns: the anchor to keep with the recording, or nil when `anchor` is lost (its
    ///   paragraph is gone): the host then falls back to the caret.
    @discardableResult
    public func insertDictationPlaceholder(id: String, at anchor: DictationAnchor? = nil,
                                           state: DictationPlaceholderState = .recognising(seconds: 0)) -> DictationAnchor? {
        let place: DictationAnchor
        if let anchor {
            guard let p = anchor.resolve(in: model) else { return nil }
            place = DictationAnchor.at(p, in: model)
        } else {
            let caret = projection.textPosition(at: selectionRange.upperBound)
                ?? projection.textPosition(at: projection.length)
            guard let caret else { return nil }
            place = DictationAnchor.at(caret, in: model)
        }
        removeDictationPlaceholder(id: id)
        let font = UIFont.systemFont(ofSize: max(12, theme.bodyFont.pointSize * 0.8), weight: .medium)
        let view = DictationPlaceholderView(id: id, anchor: place, state: state, font: font)
        view.onTap = { [weak self] id in self?.onDictationPlaceholderTap?(id) }
        textView.insertSubview(view, belowSubview: inkOver)
        dictationPlaceholders[id] = view
        textView.layoutIfNeeded()
        layoutDictationPlaceholders()
        return place
    }

    /// Shows a new state («Распознаю… 0:42», «Запись не распознана»).
    public func updateDictationPlaceholder(id: String, state: DictationPlaceholderState) {
        guard let view = dictationPlaceholders[id], view.state != state else { return }
        view.apply(state)
        layoutDictationPlaceholders()
    }

    /// The placeholder's current anchor (to keep with the recording), nil without it.
    public func dictationPlaceholderAnchor(id: String) -> DictationAnchor? {
        dictationPlaceholders[id]?.anchor
    }

    /// The ids of the placeholders in the text.
    public var dictationPlaceholderIDs: [String] { dictationPlaceholders.keys.sorted() }

    /// The recognised text takes the placeholder's place: one undo step, marked as a voice edit
    /// (`agentEdit` with `agentId: "voice"`, «Принять» on the banner). The person's caret stays
    /// with the text it was in.
    /// - Returns: false when the placeholder is not there or its place is lost.
    @discardableResult
    public func replaceDictationPlaceholder(id: String, markdown: String) -> Bool {
        guard !model.isReadOnly, let view = dictationPlaceholders[id] else { return false }
        removeDictationPlaceholder(id: id)
        guard let p = view.anchor.resolve(in: model), let at = projection.offset(block: p.block, offset: p.offset) else { return false }
        let before = selectionRange
        let length = projection.length
        let resolver = attachmentResolver
        var inserted = false
        keepingScroll {
            inserted = commands.replaceWithSuggestion(markdown, scope: .selection, selection: at..<at,
                                                      resolveNoteLink: resolver.map { r in { r.noteId(forLinkLabel: $0) } }) != nil
        }
        guard inserted else { return false }
        // The caret after the place moves with the text; before it, it stays.
        let delta = projection.length - length
        let shift = { (o: Int) in o >= at ? o + delta : o }
        textView.selectedRange = NSRange(location: shift(before.lowerBound), length: shift(before.upperBound) - shift(before.lowerBound))
        notifyStateChange()
        return true
    }

    /// Removes the placeholder (the recording was discarded).
    public func removeDictationPlaceholder(id: String) {
        guard let view = dictationPlaceholders.removeValue(forKey: id) else { return }
        view.removeFromSuperview()
        // Its room closes.
        layoutDictationPlaceholders()
    }

    /// After a change of the document: the anchors are resolved again once it is laid out.
    func scheduleDictationPlaceholderLayout() {
        guard !dictationPlaceholders.isEmpty || !dictationGaps.current.isEmpty, !dictationPlaceholderLayoutScheduled else { return }
        dictationPlaceholderLayoutScheduled = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.dictationPlaceholderLayoutScheduled = false
            self.textView.layoutIfNeeded()
            self.layoutDictationPlaceholders()
            // A paragraph the renderer drew again gets its room back.
            self.applyDictationGaps()
        }
    }

    /// The caret's x and its line at a flat offset, from the layout; where the layout has no
    /// fragment (the very end of the text, a part not laid out yet) the text view's caret.
    func dictationCaret(at offset: Int) -> (x: CGFloat, line: CGRect)? {
        if let line = geometry.lineFrame(at: offset), let x = geometry.caretX(at: offset) { return (x, line) }
        guard let pos = textView.position(from: textView.beginningOfDocument, offset: offset) else { return nil }
        let r = textView.caretRect(for: pos)
        guard !r.isNull, !r.isInfinite, r.height > 0 else { return nil }
        let left = textView.textContainerInset.left
        return (r.minX, CGRect(x: left, y: r.minY, width: max(1, textView.bounds.width - left - textView.textContainerInset.right), height: r.height))
    }

    /// The failed placeholder under a point (text view coordinates): its tap goes to the host.
    func failedDictationPlaceholder(at point: CGPoint) -> String? {
        for view in dictationPlaceholders.values where !view.isHidden {
            guard case .failed = view.state, view.frame.insetBy(dx: -6, dy: -6).contains(point) else { continue }
            return view.id
        }
        return nil
    }

    /// Each paragraph that holds placeholders keeps room under it for them — a display-only
    /// paragraph spacing in the rendered text (`dictationGaps`), never in the document, the
    /// sync or undo — so a chip never covers text. The chips sit in that room under their
    /// anchor's x; the room opens and closes smoothly (at once with Reduce Motion).
    func layoutDictationPlaceholders() {
        guard geometry != nil else { return }
        var targets: [BlockID: CGFloat] = [:]
        for view in dictationPlaceholders.values {
            guard let p = view.anchor.resolve(in: model), projection.indexByBlock[p.block] != nil else {
                view.isHidden = true
                continue
            }
            // Keep the stored offset fresh for the host.
            view.anchor.block = p.block
            view.anchor.offset = p.offset
            view.isHidden = false
            targets[p.block, default: Self.dictationRoomPadding] += DictationPlaceholderView.height + Self.dictationRowGap
        }
        dictationGaps.set(targets, animated: !UIAccessibility.isReduceMotionEnabled && window != nil)
        positionDictationChips()
    }

    static let dictationRoomPadding: CGFloat = 6
    static let dictationRowGap: CGFloat = 6
    static let dictationGapKey = NSAttributedString.Key("ds.dictationGap")

    /// The chips in their paragraph's room, one row each, under the anchor's x.
    func positionDictationChips() {
        guard geometry != nil else { return }
        let left = textView.textContainerInset.left
        let right = textView.bounds.width - textView.textContainerInset.right
        var row: [BlockID: Int] = [:]
        for view in dictationPlaceholders.values.sorted(by: { $0.id < $1.id }) where !view.isHidden {
            let block = view.anchor.block
            guard let i = projection.indexByBlock[block],
                  let at = projection.offset(block: block, offset: view.anchor.offset),
                  let caret = dictationCaret(at: at),
                  let last = dictationCaret(at: projection.starts[i] + projection.paragraphs[i].length) else { continue }
            let k = row[block, default: 0]
            row[block] = k + 1
            let size = view.sizeThatFits(.zero)
            let width = min(size.width, right - left)
            let x = max(left, min(caret.x - 10, right - width))
            let y = last.line.maxY + Self.dictationRoomPadding / 2 + CGFloat(k) * (DictationPlaceholderView.height + Self.dictationRowGap)
            let frame = CGRect(x: x, y: y, width: width, height: size.height).integral
            if view.frame != frame { view.frame = frame }
            // Fades in as its room opens.
            let target = dictationGaps.target[block] ?? 0
            view.alpha = target > 0 ? min(1, (dictationGaps.current[block] ?? 0) / target) : 1
        }
    }

    /// Writes the current room of each paragraph into the rendered text as extra paragraph
    /// spacing (marked, so a paragraph the renderer drew again gets it back and a closed room
    /// gives back exactly what it took). Only attributes change: offsets, ink anchors and the
    /// document stay as they are; ink below moves down with the text.
    func applyDictationGaps() {
        let storage = textView.textStorage
        var blocks = Set(dictationGaps.current.keys)
        storage.enumerateAttribute(Self.dictationGapKey, in: NSRange(location: 0, length: storage.length)) { value, range, _ in
            guard value != nil, let pos = projection.textPosition(at: range.location) else { return }
            blocks.insert(pos.block)
        }
        var changed = false
        for block in blocks {
            guard let i = projection.indexByBlock[block] else { continue }
            let start = projection.starts[i]
            let end = min(storage.length, start + projection.paragraphs[i].length + 1)
            guard start < storage.length, end > start else { continue }
            let want = dictationGaps.current[block] ?? 0
            let had = (storage.attribute(Self.dictationGapKey, at: start, effectiveRange: nil) as? CGFloat) ?? 0
            guard abs(want - had) > 0.25 else { continue }
            let range = NSRange(location: start, length: end - start)
            suppressDelegate = true
            storage.beginEditing()
            storage.enumerateAttribute(.paragraphStyle, in: range) { value, r, _ in
                let style = ((value as? NSParagraphStyle) ?? .default).mutableCopy() as! NSMutableParagraphStyle
                style.paragraphSpacing = max(0, style.paragraphSpacing - had + want)
                storage.addAttribute(.paragraphStyle, value: style, range: r)
            }
            if want > 0 {
                storage.addAttribute(Self.dictationGapKey, value: want, range: range)
            } else {
                storage.removeAttribute(Self.dictationGapKey, range: range)
            }
            storage.endEditing()
            suppressDelegate = false
            changed = true
        }
        guard changed else { positionDictationChips(); return }
        textView.layoutIfNeeded()
        ink.invalidateLayout()
        setNeedsInkRefresh()
        positionDictationChips()
    }
}

/// The room under paragraphs for dictation placeholders, opening and closing over a short ease.
@MainActor
final class DictationGapAnimator: NSObject {
    private(set) var current: [BlockID: CGFloat] = [:]
    private(set) var target: [BlockID: CGFloat] = [:]
    private var from: [BlockID: CGFloat] = [:]
    private var start: CFTimeInterval = 0
    private var link: CADisplayLink?
    var onTick: (() -> Void)?
    /// Seconds to open or close (tests set 0).
    static var duration: CFTimeInterval = 0.22

    func set(_ targets: [BlockID: CGFloat], animated: Bool) {
        guard targets != target else { return }
        target = targets
        from = current
        if !animated || Self.duration <= 0 {
            link?.invalidate()
            link = nil
            current = targets
            // Not inside the layout pass that asked for it.
            DispatchQueue.main.async { [weak self] in self?.onTick?() }
            return
        }
        start = CACurrentMediaTime()
        if link == nil {
            let l = CADisplayLink(target: self, selector: #selector(tick))
            l.add(to: .main, forMode: .common)
            link = l
        }
    }

    @objc private func tick() {
        let p = min(1, (CACurrentMediaTime() - start) / Self.duration)
        let e = CGFloat(1 - pow(1 - p, 3))
        var next: [BlockID: CGFloat] = [:]
        for key in Set(from.keys).union(target.keys) {
            let v = (from[key] ?? 0) + ((target[key] ?? 0) - (from[key] ?? 0)) * e
            if v > 0.25 { next[key] = v }
        }
        current = p >= 1 ? target : next
        if p >= 1 {
            link?.invalidate()
            link = nil
        }
        onTick?()
    }
}
#endif
