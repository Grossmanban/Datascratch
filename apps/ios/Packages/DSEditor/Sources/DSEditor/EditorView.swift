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
    /// A literal `[[Title]]` in the text was tapped (an agent's link to a note that did not exist
    /// yet, or one typed without autocomplete). The host opens the note with that title, or offers
    /// to create it (`spec/04-editor.md`).
    public var onOpenNoteTitled: ((String) -> Void)?
    /// Shows "Посмотреть историю" in the agent-edits banner when set.
    public var onShowHistory: (() -> Void)? {
        didSet { agentBanner.onShowHistory = onShowHistory }
    }
    /// Name of the agent that created this note (`NoteMeta.createdByAgent`, D-45), or nil. Such a
    /// note shows "Создано агентом {name} · Понятно" instead of line-by-line highlighting; the host
    /// clears the field in `onAcknowledgeCreatedByAgent` and then sets this to nil.
    public var createdByAgent: String? {
        didSet { updateAgentBanner() }
    }
    /// "Понятно" on the created-by-agent banner (D-45): the host sets `createdByAgent = null` in
    /// the notebook index. The banner hides right away.
    public var onAcknowledgeCreatedByAgent: (() -> Void)?
    /// "/" was typed at the start of a paragraph or after a space: the host shows the block menu
    /// (`DSSuggestionList`) near `caretRect` with `items`, and calls `applySlashCommand(_:)` on a
    /// pick. Called again as the query changes, and with nil when the menu should close.
    public var onSlashMenu: ((SlashMenuState?) -> Void)?
    /// "Ссылка" in the format menu or bar with no URL on the pasteboard: the host asks for a URL and
    /// calls `setLink(_:)` (the selection is kept until then).
    public var onLinkRequest: (() -> Void)?
    /// Tools, undo availability, selection, editing (`isEditingText`) or formatting (`formatState`)
    /// changed (refresh toolbars and the format bar).
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
    /// Banner above the first block while the note has unaccepted agent edits (D-10).
    private let agentBanner = AgentEditsBanner()
    private var agentBannerVisible = false
    private var agentBannerSpace: CGFloat { agentBannerVisible ? AgentEditsBanner.height + 12 : 0 }
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
    let factory: AttachmentFactory
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
        agentBanner.isHidden = true
        agentBanner.onAcceptAll = { [weak self] in self?.acceptAgentEdits() }
        agentBanner.onAcknowledge = { [weak self] in
            guard let self else { return }
            let acknowledge = self.onAcknowledgeCreatedByAgent
            self.createdByAgent = nil
            acknowledge?()
        }
        textView.addSubview(agentBanner)
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
            // Controls the host lays over the editor (a floating palette) keep their touches.
            let p = touch.location(in: self)
            if p.y > self.bounds.maxY - self.overlayInsets.bottom || p.y < self.bounds.minY + self.overlayInsets.top { return false }
            if let header = self.headerView, header.bounds.contains(touch.location(in: header)) { return false }
            if self.agentBannerVisible, self.agentBanner.bounds.contains(touch.location(in: self.agentBanner)) { return false }
            if touch.type == .pencil, !Self.pencilSeen {
                Self.pencilSeen = true
                DispatchQueue.main.async { self.setNeedsLayout() }
            }
            return touch.type == .pencil || (self.tools.allowsFingerDrawing && touch.type == .direct)
        }
        inkInput.onBegan = { [weak self] s in
            guard let self else { return }
            // Palm rejection comes from the recognizer itself: it begins on touch down and
            // prevents the scroll recognizer for that touch, so a resting hand does not draw.
            self.ink.penBegan(s)
            self.penDown = true
            self.showContactIndicator(at: s.location)
        }
        inkInput.onMoved = { [weak self] c, p in
            guard let self else { return }
            self.ink.penMoved(c, predicted: p)
            if let last = c.last { self.showContactIndicator(at: last.location) }
        }
        inkInput.onEnded = { [weak self] cancelled in
            guard let self else { return }
            self.ink.penEnded(cancelled: cancelled)
            self.penDown = false
            self.setIndicator(nil)
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
        textView.addGestureRecognizer(touchObserver)
        // Work held back while a finger was on the text: the keyboard inset, late block heights.
        touchObserver.onLift = { [weak self] in
            self?.applyKeyboardInset()
            self?.flushPendingAtomRelayout()
        }

        let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
        tap.delegate = self
        tap.delaysTouchesBegan = false
        tap.delaysTouchesEnded = false
        textView.addGestureRecognizer(tap)
        textView.editorTap = tap
        textView.tapTargetAt = { [weak self] point in self?.hasTapTarget(at: point) ?? false }

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

        // The overlap is measured once the keyboard is in place (`did`, not `will`): a host that
        // shrinks the editor for the keyboard does so in the same animation, and measuring the
        // still full-height editor against the incoming keyboard counted the keyboard twice — the
        // visible area collapsed for a moment, UIKit scrolled the caret to the very top, and a
        // screen of empty space stayed under it (iPad, build 9).
        NotificationCenter.default.addObserver(forName: UIResponder.keyboardDidChangeFrameNotification, object: nil, queue: .main) { [weak self] note in
            let frame = (note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue
            MainActor.assumeIsolated { self?.keyboardFrameChanged(frame) }
        }
        NotificationCenter.default.addObserver(forName: UIResponder.keyboardWillHideNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.keyboardFrameChanged(nil) }
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
        // Duplicate titles from a merge are repaired; an empty document gets nothing (its content
        // may still be on its way: nothing is created on open).
        EditorCommands(document: document).repairTitles()
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
        updateAgentBanner()
        ink.invalidateLayout()
        if bounds.width > 0 {
            layoutIfNeeded()
            if let tlm = textView.textLayoutManager {
                // A note of ordinary length is laid out whole on open: with TextKit 2's estimated
                // heights the content size kept changing under the first swipes and the text view
                // pulled the note back (build 15). Long notes keep the lazy layout (open time).
                if text.length <= Self.fullLayoutLimit { tlm.ensureLayout(for: tlm.documentRange) }
                tlm.textViewportLayoutController.layoutViewport()
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
        setBaseFontSize(EditorTheme.dynamicBaseSize(for: traitCollection))
    }

    /// Body text size (Dynamic Type); everything else scales with it.
    func setBaseFontSize(_ size: CGFloat) {
        guard size != theme.baseFontSize else { return }
        theme.baseFontSize = size
        applyTheme()
        rerenderAll()
    }

    private func applyTheme() {
        renderer.theme = theme
        factory.theme = theme
        paper.paper = theme.style.paper
        alignPaper(frame: paper.frame)
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
        agentBanner.isHidden = !agentBannerVisible
        if agentBannerVisible {
            let frame = CGRect(x: side, y: headerHeight + 16, width: bounds.width - side * 2, height: AgentEditsBanner.height)
            if agentBanner.frame != frame { agentBanner.frame = frame }
        }
        // Room to draw below the last paragraph — at least one screen — only while drawing is
        // available (`strokes.md` §4: a Pencil has been used, or finger drawing is on).
        let room = drawingAvailable ? max(160, bounds.height) : 160
        let inset = UIEdgeInsets(top: 32 + headerHeight + agentBannerSpace, left: side, bottom: room, right: side)
        if textView.textContainerInset != inset { textView.textContainerInset = inset }
        applyKeyboardInset()
    }

    // MARK: - Keyboard

    /// Keyboard overlap fallback: when the host keeps the editor full height under the keyboard,
    /// the bottom scroll inset grows by the overlap. Hosts should let the editor shrink for the
    /// keyboard (the SwiftUI default) — then the overlap is zero and this does nothing. In the demo
    /// under XCUITest, a full-height editor under the keyboard crashed UIKit on a tap into the text.
    private var keyboardFrame: CGRect?
    private var pendingBottomInset: (bottom: CGFloat, overlap: CGFloat)?
    private var insetApplyScheduled = false
    /// Bands along the editor's edges covered by the host's own controls (a floating tool palette):
    /// the pen does not start strokes there, so taps on those controls are never taken for ink.
    public var overlayInsets: UIEdgeInsets = .zero

    /// Whether the editor adds the keyboard overlap to its bottom scroll inset (see above).
    public var adjustsForKeyboard = true {
        didSet { applyKeyboardInset() }
    }

    private func keyboardFrameChanged(_ frame: CGRect?) {
        keyboardFrame = frame
        applyKeyboardInset()
    }

    private func applyKeyboardInset() {
        var overlap: CGFloat = 0
        if adjustsForKeyboard, let screenFrame = keyboardFrame, let window {
            let frame = window.convert(screenFrame, from: window.screen.coordinateSpace)
            let mine = convert(bounds, to: window)
            overlap = max(0, mine.maxY - frame.minY)
            if frame.minY >= window.bounds.maxY { overlap = 0 }
        }
        // Free drawings may reach below the text: keep them reachable by scrolling.
        let inkBeyond = max(0, (ink?.inkExtentMaxY ?? 0) + 40 - textView.contentSize.height)
        let bottom = overlap + inkBeyond
        guard abs(textView.contentInset.bottom - bottom) > 1 else { return }
        pendingBottomInset = (bottom, overlap)
        guard !insetApplyScheduled else { return }
        insetApplyScheduled = true
        // Applied on the next main-queue turn (never while a touch is being delivered), coalesced,
        // without forcing a scroll: the text view keeps the caret visible itself.
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.insetApplyScheduled = false
            guard let pending = self.pendingBottomInset else { return }
            self.pendingBottomInset = nil
            guard abs(self.textView.contentInset.bottom - pending.bottom) > 1 else { return }
            if self.userIsInteracting {
                // Changing the inset under a dragging finger moves the content: applied after.
                // `touchObserver.onLift` applies it once the finger is up.
                return
            }
            let grows = pending.bottom > self.textView.contentInset.bottom
            self.textView.contentInset.bottom = pending.bottom
            self.textView.verticalScrollIndicatorInsets.bottom = pending.overlap
            // Full-height host: the keyboard now covers the bottom; bring the caret into view with
            // the smallest scroll (nothing moves if it is already visible).
            if grows, pending.overlap > 0 { self.scrollCaretIntoView() }
        }
    }

    /// Ruled, grid and dot paper follow the text: the pitch is the body line height and the
    /// rules sit under the lines, which start at the top of the text container.
    private func alignPaper(frame: CGRect) {
        guard let pitch = theme.paperPitch else { return }
        let inset = textView.textContainerInset
        paper.pitch = pitch
        paper.ruleLift = (abs(theme.bodyFont.descender) - 2).rounded()
        paper.phase = CGPoint(x: inset.left - frame.minX, y: inset.top - frame.minY)
    }

    // MARK: - Drawing availability

    /// An Apple Pencil has drawn on this device (remembered across launches), or the system says
    /// the person draws only with a Pencil.
    static var pencilSeen: Bool = UserDefaults.standard.bool(forKey: "ds.pencilSeen") || UIPencilInteraction.prefersPencilOnlyDrawing {
        didSet { if pencilSeen { UserDefaults.standard.set(true, forKey: "ds.pencilSeen") } }
    }

    /// Free drawing is possible here: a Pencil has been used, or finger drawing is on. The room
    /// below the last paragraph (one screen for drawing) exists only then.
    public var drawingAvailable: Bool { tools.allowsFingerDrawing || Self.pencilSeen }

    /// Scrolls the least needed to show the caret line, with about a line of margin, above the
    /// bottom obstruction (keyboard inset, the host's palette band). Never while the person is
    /// touching the text (dragging a selection handle, scrolling): UIKit's own edge autoscroll
    /// runs then, and scrolling on top of it made the selection run away (build 14).
    func scrollCaretIntoView() {
        guard textView.isFirstResponder, !userIsInteracting, let range = textView.selectedTextRange else { return }
        let caret = textView.caretRect(for: range.end)
        let margin = max(8, theme.bodyFont.lineHeight)
        var visible = textView.bounds.inset(by: textView.adjustedContentInset)
        visible.size.height -= overlayInsets.bottom
        visible.origin.y += overlayInsets.top
        visible.size.height -= overlayInsets.top
        guard caret.minY < visible.minY || caret.maxY > visible.maxY else { return }
        var y = textView.contentOffset.y
        if caret.maxY > visible.maxY { y += caret.maxY + margin - visible.maxY }
        if caret.minY < visible.minY { y -= visible.minY - caret.minY + margin }
        let minY = -textView.adjustedContentInset.top
        let maxY = max(minY, textView.contentSize.height + textView.adjustedContentInset.bottom - textView.bounds.height)
        textView.setContentOffset(CGPoint(x: textView.contentOffset.x, y: min(max(y, minY), maxY)), animated: false)
    }

    /// The person has a finger (or pencil) on the text view: no programmatic scrolling then.
    var userIsInteracting: Bool { userIsScrolling }

    /// A structural edit at the caret (Return, joining paragraphs, a paste) re-renders paragraphs and
    /// moves the selection; UIKit then scrolled on its own — often far past the keyboard. The scroll
    /// position is kept and only the least needed to show the caret is added (build 14).
    func keepingScroll(_ edit: () -> Void) {
        let offset = textView.contentOffset
        edit()
        guard !userIsInteracting else { return }
        textView.layoutIfNeeded()
        if textView.contentOffset != offset { textView.setContentOffset(offset, animated: false) }
        scrollCaretIntoView()
        let settled = textView.contentOffset
        // UIKit scrolls to a programmatic selection on the next turn too.
        DispatchQueue.main.async { [weak self] in
            guard let self, !self.userIsInteracting, self.textView.contentOffset != settled else { return }
            self.textView.setContentOffset(settled, animated: false)
            self.scrollCaretIntoView()
        }
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
        tapTargetElementsDirty = true
        let size = CGSize(width: max(textView.contentSize.width, textView.bounds.width),
                          height: max(textView.contentSize.height, textView.bounds.height) + 400)
        let frame = CGRect(origin: CGPoint(x: 0, y: -200), size: size)
        alignPaper(frame: frame)
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
        applyKeyboardInset()
    }

    // MARK: - Document → view

    private func documentChanged(_ change: DocumentChange) {
        tapTargetElementsDirty = true
        if change.structureChanged, change.origin != .system, !titleRepairScheduled {
            // Any change of the top level (content arriving for an empty note, another client's
            // merge, a structural edit) may leave a broken start: repaired once it is over.
            titleRepairScheduled = true
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                self.titleRepairScheduled = false
                EditorCommands(document: self.document).repairTitles()
            }
        }
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
        updateAgentBanner()
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
        factory.pruneViews(keeping: Set(new.paragraphs.map(\.blockId)))
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
        tapTargetElementsDirty = true
        let text = renderer.render(projection, paragraphs: 0..<projection.paragraphs.count)
        let selection = textView.selectedRange
        suppressDelegate = true
        textView.textStorage.setAttributedString(text)
        suppressDelegate = false
        textView.selectedRange = NSRange(location: min(selection.location, text.length), length: 0)
        ink.invalidateLayout()
        setNeedsInkRefresh()
    }

    /// Notes up to this many characters are laid out whole when opened.
    static let fullLayoutLimit = 40_000
    /// Block types whose height changed (a late Mermaid render) while the person was scrolling.
    private var pendingAtomRelayout: Set<String> = []

    private var userIsScrolling: Bool {
        textView.isTracking || textView.isDragging || textView.isDecelerating || touchObserver.touching
    }

    /// Lays blocks of `type` out again after their height changed. Never while the person is
    /// scrolling (it is applied when the scroll ends), and the text at the top of the screen
    /// stays where it is: blocks above it that grow or shrink do not move what is being read.
    private func rerenderAtoms(of type: String) {
        guard let tlm = textView.textLayoutManager else { return }
        if userIsScrolling {
            pendingAtomRelayout.insert(type)
            return
        }
        let anchor = visibleAnchor()
        for (i, p) in projection.paragraphs.enumerated() where p.kind == .atom(type) {
            if let r = geometry.textRange(projection.starts[i]..<(projection.starts[i] + 1)) { tlm.invalidateLayout(for: r) }
        }
        if let anchor {
            if textView.text.utf16.count <= Self.fullLayoutLimit { tlm.ensureLayout(for: tlm.documentRange) }
            tlm.textViewportLayoutController.layoutViewport()
            restore(anchor)
        }
        textView.setNeedsLayout()
        ink.invalidateLayout()
        setNeedsInkRefresh()
    }

    private func flushPendingAtomRelayout() {
        guard !pendingAtomRelayout.isEmpty, !userIsScrolling else { return }
        let types = pendingAtomRelayout
        pendingAtomRelayout = []
        for type in types { rerenderAtoms(of: type) }
    }

    /// The first fragment at the top of the visible area and its distance from that edge.
    private func visibleAnchor() -> (location: NSTextLocation, offset: CGFloat)? {
        guard let tlm = textView.textLayoutManager else { return nil }
        let top = textView.contentOffset.y + textView.adjustedContentInset.top
        // Nothing to keep at the very top of the note.
        guard top > textView.textContainerInset.top + 1 else { return nil }
        let point = CGPoint(x: textView.textContainer.size.width / 2, y: top - textView.textContainerInset.top)
        guard let fragment = tlm.textLayoutFragment(for: point) else { return nil }
        return (fragment.rangeInElement.location, fragment.layoutFragmentFrame.minY - point.y)
    }

    private func restore(_ anchor: (location: NSTextLocation, offset: CGFloat)) {
        guard let tlm = textView.textLayoutManager, let fragment = tlm.textLayoutFragment(for: anchor.location) else { return }
        let wantedTop = fragment.layoutFragmentFrame.minY - anchor.offset + textView.textContainerInset.top
        let y = wantedTop - textView.adjustedContentInset.top
        guard abs(y - textView.contentOffset.y) > 0.5 else { return }
        textView.layoutIfNeeded()
        textView.contentOffset.y = y
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
        // Text a person types is theirs: it never inherits the agent's mark from its neighbours.
        let marks = (pendingMarks ?? commands.marks(at: r.lowerBound..<r.lowerBound)).setting(MarkName.agentEdit, nil)
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
        // A heading button on a heading of that level turns it back into text (format bar toggles).
        case .heading1: select(cmd.setBlockKind(BlockStyle(para) == .heading1 ? .paragraph : .heading(1), at: pos))
        case .heading2: select(cmd.setBlockKind(BlockStyle(para) == .heading2 ? .paragraph : .heading(2), at: pos))
        case .heading3: select(cmd.setBlockKind(BlockStyle(para) == .heading3 ? .paragraph : .heading(3), at: pos))
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
            guard !range.isEmpty else { break }
            if cmd.marks(at: range).contains(MarkName.link) {
                cmd.setMark(MarkName.link, value: nil, range: range)
            } else if let request = onLinkRequest {
                // The host asks for the address (reading the pasteboard here would show the system
                // paste prompt on every tap; the host can offer the pasteboard in its prompt).
                linkRange = range
                request()
            } else if UIPasteboard.general.hasURLs, let url = UIPasteboard.general.url, url.scheme != nil {
                cmd.setMark(MarkName.link, value: .object(["href": .string(url.absoluteString)]), range: range)
            }
        }
        notifyStateChange()
    }

    // MARK: - Formatting state (format bar)

    /// Marks on at the selection (all of it) or caret (what the next typed text gets), and the
    /// block style of the paragraph with the caret.
    public var formatState: FormatState {
        let range = selectionRange
        let (i, _) = projection.position(at: range.lowerBound)
        guard projection.paragraphs.indices.contains(i) else { return FormatState() }
        let marks = range.isEmpty ? (pendingMarks ?? commands.marks(at: range)) : commands.marks(at: range)
        return FormatState(marks: Set(marks.names).subtracting([MarkName.agentEdit]),
                           block: BlockStyle(projection.paragraphs[i]), hasSelection: !range.isEmpty)
    }

    private var linkRange: Range<Int>?

    /// Sets (or with nil removes) a link on the selection, or on the range saved when
    /// `onLinkRequest` was called.
    public func setLink(_ url: URL?) {
        let range = linkRange ?? selectionRange
        linkRange = nil
        guard !range.isEmpty else { return }
        commands.setMark(MarkName.link, value: url.map { .object(["href": .string($0.absoluteString)]) }, range: range)
        textView.selectedRange = NSRange(location: range.lowerBound, length: range.count)
        notifyStateChange()
    }

    // MARK: - "/" block menu

    private var slashMenu: SlashMenuState?

    /// Opens, updates or closes the "/" menu for the text before the caret.
    private func updateSlashMenu() {
        let range = selectionRange
        var state: SlashMenuState?
        let (i, o) = projection.position(at: range.lowerBound)
        if range.isEmpty, onSlashMenu != nil, projection.paragraphs.indices.contains(i), projection.paragraphs[i].kind.isText,
           projection.paragraphs[i].kind.type != NodeType.codeBlock, o > 0 {
            let para = projection.paragraphs[i]
            let before = document.inline(of: para.blockId, range: 0..<o).map { el -> String in
                if case .text(let t, _) = el { return t } else { return "\u{FFFC}" }
            }.joined()
            if let hit = SlashCommands.trigger(in: before) {
                let start = projection.starts[i] + hit.slashOffset
                let caret = textView.selectedTextRange.map { textView.caretRect(for: $0.start) } ?? .zero
                state = SlashMenuState(query: hit.query, items: SlashCommands.matching(hit.query),
                                       range: start..<range.lowerBound, caretRect: textView.convert(caret, to: self))
            }
        }
        guard state != slashMenu else { return }
        slashMenu = state
        onSlashMenu?(state)
    }

    /// Closes the "/" menu without applying anything (the typed text stays).
    public func dismissSlashMenu() {
        guard slashMenu != nil else { return }
        slashMenu = nil
        onSlashMenu?(nil)
    }

    /// Applies a "/" menu entry: removes the typed "/query" and turns the paragraph into that
    /// block, or inserts the block after it.
    public func applySlashCommand(_ id: String) {
        guard let menu = slashMenu else { return }
        slashMenu = nil
        onSlashMenu?(nil)
        select(commands.replace(menu.range, with: ""))
        let (i, o) = projection.position(at: selectionRange.lowerBound)
        guard projection.paragraphs.indices.contains(i) else { return }
        let pos = TextPosition(block: projection.paragraphs[i].blockId, offset: o)
        switch id {
        case "paragraph": select(commands.setBlockKind(.paragraph, at: pos))
        case "heading1": select(commands.setBlockKind(.heading(1), at: pos))
        case "heading2": select(commands.setBlockKind(.heading(2), at: pos))
        case "heading3": select(commands.setBlockKind(.heading(3), at: pos))
        case "quote": select(commands.setBlockKind(.blockquote, at: pos))
        case "bulletList": select(commands.setBlockKind(.bulletList, at: pos))
        case "orderedList": select(commands.setBlockKind(.orderedList(start: 1), at: pos))
        case "taskList": select(commands.setBlockKind(.taskList(done: false), at: pos))
        case "code": select(commands.setBlockKind(.codeBlock(language: nil), at: pos))
        case "math": insertBlock(.math(""))
        case "mermaid": insertBlock(.mermaid("flowchart LR\n  A --> B"))
        case "table": insertBlock(EditorCommands.table(rows: 3, columns: 3))
        case "drawing": insertBlock(.drawing(height: 260))
        case "rule": insertBlock(.rule())
        default: break
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
        setNeedsLayout() // finger drawing changes the room below the text
        // The pen recognizer wins pen touches by itself (it begins on touch down and prevents
        // scrolling), so the scroll recognizer's touch types are left alone: changing them while a
        // tool button's touch is being dispatched made UIKit's gesture environment throw.
        // Finger drawing (D-06) only changes how many fingers scroll, applied after this event.
        textView.panGestureRecognizer.minimumNumberOfTouches = tools.mode.capturesPen && tools.allowsFingerDrawing ? 2 : 1
        // The pen recognizer stays enabled in the text tool: it never begins there (`shouldTrack`
        // is false), so fingers type and scroll and the Pencil writes through Scribble. Disabling
        // it instead made UIKit's gesture environment throw on the next tap into the text.
        if tools.mode != .lasso { ink.clearSelection() }
        setIndicator(nil)
        notifyStateChange()
    }

    /// The pen is on the glass (the ink recognizer is tracking a touch).
    private var penDown = false
    /// Centre of the tool indicator circle in text view content coordinates, nil when hidden.
    private(set) var indicatorCenter: CGPoint?

    @objc private func hovered(_ g: UIHoverGestureRecognizer) {
        // While the pen touches the glass the hover recognizer stops moving (it kept reporting the
        // touch-down point, so the eraser circle stuck there): the pen's own touches drive the
        // indicator then.
        guard !penDown else { return }
        let point = g.location(in: textView)
        let active = (g.state == .began || g.state == .changed) && g.zOffset > 0 && tools.mode.capturesPen
        setIndicator(active ? point : nil)
    }

    /// Indicator under a touching pen: the eraser's circle follows every move (what it erases);
    /// ink tools hide it, the stroke itself shows where they draw.
    private func showContactIndicator(at point: CGPoint) {
        setIndicator(tools.mode.isEraser ? point : nil)
    }

    private func setIndicator(_ point: CGPoint?) {
        guard let point, let preview = ink.hoverPreview(at: point) else {
            hoverLayer.path = nil
            indicatorCenter = nil
            return
        }
        let r = preview.radius
        indicatorCenter = preview.center
        hoverLayer.path = UIBezierPath(ovalIn: CGRect(x: preview.center.x - r, y: preview.center.y - r, width: r * 2, height: r * 2)).cgPath
        hoverLayer.strokeColor = preview.color.resolvedColor(with: traitCollection).cgColor
        hoverLayer.fillColor = preview.color.withAlphaComponent(tools.mode.isEraser ? 0.08 : 0.25).resolvedColor(with: traitCollection).cgColor
    }

    // MARK: - Note links

    enum NoteLinkTarget: Equatable {
        case id(String)
        case title(String)
    }

    /// The note link under a point (content coordinates): a `noteLink` chip, or a literal
    /// `[[Title]]` in the text. Only when the host handles that kind of link.
    /// Frames of the note links (chips and literal `[[Title]]`) in `view`'s coordinates, for
    /// hosts and UI tests that need to find them on screen.
    public func noteLinkFrames(in view: UIView) -> [(kind: NoteLinkKind, frame: CGRect)] {
        let storage = textView.textStorage
        var out: [(kind: NoteLinkKind, frame: CGRect)] = []
        storage.enumerateAttribute(.dsWikiLink, in: NSRange(location: 0, length: storage.length)) { value, range, _ in
            guard value != nil, let f = geometry.segmentFrame(range.location..<(range.location + range.length)) else { return }
            out.append((.title, textView.convert(f, to: view)))
        }
        storage.enumerateAttribute(.attachment, in: NSRange(location: 0, length: storage.length)) { value, range, _ in
            guard let chip = value as? InlineAtomAttachment, chip.atom?.type == NodeType.noteLink,
                  let f = geometry.segmentFrame(range.location..<(range.location + 1)) else { return }
            out.append((.note, textView.convert(f, to: view)))
        }
        return out
    }

    public enum NoteLinkKind: String, Sendable {
        /// A noteLink chip (opens by id).
        case note
        /// A literal `[[Title]]` (resolved by title).
        case title
    }

    func noteLink(at point: CGPoint) -> NoteLinkTarget? {
        guard onOpenNote != nil || onOpenNoteTitled != nil,
              let pos = textView.closestPosition(to: point) else { return nil }
        let storage = textView.textStorage
        let near = textView.offset(from: textView.beginningOfDocument, to: pos)
        for off in [near, near - 1] where off >= 0 && off < storage.length {
            guard let frame = geometry.segmentFrame(off..<(off + 1)), frame.insetBy(dx: -4, dy: -6).contains(point) else { continue }
            if onOpenNoteTitled != nil, let title = storage.attribute(.dsWikiLink, at: off, effectiveRange: nil) as? String {
                return .title(title)
            }
            if onOpenNote != nil, let chip = storage.attribute(.attachment, at: off, effectiveRange: nil) as? InlineAtomAttachment,
               let atom = chip.atom, atom.type == NodeType.noteLink, let id = atom.attrs["noteId"]?.stringValue {
                return .id(id)
            }
        }
        return nil
    }

    // MARK: - Agent edits (D-10)

    /// The note has agent edits nobody has accepted yet.
    public var hasAgentEdits: Bool {
        projection.paragraphs.contains { p in p.inline.contains { $0.marks.contains(MarkName.agentEdit) } }
    }

    /// Accepts every agent edit: the marks go, the text stays (one undo step).
    public func acceptAgentEdits() {
        AgentEdits.acceptAll(in: document)
        DSHaptics.selection()
    }

    /// Accepts the agent's edits in one block.
    public func acceptAgentEdits(inBlock block: BlockID) {
        AgentEdits.accept(block: block, in: document)
    }

    /// Edits to accept come first; otherwise a note an agent created says so once (D-45).
    private func updateAgentBanner() {
        let mode: AgentEditsBanner.Mode?
        if hasAgentEdits {
            mode = .edits
        } else if let name = createdByAgent {
            mode = .createdBy(name)
        } else {
            mode = nil
        }
        if let mode, agentBanner.mode != mode { agentBanner.mode = mode }
        let visible = mode != nil
        guard visible != agentBannerVisible else { return }
        agentBannerVisible = visible
        setNeedsLayout()
    }

    // MARK: - Hiding the keyboard

    /// The text view is being edited (the keyboard is up or a hardware keyboard types into it).
    public var isEditingText: Bool { textView.isFirstResponder }

    /// Hides the keyboard (the host's "hide keyboard" control; iPhone keyboards have no such key).
    /// Dragging the text down past the keyboard also hides it (`keyboardDismissMode = .interactive`).
    public func dismissKeyboard() {
        textView.resignFirstResponder()
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

    /// Whether a single tap at `point` acts on something (a note link, a task box or date chip):
    /// the text view's own taps (caret placement) do not begin there.
    func hasTapTarget(at point: CGPoint) -> Bool {
        noteLink(at: point) != nil || taskCheckbox(at: point) != nil || (taskDatesEnabled && taskDateChip(at: point) != nil)
    }

    /// The task date chip under a point (text view coordinates): its item, whether it is the
    /// deadline chip, and its frame.
    func taskDateChip(at point: CGPoint) -> (item: BlockID, deadline: Bool, rect: CGRect)? {
        // By the chips' own frames: they are drawn right of the last line, outside the fragment's
        // frame, so looking up the fragment under the point missed them (taps did nothing).
        guard let tlm = textView.textLayoutManager else { return nil }
        let origin = geometry.origin
        var hit: (item: BlockID, deadline: Bool, rect: CGRect)?
        tlm.enumerateTextLayoutFragments(from: tlm.documentRange.location, options: []) { frag in
            guard let block = frag as? BlockLayoutFragment, let d = block.decoration, let item = d.itemBlockId,
                  case .task(_, let scheduled, let deadline) = d.marker else { return true }
            var kinds: [Bool] = []
            if scheduled != nil { kinds.append(false) }
            if deadline != nil { kinds.append(true) }
            for (frame, isDeadline) in zip(block.dateChipFrames(), kinds) {
                let rect = frame.offsetBy(dx: frag.layoutFragmentFrame.minX + origin.x, dy: frag.layoutFragmentFrame.minY + origin.y)
                if rect.insetBy(dx: -6, dy: -8).contains(point) {
                    hit = (item, isDeadline, rect)
                    return false
                }
            }
            return true
        }
        return hit
    }

    /// Frames of the task date chips in `view`'s coordinates (hosts and UI tests).
    public func taskDateChipFrames(in view: UIView) -> [CGRect] {
        guard let tlm = textView.textLayoutManager else { return [] }
        var out: [CGRect] = []
        let origin = geometry.origin
        tlm.enumerateTextLayoutFragments(from: tlm.documentRange.location, options: []) { frag in
            if let block = frag as? BlockLayoutFragment {
                for f in block.dateChipFrames() {
                    let r = f.offsetBy(dx: frag.layoutFragmentFrame.minX + origin.x, dy: frag.layoutFragmentFrame.minY + origin.y)
                    out.append(textView.convert(r, to: view))
                }
            }
            return true
        }
        return out
    }

    // MARK: - Accessibility of tap targets

    /// One accessibility element per note link and task date chip on screen, after the text view:
    /// VoiceOver (and UI tests) find them by title and activate them like a tap (`spec/05`).
    public override var accessibilityElements: [Any]? {
        get {
            // Rebuilt after layout or scrolling, never while a touch is being tracked (UI tests and
            // VoiceOver query this often; rebuilding mid-stroke measured text under the pen).
            if tapTargetElementsDirty, !penDown, !textView.isTracking {
                tapTargetElementsDirty = false
                cachedTapTargetElements = tapTargetElements()
            }
            return [textView] + cachedTapTargetElements
        }
        set {}
    }

    /// Notices fingers on the text view without taking part in any gesture.
    let touchObserver = TouchObserver()

    private var tapTargetElementsDirty = true
    private var cachedTapTargetElements: [UIAccessibilityElement] = []

    private func tapTargetElements() -> [UIAccessibilityElement] {
        guard let tlm = textView.textLayoutManager else { return [] }
        let storage = textView.textStorage
        let visible = textView.bounds
        var out: [UIAccessibilityElement] = []
        func add(_ label: String, frame: CGRect, traits: UIAccessibilityTraits, hint: String?, action: @escaping () -> Void) {
            guard frame.intersects(visible) else { return }
            let e = TapTargetAccessibilityElement(accessibilityContainer: self)
            e.accessibilityLabel = label
            e.accessibilityTraits = traits
            e.accessibilityHint = hint
            e.accessibilityFrame = UIAccessibility.convertToScreenCoordinates(frame, in: textView)
            e.activate = action
            out.append(e)
        }
        storage.enumerateAttribute(.dsWikiLink, in: NSRange(location: 0, length: storage.length)) { value, range, _ in
            guard let title = value as? String, let f = geometry.segmentFrame(range.location..<(range.location + range.length)) else { return }
            add(title, frame: f, traits: .link, hint: "Открыть заметку") { [weak self] in self?.onOpenNoteTitled?(title) }
        }
        storage.enumerateAttribute(.attachment, in: NSRange(location: 0, length: storage.length)) { value, range, _ in
            guard let chip = value as? InlineAtomAttachment, let atom = chip.atom, atom.type == NodeType.noteLink,
                  let id = atom.attrs["noteId"]?.stringValue,
                  let f = geometry.segmentFrame(range.location..<(range.location + 1)) else { return }
            let title = attachmentResolver?.noteTitle(for: id) ?? atom.attrs["label"]?.stringValue ?? "Заметка"
            add(title, frame: f, traits: .link, hint: "Открыть заметку") { [weak self] in self?.onOpenNote?(id) }
        }
        let origin = geometry.origin
        tlm.enumerateTextLayoutFragments(from: tlm.documentRange.location, options: []) { frag in
            guard let block = frag as? BlockLayoutFragment, let d = block.decoration, let item = d.itemBlockId,
                  case .task(let state, let scheduled, let deadline) = d.marker else { return true }
            var kinds: [Bool] = []
            if scheduled != nil { kinds.append(false) }
            if deadline != nil { kinds.append(true) }
            let chips = BlockLayoutFragment.dateChips(scheduled: scheduled, deadline: deadline,
                                                      completed: state == "done" || state == "cancelled", fontSize: d.fontSize)
            for ((local, isDeadline), chip) in zip(zip(block.dateChipFrames(), kinds), chips) {
                let rect = local.offsetBy(dx: frag.layoutFragmentFrame.minX + origin.x, dy: frag.layoutFragmentFrame.minY + origin.y)
                let label = (isDeadline ? "Дедлайн: " : "Дата: ") + chip.text.string
                guard self.taskDatesEnabled else {
                    let e = UIAccessibilityElement(accessibilityContainer: self)
                    e.accessibilityLabel = label
                    e.accessibilityTraits = .staticText
                    e.accessibilityFrame = UIAccessibility.convertToScreenCoordinates(rect, in: self.textView)
                    if rect.intersects(visible) { out.append(e) }
                    continue
                }
                add(label, frame: rect, traits: .button, hint: "Перенести") { [weak self] in
                    guard let self else { return }
                    self.dateMenuTarget = (item, isDeadline, rect)
                    self.editMenu.presentEditMenu(with: UIEditMenuConfiguration(identifier: "taskDate",
                                                                                sourcePoint: CGPoint(x: rect.midX, y: rect.minY)))
                }
            }
            return true
        }
        return out
    }

    /// Task dates are actionable (D-51). The notes-only app turns this off: date chips become quiet
    /// labels without a tap or menu and menus offer no dates; check boxes still toggle and the dates
    /// stay in the document. On by default.
    public var taskDatesEnabled: Bool {
        get { theme.taskDatesEnabled }
        set {
            guard newValue != theme.taskDatesEnabled else { return }
            theme.taskDatesEnabled = newValue
            applyTheme()
            rerenderAll()
            tapTargetElementsDirty = true
        }
    }

    // MARK: - Title (Apple Notes style, spec/04 «Название новой заметки»)

    /// The title a new note gets when it is left empty («Заметка 26 октября 2026»): the host
    /// supplies it, localized and dated by the note's creation day. Nil (or nil returned) leaves
    /// empty titles alone.
    public var defaultTitle: (() -> String?)?
    private var titleRepairScheduled = false
    /// The caret was in the title at the last selection change (to notice it leaving).
    private var caretWasInTitle = false

    private var titleIndex: Int? { projection.paragraphs.first?.kind.type == NodeType.title ? 0 : nil }

    private func caretIsInTitle(_ location: Int) -> Bool {
        guard let i = titleIndex else { return false }
        return location <= projection.starts[i] + projection.paragraphs[i].length
    }

    /// Puts the caret at the end of the title and brings up the keyboard (a new note).
    public func focusTitle() {
        guard let i = titleIndex else { return }
        _ = textView.becomeFirstResponder()
        selectOffset(projection.starts[i] + projection.paragraphs[i].length)
        caretWasInTitle = true
    }

    /// Fills an empty title with `defaultTitle`; returns whether it did. Always on Return in the
    /// title; when the caret leaves the title and when the host calls it before closing the note,
    /// only if the note has text (an empty note stays empty, the host drops it).
    @discardableResult
    public func commitDefaultTitleIfNeeded() -> Bool {
        commitDefaultTitle(requireText: true)
    }

    private var noteHasText: Bool {
        projection.paragraphs.dropFirst().contains { $0.length > 0 || !$0.kind.isText }
    }

    @discardableResult
    private func commitDefaultTitle(requireText: Bool) -> Bool {
        guard let i = titleIndex, projection.paragraphs[i].length == 0, !requireText || noteHasText,
              let title = defaultTitle?() ?? nil, !title.isEmpty else { return false }
        let caret = textView.selectedRange.location
        let start = projection.starts[i]
        let block = projection.paragraphs[i].blockId
        document.stopCapturing()
        document.transact(origin: .local) { document.insertText(title, marks: .empty, block: block, at: 0) }
        document.stopCapturing()
        selectOffset(caret > start ? caret + title.utf16.count : start + title.utf16.count)
        return true
    }

    /// Return in the title: no split — the caret goes to the start of the text (a new empty
    /// paragraph if the note has none yet), after filling an empty title.
    private func returnInTitle() {
        commitDefaultTitle(requireText: false)
        let p = projection
        caretWasInTitle = false
        if p.paragraphs.count > 1, p.paragraphs[1].kind.isText {
            selectOffset(p.starts[1])
        } else if let title = p.paragraphs.first?.blockId, let loc = document.location(of: title) {
            let body = BlockNode.paragraph()
            document.stopCapturing()
            document.transact(origin: .local) { document.insertBlock(body, parent: loc.parent, at: loc.index + 1) }
            document.stopCapturing()
            select(TextPosition(block: body.id, offset: 0))
        }
        notifyStateChange()
    }

    /// The date chip whose menu is showing.
    private var dateMenuTarget: (item: BlockID, deadline: Bool, rect: CGRect)?

    @objc private func tapped(_ g: UITapGestureRecognizer) {
        let point = g.location(in: textView)
        EditorDiagnostics.log("tap at \(Int(point.x)),\(Int(point.y)): link \(noteLink(at: point) != nil), date chip \(taskDateChip(at: point) != nil)")
        if let link = noteLink(at: point) {
            DSHaptics.selection()
            EditorDiagnostics.log("opening link \(link) (handlers: id \(onOpenNote != nil), title \(onOpenNoteTitled != nil))")
            // Act on the next turn: presenting UI (the host's alert, a new screen) while UIKit is
            // still dispatching this touch crashes its gesture environment (`_delayTouchesForEvent`).
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                EditorDiagnostics.log("link handler runs (window \(self.window != nil))")
                switch link {
                case .id(let id): self.onOpenNote?(id)
                case .title(let title): self.onOpenNoteTitled?(title)
                }
            }
            return
        }
        if taskDatesEnabled, let chip = taskDateChip(at: point) {
            // Same choices as the task context menu (`spec/12`): reschedule or remove the date.
            DSHaptics.selection()
            dateMenuTarget = chip
            // Next turn, for the same reason as links above: the menu's own recognizers must not
            // join a touch UIKit is still delivering.
            DispatchQueue.main.async { [weak self] in
                EditorDiagnostics.log("presenting date menu (editor \(self != nil), first responder \(self?.textView.isFirstResponder ?? false))")
                self?.editMenu.presentEditMenu(with: UIEditMenuConfiguration(identifier: "taskDate",
                                                                             sourcePoint: CGPoint(x: chip.rect.midX, y: chip.rect.minY)))
            }
            return
        }
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

        // Return in the title moves to the text (Apple Notes, spec/04).
        if text == "\n", start.kind.type == NodeType.title, range.length == 0, tv.markedTextRange == nil {
            returnInTitle()
            return false
        }
        // Return.
        if text == "\n", start.kind.isText {
            if range.length > 0 { cmd.replace(lo..<hi, with: "") }
            let pos = TextPosition(block: start.blockId, offset: so)
            var caret = range.length == 0 ? MarkdownShortcuts(commands: cmd).handleReturn(at: pos) : nil
            keepingScroll {
                if caret == nil {
                    document.stopCapturing()
                    caret = cmd.splitParagraph(at: pos)
                    document.stopCapturing()
                }
                select(caret)
            }
            return false
        }
        // Backspace at the start of a paragraph (or delete at the end of the previous one).
        if text.isEmpty, range.length == 1, ei == si + 1, eo == 0, so == start.length {
            keepingScroll { select(cmd.joinBackward(at: TextPosition(block: p.paragraphs[ei].blockId, offset: 0))) }
            return false
        }
        // Plain typing inside one text paragraph: let the text view apply it, mirror to the model.
        if si == ei, start.kind.isText, !text.contains("\n"), !text.contains("\u{FFFC}"), !text.contains("\u{2028}") || start.kind.type == NodeType.codeBlock {
            let isCode = start.kind.type == NodeType.codeBlock
            let marks: MarkSet = isCode ? .empty : (pendingMarks ?? cmd.marks(at: lo..<lo)).setting(MarkName.agentEdit, nil)
            let modelText = isCode ? text.replacingOccurrences(of: "\u{2028}", with: "\n") : text
            cmd.typeText(modelText, marks: marks, at: TextPosition(block: start.blockId, offset: so), replacing: hi - lo)
            // Markdown shortcuts never fire on marked text (dictation and input methods stream
            // their text through it; acting on it moved the caret under them).
            if text.utf16.count == 1, tv.markedTextRange == nil { pendingShortcut = (lo + 1, text) }
            return true
        }
        // Everything else is structural.
        let clean = text.replacingOccurrences(of: "\u{FFFC}", with: "").replacingOccurrences(of: "\u{2028}", with: "\n")
        keepingScroll { select(cmd.replace(lo..<hi, with: clean, marks: (pendingMarks ?? .empty).setting(MarkName.agentEdit, nil))) }
        return false
    }

    public func textViewDidChange(_ tv: UITextView) {
        mirrorUnreportedEdit()
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
        updateSlashMenu()
        notifyStateChange()
    }

    /// Safety net for text the text view changed without asking `shouldChangeTextIn` (some
    /// dictation and input-method paths): the change inside the caret's paragraph is mirrored into
    /// the document; anything else is undone by re-rendering from the document, so the text view
    /// and the document never drift apart (a drift put the caret in the wrong paragraph).
    private func mirrorUnreportedEdit() {
        let storage = textView.textStorage
        let delta = storage.length - projection.length
        guard delta != 0, !projection.paragraphs.isEmpty else { return }
        let caret = textView.selectedRange.location
        let (i, _) = projection.position(at: max(0, min(projection.length, caret - max(0, delta))))
        let para = projection.paragraphs[i]
        let start = projection.starts[i]
        let old = Array(renderer.paragraph(projection, index: i).string.utf16.prefix(para.length))
        let newLength = para.length + delta
        guard para.kind.isText, newLength >= 0, start + newLength <= storage.length else {
            EditorDiagnostics.log("unreported edit outside a text paragraph: re-render")
            return rerenderAll()
        }
        let new = Array((storage.string as NSString).substring(with: NSRange(location: start, length: newLength)).utf16)
        var prefix = 0
        while prefix < old.count, prefix < new.count, old[prefix] == new[prefix] { prefix += 1 }
        var suffix = 0
        while suffix < old.count - prefix, suffix < new.count - prefix,
              old[old.count - 1 - suffix] == new[new.count - 1 - suffix] { suffix += 1 }
        let inserted = String(utf16CodeUnits: Array(new[prefix..<(new.count - suffix)]), count: new.count - suffix - prefix)
        if inserted.contains("\n") || inserted.contains("\u{FFFC}") || inserted.contains("\u{2029}") {
            EditorDiagnostics.log("unreported structural edit: re-render")
            return rerenderAll()
        }
        EditorDiagnostics.log("mirroring an unreported edit of \(inserted.utf16.count) characters")
        let marks = (pendingMarks ?? commands.marks(at: (start + prefix)..<(start + prefix))).setting(MarkName.agentEdit, nil)
        suppressDelegate = true
        commands.typeText(inserted, marks: marks, at: TextPosition(block: para.blockId, offset: prefix),
                          replacing: old.count - suffix - prefix)
        suppressDelegate = false
    }

    public func scrollViewDidScroll(_ scrollView: UIScrollView) {
        tapTargetElementsDirty = true
        onScroll?(scrollView.contentOffset.y + scrollView.adjustedContentInset.top)
    }

    public func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
        if !decelerate { DispatchQueue.main.async { [weak self] in self?.flushPendingAtomRelayout() } }
    }

    public func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        DispatchQueue.main.async { [weak self] in self?.flushPendingAtomRelayout() }
    }

    public func textViewDidBeginEditing(_ textView: UITextView) { notifyStateChange() }
    public func textViewDidEndEditing(_ textView: UITextView) {
        dismissSlashMenu()
        notifyStateChange()
    }

    public func textViewDidChangeSelection(_ tv: UITextView) {
        if suppressDelegate { return }
        pendingMarks = nil
        // The caret left an empty title: it gets the default name.
        let inTitle = caretIsInTitle(tv.selectedRange.location)
        if caretWasInTitle, !inTitle, tv.markedTextRange == nil {
            caretWasInTitle = false
            if commitDefaultTitleIfNeeded() {
                notifyStateChange()
                return
            }
        }
        caretWasInTitle = inTitle && tv.isFirstResponder
        // Typing attributes are left alone while text is marked (dictation, input methods).
        if tv.markedTextRange == nil { updateTypingAttributes() }
        updateSlashMenu()
        notifyStateChange()
    }

    public func textView(_ textView: UITextView, editMenuForTextIn range: NSRange, suggestedActions: [UIMenuElement]) -> UIMenu? {
        let (i, _) = projection.position(at: range.location)
        guard projection.paragraphs.indices.contains(i) else { return nil }
        let para = projection.paragraphs[i]
        var extra: [UIMenuElement] = []
        if para.inline.contains(where: { $0.marks.contains(MarkName.agentEdit) }) {
            let block = para.blockId
            extra.append(UIAction(title: "Принять правку агента", image: UIImage(systemName: "checkmark.seal")) { [weak self] _ in
                self?.acceptAgentEdits(inBlock: block)
            })
        }
        if let item = para.context.itemBlockId, let node = document.block(item), node.type == NodeType.taskItem {
            extra.append(taskMenu(item: item, node: node))
        }
        if para.kind.isText, para.kind.type != NodeType.codeBlock, para.kind.type != NodeType.title {
            extra.append(contentsOf: formatMenu())
        }
        guard !extra.isEmpty else { return nil }
        return UIMenu(children: extra + suggestedActions)
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
        let children: [UIMenuElement] = taskDatesEnabled ? [toggle, schedule, due, cancel] : [toggle, cancel]
        return UIMenu(title: "Задача", image: UIImage(systemName: "checklist"), options: .displayInline, children: children)
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
    /// The editor's tap begins only on something a tap acts on — a note link, a task box or a
    /// task date chip (`hasTapTarget`; date chips were missing here, so their taps never began).
    public override func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
        if g is UITapGestureRecognizer, g.view === textView, g.delegate === self {
            let p = g.location(in: textView)
            let target = hasTapTarget(at: p)
            EditorDiagnostics.log("editor tap should begin at \(Int(p.x)),\(Int(p.y)): \(target)")
            return target
        }
        return super.gestureRecognizerShouldBegin(g)
    }

    public func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        // The editor's tap fires alongside the text view's own recognizers: a link or task box tap
        // must not be swallowed by caret placement (note links did nothing on iPhone, build 14).
        g === textView.editorTap && other.view === textView && !(other is UIPanGestureRecognizer)
    }

    /// The pen recognizer receives every touch and follows only those it draws with (it never
    /// begins for the others, so selection and scrolling are unaffected). Declining touches here
    /// crashed UIKit when a SwiftUI control over the editor was delaying the same touch.
    public func gestureRecognizer(_ g: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        if g === inkInput { return true }
        if let header = headerView, header.bounds.contains(touch.location(in: header)) { return false }
        if agentBannerVisible, agentBanner.bounds.contains(touch.location(in: agentBanner)) { return false }
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

extension EditorView {
    /// A day as stored in task attributes ("2026-10-27"), `offset` days from today or a given date.
    static func isoDay(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 2026, c.month ?? 1, c.day ?? 1)
    }

    static func isoDay(offset: Int) -> String {
        isoDay(Calendar.current.date(byAdding: .day, value: offset, to: Date()) ?? Date())
    }

    /// Menu of a tapped date chip: move the date (or deadline) or remove it.
    func dateMenu() -> UIMenu? {
        EditorDiagnostics.log("date menu requested (target \(dateMenuTarget != nil))")
        guard let target = dateMenuTarget, let node = document.block(target.item) else { return nil }
        let cmd = commands
        let item = target.item
        let scheduled = node.attrs["scheduled"]?.stringValue
        let deadline = node.attrs["deadline"]?.stringValue
        func set(_ day: String?) {
            if target.deadline {
                cmd.setTaskDates(item, scheduled: scheduled, deadline: day)
            } else {
                cmd.setTaskDates(item, scheduled: day, deadline: deadline)
            }
        }
        let current = (target.deadline ? deadline : scheduled).flatMap(BlockLayoutFragment.date) ?? Date()
        return UIMenu(title: target.deadline ? "Дедлайн" : "Перенести", children: [
            UIAction(title: "Сегодня") { _ in set(Self.isoDay(offset: 0)) },
            UIAction(title: "Завтра") { _ in set(Self.isoDay(offset: 1)) },
            UIAction(title: "След. неделя") { _ in set(Self.isoDay(offset: 7)) },
            UIAction(title: "Дата…") { [weak self] _ in
                self?.pickDate(initial: current, from: target.rect) { set(Self.isoDay($0)) }
            },
            UIAction(title: target.deadline ? "Убрать дедлайн" : "Убрать дату", attributes: .destructive) { _ in set(nil) },
        ])
    }

    /// A calendar for "Дата…": a sheet on iPhone, a popover from the chip on iPad.
    private func pickDate(initial: Date, from rect: CGRect, done: @escaping (Date) -> Void) {
        guard var top = window?.rootViewController else { return }
        while let presented = top.presentedViewController { top = presented }
        let picker = TaskDatePickerController(date: initial, onPick: done)
        picker.modalPresentationStyle = traitCollection.horizontalSizeClass == .regular ? .popover : .pageSheet
        if let popover = picker.popoverPresentationController {
            popover.sourceView = textView
            popover.sourceRect = rect
        }
        picker.sheetPresentationController?.detents = [.medium()]
        top.present(picker, animated: true)
    }
}

