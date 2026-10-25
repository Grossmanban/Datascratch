#if canImport(UIKit)
import DSDesign
import DSEditorModel
import DSInk
import UIKit

/// The note editor: TextKit 2 text with the living-stroke pen layer on top.
///
/// The document (`EditorDocument`) is the source of truth. The text view shows its flattened
/// projection; plain typing inside a paragraph goes straight to the model, structural edits
/// (Return, joining paragraphs, pastes with newlines) go through `EditorCommands`, and the view
/// re-renders only the paragraphs that changed.
@MainActor
public final class EditorView: UIView {
    public private(set) var document: EditorDocument
    public let tools = InkToolState()
    public private(set) var theme: EditorTheme

    public weak var attachmentResolver: EditorAttachmentResolver? {
        didSet { factory.resolver = attachmentResolver }
    }

    /// The host should show the tool palette (Pencil Pro squeeze, or double tap set to palette).
    public var onPaletteRequest: ((CGPoint?) -> Void)?
    /// A note link chip was tapped.
    public var onOpenNote: ((String) -> Void)?
    /// Tools, undo availability or selection changed (refresh toolbars).
    public var onStateChange: (() -> Void)?
    private var stateChangePending = false

    /// Tells the host about a change on the next main-queue turn, coalesced. Never during UIKit's
    /// touch dispatch: a host that re-renders its interface synchronously (SwiftUI state) while a
    /// touch is still being delivered crashed UIKit's gesture environment.
    private func notifyStateChange() {
        guard !stateChangePending else { return }
        stateChangePending = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.stateChangePending = false
            self.onStateChange?()
        }
    }

    /// A view scrolled together with the text above the first block (cover, title, metadata).
    /// It gets the editor's full width and its height from Auto Layout
    /// (`systemLayoutSizeFitting`), re-measured on rotation, width changes and Dynamic Type; call
    /// `headerLayoutDidChange()` when its content changes size. The text starts below it, and
    /// strokes and margin notes are positioned in text coordinates, so they move with it. The pen
    /// does not draw on the header.
    public var headerView: UIView? {
        didSet {
            guard headerView !== oldValue else { return }
            oldValue?.removeFromSuperview()
            if let headerView {
                headerView.translatesAutoresizingMaskIntoConstraints = true
                textView.addSubview(headerView)
            }
            headerLayoutDidChange()
        }
    }
    /// Current height of `headerView` (0 without one).
    public private(set) var headerHeight: CGFloat = 0
    /// Vertical scroll position: 0 when the top of the header (or of the text) is at the top of the
    /// visible area, positive when scrolled down. For collapsing navigation titles.
    public var onScroll: ((CGFloat) -> Void)?

    /// Re-measures `headerView` and moves the text below it.
    public func headerLayoutDidChange() {
        setNeedsLayout()
    }

    /// Time it took to build and lay out the visible part of the document in `init`/`setDocument`.
    public private(set) var lastOpenDuration: TimeInterval = 0
    public var lastInkRefreshDuration: TimeInterval { ink.lastRefreshDuration }
    public var renderedStrokeCount: Int { ink.renderedStrokeCount }

    // Designated initializer (TextKit 2 by default on iOS 16+). `UITextView(usingTextLayoutManager:)`
    // skips the Swift property initializers of subclasses, which corrupts them at deallocation.
    let textView = EditorTextView(frame: .zero, textContainer: nil)
    private let paper = PaperView()
    private let inkUnder = InkCanvas()
    private let inkOver = InkCanvas()
    private let hoverLayer = CAShapeLayer()
    private let fragmentProvider = FragmentProvider()
    private let factory: AttachmentFactory
    private var renderer: AttributedRenderer
    private(set) var projection: Projection
    var geometry: TextGeometry!
    var ink: InkController!
    private var observation: ObservationToken?
    private var suppressDelegate = false
    private var pendingMarks: MarkSet?
    private var pendingShortcut: (offset: Int, char: String)?
    private var lastContainerWidth: CGFloat = 0
    private var lastContentHeight: CGFloat = 0
    private(set) var inkInput: InkInputRecognizer!
    private var toolsChangePending = false
    private var editMenu: UIEditMenuInteraction!
    private var lassoTextRange: Range<Int>?

    public init(document: EditorDocument, theme: EditorTheme? = nil) {
        self.document = document
        let t = theme ?? EditorTheme(style: document.style)
        self.theme = t
        factory = AttachmentFactory(theme: t)
        renderer = AttributedRenderer(theme: t, attachments: factory)
        projection = Projection.build(document.blocks)
        super.init(frame: .zero)
        setUp()
        load()
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    // MARK: - Setup

    private func setUp() {
        backgroundColor = EditorTheme.paper
        textView.backgroundColor = .clear
        textView.delegate = self
        // The scroll view must not hold touches back (its delayed-touches recognizer is the one
        // UIKit was delaying when a tool switch crashed it; it also adds latency to the pen).
        textView.delaysContentTouches = false
        textView.alwaysBounceVertical = true
        textView.keyboardDismissMode = .interactive
        textView.textContainer.lineFragmentPadding = 0
        textView.smartInsertDeleteType = .no
        textView.linkTextAttributes = [.foregroundColor: EditorTheme.accent, .underlineStyle: NSUnderlineStyle.single.rawValue]
        textView.textLayoutManager?.delegate = fragmentProvider
        textView.accessibilityIdentifier = "editor.text"
        addSubview(textView)

        textView.insertSubview(paper, at: 0)
        textView.insertSubview(inkUnder, aboveSubview: paper)
        textView.addSubview(inkOver)
        inkOver.accessibilityIdentifier = "editor.ink"
        hoverLayer.fillColor = nil
        hoverLayer.lineWidth = 1.2
        hoverLayer.actions = ["path": NSNull(), "position": NSNull(), "hidden": NSNull()]
        inkOver.layer.addSublayer(hoverLayer)

        geometry = TextGeometry(textView: textView)
        ink = InkController(textView: textView, geometry: geometry, over: inkOver, under: inkUnder, tools: tools,
                            document: document, projection: { [unowned self] in self.projection })
        ink.onTextChangedByGesture = { [weak self] caret in self?.select(caret) }
        ink.onLassoSelection = { [weak self] ids, range, bounds in self?.lassoSelected(ids, range: range, bounds: bounds) }
        inkOver.needsRecolor = { [weak self] in self?.ink.refresh() }

        textView.onLayout = { [weak self] in self?.textViewDidLayout() }
        textView.keyHandler = { [weak self] in self?.perform($0) }
        textView.documentUndo.document = document
        textView.documentUndo.afterChange = { [weak self] in self?.notifyStateChange() }

        inkInput = InkInputRecognizer(target: nil, action: nil)
        inkInput.shouldTrack = { [weak self] touch in
            guard let self, self.tools.mode.capturesPen else { return false }
            if let header = self.headerView, header.bounds.contains(touch.location(in: header)) { return false }
            return touch.type == .pencil || (self.tools.allowsFingerDrawing && touch.type == .direct)
        }
        inkInput.onBegan = { [weak self] s in
            guard let self else { return }
            // Palm rejection comes from the recognizer itself: it begins on touch down and
            // prevents the scroll recognizer for that touch, so a resting hand does not draw.
            self.ink.penBegan(s)
        }
        inkInput.onMoved = { [weak self] c, p in self?.ink.penMoved(c, predicted: p) }
        inkInput.onEnded = { [weak self] cancelled in
            guard let self else { return }
            self.ink.penEnded(cancelled: cancelled)
            self.notifyStateChange()
        }
        inkInput.onEstimatedUpdate = { [weak self] s in self?.ink.penEstimatedUpdate(s) }
        inkInput.delegate = self
        // No touch delays (UIGestureRecognizer delays ended touches by default): the editor's
        // recognizers must not hold events that other views are still dispatching.
        inkInput.delaysTouchesBegan = false
        inkInput.delaysTouchesEnded = false
        textView.addGestureRecognizer(inkInput)

        let hover = UIHoverGestureRecognizer(target: self, action: #selector(hovered(_:)))
        hover.delaysTouchesEnded = false
        textView.addGestureRecognizer(hover)

        let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
        tap.delegate = self
        tap.delaysTouchesBegan = false
        tap.delaysTouchesEnded = false
        textView.addGestureRecognizer(tap)

        textView.addInteraction(UIScribbleInteraction(delegate: self))
        addInteraction(UIPencilInteraction(delegate: self))
        editMenu = UIEditMenuInteraction(delegate: self)
        textView.addInteraction(editMenu)

        // Tool changes usually come from a button whose touch UIKit is still dispatching; reacting
        // synchronously (gesture recognizer changes, SwiftUI updates) made the gesture environment
        // throw. Apply them on the next run loop turn.
        // This makes `tools` safe to change from anywhere, including a touch or key handler that
        // UIKit is still dispatching. Several changes in one turn are applied once.
        tools.onChange = { [weak self] in
            guard let self, !self.toolsChangePending else { return }
            self.toolsChangePending = true
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                self.toolsChangePending = false
                self.toolsChanged()
            }
        }
        toolsChanged()
        factory.onTableCellEdit = { [weak self] table, row, column, text in
            self?.commands.setTableCell(table, row: row, column: column, text: text)
        }
        factory.onTableStructure = { [weak self] table, addRow in
            guard let self else { return }
            if addRow { self.commands.addTableRow(table) } else { self.commands.addTableColumn(table) }
        }

        registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) { (self: EditorView, _: UITraitCollection) in
            self.dynamicTypeChanged()
        }

        NotificationCenter.default.addObserver(forName: MermaidRenderer.didRender, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                EditorDiagnostics.log("mermaid rendered: re-laying out diagrams")
                self?.rerenderAtoms(of: NodeType.mermaid)
            }
        }
    }

    private func load() {
        let signpost = EditorSignpost.log.beginInterval("OpenNote", id: EditorSignpost.log.makeSignpostID())
        defer { EditorSignpost.log.endInterval("OpenNote", signpost) }
        let start = CACurrentMediaTime()
        observation = document.observe { [weak self] change in self?.documentChanged(change) }
        projection = Projection.build(document.blocks)
        theme.style = document.style
        theme.baseFontSize = EditorTheme.dynamicBaseSize(for: traitCollection)
        applyTheme()
        let text = renderer.render(projection, paragraphs: 0..<projection.paragraphs.count)
        suppressDelegate = true
        textView.textStorage.setAttributedString(text)
        suppressDelegate = false
        textView.selectedRange = NSRange(location: projection.paragraphs.count > 1 ? projection.starts[1] : 0, length: 0)
        updateTypingAttributes()
        ink.invalidateLayout()
        if bounds.width > 0 {
            layoutIfNeeded()
            if let viewport = textView.textLayoutManager?.textViewportLayoutController {
                viewport.layoutViewport()
            }
        }
        lastOpenDuration = CACurrentMediaTime() - start
    }

    /// Replaces the edited document.
    public func setDocument(_ document: EditorDocument) {
        self.document = document
        ink.document = document
        textView.documentUndo.document = document
        load()
        ink.refresh()
    }

    // MARK: - Style

    public func setStyle(_ style: DocumentStyle) {
        document.setStyle(style)
    }

    private func dynamicTypeChanged() {
        let size = EditorTheme.dynamicBaseSize(for: traitCollection)
        guard size != theme.baseFontSize else { return }
        theme.baseFontSize = size
        applyTheme()
        rerenderAll()
    }

    private func applyTheme() {
        renderer.theme = theme
        factory.theme = theme
        paper.paper = theme.style.paper
        setNeedsLayout()
    }

    // MARK: - Layout

    public override func layoutSubviews() {
        super.layoutSubviews()
        textView.frame = bounds
        let available = bounds.width - theme.horizontalPadding * 2
        let column = theme.columnWidth(available: max(200, available))
        let side = max(theme.horizontalPadding, (bounds.width - column) / 2)
        layoutHeader()
        let inset = UIEdgeInsets(top: 32 + headerHeight, left: side, bottom: 160, right: side)
        if textView.textContainerInset != inset { textView.textContainerInset = inset }
    }

    private func layoutHeader() {
        guard let header = headerView else {
            headerHeight = 0
            return
        }
        let width = bounds.width
        let height = width > 0
            ? ceil(header.systemLayoutSizeFitting(CGSize(width: width, height: UIView.layoutFittingCompressedSize.height),
                                                  withHorizontalFittingPriority: .required,
                                                  verticalFittingPriority: .fittingSizeLevel).height)
            : 0
        headerHeight = height
        let frame = CGRect(x: 0, y: 0, width: width, height: height)
        if header.frame != frame { header.frame = frame }
    }

    private func textViewDidLayout() {
        let size = CGSize(width: max(textView.contentSize.width, textView.bounds.width),
                          height: max(textView.contentSize.height, textView.bounds.height) + 400)
        let frame = CGRect(origin: CGPoint(x: 0, y: -200), size: size)
        if paper.frame != frame {
            paper.frame = frame
            inkUnder.frame = CGRect(origin: .zero, size: size)
            inkOver.frame = CGRect(origin: .zero, size: size)
        }
        // Reorder only when needed: changing subview order marks the text view for layout again.
        let subs = textView.subviews
        if subs.first !== paper || (subs.count > 1 && subs[1] !== inkUnder) {
            EditorDiagnostics.log("reorder ink layers")
            textView.sendSubviewToBack(inkUnder)
            textView.sendSubviewToBack(paper)
        }
        if textView.subviews.last !== inkOver { textView.bringSubviewToFront(inkOver) }
        MermaidRenderer.shared.host = self
        let width = textView.textContainer.size.width
        if width != lastContainerWidth || textView.contentSize.height != lastContentHeight {
            lastContainerWidth = width
            lastContentHeight = textView.contentSize.height
            ink.invalidateLayout()
        }
        ink.refreshIfNeeded()
    }

    // MARK: - Document → view

    private func documentChanged(_ change: DocumentChange) {
        if change.styleChanged {
            theme.style = document.style
            applyTheme()
            rerenderAll()
        }
        if change.origin == .textInput {
            for block in change.textBlocks {
                if let i = projection.indexByBlock[block] {
                    projection.replaceContent(ofParagraph: i, inline: document.inline(of: block, range: nil))
                }
            }
        } else if !change.textBlocks.isEmpty || change.structureChanged {
            let changed = reproject()
            if change.origin == .undo || change.origin == .redo, let r = changed {
                selectOffset(min(projection.length, r.upperBound))
            }
        }
        ink.invalidateLayout()
        if !change.strokesAdded.isEmpty || !change.strokesRemoved.isEmpty || change.origin != .textInput {
            setNeedsInkRefresh()
        }
        notifyStateChange()
    }

    private var inkRefreshScheduled = false
    private func setNeedsInkRefresh() {
        guard !inkRefreshScheduled else { return }
        inkRefreshScheduled = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.inkRefreshScheduled = false
            self.textView.layoutIfNeeded()
            self.ink.refresh()
        }
    }

    /// Rebuilds the projection and replaces only the paragraphs that differ.
    /// - Returns: flattened range of the new text that was re-rendered.
    @discardableResult
    private func reproject() -> Range<Int>? {
        let signpost = EditorSignpost.log.beginInterval("Reproject", id: EditorSignpost.log.makeSignpostID())
        defer { EditorSignpost.log.endInterval("Reproject", signpost) }
        let new = Projection.build(document.blocks)
        let old = projection
        let oldP = old.paragraphs, newP = new.paragraphs
        var prefix = 0
        while prefix < oldP.count, prefix < newP.count, oldP[prefix] == newP[prefix] { prefix += 1 }
        var suffix = 0
        while suffix < oldP.count - prefix, suffix < newP.count - prefix,
              oldP[oldP.count - 1 - suffix] == newP[newP.count - 1 - suffix] { suffix += 1 }
        if prefix == oldP.count, prefix == newP.count {
            projection = new
            return nil
        }
        // Neighbours can change decoration (callout edges, numbering): widen by one.
        prefix = max(0, prefix - 1)
        suffix = max(0, suffix - 1)
        let oldEnd = oldP.count - suffix, newEnd = newP.count - suffix

        var oldStart = old.starts[prefix]
        var replacement = renderer.render(new, paragraphs: prefix..<newEnd)
        let oldStop: Int
        if suffix > 0 {
            oldStop = old.starts[oldEnd]
        } else {
            oldStop = old.length
            if prefix > 0 {
                // Include the separator before the range, so the end of the document stays well formed.
                oldStart = old.starts[prefix - 1] + oldP[prefix - 1].length
                let m = NSMutableAttributedString(string: "\n", attributes: renderer.paragraphAttributes(new, index: prefix - 1))
                m.append(replacement)
                replacement = m
            }
        }
        let storage = textView.textStorage
        let selection = textView.selectedRange
        suppressDelegate = true
        storage.beginEditing()
        storage.replaceCharacters(in: NSRange(location: oldStart, length: oldStop - oldStart), with: replacement)
        storage.endEditing()
        suppressDelegate = false
        projection = new
        // Keep the caret sensible when the edit did not set it explicitly.
        let delta = replacement.length - (oldStop - oldStart)
        if selection.location >= oldStop {
            selectOffset(min(new.length, selection.location + delta))
        } else if selection.location > oldStart {
            selectOffset(min(new.length, oldStart + replacement.length))
        }
        let newStart = new.starts[prefix]
        let newStop = newEnd < newP.count ? new.starts[newEnd] : new.length
        return newStart..<newStop
    }

    private func rerenderAll() {
        let text = renderer.render(projection, paragraphs: 0..<projection.paragraphs.count)
        let selection = textView.selectedRange
        suppressDelegate = true
        textView.textStorage.setAttributedString(text)
        suppressDelegate = false
        textView.selectedRange = NSRange(location: min(selection.location, text.length), length: 0)
        ink.invalidateLayout()
        setNeedsInkRefresh()
    }

    private func rerenderAtoms(of type: String) {
        guard let tlm = textView.textLayoutManager else { return }
        for (i, p) in projection.paragraphs.enumerated() where p.kind == .atom(type) {
            if let r = geometry.textRange(projection.starts[i]..<(projection.starts[i] + 1)) { tlm.invalidateLayout(for: r) }
        }
        textView.setNeedsLayout()
        ink.invalidateLayout()
        setNeedsInkRefresh()
    }

    /// Re-applies rendered attributes of a paragraph without touching its characters.
    private func normalizeParagraph(_ i: Int) {
        guard projection.paragraphs.indices.contains(i), textView.markedTextRange == nil else { return }
        let rendered = renderer.paragraph(projection, index: i)
        let start = projection.starts[i]
        let storage = textView.textStorage
        guard start + rendered.length <= storage.length else { return }
        let current = storage.attributedSubstring(from: NSRange(location: start, length: rendered.length)).string
        guard current == rendered.string else {
            // Out of sync (should not happen): fall back to a full re-render.
            rerenderAll()
            return
        }
        suppressDelegate = true
        storage.beginEditing()
        rendered.enumerateAttributes(in: NSRange(location: 0, length: rendered.length)) { attrs, range, _ in
            storage.setAttributes(attrs, range: NSRange(location: start + range.location, length: range.length))
        }
        storage.endEditing()
        suppressDelegate = false
    }

    // MARK: - Selection helpers

    var commands: EditorCommands { EditorCommands(document: document) }

    func select(_ pos: TextPosition?) {
        guard let pos, let off = projection.offset(block: pos.block, offset: pos.offset) else { return }
        selectOffset(off)
    }

    private func selectOffset(_ off: Int) {
        suppressDelegate = true
        textView.selectedRange = NSRange(location: max(0, min(off, textView.textStorage.length)), length: 0)
        suppressDelegate = false
        updateTypingAttributes()
    }

    private var selectionRange: Range<Int> {
        let r = textView.selectedRange
        return r.location..<(r.location + r.length)
    }

    private func updateTypingAttributes() {
        let r = selectionRange
        let (i, _) = projection.position(at: r.lowerBound)
        let marks = pendingMarks ?? commands.marks(at: r.lowerBound..<r.lowerBound)
        textView.typingAttributes = renderer.typingAttributes(projection, index: i, marks: marks)
    }

    // MARK: - Commands

    /// Runs a formatting or structure command on the current selection.
    public func perform(_ action: EditorAction) {
        let range = selectionRange
        let (i, o) = projection.position(at: range.lowerBound)
        guard projection.paragraphs.indices.contains(i) else { return }
        let para = projection.paragraphs[i]
        let pos = TextPosition(block: para.blockId, offset: o)
        let cmd = commands
        func mark(_ name: String, _ value: JSONValue = MarkSet.plain) {
            if range.isEmpty {
                var m = pendingMarks ?? cmd.marks(at: range)
                m.set(name, m.contains(name) ? nil : value)
                pendingMarks = m
                textView.typingAttributes = renderer.typingAttributes(projection, index: i, marks: m)
            } else {
                cmd.toggleMark(name, value: value, range: range)
                textView.selectedRange = NSRange(location: range.lowerBound, length: range.count)
            }
        }
        switch action {
        case .bold: mark(MarkName.bold)
        case .italic: mark(MarkName.italic)
        case .underline: mark(MarkName.underline)
        case .strike: mark(MarkName.strike)
        case .code: mark(MarkName.code)
        case .highlight: mark(MarkName.highlight, .object(["color": .string("highlight.yellow")]))
        case .heading1: select(cmd.setBlockKind(.heading(1), at: pos))
        case .heading2: select(cmd.setBlockKind(.heading(2), at: pos))
        case .heading3: select(cmd.setBlockKind(.heading(3), at: pos))
        case .paragraph: select(cmd.setBlockKind(.paragraph, at: pos))
        case .bulletList: select(cmd.setBlockKind(.bulletList, at: pos))
        case .orderedList: select(cmd.setBlockKind(.orderedList(start: 1), at: pos))
        case .taskList: select(cmd.setBlockKind(.taskList(done: false), at: pos))
        case .quote: select(cmd.setBlockKind(.blockquote, at: pos))
        case .toggleTask:
            if let item = para.context.itemBlockId { cmd.toggleTask(item) }
        case .indent:
            if let item = para.context.itemBlockId {
                cmd.indentItem(item)
                select(pos)
            } else {
                textView.insertText(para.kind.type == NodeType.codeBlock ? "    " : "\t")
            }
        case .outdent:
            if let item = para.context.itemBlockId {
                cmd.outdentItem(item)
                select(pos)
            }
        case .link:
            if !range.isEmpty, let s = UIPasteboard.general.string, let url = URL(string: s), url.scheme != nil {
                cmd.setMark(MarkName.link, value: .object(["href": .string(s)]), range: range)
            }
        }
        notifyStateChange()
    }

    /// Inserts a block after the paragraph with the caret.
    public func insertBlock(_ node: BlockNode) {
        let (i, o) = projection.position(at: selectionRange.lowerBound)
        guard projection.paragraphs.indices.contains(i) else { return }
        let caret = commands.insertBlock(node, after: TextPosition(block: projection.paragraphs[i].blockId, offset: o))
        select(caret)
    }

    public func undo() { textView.documentUndo.undo() }
    public func redo() { textView.documentUndo.redo() }
    public var canUndo: Bool { document.canUndo }
    public var canRedo: Bool { document.canRedo }

    // MARK: - Tools

    private func toolsChanged() {
        EditorDiagnostics.log("tools changed: \(tools.mode.rawValue)")
        // The pen recognizer wins pen touches by itself (it begins on touch down and prevents
        // scrolling), so the scroll recognizer's touch types are left alone: changing them while a
        // tool button's touch is being dispatched made UIKit's gesture environment throw.
        // Finger drawing (D-06) only changes how many fingers scroll, applied after this event.
        textView.panGestureRecognizer.minimumNumberOfTouches = tools.mode.capturesPen && tools.allowsFingerDrawing ? 2 : 1
        // The pen recognizer stays enabled in the text tool: it never begins there (`shouldTrack`
        // is false), so fingers type and scroll and the Pencil writes through Scribble. Disabling
        // it instead made UIKit's gesture environment throw on the next tap into the text.
        if tools.mode != .lasso { ink.clearSelection() }
        hoverLayer.path = nil
        notifyStateChange()
    }

    @objc private func hovered(_ g: UIHoverGestureRecognizer) {
        let point = g.location(in: textView)
        let active = (g.state == .began || g.state == .changed) && g.zOffset > 0 && tools.mode.capturesPen
        guard active, let preview = ink.hoverPreview(at: point) else {
            hoverLayer.path = nil
            return
        }
        let r = preview.radius
        hoverLayer.path = UIBezierPath(ovalIn: CGRect(x: preview.center.x - r, y: preview.center.y - r, width: r * 2, height: r * 2)).cgPath
        hoverLayer.strokeColor = preview.color.resolvedColor(with: traitCollection).cgColor
        hoverLayer.fillColor = preview.color.withAlphaComponent(tools.mode.isEraser ? 0.08 : 0.25).resolvedColor(with: traitCollection).cgColor
    }

    // MARK: - Task check boxes

    /// Task item whose check box is at `point` (content coordinates).
    private func taskItem(at point: CGPoint) -> BlockID? { taskCheckbox(at: point)?.item }

    /// The task check box under a point: its item, box in text view coordinates and state.
    private func taskCheckbox(at point: CGPoint) -> (item: BlockID, rect: CGRect, state: String)? {
        guard let off = geometry.paragraphOffset(at: point), let frag = geometry.fragment(at: off) as? BlockLayoutFragment,
              let d = frag.decoration, let state = d.taskState, let item = d.itemBlockId,
              let first = frag.textLineFragments.first else { return nil }
        let baseline = first.typographicBounds.minY + first.glyphOrigin.y
        let local = frag.checkboxRect(d, baseline: baseline)
        let origin = frag.layoutFragmentFrame.origin
        let rect = local.offsetBy(dx: origin.x + geometry.origin.x, dy: origin.y + geometry.origin.y)
        return rect.insetBy(dx: -10, dy: -8).contains(point) ? (item, rect, state) : nil
    }

    @objc private func tapped(_ g: UITapGestureRecognizer) {
        guard let box = taskCheckbox(at: g.location(in: textView)) else { return }
        commands.toggleTask(box.item)
        if box.state == "done" {
            DSHaptics.selection()
        } else {
            DSHaptics.taskComplete()
            animateCheck(in: box.rect)
        }
    }

    /// Completion flourish over the freshly drawn check box (`DSTaskCheckbox` motion): the fill
    /// grows with a slight overshoot, then the check mark draws itself. Skipped with Reduce Motion.
    private func animateCheck(in rect: CGRect) {
        guard !UIAccessibility.isReduceMotionEnabled else { return }
        let box = rect.insetBy(dx: 0.75, dy: 0.75)
        let container = CALayer()
        container.frame = rect.insetBy(dx: -2, dy: -2)
        let local = box.offsetBy(dx: -container.frame.minX, dy: -container.frame.minY)
        // Hide the already drawn final state until the animation reaches it.
        let cover = CAShapeLayer()
        cover.path = UIBezierPath(ovalIn: local.insetBy(dx: -1.5, dy: -1.5)).cgPath
        cover.fillColor = (paper.backgroundColor ?? EditorTheme.paper).resolvedColor(with: traitCollection).cgColor
        let fill = CAShapeLayer()
        fill.frame = local
        fill.path = UIBezierPath(ovalIn: CGRect(origin: .zero, size: local.size)).cgPath
        fill.fillColor = EditorTheme.accent.resolvedColor(with: traitCollection).cgColor
        let check = CAShapeLayer()
        let path = UIBezierPath()
        path.move(to: CGPoint(x: local.minX + local.width * 0.27, y: local.midY + local.height * 0.02))
        path.addLine(to: CGPoint(x: local.minX + local.width * 0.44, y: local.maxY - local.height * 0.28))
        path.addLine(to: CGPoint(x: local.maxX - local.width * 0.24, y: local.minY + local.height * 0.3))
        check.path = path.cgPath
        check.strokeColor = UIColor.white.cgColor
        check.fillColor = nil
        check.lineWidth = max(1.6, local.width * 0.12)
        check.lineCap = .round
        check.lineJoin = .round
        check.strokeEnd = 0
        [cover, fill, check].forEach(container.addSublayer)
        textView.layer.addSublayer(container)

        let now = CACurrentMediaTime()
        let grow = CABasicAnimation(keyPath: "transform.scale")
        grow.fromValue = 0
        grow.toValue = 1
        grow.duration = 0.3
        grow.timingFunction = CAMediaTimingFunction(controlPoints: 0.3, 1.3, 0.5, 1)
        fill.add(grow, forKey: "grow")
        let draw = CABasicAnimation(keyPath: "strokeEnd")
        draw.fromValue = 0
        draw.toValue = 1
        draw.beginTime = now + 0.05
        draw.duration = 0.25
        draw.fillMode = .both
        draw.isRemovedOnCompletion = false
        check.add(draw, forKey: "draw")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { container.removeFromSuperlayer() }
    }

    // MARK: - Lasso

    private func lassoSelected(_ ids: Set<String>, range: Range<Int>?, bounds: CGRect) {
        lassoTextRange = range
        if let range {
            textView.selectedRange = NSRange(location: range.lowerBound, length: range.count)
        }
        guard !ids.isEmpty || range != nil else {
            ink.clearSelection()
            return
        }
        let config = UIEditMenuConfiguration(identifier: "lasso", sourcePoint: CGPoint(x: bounds.midX, y: bounds.minY))
        editMenu.presentEditMenu(with: config)
    }

    private func deleteLassoSelection() {
        let range = lassoTextRange
        document.stopCapturing()
        document.transact {
            ink.deleteSelectedStrokes()
            if let range { commands.replace(range, with: "") }
        }
        document.stopCapturing()
        lassoTextRange = nil
    }
}

