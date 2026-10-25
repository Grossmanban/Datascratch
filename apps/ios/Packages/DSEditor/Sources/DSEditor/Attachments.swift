#if canImport(UIKit)
import DSEditorModel
import UIKit

/// Host-provided data for attachments (images, note titles). The demo uses an in-memory store.
@MainActor
public protocol EditorAttachmentResolver: AnyObject {
    func image(for attachmentId: String) -> UIImage?
    func noteTitle(for noteId: String) -> String?
}

/// Creates attachments for atom blocks and inline atoms; caches them by node so unchanged blocks
/// keep their views across re-renders.
@MainActor
final class AttachmentFactory {
    weak var resolver: EditorAttachmentResolver?
    var theme: EditorTheme
    private var cache: [BlockID: BlockAttachment] = [:]

    init(theme: EditorTheme) { self.theme = theme }

    func blockAttachment(for para: ProjectedParagraph) -> NSTextAttachment {
        let node = para.node ?? BlockNode(id: para.blockId, type: para.kind.type, attrs: para.attrs)
        if let cached = cache[para.blockId], cached.node == node { return cached }
        let a = BlockAttachment(node: node, factory: self)
        cache[para.blockId] = a
        return a
    }

    func inlineAttachment(for atom: InlineAtom, font: UIFont) -> NSTextAttachment {
        let text: String
        let color: UIColor
        switch atom.type {
        case NodeType.noteLink:
            let label = atom.attrs["label"]?.stringValue ?? ""
            text = "↗ " + (resolver?.noteTitle(for: atom.attrs["noteId"]?.stringValue ?? "") ?? label)
            color = EditorTheme.accent
        case NodeType.tag:
            text = "#" + (atom.attrs["name"]?.stringValue ?? "")
            color = EditorTheme.secondaryText
        default:
            text = "◇"
            color = EditorTheme.secondaryText
        }
        let chipFont = font.withSize(font.pointSize * 0.92)
        let attributed = NSAttributedString(string: text, attributes: [.font: chipFont, .foregroundColor: color])
        let textSize = attributed.size()
        let size = CGSize(width: ceil(textSize.width) + 12, height: ceil(chipFont.lineHeight) + 2)
        let format = UIGraphicsImageRendererFormat.preferred()
        let image = UIGraphicsImageRenderer(size: size, format: format).image { _ in
            EditorTheme.chipBackground.setFill()
            UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: size.height / 2).fill()
            attributed.draw(at: CGPoint(x: 6, y: (size.height - textSize.height) / 2))
        }
        let a = InlineAtomAttachment(image: image)
        a.atom = atom
        a.bounds = CGRect(x: 0, y: font.descender - 1, width: size.width, height: size.height)
        return a
    }

    /// Height of an atom block for a given column width (also used before its view exists).
    func height(for node: BlockNode, width: CGFloat) -> CGFloat {
        switch node.type {
        case NodeType.horizontalRule: return 28
        case NodeType.drawing:
            let h = node.attrs["height"]?.numberValue ?? 240
            return CGFloat(h) * max(width, 1) / 600
        case NodeType.image:
            let fraction = CGFloat(node.attrs["width"]?.numberValue ?? 1)
            if let id = node.attrs["attachmentId"]?.stringValue, let img = resolver?.image(for: id), img.size.width > 0 {
                return width * fraction * img.size.height / img.size.width + (node.attrs["caption"]?.stringValue?.isEmpty == false ? 24 : 0)
            }
            return width * fraction * 0.56
        case NodeType.mathBlock: return MathBlockView.height(latex: node.attrs["latex"]?.stringValue ?? "", width: width)
        case NodeType.mermaid: return MermaidBlockView.height(for: node, width: width)
        case NodeType.file: return 60
        case NodeType.pageCard: return node.attrs["style"]?.stringValue == "link" ? 36 : 88
        case NodeType.table: return TableBlockView.height(for: node)
        default: return 48
        }
    }

    func makeView(for node: BlockNode) -> BlockContentView {
        let v: BlockContentView
        switch node.type {
        case NodeType.horizontalRule: v = RuleBlockView()
        case NodeType.drawing: v = DrawingBlockView()
        case NodeType.image: v = ImageBlockView()
        case NodeType.mathBlock: v = MathBlockView()
        case NodeType.mermaid: v = MermaidBlockView()
        case NodeType.file: v = FileBlockView()
        case NodeType.pageCard: v = PageCardView()
        case NodeType.table: v = TableBlockView()
        default: v = UnsupportedBlockView()
        }
        v.configure(node: node, resolver: resolver, theme: theme)
        return v
    }
}

/// Inline chip (note link, tag).
final class InlineAtomAttachment: NSTextAttachment {
    nonisolated(unsafe) var atom: InlineAtom?
}

/// Attachment of an atom block; its content is a live view.
final class BlockAttachment: NSTextAttachment {
    let node: BlockNode
    nonisolated(unsafe) weak var factory: AttachmentFactory?