/// Follows whether a finger is on the text view (selection handles included) without
/// recognizing anything or delaying touches.
final class TouchObserver: UIGestureRecognizer, UIGestureRecognizerDelegate {
    private(set) var touching = false
    /// Called (on the next turn) whenever the last touch ends.
    var onLift: (() -> Void)?
    private var count = 0

    init() {
        super.init(target: nil, action: nil)
        cancelsTouchesInView = false
        delaysTouchesBegan = false
        delaysTouchesEnded = false
        delegate = self
    }

    /// Tests: as if a finger were down.
    func setTouchingForTesting(_ value: Bool) {
        touching = value
        if !value { finish() }
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        count += touches.count
        touching = true
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) { lift(touches.count) }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) { lift(touches.count) }

    private func lift(_ n: Int) {
        count = max(0, count - n)
        guard count == 0 else { return }
        touching = false
        // Never recognizes: fails once the touches are over, so it never blocks others.
        state = .failed
        finish()
    }

    private func finish() {
        guard let lift = onLift else { return }
        DispatchQueue.main.async { lift() }
    }

    override func reset() {
        super.reset()
        count = 0
        touching = false
    }

    func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }
}

/// Accessibility element of a link or chip: activating it does what a tap does.
final class TapTargetAccessibilityElement: UIAccessibilityElement {
    var activate: (() -> Void)?