// MARK: - UITextViewDelegate

extension EditorView: UITextViewDelegate {
    public func textView(_ tv: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
        if suppressDelegate { return true }
        let p = projection
        guard !p.paragraphs.isEmpty else { return true }
        let lo = range.location, hi = range.location + range.length
        let (si, so) = p.position(at: lo)
        let (ei, eo) = p.position(at: hi)
        let cmd = commands
        let start = p.paragraphs[si]
        pendingShortcut = nil

        // Return.
        if text == "\n", start.kind.isText {
            if range.length > 0 { cmd.replace(lo..<hi, with: "") }
            let pos = TextPosition(block: start.blockId, offset: so)
            var caret = range.length == 0 ? MarkdownShortcuts(commands: cmd).handleReturn(at: pos) : nil
            if caret == nil {
                document.stopCapturing()
                caret = cmd.splitParagraph(at: pos)
                document.stopCapturing()
            }
            select(caret)
            return false
        }
        // Backspace at the start of a paragraph (or delete at the end of the previous one).
        if text.isEmpty, range.length == 1, ei == si + 1, eo == 0, so == start.length {
            select(cmd.joinBackward(at: TextPosition(block: p.paragraphs[ei].blockId, offset: 0)))
            return false
        }
        // Plain typing inside one text paragraph: let the text view apply it, mirror to the model.
        if si == ei, start.kind.isText, !text.contains("\n"), !text.contains("\u{FFFC}"), !text.contains("\u{2028}") || start.kind.type == NodeType.codeBlock {
            let isCode = start.kind.type == NodeType.codeBlock
            let marks: MarkSet = isCode ? .empty : (pendingMarks ?? cmd.marks(at: lo..<lo))
            let modelText = isCode ? text.replacingOccurrences(of: "\u{2028}", with: "\n") : text
            cmd.typeText(modelText, marks: marks, at: TextPosition(block: start.blockId, offset: so), replacing: hi - lo)
            if text.utf16.count == 1 { pendingShortcut = (lo + 1, text) }
            return true
        }
        // Everything else is structural.
        let clean = text.replacingOccurrences(of: "\u{FFFC}", with: "").replacingOccurrences(of: "\u{2028}", with: "\n")
        select(cmd.replace(lo..<hi, with: clean, marks: pendingMarks ?? .empty))
        return false
    }

