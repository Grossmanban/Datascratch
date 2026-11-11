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
        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tapped)))
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
            isUserInteractionEnabled = false
            pulse(true)
        case .failed:
            label.text = "Запись не распознана"
            label.textColor = EditorTheme.error
            icon.image = UIImage(systemName: "exclamationmark.circle.fill")
            icon.tintColor = EditorTheme.error
            backgroundColor = EditorTheme.error.withAlphaComponent(0.10)
            accessibilityTraits = [.button]
            accessibilityHint = "Показать варианты"
            isUserInteractionEnabled = true
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

    @objc func tapped() {
        if case .failed = state { onTap?(id) }
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
    }

    /// After a change of the document: the anchors are resolved again once it is laid out.
    func scheduleDictationPlaceholderLayout() {
        guard !dictationPlaceholders.isEmpty, !dictationPlaceholderLayoutScheduled else { return }
        dictationPlaceholderLayoutScheduled = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.dictationPlaceholderLayoutScheduled = false
            self.textView.layoutIfNeeded()
            self.layoutDictationPlaceholders()
        }
    }

    /// The caret's x at a flat offset; at the very end of the text the layout has no fragment
    /// there, so the text view's caret is used.
    func dictationCaretX(at offset: Int) -> CGFloat? {
        if let x = geometry.caretX(at: offset) { return x }
        guard let pos = textView.position(from: textView.beginningOfDocument, offset: offset) else { return nil }
        let r = textView.caretRect(for: pos)
        return r.isNull || r.isInfinite ? nil : r.minX
    }

    /// Each chip at its place: just after the caret position on its line, or at the start of the
    /// next line when the line has no room for it. Hidden while its paragraph is gone.
    func layoutDictationPlaceholders() {
        guard geometry != nil else { return }
        let left = textView.textContainerInset.left
        let right = textView.bounds.width - textView.textContainerInset.right
        for view in dictationPlaceholders.values {
            guard let p = view.anchor.resolve(in: model),
                  let at = projection.offset(block: p.block, offset: p.offset),
                  let line = geometry.lineFrame(at: at) else {
                view.isHidden = true
                continue
            }
            // Keep the stored offset fresh for the host.
            view.anchor.block = p.block
            view.anchor.offset = p.offset
            view.isHidden = false
            let size = view.sizeThatFits(.zero)
            let lineHeight = min(line.height, theme.bodyFont.lineHeight * 1.6)
            var x = (dictationCaretX(at: at) ?? line.minX) + DictationPlaceholderView.gap
            var y = line.minY + (lineHeight - size.height) / 2
            if x + size.width > right {
                x = left
                y = line.minY + lineHeight + 2
            }
            let frame = CGRect(x: x, y: y, width: min(size.width, right - left), height: size.height).integral
            if view.frame != frame { view.frame = frame }
        }
    }
}
#endif
