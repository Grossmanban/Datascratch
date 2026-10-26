#if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore) && canImport(DSDesign)
import DSCore
import DSDesign
import DSEditor
import DSEditorCore
import Observation
import SwiftUI
import UIKit

/// Owns one `EditorView` over a note's Yrs document (TextKit 2 + living-stroke pen layer).
@Observable
final class NativeEditorModel {
    let editor: EditorView
    let noteId: String
    let notebookId: String
    /// Which editor instance this is (UI-test diagnostics: a rebuilt screen must reuse it).
    let serial: Int
    nonisolated(unsafe) private static var created = 0
    /// Bumped on every editor change so toolbars refresh.
    var revision = 0
    /// Cover and metadata scrolled with the text (`EditorView.headerView`).
    let header = NativeHeaderState()
    @ObservationIgnored private var headerHost: UIHostingController<AnyView>?
    @ObservationIgnored private var refreshTask: Task<Void, Never>?
    @ObservationIgnored private weak var app: AppModel?

    init(app: AppModel, core: CoreLibrary, noteId: String, notebookId: String) throws {
        self.app = app
        self.noteId = noteId
        self.notebookId = notebookId
        Self.created += 1
        serial = Self.created
        let note = try core.noteDocument(noteId, notebookId: notebookId)
        editor = EditorView(document: CoreEditorDocument(note: note))
        // D-06: a finger draws only when enabled; on iPhone (no Pencil) it is on by default.
        editor.tools.allowsFingerDrawing = app.settings.fingerDrawingEffective
        editor.tools.mode = .text
        // Never touch SwiftUI state in the middle of a touch: the editor reports state changes
        // during gesture handling, and an immediate re-render there crashed UIKit
        // (_delayTouchesForEvent) in ios-editor's demo.
        editor.onStateChange = { [weak self] in
            DispatchQueue.main.async { self?.changed() }
        }
        editor.onOpenNote = { [weak app] id in app?.pendingRoute = .note(id) }
        // A literal [[Title]] (an agent's link, or one typed without autocomplete).
        editor.onOpenNoteTitled = { [weak app] title in app?.pendingRoute = .noteTitled(title) }
        // D-45: «Создано агентом» strip until the person acknowledges it.
        editor.onAcknowledgeCreatedByAgent = { [weak self] in
            guard let self, let core = self.app?.core else { return }
            try? core.notebookDocument(self.notebookId).clearCreatedByAgent(noteId: self.noteId)
            self.editor.createdByAgent = nil
        }
        refreshCreatedByAgent()
        // «Hide Keyboard» is offered only while an on-screen keyboard is up (not with a
        // hardware keyboard, where there is nothing to hide). Judged by how much of the screen
        // the keyboard's end frame covers: on iPad the frame changes without a matching
        // will-hide (the keyboard folds into the shortcuts bar), so every change counts.
        let names = [UIResponder.keyboardWillShowNotification, UIResponder.keyboardWillChangeFrameNotification,
                     UIResponder.keyboardWillHideNotification, UIResponder.keyboardDidHideNotification]
        keyboardObservers = names.map { name in
            NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] note in
                let frame = (note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue ?? .zero
                let hiding = name == UIResponder.keyboardWillHideNotification || name == UIResponder.keyboardDidHideNotification
                let screen = (note.object as? UIScreen)?.bounds
                MainActor.assumeIsolated {
                    guard let self else { return }
                    let bounds = screen ?? self.editor.window?.screen.bounds ?? .zero
                    let shown = !hiding && frame.intersection(bounds).height > 120
                    if self.isSoftwareKeyboardShown != shown { self.isSoftwareKeyboardShown = shown }
                }
            }
        }
    }

    /// An on-screen keyboard is showing.
    var isSoftwareKeyboardShown = false
    @ObservationIgnored private var keyboardObservers: [NSObjectProtocol] = []

    isolated deinit {
        for observer in keyboardObservers { NotificationCenter.default.removeObserver(observer) }
    }

    /// The agent that created this note (`NoteMeta.createdByAgent`, D-45); follows the index,
    /// so a strip acknowledged on another device goes here too.
    func refreshCreatedByAgent() {
        let meta = try? app?.core?.notebookDocument(notebookId).note(id: noteId)
        let name = meta?.createdByAgent?.agentName
        if editor.createdByAgent != name { editor.createdByAgent = name }
    }

    private func changed() {
        revision &+= 1
        // Title, tags and tasks of the list views follow the document (debounced).
        refreshTask?.cancel()
        refreshTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(350))
            guard !Task.isCancelled, let self, let app = self.app, let core = app.core,
                  let fresh = core.refreshNote(self.noteId, notebookId: self.notebookId) else { return }
            app.library.applyExternal(note: fresh.0, body: fresh.1)
        }
    }

    /// Puts the cover and the note's place (notebook, folder, tags) above the first block,
    /// so they scroll with the text and the title starts below the cover.
    func installHeader(app: AppModel, scene: SceneModel) {
        let editor = self.editor
        let root = NativeDocumentHeader(state: header) { editor.headerLayoutDidChange() }
            .environment(app)
            .environment(scene)
        let host = UIHostingController(rootView: AnyView(root))
        host.sizingOptions = .intrinsicContentSize
        host.view.backgroundColor = .clear
        headerHost = host
        editor.headerView = host.view
        // «Посмотреть историю» in the agent-edits banner: the note's version history.
        let noteId = self.noteId
        editor.onShowHistory = { [weak scene] in scene?.sheet = .versions(noteId: noteId) }
    }

    /// Switches the pen tool; leaving text mode hides the keyboard once, with its own animation.
    func select(_ mode: PenMode) {
        if mode != .text, editor.tools.mode == .text { editor.endEditing(true) }
        // Change the tool on the next run-loop turn: switching it while the tap is still being
        // delivered reconfigures gesture recognizers mid-event (crash).
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.editor.tools.mode = mode
            self.revision &+= 1
        }
    }

    func apply(style: NoteStyle) {
        editor.setStyle(DocumentStyle(font: DocumentStyle.Font(rawValue: style.font.rawValue) ?? .serif,
                                      width: DocumentStyle.Width(rawValue: style.width.rawValue) ?? .normal,
                                      paper: DocumentStyle.Paper(rawValue: style.paper.rawValue) ?? .plain))
    }
}