    public func textViewDidChange(_ tv: UITextView) {
        let caret = tv.selectedRange.location
        let (i, o) = projection.position(at: caret)
        if let shortcut = pendingShortcut, projection.paragraphs.indices.contains(i) {
            pendingShortcut = nil
            let pos = TextPosition(block: projection.paragraphs[i].blockId, offset: o)
            let md = MarkdownShortcuts(commands: commands)
            var fired: TextPosition?
            if shortcut.char == " " { fired = md.handleSpace(at: pos) ?? md.handleTag(at: pos) }
            if fired == nil, ["*", "_", "`", "~", "="].contains(shortcut.char) { fired = md.handleInline(at: pos) }
            if fired == nil, shortcut.char == "]", let resolver = attachmentResolver {
                fired = md.handleNoteLink(at: pos) { resolver.noteId(forLinkLabel: $0) }
            }
            if let fired {
                select(fired)
                return
            }
        }
        normalizeParagraph(i)
        ink.invalidateLayout()
        notifyStateChange()
    }

    public func scrollViewDidScroll(_ scrollView: UIScrollView) {
        onScroll?(scrollView.contentOffset.y + scrollView.adjustedContentInset.top)
    }

    public func textViewDidChangeSelection(_ tv: UITextView) {
        if suppressDelegate { return }
        pendingMarks = nil
        updateTypingAttributes()
        notifyStateChange()
    }

