#if canImport(UIKit)
import DSEditorModel
import SwiftMath
import UIKit

/// LaTeX formula rendered natively with SwiftMath.
final class MathBlockView: BlockContentView {
    private let label = MTMathUILabel()
    /// Space between the formula's ink and the block's top and bottom edges.
    static let padding: CGFloat = 12
    private struct Metrics {
        var height: CGFloat
        /// Height of the label the formula is drawn in (taller than the formula, so nothing of it
        /// is cut) and the formula's ink within it.
        var labelHeight: CGFloat
        var ink: CGRect
    }
    private static var metricsCache: [String: Metrics] = [:]

    static func makeLabel(latex: String) -> MTMathUILabel {
        let l = MTMathUILabel()
        l.latex = latex
        l.fontSize = 22
        l.labelMode = .display
        l.textAlignment = .center
        l.textColor = EditorTheme.text
        return l
    }

    /// The block's height comes from what the formula actually draws: SwiftMath's own size
    /// (ascent + descent) left out operator limits and fraction numerators, which were cut off.
    private static func metrics(latex: String, width: CGFloat) -> Metrics {
        let key = "\(Int(width))|\(latex)"
        if let m = metricsCache[key] { return m }
        let l = makeLabel(latex: latex)
        let fit = l.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude))
        let labelHeight = ceil(fit.height) * 3 + 120
        let size = CGSize(width: max(1, width), height: labelHeight)
        l.frame = CGRect(origin: .zero, size: size)
        l.layoutIfNeeded()
        let ink = InkBounds.of(layer: l.layer, size: size)
            ?? CGRect(x: 0, y: (labelHeight - fit.height) / 2, width: width, height: fit.height)
        let m = Metrics(height: max(44, ceil(ink.height) + padding * 2), labelHeight: labelHeight, ink: ink)
        metricsCache[key] = m
        return m
    }

    static func height(latex: String, width: CGFloat) -> CGFloat {
        metrics(latex: latex, width: width).height
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
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // The label is as tall as when it was measured, placed so the formula's ink is centred
        // in the block.
        let m = Self.metrics(latex: node?.attrs["latex"]?.stringValue ?? "", width: bounds.width)
        label.frame = CGRect(x: 0, y: (bounds.height - m.ink.height) / 2 - m.ink.minY,
                             width: bounds.width, height: m.labelHeight)
    }
}

/// Bounding box of what a layer draws (pixels with visible alpha), in points.
enum InkBounds {
    static func of(layer: CALayer, size: CGSize, threshold: UInt8 = 8) -> CGRect? {
        let w = Int(ceil(size.width)), h = Int(ceil(size.height))
        guard w > 0, h > 0 else { return nil }
        var pixels = [UInt8](repeating: 0, count: w * h * 4)
        pixels.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                      space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
            // UIKit coordinates: row 0 (the first row in memory) at the top.
            ctx.translateBy(x: 0, y: CGFloat(h))
            ctx.scaleBy(x: 1, y: -1)
            UIGraphicsPushContext(ctx)
            layer.render(in: ctx)
            UIGraphicsPopContext()
        }
        return of(rgba: pixels, width: w, height: h, threshold: threshold)
    }

    static func of(image: UIImage, threshold: UInt8 = 8) -> CGRect? {
        guard let cg = image.cgImage else { return nil }
        let w = cg.width, h = cg.height
        var pixels = [UInt8](repeating: 0, count: w * h * 4)
        pixels.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                      space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        // In image pixels; rows of a drawn CGImage are stored top first.
        return of(rgba: pixels, width: w, height: h, threshold: threshold)
    }

    private static func of(rgba pixels: [UInt8], width w: Int, height h: Int, threshold: UInt8) -> CGRect? {
        var minX = w, minY = h, maxX = -1, maxY = -1
        for y in 0..<h {
            let row = y * w * 4
            for x in 0..<w where pixels[row + x * 4 + 3] > threshold {
                if x < minX { minX = x }
                if x > maxX { maxX = x }
                if y < minY { minY = y }
                if y > maxY { maxY = y }
            }
        }
        guard maxX >= 0 else { return nil }
        return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
    }
}
#endif