    init(node: BlockNode, factory: AttachmentFactory) {
        self.node = node
        self.factory = factory
        super.init(data: nil, ofType: nil)
        allowsTextAttachmentView = true
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    override func viewProvider(for parentView: UIView?, location: NSTextLocation, textContainer: NSTextContainer?) -> NSTextAttachmentViewProvider? {
        let p = BlockAttachmentViewProvider(textAttachment: self, parentView: parentView,
                                            textLayoutManager: textContainer?.textLayoutManager, location: location)
        p.tracksTextAttachmentViewBounds = true
        return p
    }
}

final class BlockAttachmentViewProvider: NSTextAttachmentViewProvider {
    override func loadView() {
        guard let attachment = textAttachment as? BlockAttachment else { return }
        let node = attachment.node
        let made: UIView? = MainActor.assumeIsolated { attachment.factory?.makeView(for: node) }
        view = made
    }

    override func attachmentBounds(for attributes: [NSAttributedString.Key: Any], location: NSTextLocation,
                                   textContainer: NSTextContainer?, proposedLineFragment: CGRect, position: CGPoint) -> CGRect {
        guard let attachment = textAttachment as? BlockAttachment else { return .zero }
        let width = max(40, proposedLineFragment.width - 4)
        let node = attachment.node
        let height: CGFloat = MainActor.assumeIsolated { attachment.factory?.height(for: node, width: width) ?? 48 }
        return CGRect(x: 0, y: 0, width: width, height: height)
    }
}

// MARK: - Block views

class BlockContentView: UIView {
    private(set) var node: BlockNode?

    func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        self.node = node
        backgroundColor = .clear
        isOpaque = false
    }
}

final class RuleBlockView: BlockContentView {
    override func draw(_ rect: CGRect) {
        let style = node?.attrs["style"]?.stringValue ?? "line"
        let y = bounds.midY
        EditorTheme.quoteBar.setStroke()
        EditorTheme.quoteBar.setFill()
        switch style {
        case "dots":
            for i in -1...1 {
                let c = CGPoint(x: bounds.midX + CGFloat(i) * 18, y: y)
                UIBezierPath(ovalIn: CGRect(x: c.x - 2, y: c.y - 2, width: 4, height: 4)).fill()
            }
        case "wave":
            let p = UIBezierPath()
            let w = min(bounds.width, 240)
            var x = bounds.midX - w / 2
            p.move(to: CGPoint(x: x, y: y))
            while x < bounds.midX + w / 2 {
                p.addQuadCurve(to: CGPoint(x: x + 12, y: y), controlPoint: CGPoint(x: x + 6, y: y - 5))
                p.addQuadCurve(to: CGPoint(x: x + 24, y: y), controlPoint: CGPoint(x: x + 18, y: y + 5))
                x += 24
            }
            p.lineWidth = 1.5
            p.stroke()
        default:
            let p = UIBezierPath()
            p.move(to: CGPoint(x: 0, y: y))
            p.addLine(to: CGPoint(x: bounds.width, y: y))
            p.lineWidth = 1
            p.stroke()
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        setNeedsDisplay()
    }
}

/// Canvas for a drawing block; the strokes themselves are rendered by the ink layer above.
final class DrawingBlockView: BlockContentView {
    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        layer.cornerRadius = 12
        layer.borderWidth = 1
        layer.borderColor = EditorTheme.paperPattern.cgColor
        backgroundColor = EditorTheme.codeBackground.withAlphaComponent(0.45)
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        layer.borderColor = EditorTheme.paperPattern.cgColor
    }

    override func draw(_ rect: CGRect) {
        EditorTheme.paperPattern.setFill()
        let step: CGFloat = 20
        var y = step
        while y < bounds.height {
            var x = step
            while x < bounds.width {
                UIBezierPath(ovalIn: CGRect(x: x - 0.9, y: y - 0.9, width: 1.8, height: 1.8)).fill()
                x += step
            }
            y += step
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        setNeedsDisplay()
    }
}

final class ImageBlockView: BlockContentView {
    private let imageView = UIImageView()
    private let caption = UILabel()

    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        imageView.contentMode = .scaleAspectFit
        imageView.layer.cornerRadius = 10
        imageView.clipsToBounds = true
        imageView.backgroundColor = EditorTheme.codeBackground
        if let id = node.attrs["attachmentId"]?.stringValue, let img = resolver?.image(for: id) {
            imageView.image = img
        } else {
            imageView.image = UIImage(systemName: "photo")
            imageView.tintColor = EditorTheme.secondaryText
            imageView.contentMode = .center
        }
        caption.text = node.attrs["caption"]?.stringValue
        caption.font = theme.font(size: 13, italic: true)
        caption.textColor = EditorTheme.secondaryText
        caption.textAlignment = .center
        if imageView.superview == nil {
            addSubview(imageView)
            addSubview(caption)
        }
        accessibilityLabel = node.attrs["alt"]?.stringValue
        isAccessibilityElement = true
        accessibilityTraits = .image
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let hasCaption = caption.text?.isEmpty == false
        let fraction = CGFloat(node?.attrs["width"]?.numberValue ?? 1)
        let w = bounds.width * fraction
        imageView.frame = CGRect(x: (bounds.width - w) / 2, y: 0, width: w, height: bounds.height - (hasCaption ? 24 : 0))
        caption.frame = CGRect(x: 0, y: bounds.height - 22, width: bounds.width, height: 20)
    }
}