    public func textView(_ textView: UITextView, editMenuForTextIn range: NSRange, suggestedActions: [UIMenuElement]) -> UIMenu? {
        let (i, _) = projection.position(at: range.location)
        guard projection.paragraphs.indices.contains(i), let item = projection.paragraphs[i].context.itemBlockId,
              let node = document.block(item), node.type == NodeType.taskItem else { return nil }
        return UIMenu(children: [taskMenu(item: item, node: node)] + suggestedActions)
    }

    /// Craft-like task menu: complete, schedule, deadline, cancel.
    private func taskMenu(item: BlockID, node: BlockNode) -> UIMenu {
        let cmd = commands
        let state = node.attrs["state"]?.stringValue ?? "open"
        let scheduled = node.attrs["scheduled"]?.stringValue
        let deadline = node.attrs["deadline"]?.stringValue
        func day(_ offset: Int) -> String {
            let date = Calendar.current.date(byAdding: .day, value: offset, to: Date()) ?? Date()
            let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
            return String(format: "%04d-%02d-%02d", c.year ?? 2026, c.month ?? 1, c.day ?? 1)
        }
        let schedule = UIMenu(title: "Запланировать", image: UIImage(systemName: "calendar"), children: [
            UIAction(title: "Сегодня") { _ in cmd.setTaskDates(item, scheduled: day(0), deadline: deadline) },
            UIAction(title: "Завтра") { _ in cmd.setTaskDates(item, scheduled: day(1), deadline: deadline) },
            UIAction(title: "Через неделю") { _ in cmd.setTaskDates(item, scheduled: day(7), deadline: deadline) },
            UIAction(title: "Без даты") { _ in cmd.setTaskDates(item, scheduled: nil, deadline: deadline) },
        ])
        let due = UIMenu(title: "Дедлайн", image: UIImage(systemName: "flag"), children: [
            UIAction(title: "Сегодня") { _ in cmd.setTaskDates(item, scheduled: scheduled, deadline: day(0)) },
            UIAction(title: "Завтра") { _ in cmd.setTaskDates(item, scheduled: scheduled, deadline: day(1)) },
            UIAction(title: "Через неделю") { _ in cmd.setTaskDates(item, scheduled: scheduled, deadline: day(7)) },
            UIAction(title: "Без дедлайна") { _ in cmd.setTaskDates(item, scheduled: scheduled, deadline: nil) },
        ])
        let toggle = UIAction(title: state == "done" ? "Вернуть в работу" : "Выполнить",
                              image: UIImage(systemName: state == "done" ? "circle" : "checkmark.circle")) { _ in cmd.toggleTask(item) }
        let cancel = UIAction(title: state == "cancelled" ? "Восстановить" : "Отменить задачу", image: UIImage(systemName: "xmark.circle")) { [weak self] _ in
            self?.document.setAttributes(item, ["state": .string(state == "cancelled" ? "open" : "cancelled"), "completedAt": nil])
        }
        return UIMenu(title: "Задача", image: UIImage(systemName: "checklist"), options: .displayInline, children: [toggle, schedule, due, cancel])
    }