struct NativeEditorRepresentable: UIViewRepresentable {
    let editor: EditorView
    func makeUIView(context: Context) -> EditorView { editor }
    func updateUIView(_ uiView: EditorView, context: Context) {}
}

/// The document screen with the native editor: full-height editor, floating glass
/// pen palette, undo/redo and insert menus in the toolbar.
struct NativeDocumentScreen: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var model: NativeEditorModel?
    @State private var failed = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let noteId: String

    private func setPaletteCollapsed(_ collapsed: Bool) {
        withAnimation(reduceMotion ? nil : Theme.Motion.snappy) {
            app.settings.penPaletteCollapsed = collapsed
        }
    }

    /// The palette with its fold button at the trailing end.
    private func paletteRow(_ model: NativeEditorModel, isCompact: Bool) -> some View {
        HStack(spacing: isCompact ? Theme.Space.s1 : Theme.Space.s2) {
            HideKeyboardButton(model: model, isCompact: isCompact)
                .padding(.leading, Theme.Space.s3)
            PenPalette(model: model, isCompact: isCompact)
            Button { setPaletteCollapsed(true) } label: {
                Image(systemName: "chevron.down.right")
                    .font(.system(size: isCompact ? 13 : 15, weight: .semibold))
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .frame(width: isCompact ? 22 : 28, height: isCompact ? 22 : 28)
            }
            // A system glass button: a plain button over interactive glass missed taps.
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .accessibilityLabel("Hide Pen Tools")
            .accessibilityIdentifier("penPalette.collapse")
            .padding(.trailing, Theme.Space.s3)
        }
    }

    var body: some View {
        Group {
            if let model, let note = app.library.note(noteId) {
                GeometryReader { proxy in
                    ZStack {
                        DocumentBackground(note: note)
                        // The editor ends above the palette: extended under it, the pen recognizer
                        // (which takes every touch in pen mode) won taps meant for the palette.
                        // It shrinks for the keyboard (DSEditor then has no overlap to inset): the
                        // variant that stays full height and insets itself crashed (ios-editor bisect).
                        NativeEditorRepresentable(editor: model.editor)
                            .accessibilityIdentifier("editor")
                    }
                    // The palette sits in the bottom safe area: the text scrolls clear of it, and it
                    // rides up with the keyboard in one animation (no second layout pass).
                    .safeAreaInset(edge: .bottom, spacing: 0) {
                        // Inline when it fits the column, else the compact row: it never runs past
                        // the column's edges (iPad split view with three columns).
                        Group {
                            if app.settings.penPaletteCollapsed {
                                // Folded to a button at the trailing edge: the editor gets the
                                // room, the current tool keeps working (Pencil still draws).
                                HStack(spacing: Theme.Space.s2) {
                                    Spacer(minLength: 0)
                                    HideKeyboardButton(model: model, isCompact: true)
                                    CollapsedPenButton(model: model) { setPaletteCollapsed(false) }
                                        .padding(.trailing, Theme.Space.s4)
                                }
                                // A thin strip: the folded button takes less height than the palette.
                                .padding(.bottom, Theme.Space.s1)
                                .transition(.scale(scale: 0.3, anchor: .bottomTrailing).combined(with: .opacity))
                            } else {
                                ViewThatFits(in: .horizontal) {
                                    paletteRow(model, isCompact: false)
                                    paletteRow(model, isCompact: true)
                                }
                                .padding(.top, Theme.Space.s2)
                                .padding(.bottom, Theme.Space.s3)
                                .transition(.scale(scale: 0.3, anchor: .bottomTrailing).combined(with: .opacity))
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .onAppear { model.header.containerHeight = proxy.size.height }
                    .onChange(of: proxy.size.height) { _, height in model.header.containerHeight = height }
                }
                .onChange(of: note.style, initial: true) { _, style in model.apply(style: style) }
                .onChange(of: note, initial: true) { _, note in
                    model.header.note = note
                    model.refreshCreatedByAgent()
                }
                .onChange(of: app.settings.fingerDrawing) { _, _ in
                    model.editor.tools.allowsFingerDrawing = app.settings.fingerDrawingEffective
                }
                .toolbar { NativeEditorToolbar(model: model, note: note) }
                .coverPickers()
            } else if failed {
                // Opening the document failed: fall back to the stand-in editor.
                DocumentScreen(noteId: noteId, forceStandIn: true)
            } else {
                ProgressView()
            }
        }
        .navigationTitle(app.library.note(noteId)?.title ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackgroundVisibility(.hidden, for: .navigationBar)
        .onAppear(perform: load)
        .onDisappear { app.library.recordVersion(ofNote: noteId) }
    }

    private func load() {
        guard model == nil, let core = app.core, let note = app.library.note(noteId) else {
            if app.core == nil { failed = true }
            return
        }
        if let kept = scene.editor(for: noteId) as? NativeEditorModel, kept.notebookId == note.notebookId {
            model = kept
            return
        }
        do {
            let model = try NativeEditorModel(app: app, core: core, noteId: noteId, notebookId: note.notebookId)
            model.installHeader(app: app, scene: scene)
            scene.keepEditor(model, for: noteId)
            self.model = model
        } catch {
            failed = true
        }
    }
}

struct NativeEditorToolbar: ToolbarContent {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.openWindow) private var openWindow
    let model: NativeEditorModel
    let note: NoteMeta

    var body: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarLeading) {
            CloseDocumentButton()
            FullScreenButton()
            let _ = model.revision
            Button { model.editor.undo() } label: { Image(systemName: "arrow.uturn.backward") }
                .disabled(!model.editor.canUndo)
                .accessibilityLabel("Undo")
                .keyboardShortcut("z", modifiers: .command)
            Button { model.editor.redo() } label: { Image(systemName: "arrow.uturn.forward") }
                .disabled(!model.editor.canRedo)
                .accessibilityLabel("Redo")
                .keyboardShortcut("z", modifiers: [.command, .shift])
        }
        ToolbarItemGroup(placement: .topBarTrailing) {
            Menu {
                Button("Task", systemImage: "checkmark.circle") { model.editor.perform(.taskList) }
                Menu {
                    Button("Heading 1") { model.editor.perform(.heading1) }
                    Button("Heading 2") { model.editor.perform(.heading2) }
                    Button("Heading 3") { model.editor.perform(.heading3) }
                } label: {
                    Label("Heading", systemImage: "textformat")
                }
                Button("Bulleted List", systemImage: "list.bullet") { model.editor.perform(.bulletList) }
                Button("Quote", systemImage: "text.quote") { model.editor.perform(.quote) }
                Divider()
                Button("Drawing", systemImage: "scribble") { model.editor.insertBlock(.drawing(height: 260)) }
                Button("Formula", systemImage: "function") { model.editor.insertBlock(.math("a^2 + b^2 = c^2")) }
                Button("Diagram", systemImage: "point.3.connected.trianglepath.dotted") {
                    model.editor.insertBlock(.mermaid("graph TD\n  A --> B"))
                }
                Button("Table", systemImage: "tablecells") {
                    model.editor.insertBlock(EditorCommands.table(rows: 3, columns: 3, header: ["", "", ""]))
                }
                Button("Divider", systemImage: "minus") { model.editor.insertBlock(.rule("line")) }
            } label: {
                Image(systemName: "plus.circle")
            }
            .accessibilityLabel("Insert")
            .accessibilityIdentifier("editor.insert")

            Button {
                scene.sheet = .share(ShareTarget(kind: .note, id: note.id))
            } label: {
                Image(systemName: "square.and.arrow.up")
            }
            .accessibilityLabel("Share")

            Menu {
                Button("Style…", systemImage: "textformat") { scene.sheet = .documentStyle(noteId: note.id) }
                Menu("Cover", systemImage: "photo") { CoverMenuItems(note: note) }
                Button("Version History", systemImage: "clock.arrow.circlepath") {
                    app.library.recordVersion(ofNote: note.id)
                    scene.sheet = .versions(noteId: note.id)
                }
                Button(app.library.isStarred(.note, note.id) ? LocalizedStringKey("Remove from Starred") : "Add to Starred",
                       systemImage: "star") {
                    app.library.toggleStar(.note, note.id)
                }
                Button("Move To…", systemImage: "folder") { scene.sheet = .move(noteId: note.id) }
                Button("Open in New Window", systemImage: "macwindow.badge.plus") { openWindow(id: "note", value: note.id) }
                Button("Close Tab", systemImage: "xmark") { scene.closeTab() }
                Divider()
                Button("Move to Trash", systemImage: "trash", role: .destructive) {
                    scene.closeDocument()
                    app.library.trash(note: note.id)
                }
            } label: {
                Image(systemName: "ellipsis")
            }
            .accessibilityLabel("More")
            .accessibilityIdentifier("document.more")
        }
    }
}

