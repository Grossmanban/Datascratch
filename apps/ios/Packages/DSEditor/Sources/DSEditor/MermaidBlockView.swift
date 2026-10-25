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
        if let img = MermaidRenderer.shared.cachedImage(for: source) {
            show(img)
        } else {
            MermaidRenderer.shared.render(source) { [weak self] img in
                guard let self, let img, self.node?.attrs["source"]?.stringValue == source else { return }
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
