import DSEditor
import SwiftUI

struct DemoView: View {
    let model: DemoModel

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                EditorRepresentable(editor: model.editor)
                    .ignoresSafeArea(.container, edges: .bottom)
                    .accessibilityIdentifier("editor")
                ToolPalette(model: model)
                    .padding(.bottom, 12)
                if model.showHUD {
                    HUDView(model: model)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                        .padding(12)
                        .allowsHitTesting(false)
                }
            }
            .navigationTitle("Живой штрих")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
            .sheet(isPresented: Binding(get: { model.showPalette }, set: { model.showPalette = $0 })) {
                PaletteSheet(model: model)
                    .presentationDetents([.height(300)])
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarLeading) {
            let _ = model.revision
            Button { model.editor.undo() } label: { Image(systemName: "arrow.uturn.backward") }
                .disabled(!model.editor.canUndo)
                .accessibilityIdentifier("undo")
            Button { model.editor.redo() } label: { Image(systemName: "arrow.uturn.forward") }
                .disabled(!model.editor.canRedo)
                .accessibilityIdentifier("redo")
        }
        ToolbarItemGroup(placement: .topBarTrailing) {
            Menu {
                Section("Ширина колонки") {
                    ForEach(DocumentStyle.Width.allCases, id: \.self) { w in
                        Button(widthTitle(w)) { model.setWidth(w) }
                            .accessibilityIdentifier("width.\(w.rawValue)")
                    }
                }
                Section("Бумага") {
                    ForEach(DocumentStyle.Paper.allCases, id: \.self) { p in
                        Button(paperTitle(p)) { model.setPaper(p) }
                    }
                }
                Section("Шрифт") {
                    ForEach(DocumentStyle.Font.allCases, id: \.self) { f in
                        Button(fontTitle(f)) { model.setFont(f) }
                    }
                }
            } label: { Image(systemName: "textformat.size") }
                .accessibilityIdentifier("style")
            Menu {
                Button("Блок рисования", systemImage: "scribble") { model.editor.insertBlock(.drawing(height: 260)) }
                Button("Задача", systemImage: "checkmark.circle") { model.editor.perform(.taskList) }
                Button("Заголовок", systemImage: "textformat") { model.editor.perform(.heading2) }
                Button("Список", systemImage: "list.bullet") { model.editor.perform(.bulletList) }
                Button("Цитата", systemImage: "text.quote") { model.editor.perform(.quote) }
                Button("Формула", systemImage: "function") { model.editor.insertBlock(.math("a^2 + b^2 = c^2")) }
                Button("Диаграмма", systemImage: "point.3.connected.trianglepath.dotted") {
                    model.editor.insertBlock(.mermaid("graph TD\n  A --> B"))
                }
                Button("Картинка", systemImage: "photo") {
                    model.editor.insertBlock(BlockNode(type: NodeType.image, attrs: ["attachmentId": "demo-1", "width": 1, "alt": "Пример", "caption": "Нарисуйте на картинке"]))
                }
                Button("Таблица", systemImage: "tablecells") { model.editor.insertBlock(EditorCommands.table(rows: 3, columns: 3, header: ["Что", "Где", "Когда"])) }
                Button("Разделитель", systemImage: "minus") { model.editor.insertBlock(.rule("wave")) }
            } label: { Image(systemName: "plus.circle") }
                .accessibilityIdentifier("insert")
            Menu {
                Button("Сохранить", systemImage: "square.and.arrow.down") { model.save() }
                    .accessibilityIdentifier("save")
                Button("Загрузить из файла", systemImage: "arrow.clockwise") { model.reload() }
                Button("Восстановить образец", systemImage: "doc.badge.arrow.up") { model.reset() }
                Button("Открыть 10 000 слов", systemImage: "speedometer") { model.loadLarge() }
                Toggle("Рисовать пальцем", isOn: Binding(get: { model.editor.tools.allowsFingerDrawing },
                                                         set: { model.editor.tools.allowsFingerDrawing = $0 }))
                Toggle("Жесты пером", isOn: Binding(get: { model.editor.tools.gesturesEnabled },
                                                    set: { model.editor.tools.gesturesEnabled = $0 }))
                Toggle("Замеры", isOn: Binding(get: { model.showHUD }, set: { model.showHUD = $0 }))
                if !model.status.isEmpty { Text(model.status) }
            } label: { Image(systemName: "ellipsis.circle") }
                .accessibilityIdentifier("more")
        }
    }

    private func widthTitle(_ w: DocumentStyle.Width) -> String {
        switch w {
        case .normal: "Обычная"
        case .wide: "Широкая"
        case .full: "Во всю ширину"
        }
    }

    private func paperTitle(_ p: DocumentStyle.Paper) -> String {
        switch p {
        case .plain: "Гладкая"
        case .dots: "Точки"
        case .grid: "Клетка"
        case .lines: "Линейка"
        }
    }

    private func fontTitle(_ f: DocumentStyle.Font) -> String {
        switch f {
        case .serif: "С засечками"
        case .sans: "Без засечек"
        case .mono: "Моноширинный"
        }
    }
}

