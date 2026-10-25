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
    /// Bumped on every editor change so toolbars refresh.
    var revision = 0
    @ObservationIgnored private var refreshTask: Task<Void, Never>?
    @ObservationIgnored private weak var app: AppModel?

    init(app: AppModel, core: CoreLibrary, noteId: String, notebookId: String) throws {
        self.app = app
        self.noteId = noteId
        self.notebookId = notebookId
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
                ZStack(alignment: .bottom) {
                    DocumentBackground(note: note)
                    VStack(spacing: 0) {
                        // Compact header above the text (the editor has no scrolling header yet).
                        if CoverHeader.hasCover(note) {
                            CoverHeader(note: note)
                                .contextMenu { CoverMenuItems(note: note) }
                        }
                        NativeEditorRepresentable(editor: model.editor)
                            .ignoresSafeArea(.container, edges: .bottom)
                            .accessibilityIdentifier("editor")
                    }
                    PenPalette(model: model)
                        .padding(.bottom, Theme.Space.s3)
                }
                .onChange(of: note.style, initial: true) { _, style in model.apply(style: style) }
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
        do {
            model = try NativeEditorModel(app: app, core: core, noteId: noteId, notebookId: note.notebookId)
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
struct PenPalette: View {
    @Environment(AppModel.self) private var app
    let model: NativeEditorModel
    private let modes: [PenMode] = [.text, .pen, .pencil, .marker, .highlighter, .pixelEraser, .strokeEraser, .lasso]
    private let inks = ["ink.black", "ink.blue", "ink.red", "ink.green", "ink.purple", "ink.brown"]

    var body: some View {
        let _ = model.revision
        let tools = model.editor.tools
        HStack(spacing: Theme.Space.s1) {
            ForEach(modes, id: \.self) { mode in
                Button {
                    // Change the tool on the next run-loop turn: switching it while the tap is
                    // still being delivered reconfigures gesture recognizers mid-event (crash).
                    DispatchQueue.main.async {
                        tools.mode = mode
                        model.revision &+= 1
                    }
                    Haptics.selection()
                } label: {
                    Image(systemName: mode.symbolName)
                        .font(.system(size: 17, weight: .medium))
                        .frame(width: 38, height: 38)
                        .foregroundStyle(tools.mode == mode ? Theme.Palette.onAccent : Theme.Palette.textPrimary)
                        .background(tools.mode == mode ? Theme.Palette.accent : .clear, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(mode.title)
                .accessibilityIdentifier("tool.\(mode.rawValue)")
            }
            if tools.mode.inkTool != nil {
                Divider().frame(height: 24)
                ForEach(inks, id: \.self) { token in
                    Button {
                        tools.setColor(token)
                        model.revision &+= 1
                    } label: {
                        Circle()
                            .fill(Self.color(token))
                            .frame(width: 22, height: 22)
                            .overlay {
                                if tools.currentPaint?.color == token {
                                    Circle().strokeBorder(Theme.Palette.surface, lineWidth: 2).padding(2)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(token)
                }
            }
            Divider().frame(height: 24)
            Button {
                DispatchQueue.main.async {
                    tools.allowsFingerDrawing.toggle()
                    model.revision &+= 1
                }
            } label: {
                Image(systemName: tools.allowsFingerDrawing ? "hand.draw.fill" : "hand.draw")
                    .font(.system(size: 17, weight: .medium))
                    .frame(width: 38, height: 38)
                    .foregroundStyle(tools.allowsFingerDrawing ? Theme.Palette.accent : Theme.Palette.textSecondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Draw with Finger")
            .accessibilityValue(tools.allowsFingerDrawing ? Text("On") : Text("Off"))
            .accessibilityIdentifier("tool.fingerDrawing")
        }
        .padding(.horizontal, Theme.Space.s2)
        .padding(.vertical, Theme.Space.s1)
        .glassEffect(.regular, in: .capsule)
        .shadow(color: .black.opacity(0.12), radius: 20, y: 8)
        .padding(.horizontal, Theme.Space.s3)
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