    public func textView(_ textView: UITextView, primaryActionFor textItem: UITextItem, defaultAction: UIAction) -> UIAction? {
        if case .textAttachment(let attachment) = textItem.content, let chip = attachment as? InlineAtomAttachment,
           let atom = chip.atom, atom.type == NodeType.noteLink, let id = atom.attrs["noteId"]?.stringValue {
            return UIAction { [weak self] _ in self?.onOpenNote?(id) }
        }
        return defaultAction
    }
}

// MARK: - Gestures, Scribble, Pencil, edit menu

extension EditorView: UIGestureRecognizerDelegate {
    public override func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
        if g is UITapGestureRecognizer, g.view === textView, g.delegate === self {
            return taskItem(at: g.location(in: textView)) != nil
        }
        return super.gestureRecognizerShouldBegin(g)
    }

    public func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        false
    }

    /// The pen recognizer receives every touch and follows only those it draws with (it never
    /// begins for the others, so selection and scrolling are unaffected). Declining touches here
    /// crashed UIKit when a SwiftUI control over the editor was delaying the same touch.
    public func gestureRecognizer(_ g: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        if g === inkInput { return true }
        if let header = headerView, header.bounds.contains(touch.location(in: header)) { return false }
        return true
    }
}

extension EditorView: @preconcurrency UIScribbleInteractionDelegate {
    public func scribbleInteraction(_ interaction: UIScribbleInteraction, shouldBeginAt location: CGPoint) -> Bool {
        !tools.mode.capturesPen
    }
}