final class FileBlockView: BlockContentView {
    private let icon = UIImageView(image: UIImage(systemName: "doc.fill"))
    private let name = UILabel()
    private let detail = UILabel()

    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        backgroundColor = EditorTheme.codeBackground
        layer.cornerRadius = 12
        icon.tintColor = EditorTheme.accent
        icon.contentMode = .scaleAspectFit
        name.text = node.attrs["name"]?.stringValue ?? "Файл"
        name.font = theme.font(size: 15, weight: .medium, design: .default)
        name.textColor = EditorTheme.text
        let size = node.attrs["size"]?.numberValue ?? 0
        detail.text = ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file) + " · " + (node.attrs["mime"]?.stringValue ?? "")
        detail.font = theme.font(size: 12, design: .default)
        detail.textColor = EditorTheme.secondaryText
        if icon.superview == nil { [icon, name, detail].forEach(addSubview) }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        icon.frame = CGRect(x: 14, y: (bounds.height - 28) / 2, width: 28, height: 28)
        name.frame = CGRect(x: 54, y: bounds.midY - 19, width: bounds.width - 66, height: 20)
        detail.frame = CGRect(x: 54, y: bounds.midY + 2, width: bounds.width - 66, height: 16)
    }
}

final class PageCardView: BlockContentView {
    private let title = UILabel()
    private let icon = UIImageView(image: UIImage(systemName: "doc.text"))

    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        let isLink = node.attrs["style"]?.stringValue == "link"
        let noteId = node.attrs["noteId"]?.stringValue ?? ""
        title.text = resolver?.noteTitle(for: noteId) ?? "Документ"
        title.font = theme.font(size: isLink ? 16 : 19, weight: .semibold)
        title.textColor = isLink ? EditorTheme.accent : EditorTheme.text
        icon.tintColor = EditorTheme.accent
        if !isLink {
            backgroundColor = EditorTheme.paper
            layer.cornerRadius = 14
            layer.shadowColor = UIColor.black.cgColor
            layer.shadowOpacity = 0.08
            layer.shadowRadius = 10
            layer.shadowOffset = CGSize(width: 0, height: 3)
            layer.borderWidth = 0.5
            layer.borderColor = EditorTheme.paperPattern.cgColor
        }
        if title.superview == nil {
            addSubview(icon)
            addSubview(title)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        icon.frame = CGRect(x: 14, y: (bounds.height - 22) / 2, width: 22, height: 22)
        title.frame = CGRect(x: 46, y: 0, width: bounds.width - 58, height: bounds.height)
    }
}

final class TableBlockView: BlockContentView {
    static let rowHeight: CGFloat = 38

    static func rows(_ node: BlockNode) -> [[(text: String, header: Bool)]] {
        node.children.map { row in row.children.map { cell in (cell.plainText, cell.type == NodeType.tableHeader) } }
    }

    static func height(for node: BlockNode) -> CGFloat { CGFloat(max(1, node.children.count)) * rowHeight + 2 }

    private var labels: [UILabel] = []

    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        labels.forEach { $0.removeFromSuperview() }
        labels = []
        layer.cornerRadius = 8
        layer.borderWidth = 1
        layer.borderColor = EditorTheme.quoteBar.cgColor
        clipsToBounds = true
        for row in Self.rows(node) {
            for cell in row {
                let l = PaddedLabel()
                l.text = cell.text
                l.font = theme.font(size: 15, weight: cell.header ? .semibold : .regular)
                l.textColor = EditorTheme.text
                l.backgroundColor = cell.header ? EditorTheme.codeBackground : .clear
                l.layer.borderWidth = 0.5
                l.layer.borderColor = EditorTheme.quoteBar.cgColor
                addSubview(l)
                labels.append(l)
            }
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard let node else { return }
        var i = 0
        for (r, row) in Self.rows(node).enumerated() {
            let w = bounds.width / CGFloat(max(1, row.count))
            for c in row.indices where i < labels.count {
                labels[i].frame = CGRect(x: CGFloat(c) * w, y: CGFloat(r) * Self.rowHeight, width: w, height: Self.rowHeight)
                i += 1
            }
        }
    }
}

final class PaddedLabel: UILabel {
    override func drawText(in rect: CGRect) { super.drawText(in: rect.insetBy(dx: 10, dy: 0)) }
}

final class UnsupportedBlockView: BlockContentView {
    private let label = UILabel()

    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        backgroundColor = EditorTheme.codeBackground
        layer.cornerRadius = 10
        label.text = "Неподдерживаемый блок: \(node.type)"
        label.font = theme.font(size: 14, design: .default)
        label.textColor = EditorTheme.secondaryText
        label.textAlignment = .center
        if label.superview == nil { addSubview(label) }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        label.frame = bounds
    }
}
#endif