/// Floating glass palette: text / pen / pencil / marker / highlighter / erasers / lasso,
/// ink colours and the finger-drawing switch (D-06).
/// What the scrolling header shows.
@Observable
final class NativeHeaderState {
    var note: NoteMeta?
    /// Height of the document area: the cover takes at most a fifth of it (spec/12 §12.7).
    var containerHeight: CGFloat = 800
}

/// Cover, then notebook › folder and tags, above the first block of the native editor.
struct NativeDocumentHeader: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let state: NativeHeaderState
    let onResize: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s3) {
            if let note = state.note {
                if CoverHeader.hasCover(note) {
                    CoverHeader(note: note, height: CoverHeader.height(for: state.containerHeight))
                        .contextMenu { CoverMenuItems(note: note) }
                }
                meta(note)
                    .frame(maxWidth: Theme.columnWidth(note.style.width), alignment: .leading)
                    .padding(.horizontal, Theme.Space.s5)
                    .frame(maxWidth: .infinity)
                    .padding(.top, CoverHeader.hasCover(note) ? 0 : Theme.Space.s3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .top)
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { _ in onResize() }
        .onChange(of: state.note.map(CoverHeader.hasCover)) { onResize() }
    }

    private func meta(_ note: NoteMeta) -> some View {
        let library = app.library
        return HStack(spacing: Theme.Space.s2) {
            if let notebook = library.notebook(note.notebookId) {
                Label(notebook.name, systemImage: notebook.icon)
            }
            if let folder = note.folderId.flatMap({ library.folder($0) }) {
                Image(systemName: "chevron.right").font(.caption2)
                Text(folder.name)
            }
            ForEach(note.tags, id: \.self) { tag in
                Button("#" + tag) { scene.show(.tag(tag)) }
                    .buttonStyle(.plain)
                    .foregroundStyle((library.data.tagColors[tag] ?? .gray).foreground)
            }
        }
        .font(Theme.Typography.footnote)
        .foregroundStyle(Theme.Palette.textTertiary)
        .lineLimit(1)
        .accessibilityIdentifier("document.meta")
    }
}

