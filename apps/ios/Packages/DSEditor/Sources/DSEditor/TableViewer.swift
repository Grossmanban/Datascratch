#if canImport(UIKit)
import DSEditorModel
import UIKit

/// The cells of a table as the full-screen viewer shows them: plain text, header flag, alignment.
struct TableViewerContent {
    struct Cell {
        var text: String
        var header: Bool
        var align: NSTextAlignment
    }
    var rows: [[Cell]]

    init(node: BlockNode) {
        rows = TableBlockView.rows(node).map { $0.map { Cell(text: $0.text, header: $0.header, align: $0.align) } }
    }

    var columnCount: Int { rows.map(\.count).max() ?? 0 }
    /// The first row stays on screen while the table scrolls down: it is a header row.
    var hasHeaderRow: Bool { rows.first.map { !$0.isEmpty && $0.allSatisfy(\.header) } ?? false }
    /// The first column stays on screen while the table scrolls sideways: every cell in it is a
    /// header (a header column), not just the corner of a header row.
    var hasHeaderColumn: Bool {
        rows.count > 1 && rows.allSatisfy { $0.first?.header == true }
    }
}

/// Geometry of the whole table at its natural size: every cell as tall as its wrapped text, each
/// column as wide as its text up to a limit (then it wraps).
struct TableViewerLayout {
    static let padding = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)
    static let minColumnWidth: CGFloat = 88
    static let maxColumnWidth: CGFloat = 300
    static let minRowHeight: CGFloat = 44

    var columnWidths: [CGFloat]
    var rowHeights: [CGFloat]
    var size: CGSize { CGSize(width: columnWidths.reduce(0, +), height: rowHeights.reduce(0, +)) }

    init(content: TableViewerContent, font: (Bool) -> UIFont) {
        let columns = content.columnCount
        let pad = Self.padding
        columnWidths = (0..<columns).map { c in
            let widest = content.rows.compactMap { $0.indices.contains(c) ? $0[c] : nil }
                .map { ($0.text as NSString).size(withAttributes: [.font: font($0.header)]).width }
                .max() ?? 0
            return min(Self.maxColumnWidth, max(Self.minColumnWidth, ceil(widest) + pad.left + pad.right + 1))
        }
        let widths = columnWidths
        rowHeights = content.rows.map { row in
            row.enumerated().map { c, cell in
                let w = (widths.indices.contains(c) ? widths[c] : Self.minColumnWidth) - pad.left - pad.right
                let rect = (cell.text as NSString).boundingRect(with: CGSize(width: max(1, w), height: .greatestFiniteMagnitude),
                                                                 options: [.usesLineFragmentOrigin, .usesFontLeading],
                                                                 attributes: [.font: font(cell.header)], context: nil)
                return ceil(rect.height) + pad.top + pad.bottom
            }.reduce(Self.minRowHeight, max)
        }
    }

    func frame(row: Int, column: Int) -> CGRect {
        CGRect(x: columnWidths.prefix(column).reduce(0, +), y: rowHeights.prefix(row).reduce(0, +),
               width: columnWidths.indices.contains(column) ? columnWidths[column] : 0,
               height: rowHeights.indices.contains(row) ? rowHeights[row] : 0)
    }

    /// The cell under a point of the grid.
    func cell(at point: CGPoint) -> (row: Int, column: Int)? {
        guard point.x >= 0, point.y >= 0 else { return nil }
        var y: CGFloat = 0, x: CGFloat = 0
        guard let r = rowHeights.indices.first(where: { y += rowHeights[$0]; return point.y < y }),
              let c = columnWidths.indices.first(where: { x += columnWidths[$0]; return point.x < x }) else { return nil }
        return (r, c)
    }
}

/// Some or all cells of a table, laid out at the table's natural size. The viewer shows the whole
/// grid once, and the header row, header column and their corner again as sticky copies.
final class TableViewerGridView: UIView {
    private(set) var labels: [[UILabel?]] = []

