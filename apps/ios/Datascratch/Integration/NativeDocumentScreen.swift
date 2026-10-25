#if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore)
import DSCore
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
        editor.onStateChange = { [weak self] in self?.changed() }
        editor.onOpenNote = { [weak app] id in app?.pendingRoute = .note(id) }
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
    let noteId: String

    var body: some View {
        Group {
            if let model, let note = app.library.note(noteId) {
                GeometryReader { proxy in
                    ZStack {
                        DocumentBackground(note: note)
                        // The editor ends above the palette: extended under it, the pen recognizer
                        // (which takes every touch in pen mode) won taps meant for the palette.
                        NativeEditorRepresentable(editor: model.editor)
                            .accessibilityIdentifier("editor")
                    }
                    // The palette sits in the bottom safe area: the text scrolls clear of it, and it
                    // rides up with the keyboard in one animation (no second layout pass).
                    .safeAreaInset(edge: .bottom, spacing: 0) {
                        PenPalette(model: model, isCompact: proxy.size.width < PenPalette.fullWidth)
                            .padding(.top, Theme.Space.s2)
                            .padding(.bottom, Theme.Space.s3)
                    }
                    .onAppear { model.header.containerHeight = proxy.size.height }
                    .onChange(of: proxy.size.height) { _, height in model.header.containerHeight = height }
                }
                .onChange(of: note.style, initial: true) { _, style in model.apply(style: style) }
                .onChange(of: note, initial: true) { _, note in model.header.note = note }
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
                Button("Heading", systemImage: "textformat") { model.editor.perform(.heading2) }
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

struct PenPalette: View {
    @Environment(AppModel.self) private var app
    let model: NativeEditorModel
    /// Narrow (iPhone, iPad portrait or split view): the main tools in one row of 44 pt targets,
    /// the rest in «More» (colours, lasso, pixel eraser, finger drawing). Wide: everything inline.
    let isCompact: Bool
    /// Width the inline palette needs: 8 tools, 6 inks, finger drawing, dividers, margins.
    static let fullWidth: CGFloat = 15 * target + 64
    private var modes: [PenMode] {
        isCompact ? [.text, .pen, .pencil, .marker, .highlighter, .strokeEraser]
            : [.text, .pen, .pencil, .marker, .highlighter, .pixelEraser, .strokeEraser, .lasso]
    }
    private let inks = ["ink.black", "ink.blue", "ink.red", "ink.green", "ink.purple", "ink.brown"]
    private static let target: CGFloat = 44

    var body: some View {
        let _ = model.revision
        let tools = model.editor.tools
        HStack(spacing: 0) {
            ForEach(modes, id: \.self) { mode in
                Button {
                    model.select(mode)
                    Haptics.selection()
                } label: {
                    Image(systemName: mode.symbolName)
                        .font(.system(size: 17, weight: .medium))
                        .frame(width: 36, height: 36)
                        // Selected: a quiet ink fill (bg.selected), as in DSPenToolbar — not a filled accent.
                        .foregroundStyle(tools.mode == mode ? Theme.Palette.textPrimary : Theme.Palette.textSecondary)
                        .background(Theme.Palette.textPrimary.opacity(tools.mode == mode ? 0.08 : 0),
                                    in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .frame(width: Self.target, height: Self.target)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(mode.title)
                .accessibilityAddTraits(tools.mode == mode ? .isSelected : [])
                .accessibilityIdentifier("tool.\(mode.rawValue)")
            }
            if isCompact {
                more(tools)
            } else {
                if tools.mode.inkTool != nil {
                    Divider().frame(height: 24).padding(.horizontal, Theme.Space.s1)
                    ForEach(inks, id: \.self) { token in
                        Button {
                            tools.setColor(token)
                            model.revision &+= 1
                        } label: {
                            swatch(token, isOn: tools.currentPaint?.color == token)
                                .frame(width: Self.target, height: Self.target)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(token)
                    }
                }
                Divider().frame(height: 24).padding(.horizontal, Theme.Space.s1)
                Button {
                    DispatchQueue.main.async {
                        tools.allowsFingerDrawing.toggle()
                        model.revision &+= 1
                    }
                } label: {
                    Image(systemName: tools.allowsFingerDrawing ? "hand.draw.fill" : "hand.draw")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(tools.allowsFingerDrawing ? Theme.Palette.accent : Theme.Palette.textSecondary)
                        .frame(width: Self.target, height: Self.target)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Draw with Finger")
                .accessibilityValue(tools.allowsFingerDrawing ? Text("On") : Text("Off"))
                .accessibilityIdentifier("tool.fingerDrawing")
            }
        }
        .padding(.horizontal, Theme.Space.s1)
        // No gaps for touches to fall through: the buttons sit edge to edge, each 44 pt wide with
        // its own hit shape (a hit shape on the whole capsule brought back a UIKit crash in
        // ios-editor's demo; the editor also ends above the palette).
        .glassEffect(.regular, in: .capsule)
        .shadow(color: .black.opacity(0.12), radius: 20, y: 8)
        .padding(.horizontal, Theme.Space.s3)
        .accessibilityElement(children: .contain)
        .accessibilityValue(Text(verbatim: "editor \(model.serial), mode \(tools.mode.rawValue)"))
        .accessibilityIdentifier("penPalette")
    }

    /// iPhone «More»: colours of the current ink tool, lasso, pixel eraser, finger drawing.
    private func more(_ tools: InkToolState) -> some View {
        Menu {
            if tools.mode.inkTool != nil {
                Section("Color") {
                    ForEach(inks, id: \.self) { token in
                        Button {
                            tools.setColor(token)
                            model.revision &+= 1
                        } label: {
                            if tools.currentPaint?.color == token {
                                Label(Self.colorName(token), systemImage: "checkmark")
                            } else {
                                Text(Self.colorName(token))
                            }
                        }
                    }
                }
            }
            Section {
                Button(PenMode.lasso.title, systemImage: PenMode.lasso.symbolName) { model.select(.lasso) }
                Button(PenMode.pixelEraser.title, systemImage: PenMode.pixelEraser.symbolName) { model.select(.pixelEraser) }
            }
            Section {
                Toggle(isOn: Binding(get: { tools.allowsFingerDrawing }, set: { value in
                    DispatchQueue.main.async {
                        tools.allowsFingerDrawing = value
                        model.revision &+= 1
                    }
                })) {
                    Label("Draw with Finger", systemImage: "hand.draw")
                }
                .accessibilityIdentifier("tool.fingerDrawing")
            }
        } label: {
            ZStack(alignment: .bottomTrailing) {
                Image(systemName: "ellipsis")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Theme.Palette.textPrimary)
                if tools.mode.inkTool != nil, let token = tools.currentPaint?.color {
                    Circle().fill(Self.color(token)).frame(width: 9, height: 9)
                        .overlay { Circle().strokeBorder(Theme.Palette.surface, lineWidth: 1.5) }
                        .offset(x: 6, y: 6)
                }
            }
            .frame(width: Self.target, height: Self.target)
            .contentShape(Rectangle())
        }
        .accessibilityLabel("More Pen Options")
        .accessibilityValue(tools.allowsFingerDrawing ? Text("Draw with Finger: On") : Text("Draw with Finger: Off"))
        .accessibilityIdentifier("tool.more")
    }

    private func swatch(_ token: String, isOn: Bool) -> some View {
        Circle()
            .fill(Self.color(token))
            .frame(width: 22, height: 22)
            .overlay {
                if isOn { Circle().strokeBorder(Theme.Palette.surface, lineWidth: 2).padding(2) }
            }
    }

    private static func colorName(_ token: String) -> LocalizedStringKey {
        switch token {
        case "ink.blue": "Blue"
        case "ink.red": "Red"
        case "ink.green": "Green"
        case "ink.purple": "Purple"
        case "ink.brown": "Brown"
        default: "Black"
        }
    }

    private static func color(_ token: String) -> Color {
        switch token {
        case "ink.blue": Theme.Palette.accent
        case "ink.red": Theme.Palette.danger
        case "ink.green": Theme.Palette.success
        case "ink.purple": Tint.purple.foreground
        case "ink.brown": Color(light: 0x8A5A32, dark: 0xC79A73)
        default: Theme.Palette.textPrimary
        }
    }
}
#endif