/// The pen palette: `DSPenToolbar` over the editor's `InkToolState`. Narrow (iPhone, iPad
/// portrait or split view): the compact row (44 pt targets) with colour, width and finger
/// drawing under «More». Wide: everything inline.
/// Hides the keyboard while text is being edited (iPhone has no other way). The slot stays put
/// when there is no keyboard — only its opacity changes — so nothing moves under the finger.
struct HideKeyboardButton: View {
    let model: NativeEditorModel
    let isCompact: Bool

    var body: some View {
        let _ = model.revision
        let editing = model.editor.isEditingText && model.isSoftwareKeyboardShown
        Button {
            model.editor.dismissKeyboard()
            // On iPad resigning the text view alone left the keyboard up; ending editing on the
            // whole editor (as switching to a pen does) takes it down.
            model.editor.endEditing(true)
            // The keyboard is going: drop the button now rather than wait for the notification.
            model.isSoftwareKeyboardShown = false
            // With a hardware keyboard nothing else reports the end of editing: refresh the bar.
            DispatchQueue.main.async { model.revision &+= 1 }
        } label: {
            Image(systemName: "keyboard.chevron.compact.down")
                .font(.system(size: isCompact ? 13 : 15, weight: .semibold))
                .foregroundStyle(Theme.Palette.textSecondary)
                .frame(width: isCompact ? 22 : 28, height: isCompact ? 22 : 28)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
        .opacity(editing ? 1 : 0)
        .disabled(!editing)
        .accessibilityHidden(!editing)
        .accessibilityLabel("Hide Keyboard")
        .accessibilityIdentifier("editor.hideKeyboard")
    }
}

/// The folded pen palette: the current tool's nib in its ink colour; a tap brings the palette back.
struct CollapsedPenButton: View {
    let model: NativeEditorModel
    let expand: () -> Void

