#if canImport(UIKit)
import DSEditorModel
import SwiftMath
import UIKit

/// LaTeX formula rendered natively with SwiftMath.
final class MathBlockView: BlockContentView {
    private let label = MTMathUILabel()
    private static var heightCache: [String: CGFloat] = [:]

    static func makeLabel(latex: String) -> MTMathUILabel {
        let l = MTMathUILabel()
        l.latex = latex
        l.fontSize = 22
        l.labelMode = .display
        l.textAlignment = .center
        l.textColor = EditorTheme.text
        return l
    }

    static func height(latex: String, width: CGFloat) -> CGFloat {
        let key = "\(Int(width))|\(latex)"
        if let h = heightCache[key] { return h }
        let l = makeLabel(latex: latex)
        let size = l.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude))
        let h = max(44, ceil(size.height) + 20)
        heightCache[key] = h
        return h
    }

    override func configure(node: BlockNode, resolver: EditorAttachmentResolver?, theme: EditorTheme) {
        super.configure(node: node, resolver: resolver, theme: theme)
        label.latex = node.attrs["latex"]?.stringValue ?? ""
        label.fontSize = 22
        label.labelMode = .display
        label.textAlignment = .center
        label.textColor = EditorTheme.text
        if label.superview == nil { addSubview(label) }
        isAccessibilityElement = true
        accessibilityLabel = "Формула: " + (node.attrs["latex"]?.stringValue ?? "")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        label.frame = bounds.insetBy(dx: 0, dy: 10)
    }
}
#endif
