#if canImport(UIKit)
import DSEditorModel
import UIKit

/// Mermaid diagram block. Shows the rendered image when `MermaidRenderer` has one, otherwise the source.
final class MermaidBlockView: BlockContentView {
    private let imageView = UIImageView()
    private let sourceLabel = UILabel()

    static func height(for node: BlockNode, width: CGFloat) -> CGFloat {
        let source = node.attrs["source"]?.stringValue ?? ""
        if let size = MermaidRenderer.shared.cachedSize(for: source), size.width > 0 {
            return min(size.height * min(1, width / size.width), 600) + 16
        }
        let lines = source.split(separator: "\n", omittingEmptySubsequences: false).count
        return CGFloat(max(2, lines)) * 18 + 32
    }

    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        let source = node.attrs["source"]?.stringValue ?? ""
        backgroundColor = EditorTheme.codeBackground.withAlphaComponent(0.6)
        layer.cornerRadius = 12
        imageView.contentMode = .scaleAspectFit
        sourceLabel.numberOfLines = 0
        sourceLabel.font = theme.font(size: 13, design: .monospaced)
        sourceLabel.textColor = EditorTheme.secondaryText
        sourceLabel.text = source
        if imageView.superview == nil {
            addSubview(sourceLabel)
            addSubview(imageView)
        }
        isAccessibilityElement = true
        accessibilityLabel = "Диаграмма Mermaid"
        if traitObservation == nil {
            traitObservation = registerForTraitChanges([UITraitUserInterfaceStyle.self]) { (view: MermaidBlockView, _) in
                view.loadImage()
            }
        }
        loadImage()
    }

    private var traitObservation: (any UITraitChangeRegistration)?

    /// Shows the diagram for the current appearance (rendering it if needed); the source text
    /// stays visible until then, or if Mermaid cannot render it.
    private func loadImage() {
        let source = node?.attrs["source"]?.stringValue ?? ""
        let dark = traitCollection.userInterfaceStyle == .dark
        if let img = MermaidRenderer.shared.cachedImage(for: source, dark: dark) {
            show(img)
        } else {
            imageView.image = nil
            sourceLabel.isHidden = false
            MermaidRenderer.shared.render(source, dark: dark) { [weak self] img in
                guard let self, let img, self.node?.attrs["source"]?.stringValue == source,
                      (self.traitCollection.userInterfaceStyle == .dark) == dark else { return }
                self.show(img)
            }
        }
    }

    private func show(_ image: UIImage) {
        imageView.image = image
        sourceLabel.isHidden = true
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        imageView.frame = bounds.insetBy(dx: 8, dy: 8)
        sourceLabel.frame = bounds.insetBy(dx: 14, dy: 12)
    }
}
#endif