    init(content: TableViewerContent, layout: TableViewerLayout, font: (Bool) -> UIFont,
         includes: (Int, Int) -> Bool, accessible: Bool) {
        super.init(frame: CGRect(origin: .zero, size: layout.size))
        backgroundColor = .clear
        isAccessibilityElement = false
        accessibilityElementsHidden = !accessible
        for (r, row) in content.rows.enumerated() {
            var line: [UILabel?] = []
            for c in 0..<content.columnCount {
                guard includes(r, c) else { line.append(nil); continue }
                let cell = row.indices.contains(c) ? row[c] : TableViewerContent.Cell(text: "", header: false, align: .natural)
                let frame = layout.frame(row: r, column: c)
                let box = UIView(frame: frame)
                // Opaque: the sticky copies cover the cells scrolling under them.
                box.backgroundColor = EditorTheme.paper
                if cell.header {
                    let fill = UIView(frame: box.bounds)
                    fill.backgroundColor = EditorTheme.codeBackground
                    fill.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                    box.addSubview(fill)
                }
                box.layer.borderWidth = 0.5
                box.layer.borderColor = EditorTheme.quoteBar.cgColor
                let label = UILabel(frame: box.bounds.inset(by: TableViewerLayout.padding))
                label.numberOfLines = 0
                label.lineBreakMode = .byWordWrapping
                label.font = font(cell.header)
                label.textColor = EditorTheme.text
                label.textAlignment = cell.align
                label.text = cell.text
                label.isAccessibilityElement = accessible
                label.accessibilityIdentifier = "tableViewer.cell.\(r).\(c)"
                if cell.header { label.accessibilityTraits.insert(.header) }
                box.addSubview(label)
                addSubview(box)
                line.append(label)
            }
            labels.append(line)
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }
}

/// A table on the whole screen, to read it on a phone (owner, 2026-11-11: in the note every cell
/// had to be scrolled on its own). Every cell shows all of its text; the table scrolls both ways
/// as one surface and zooms with a pinch; the header row (and a header column) stay on screen;
/// it turns to landscape. Read-only: a tap on a cell closes it and puts the caret in that cell
/// (when the note can be edited).
public final class TableViewerController: UIViewController, UIScrollViewDelegate {
    private let content: TableViewerContent
    private let theme: EditorTheme
    let layout: TableViewerLayout
    /// A tap on a cell: row, column (nil: the note is read-only, a tap does nothing).
    var onSelectCell: ((Int, Int) -> Void)?

    static let margin: CGFloat = 16
    static let barHeight: CGFloat = 56
    let scroller = UIScrollView()
    /// Holds the grid with its margin; the scroll view zooms it.
    let zoomView = UIView()
    private(set) var grid: TableViewerGridView!
    /// Sticky copies: the header row, the header column and the cell where they meet.
    private(set) var stickyRow: TableViewerGridView!
    private(set) var stickyColumn: TableViewerGridView!
    private(set) var stickyCorner: TableViewerGridView!
    private var stickyRowEnabled = false
    private var stickyColumnEnabled = false
    let closeButton = UIButton(type: .system)
    private let titleLabel = UILabel()
    private let bar = UIView()
    private let barLine = UIView()

    init(node: BlockNode, theme: EditorTheme) {
        let content = TableViewerContent(node: node)
        self.content = content
        self.theme = theme
        layout = TableViewerLayout(content: content, font: Self.fonts(theme))
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
        modalTransitionStyle = UIAccessibility.isReduceMotionEnabled ? .crossDissolve : .coverVertical
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    static func fonts(_ theme: EditorTheme) -> (Bool) -> UIFont {
        let regular = theme.font(size: 16, weight: .regular)
        let header = theme.font(size: 16, weight: .semibold)
        return { $0 ? header : regular }
    }

    /// The label of a cell in the main grid (tests).
    func label(row: Int, column: Int) -> UILabel? {
        grid.labels.indices.contains(row) && grid.labels[row].indices.contains(column) ? grid.labels[row][column] : nil
    }

    public override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown
    }

    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = EditorTheme.paper
        view.accessibilityViewIsModal = true
        let fonts = Self.fonts(theme)

        scroller.delegate = self
        scroller.minimumZoomScale = 0.5
        scroller.maximumZoomScale = 3
        scroller.contentInsetAdjustmentBehavior = .never
        scroller.alwaysBounceVertical = true
        scroller.alwaysBounceHorizontal = true
        scroller.accessibilityIdentifier = "tableViewer"
        view.addSubview(scroller)