extension EditorView: @preconcurrency UIPencilInteractionDelegate {
    public func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveTap tap: UIPencilInteraction.Tap) {
        switch UIPencilInteraction.preferredTapAction {
        case .switchEraser: tools.toggleEraser()
        case .switchPrevious: tools.mode = tools.previousMode
        case .showColorPalette, .showInkAttributes, .showContextualPalette:
            onPaletteRequest?(tap.hoverPose.map { interaction.view?.convert($0.location, to: self) ?? $0.location })
        default: break
        }
    }

    public func pencilInteraction(_ interaction: UIPencilInteraction, didReceiveSqueeze squeeze: UIPencilInteraction.Squeeze) {
        guard squeeze.phase == .ended else { return }
        switch UIPencilInteraction.preferredSqueezeAction {
        case .ignore: return
        case .switchEraser: tools.toggleEraser()
        case .switchPrevious: tools.mode = tools.previousMode
        default:
            UICanvasFeedbackGenerator(view: self).alignmentOccurred(at: squeeze.hoverPose?.location ?? center)
            onPaletteRequest?(squeeze.hoverPose.map { interaction.view?.convert($0.location, to: self) ?? $0.location })
        }
    }
}

extension EditorView: @preconcurrency UIEditMenuInteractionDelegate {
    public func editMenuInteraction(_ interaction: UIEditMenuInteraction, menuFor configuration: UIEditMenuConfiguration,
                                    suggestedActions: [UIMenuElement]) -> UIMenu? {
        guard configuration.identifier as? String == "lasso" else { return UIMenu(children: suggestedActions) }
        var items: [UIMenuElement] = [
            UIAction(title: "Удалить", image: UIImage(systemName: "trash"), attributes: .destructive) { [weak self] _ in
                self?.deleteLassoSelection()
            },
        ]
        if let range = lassoTextRange {
            items.append(UIAction(title: "Копировать текст", image: UIImage(systemName: "doc.on.doc")) { [weak self] _ in
                guard let self else { return }
                let s = (self.textView.textStorage.string as NSString).substring(with: NSRange(location: range.lowerBound, length: range.count))
                UIPasteboard.general.string = s.replacingOccurrences(of: "\u{FFFC}", with: "")
            })
        }
        if !ink.selectedStrokes.isEmpty {
            let colors = EditorTheme.inkTokens.map { token in
                UIAction(title: token.replacingOccurrences(of: "ink.", with: ""),
                         image: UIImage(systemName: "circle.fill")?.withTintColor(EditorTheme.color(token: token), renderingMode: .alwaysOriginal)) { [weak self] _ in
                    self?.ink.recolorSelection(token)
                }
            }
            items.append(UIMenu(title: "Цвет штрихов", image: UIImage(systemName: "paintpalette"), children: colors))
        }
        return UIMenu(children: items)
    }
}
#endif