    var body: some View {
        let _ = model.revision
        let selection = PenPalette.selection(from: model.editor.tools)
        Button(action: expand) {
            Group {
                if let tool = selection.tool, tool != .lasso {
                    DSPenNib(tool: tool, color: tool == .eraser ? Color.dsTint(.pink) : selection.color.color)
                        .frame(width: 12, height: 24)
                } else {
                    Image(systemName: selection.tool == .lasso ? "lasso" : "character.cursor.ibeam")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.Palette.textPrimary)
                }
            }
            .frame(width: 26, height: 26)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
        .controlSize(.small)
        .accessibilityLabel("Show Pen Tools")
        .accessibilityValue(Text(verbatim: "mode \(model.editor.tools.mode.rawValue)"))
        .accessibilityIdentifier("penPalette.collapsed")
    }
}

struct PenPalette: View {
    let model: NativeEditorModel
    let isCompact: Bool

    var body: some View {
        let _ = model.revision
        let tools = model.editor.tools
        DSPenToolbar(selection: selection(tools),
                     tools: isCompact ? [.pen, .pencil, .marker, .highlighter, .eraser]
                         : [.pen, .pencil, .marker, .highlighter, .eraser, .lasso],
                     compact: isCompact)
            .accessibilityElement(children: .contain)
            // UI tests read the editor's state here (it changes with the mode, not the animation).
            .accessibilityValue(Text(verbatim: "editor \(model.serial), mode \(tools.mode.rawValue), color \(tools.currentPaint?.color ?? "none"), finger \(tools.allowsFingerDrawing ? "on" : "off")"))
            .accessibilityIdentifier("penPalette")
    }