struct EditorRepresentable: UIViewRepresentable {
    let editor: EditorView
    func makeUIView(context: Context) -> EditorView { editor }
    func updateUIView(_ uiView: EditorView, context: Context) {}
}

/// Floating glass tool palette.
struct ToolPalette: View {
    let model: DemoModel
    private let modes: [PenMode] = [.text, .pen, .pencil, .marker, .highlighter, .pixelEraser, .strokeEraser, .lasso]

    var body: some View {
        let _ = model.revision
        let tools = model.editor.tools
        HStack(spacing: 6) {
            ForEach(modes, id: \.self) { mode in
                Button {
                    // Applied after the button's touch has been fully delivered: changing the tool
                    // (and re-rendering this palette) inside the action crashed UIKit's gesture
                    // environment while it delayed the ending touch.
                    DispatchQueue.main.async { tools.mode = mode }
                } label: {
                    Image(systemName: mode.symbolName)
                        .font(.system(size: 18, weight: .medium))
                        .frame(width: 40, height: 40)
                        .foregroundStyle(tools.mode == mode ? Color.white : Color.primary)
                        .background(tools.mode == mode ? Color.accentColor : Color.clear, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("tool.\(mode.rawValue)")
                .accessibilityLabel(mode.title)
            }
            // The swatch row is always present (dimmed when the tool has no ink) so the palette never
            // changes its structure under the finger: removing buttons while a tool button's touch
            // was still being delivered made UIKit's gesture environment throw.
            let inkTool = tools.mode.inkTool
            let tool = inkTool ?? .pen
            let tokens = tool == .highlighter ? EditorTheme.highlightTokens : EditorTheme.inkTokens
            Divider().frame(height: 28)
            ForEach(0..<4, id: \.self) { slot in
                let token = tokens[min(slot, tokens.count - 1)]
                Button {
                    guard inkTool != nil else { return }
                    DispatchQueue.main.async { tools.setColor(token) }
                } label: {
                    Circle()
                        .fill(Color(EditorTheme.color(token: token)))
                        .frame(width: 24, height: 24)
                        .overlay(Circle().stroke(Color.primary.opacity(inkTool != nil && tools.paints[tool]?.color == token ? 0.8 : 0), lineWidth: 2).padding(-3))
                }
                .buttonStyle(.plain)
                .opacity(inkTool == nil ? 0.3 : 1)
                .accessibilityIdentifier("color.slot\(slot)")
                .accessibilityLabel(token)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .glassEffect(.regular, in: Capsule())
        // The whole capsule is the palette's: a tap between two buttons must not fall through
        // to the editor underneath (it would move the caret and scroll).
        .contentShape(Capsule())
    }
}

/// Palette shown on Pencil Pro squeeze.
struct PaletteSheet: View {
    let model: DemoModel

    var body: some View {
        let _ = model.revision
        let tools = model.editor.tools
        VStack(alignment: .leading, spacing: 16) {
            Text("Инструменты").font(.headline)
            ToolPalette(model: model)
            if let tool = tools.mode.inkTool {
                let width = tools.paints[tool]?.width ?? 2
                Text(String(format: "Толщина: %.1f pt", width)).font(.subheadline)
                Slider(value: Binding(get: { width }, set: { tools.setWidth($0) }),
                       in: tool == .highlighter ? 6...30 : 0.6...8)
            }
        }
        .padding(24)
    }
}

/// Live numbers for checking performance on device.
struct HUDView: View {
    let model: DemoModel
    @State private var fps = FPSCounter()

    var body: some View {
        let _ = model.revision
        VStack(alignment: .trailing, spacing: 2) {
            Text(String(format: "открытие: %.0f мс", model.editor.lastOpenDuration * 1000))
            Text(String(format: "перерисовка пера: %.1f мс", model.editor.lastInkRefreshDuration * 1000))
            Text("штрихов: \(model.document.strokes.count)")
                .accessibilityIdentifier("hud.strokes")
            Text("кадров/с: \(fps.fps)")
        }
        .font(.caption.monospacedDigit())
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
        .onAppear { fps.start() }
    }
}

@MainActor
@Observable
final class FPSCounter {
    var fps = 0
    private var link: CADisplayLink?
    private var frames = 0
    private var last: CFTimeInterval = 0

    func start() {
        guard link == nil else { return }
        let l = CADisplayLink(target: self, selector: #selector(tick(_:)))
        l.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
        l.add(to: .main, forMode: .common)
        link = l
    }

    @objc private func tick(_ l: CADisplayLink) {
        if last == 0 { last = l.timestamp }
        frames += 1
        if l.timestamp - last >= 1 {
            fps = frames
            frames = 0
            last = l.timestamp
        }
    }
}
