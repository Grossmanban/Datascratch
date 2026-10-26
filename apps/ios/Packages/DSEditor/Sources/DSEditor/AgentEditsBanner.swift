#if canImport(UIKit)
import DSDesign
import UIKit

/// Calm banner above the first block while the note has unaccepted agent edits (D-10,
/// `spec/04-editor.md`): "Правки агента · Принять все", plus "Посмотреть историю" when the host
/// can show the note's history. Scrolls with the text, like the header.
final class AgentEditsBanner: UIView {
    static let height: CGFloat = 44

    var onAcceptAll: (() -> Void)?
    var onShowHistory: (() -> Void)? {
        didSet { historyButton.isHidden = onShowHistory == nil }
    }

    private let dot = UIView()
    private let label = UILabel()
    private let historyButton = UIButton(type: .system)
    private let acceptButton = UIButton(type: .system)

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = DSTintToken.green.value.bg.uiColor.withAlphaComponent(0.7)
        layer.cornerRadius = 12
        layer.cornerCurve = .continuous

        dot.backgroundColor = EditorTheme.agentEdit
        dot.layer.cornerRadius = 1.5
        label.text = "Правки агента"
        label.font = UIFont.preferredFont(forTextStyle: .subheadline)
        label.adjustsFontForContentSizeCategory = true
        label.textColor = EditorTheme.secondaryText

        var history = UIButton.Configuration.plain()
        history.title = "Посмотреть историю"
        history.baseForegroundColor = EditorTheme.secondaryText
        history.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8)
        historyButton.configuration = history
        historyButton.isHidden = true
        historyButton.addAction(UIAction { [weak self] _ in self?.onShowHistory?() }, for: .primaryActionTriggered)
        historyButton.accessibilityIdentifier = "agentEdits.history"

        var accept = UIButton.Configuration.plain()
        accept.title = "Принять все"
        accept.baseForegroundColor = DSTintToken.green.value.fg.uiColor
        accept.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8)
        acceptButton.configuration = accept
        acceptButton.addAction(UIAction { [weak self] _ in self?.onAcceptAll?() }, for: .primaryActionTriggered)
        acceptButton.accessibilityIdentifier = "agentEdits.acceptAll"

        for v in [dot, label, historyButton, acceptButton] { addSubview(v) }
        accessibilityIdentifier = "agentEdits.banner"
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    override func layoutSubviews() {
        super.layoutSubviews()
        let h = bounds.height
        dot.frame = CGRect(x: 12, y: (h - 16) / 2, width: 3, height: 16)
        let accept = acceptButton.sizeThatFits(bounds.size)
        acceptButton.frame = CGRect(x: bounds.width - accept.width - 4, y: (h - accept.height) / 2,
                                    width: accept.width, height: accept.height)
        var right = acceptButton.frame.minX
        if !historyButton.isHidden {
            let history = historyButton.sizeThatFits(bounds.size)
            // On a narrow column the history action gives way to the label and "Принять все".
            let fits = right - history.width > 24 + label.intrinsicContentSize.width + 8
            historyButton.alpha = fits ? 1 : 0
            if fits {
                historyButton.frame = CGRect(x: right - history.width, y: (h - history.height) / 2,
                                             width: history.width, height: history.height)
                right = historyButton.frame.minX
            }
        }
        label.frame = CGRect(x: 24, y: 0, width: max(0, right - 24 - 4), height: h)
    }
}
#endif