    private func selection(_ tools: InkToolState) -> Binding<DSPenSelection> {
        Binding(get: { Self.selection(from: tools) }, set: { new in apply(new, to: tools) })
    }

    private func apply(_ new: DSPenSelection, to tools: InkToolState) {
        let old = Self.selection(from: tools)
        let mode = Self.mode(for: new)
        if mode != tools.mode { model.select(mode) }
        if new.drawWithFinger != old.drawWithFinger {
            DispatchQueue.main.async {
                tools.allowsFingerDrawing = new.drawWithFinger
                model.revision &+= 1
            }
        }
        // Colour and width belong to the ink tool being selected (set after the switch).
        guard let ink = mode.inkTool else { return }
        let token = Self.token(for: new.color)
        let width = InkPaint.defaults(for: ink).width * Self.factor(new.width)
        DispatchQueue.main.async {
            if new.color != old.color || mode != tools.mode { tools.paints[ink, default: .defaults(for: ink)].color = token }
            if new.width != old.width { tools.paints[ink, default: .defaults(for: ink)].width = width }
            model.revision &+= 1
        }
    }

    // MARK: InkToolState ⇄ DSPenSelection

    static func selection(from tools: InkToolState) -> DSPenSelection {
        let tool: DSPenTool? = switch tools.mode {
        case .text: nil
        case .pen: .pen
        case .pencil: .pencil
        case .marker: .marker
        case .highlighter: .highlighter
        case .strokeEraser, .pixelEraser: .eraser
        case .lasso: .lasso
        }
        let paint = tools.currentPaint
        let ink = tools.mode.inkTool
        let width: DSPenWidth = {
            guard let paint, let ink else { return .medium }
            let ratio = paint.width / InkPaint.defaults(for: ink).width
            return ratio < 0.8 ? .fine : (ratio > 1.3 ? .bold : .medium)
        }()
        return DSPenSelection(tool: tool, color: color(for: paint?.color ?? "ink.black"), width: width,
                              eraserMode: tools.mode == .pixelEraser ? .pixel : .stroke,
                              drawWithFinger: tools.allowsFingerDrawing)
    }

    static func mode(for selection: DSPenSelection) -> PenMode {
        switch selection.tool {
        case nil: .text
        case .pen: .pen
        case .pencil: .pencil
        case .marker: .marker
        case .highlighter: .highlighter
        case .eraser: selection.eraserMode == .pixel ? .pixelEraser : .strokeEraser
        case .lasso: .lasso
        }
    }

    /// `ink.blue` / `highlight.yellow` (contracts/strokes.md) ⇄ design-system colours.
    /// `ink.blue`, `highlight.yellow` or a custom `#RRGGBB` (the editor parses all three).
    static func color(for token: String) -> DSPenColor { DSPenColor(tokenValue: token) ?? .ink(.black) }

    static func token(for color: DSPenColor) -> String { color.tokenValue }

    static func factor(_ width: DSPenWidth) -> Double {
        switch width {
        case .fine: 0.6
        case .medium: 1
        case .bold: 1.6
        }
    }
}
#endif