    override func accessibilityActivate() -> Bool {
        activate?()
        return activate != nil
    }
}

/// Inline calendar with "Готово" for picking a task date.
final class TaskDatePickerController: UIViewController {
    private let picker = UIDatePicker()
    private let onPick: (Date) -> Void

    init(date: Date, onPick: @escaping (Date) -> Void) {
        self.onPick = onPick
        super.init(nibName: nil, bundle: nil)
        picker.date = date
        preferredContentSize = CGSize(width: 340, height: 400)
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        picker.datePickerMode = .date
        picker.preferredDatePickerStyle = .inline
        picker.accessibilityIdentifier = "taskDate.picker"
        let done = UIButton(type: .system)
        var config = UIButton.Configuration.filled()
        config.title = "Готово"
        done.configuration = config
        done.accessibilityIdentifier = "taskDate.done"
        done.addAction(UIAction { [weak self] _ in
            guard let self else { return }
            self.onPick(self.picker.date)
            self.dismiss(animated: true)
        }, for: .primaryActionTriggered)
        let stack = UIStackView(arrangedSubviews: [picker, done])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor),
            stack.topAnchor.constraint(equalTo: view.layoutMarginsGuide.topAnchor, constant: 8),
        ])
    }
}

extension EditorView: @preconcurrency UIEditMenuInteractionDelegate {
    public func editMenuInteraction(_ interaction: UIEditMenuInteraction, willPresentMenuFor configuration: UIEditMenuConfiguration,
                                    animator: any UIEditMenuInteractionAnimating) {
        EditorDiagnostics.log("edit menu will present \(configuration.identifier)")
    }

    public func editMenuInteraction(_ interaction: UIEditMenuInteraction, willDismissMenuFor configuration: UIEditMenuConfiguration,
                                    animator: any UIEditMenuInteractionAnimating) {
        EditorDiagnostics.log("edit menu will dismiss \(configuration.identifier)")
    }

    public func editMenuInteraction(_ interaction: UIEditMenuInteraction, menuFor configuration: UIEditMenuConfiguration,
                                    suggestedActions: [UIMenuElement]) -> UIMenu? {
        if configuration.identifier as? String == "taskDate" { return dateMenu() }
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