        let size = layout.size
        let m = Self.margin
        zoomView.frame = CGRect(x: 0, y: 0, width: size.width + 2 * m, height: size.height + 2 * m)
        grid = TableViewerGridView(content: content, layout: layout, font: fonts, includes: { _, _ in true }, accessible: true)
        grid.frame.origin = CGPoint(x: m, y: m)
        grid.layer.cornerRadius = 10
        grid.layer.borderWidth = 1
        grid.layer.borderColor = EditorTheme.quoteBar.cgColor
        grid.clipsToBounds = true
        zoomView.addSubview(grid)
        scroller.addSubview(zoomView)
        scroller.contentSize = zoomView.frame.size

        let headerRow = content.hasHeaderRow, headerColumn = content.hasHeaderColumn
        stickyColumn = TableViewerGridView(content: content, layout: layout, font: fonts, includes: { _, c in c == 0 }, accessible: false)
        stickyRow = TableViewerGridView(content: content, layout: layout, font: fonts, includes: { r, _ in r == 0 }, accessible: false)
        stickyCorner = TableViewerGridView(content: content, layout: layout, font: fonts, includes: { r, c in r == 0 && c == 0 }, accessible: false)
        stickyRowEnabled = headerRow
        stickyColumnEnabled = headerColumn
        for v in [stickyColumn!, stickyRow!, stickyCorner!] {
            v.isUserInteractionEnabled = false
            v.isHidden = true
            v.layer.shadowColor = UIColor.black.cgColor
            v.layer.shadowRadius = 4
            v.layer.shadowOffset = .zero
            v.layer.shadowOpacity = 0.12
            scroller.addSubview(v)
        }

        let doubleTap = UITapGestureRecognizer(target: self, action: #selector(toggleZoom(_:)))
        doubleTap.numberOfTapsRequired = 2
        scroller.addGestureRecognizer(doubleTap)
        let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
        tap.require(toFail: doubleTap)
        scroller.addGestureRecognizer(tap)

        bar.backgroundColor = EditorTheme.paper
        barLine.backgroundColor = EditorTheme.quoteBar
        barLine.alpha = 0
        view.addSubview(bar)
        bar.addSubview(barLine)
        titleLabel.text = "Таблица"
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLabel.textColor = EditorTheme.text
        titleLabel.accessibilityTraits.insert(.header)
        bar.addSubview(titleLabel)

        var config = UIButton.Configuration.gray()
        config.cornerStyle = .capsule
        config.image = UIImage(systemName: "xmark", withConfiguration: UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold))
        closeButton.configuration = config
        closeButton.addAction(UIAction { [weak self] _ in self?.close() }, for: .touchUpInside)
        closeButton.accessibilityLabel = "Закрыть"
        closeButton.accessibilityIdentifier = "tableViewer.close"
        bar.addSubview(closeButton)
    }

