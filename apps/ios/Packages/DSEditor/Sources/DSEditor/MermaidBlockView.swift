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

    /// The rendered diagram, once there is one (opened full screen on a tap).
    var renderedImage: UIImage? { imageView.image }

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

/// A diagram on the whole screen, to read it: pinch to zoom, double-tap to zoom in and out,
/// × to close (owner, 2026-11-03: a wide diagram could be neither enlarged nor opened).
final class DiagramViewerController: UIViewController, UIScrollViewDelegate {
    private let image: UIImage
    private let scroller = UIScrollView()
    private let imageView = UIImageView()

    init(image: UIImage) {
        self.image = image
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        scroller.delegate = self
        scroller.maximumZoomScale = 8
        scroller.showsHorizontalScrollIndicator = false
        scroller.showsVerticalScrollIndicator = false
        scroller.contentInsetAdjustmentBehavior = .never
        scroller.accessibilityIdentifier = "diagram.viewer"
        view.addSubview(scroller)
        imageView.image = image
        imageView.frame = CGRect(origin: .zero, size: image.size)
        imageView.isAccessibilityElement = true
        imageView.accessibilityLabel = "Диаграмма"
        scroller.addSubview(imageView)
        scroller.contentSize = image.size

        let doubleTap = UITapGestureRecognizer(target: self, action: #selector(toggleZoom(_:)))
        doubleTap.numberOfTapsRequired = 2
        scroller.addGestureRecognizer(doubleTap)

        var config = UIButton.Configuration.gray()
        config.cornerStyle = .capsule
        config.image = UIImage(systemName: "xmark")
        let close = UIButton(configuration: config, primaryAction: UIAction { [weak self] _ in self?.dismiss(animated: true) })
        close.accessibilityLabel = "Закрыть"
        close.accessibilityIdentifier = "diagram.close"
        close.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(close)
        NSLayoutConstraint.activate([
            close.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            close.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            close.widthAnchor.constraint(equalToConstant: 44),
            close.heightAnchor.constraint(equalToConstant: 44),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let fit = scroller.zoomScale == scroller.minimumZoomScale
        scroller.frame = view.bounds
        let size = image.size
        guard size.width > 0, size.height > 0 else { return }
        // The whole diagram fits at first; a diagram smaller than the screen is not blown up.
        scroller.minimumZoomScale = min(1, min(view.bounds.width / size.width, view.bounds.height / size.height))
        if fit { scroller.zoomScale = scroller.minimumZoomScale }
        center()
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }

    func scrollViewDidZoom(_ scrollView: UIScrollView) { center() }

    private func center() {
        let x = max(0, (scroller.bounds.width - scroller.contentSize.width) / 2)
        let y = max(0, (scroller.bounds.height - scroller.contentSize.height) / 2)
        scroller.contentInset = UIEdgeInsets(top: y, left: x, bottom: y, right: x)
    }

    @objc private func toggleZoom(_ gesture: UITapGestureRecognizer) {
        if scroller.zoomScale > scroller.minimumZoomScale * 1.01 {
            scroller.setZoomScale(scroller.minimumZoomScale, animated: true)
        } else {
            let point = gesture.location(in: imageView)
            let scale = min(scroller.maximumZoomScale, max(scroller.minimumZoomScale * 3, 1))
            let size = CGSize(width: scroller.bounds.width / scale, height: scroller.bounds.height / scale)
            scroller.zoom(to: CGRect(x: point.x - size.width / 2, y: point.y - size.height / 2,
                                     width: size.width, height: size.height), animated: true)
        }
    }
}
#endif