    public override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setNeedsUpdateOfSupportedInterfaceOrientations()
    }

    public override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let safe = view.safeAreaInsets
        let barBottom = safe.top + Self.barHeight
        bar.frame = CGRect(x: 0, y: 0, width: view.bounds.width, height: barBottom)
        barLine.frame = CGRect(x: 0, y: barBottom - 0.5, width: view.bounds.width, height: 0.5)
        closeButton.frame = CGRect(x: view.bounds.width - safe.right - 16 - 44, y: safe.top + (Self.barHeight - 44) / 2, width: 44, height: 44)
        titleLabel.frame = CGRect(x: safe.left + 20, y: safe.top, width: closeButton.frame.minX - safe.left - 32, height: Self.barHeight)
        scroller.frame = CGRect(x: 0, y: barBottom, width: view.bounds.width, height: max(0, view.bounds.height - barBottom))
        scroller.verticalScrollIndicatorInsets.bottom = safe.bottom
        // A small table is not shrunk below its natural size; a wide one may be pinched out to
        // see it whole (no smaller than half).
        let fit = min(1, (scroller.bounds.width - safe.left - safe.right) / max(1, zoomView.bounds.width))
        scroller.minimumZoomScale = max(0.5, min(1, fit))
        if scroller.zoomScale < scroller.minimumZoomScale { scroller.zoomScale = scroller.minimumZoomScale }
        updateInsets()
        updateSticky()
    }

    public func viewForZooming(in scrollView: UIScrollView) -> UIView? { zoomView }

    public func scrollViewDidZoom(_ scrollView: UIScrollView) {
        updateInsets()
        updateSticky()
    }

    public func scrollViewDidScroll(_ scrollView: UIScrollView) { updateSticky() }

    /// The table stays centred when it is narrower or shorter than the screen; the safe area
    /// (landscape notch, home indicator) is kept clear.
    private func updateInsets() {
        let safe = view.safeAreaInsets
        let width = scroller.bounds.width - safe.left - safe.right
        let height = scroller.bounds.height - safe.bottom
        let x = max(0, (width - scroller.contentSize.width) / 2)
        let y = max(0, (height - scroller.contentSize.height) / 2)
        scroller.contentInset = UIEdgeInsets(top: y, left: safe.left + x, bottom: safe.bottom + y, right: safe.right + x)
    }

    /// The header row follows the top edge and the header column the left edge of what is on
    /// screen, at the current zoom, never past the end of the table.
    func updateSticky() {
        guard grid != nil else { return }
        let z = scroller.zoomScale
        let m = Self.margin * z
        let size = layout.size
        let top = scroller.contentOffset.y, left = scroller.contentOffset.x + view.safeAreaInsets.left
        let rowHeight = layout.rowHeights.first ?? 0, columnWidth = layout.columnWidths.first ?? 0
        let stickyY = min(max(m, top), m + (size.height - rowHeight) * z)
        let stickyX = min(max(m, left), m + (size.width - columnWidth) * z)
        func place(_ v: UIView, x: CGFloat, y: CGFloat) {
            v.transform = CGAffineTransform(scaleX: z, y: z)
            v.center = CGPoint(x: x + v.bounds.width * z / 2, y: y + v.bounds.height * z / 2)
        }
        place(stickyRow, x: m, y: stickyY)
        place(stickyColumn, x: stickyX, y: m)
        place(stickyCorner, x: stickyX, y: stickyY)
        // Shown only once they leave the grid's own header: in place, the grid (with its rounded
        // corners) shows itself.
        let rowStuck = stickyRowEnabled && stickyY > m + 0.5, columnStuck = stickyColumnEnabled && stickyX > m + 0.5
        stickyRow.isHidden = !rowStuck
        stickyColumn.isHidden = !columnStuck
        stickyCorner.isHidden = !(rowStuck && columnStuck)
        barLine.alpha = top > -scroller.contentInset.top + 0.5 ? 1 : 0
    }

    func close() { dismiss(animated: true) }

    /// Closes the viewer and puts the caret in a cell (the note is editable).
    func select(row: Int, column: Int) {
        guard let onSelectCell else { return }
        dismiss(animated: true) { onSelectCell(row, column) }
    }

    @objc private func tapped(_ gesture: UITapGestureRecognizer) {
        // The sticky copies share the grid's coordinates; the topmost one shown under the finger wins.
        for v in [stickyCorner!, stickyRow!, stickyColumn!, grid!] where !v.isHidden {
            let point = gesture.location(in: v)
            guard v.bounds.contains(point), let cell = layout.cell(at: point) else { continue }
            if v !== grid, !(v === stickyRow ? cell.row == 0 : v === stickyColumn ? cell.column == 0 : cell.row == 0 && cell.column == 0) { continue }
            select(row: cell.row, column: cell.column)
            return
        }
    }

    @objc private func toggleZoom(_ gesture: UITapGestureRecognizer) {
        let animated = !UIAccessibility.isReduceMotionEnabled
        if scroller.zoomScale > 1.01 {
            scroller.setZoomScale(1, animated: animated)
        } else {
            let point = gesture.location(in: zoomView)
            let scale: CGFloat = 2
            let size = CGSize(width: scroller.bounds.width / scale, height: scroller.bounds.height / scale)
            scroller.zoom(to: CGRect(x: point.x - size.width / 2, y: point.y - size.height / 2,
                                     width: size.width, height: size.height), animated: animated)
        }
    }
}

/// Orientations for the host app's `application(_:supportedInterfaceOrientationsFor:)`: a portrait
/// app turns to landscape while a table is open full screen (nil: the app's own choice).
public enum EditorFullScreen {
    @MainActor
    public static func supportedInterfaceOrientations(for window: UIWindow?) -> UIInterfaceOrientationMask? {
        var top = window?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        guard let viewer = top as? TableViewerController, !viewer.isBeingDismissed else { return nil }
        return viewer.supportedInterfaceOrientations
    }
}
#endif
