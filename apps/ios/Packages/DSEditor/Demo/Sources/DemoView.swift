import DSDesign
import DSEditor
import SwiftUI

struct DemoView: View {
    let model: DemoModel

    var body: some View {
        NavigationStack { content }
    }

    private var content: some View {
        editorAndPalette
            .navigationTitle("Живой штрих")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
            .alert("Заметки «\(model.pendingNoteTitle ?? "")» нет",
                   isPresented: Binding(get: { model.pendingNoteTitle != nil }, set: { if !$0 { model.pendingNoteTitle = nil } })) {
                Button("Создать заметку") { model.status = "Создана «\(model.pendingNoteTitle ?? "")» (демо)" }
                Button("Отмена", role: .cancel) {}
            } message: {
                Text("В приложении ссылка откроет заметку с этим названием или предложит её создать.")
            }
            .alert("Ссылка", isPresented: Binding(get: { model.askingForLink }, set: { model.askingForLink = $0 })) {
                TextField("https://", text: Binding(get: { model.linkText }, set: { model.linkText = $0 }))
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                Button("Готово") { model.editor.setLink(URL(string: model.linkText)) }
                Button("Отмена", role: .cancel) {}
            }
            .overlay(alignment: .topLeading) { SlashMenuOverlay(model: model) }
            .sheet(isPresented: Binding(get: { model.showPalette }, set: { model.showPalette = $0 })) {
                PaletteSheet(model: model)
                    .presentationDetents([.height(300)])
            }
    }

    private var editorAndPalette: some View {
        ZStack(alignment: .bottom) {
            // As in the app: the palette sits in the bottom safe area and the editor shrinks for
            // it and for the keyboard. Laid over the editor, the palette's taps reached the text
            // view instead of its buttons.
            EditorRepresentable(editor: model.editor)
                .accessibilityIdentifier("editor")
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    VStack(spacing: 8) {
                        // While typing: the format bar above the palette (`spec/04-editor.md`).
                        if model.editor.isEditingText {
                            FormatBar(model: model)
                        }
                        ToolPalette(model: model)
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 12)
                }
            if model.showHUD {
                HUDView(model: model)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .padding(12)
                    .allowsHitTesting(false)
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarLeading) {
            let _ = model.revision
            // iPhone keyboards have no "hide" key: the toolbar always has one (disabled when not typing).
            Button { model.editor.dismissKeyboard() } label: { Image(systemName: "keyboard.chevron.compact.down") }
                .disabled(!model.editor.isEditingText)
                .accessibilityIdentifier("hideKeyboard")
                .accessibilityLabel("Скрыть клавиатуру")
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

/// Format bar over the keyboard (DSDesign `DSFormatBar`): marks act on the selection, or on the
/// next typed text at a caret; headings toggle.
struct FormatBar: View {
    let model: DemoModel

    private func item(_ id: String, _ image: String, _ label: String, _ action: EditorAction, _ on: Bool) -> DSFormatBarElement {
        let editor = model.editor
        return .item(DSFormatBarItem(id: id, systemImage: image, label: label, isActive: on) {
            // After the button's touch is delivered (same rule as the tool palette).
            DispatchQueue.main.async { editor.perform(action) }
        })
    }

    var body: some View {
        let _ = model.revision
        let state = model.editor.formatState
        DSFormatBar(items: [
            item("bold", "bold", "Жирный", .bold, state.has(MarkName.bold)),
            item("italic", "italic", "Курсив", .italic, state.has(MarkName.italic)),
            item("underline", "underline", "Подчёркнутый", .underline, state.has(MarkName.underline)),
            item("strike", "strikethrough", "Зачёркнутый", .strike, state.has(MarkName.strike)),
            item("highlight", "highlighter", "Выделение", .highlight, state.has(MarkName.highlight)),
            .separator(id: "blocks"),
            item("h1", "textformat.size.larger", "Заголовок 1", .heading1, state.block == .heading1),
            item("h2", "textformat.size", "Заголовок 2", .heading2, state.block == .heading2),
            item("list", "list.bullet", "Список", .bulletList, state.block == .bulletList),
            item("task", "checkmark.circle", "Задача", .taskList, state.block == .taskList),
            .separator(id: "link"),
            item("link", "link", "Ссылка", .link, state.has(MarkName.link)),
        ])
        .accessibilityIdentifier("formatBar")
    }
}

/// The "/" block menu under the caret (DSDesign `DSSuggestionList`).
struct SlashMenuOverlay: View {
    let model: DemoModel

    var body: some View {
        if let menu = model.slashMenu {
            let groups = Dictionary(grouping: menu.items, by: \.group)
            let order = ["Текст", "Списки", "Вставка"]
            DSSuggestionList(
                groups: order.compactMap { name in
                    groups[name].map { cmds in
                        DSSuggestionGroup(heading: name, items: cmds.map {
                            DSSuggestionItem(id: $0.id, title: $0.title, systemImage: $0.systemImage, hint: $0.hint)
                        })
                    }
                },
                selectedID: Binding(get: { model.slashSelection }, set: { model.slashSelection = $0 }),
                onPick: { item in DispatchQueue.main.async { model.editor.applySlashCommand(item.id) } }
            )
            .frame(width: 280)
            .frame(maxHeight: 320)
            .offset(x: max(8, menu.caretRect.minX), y: menu.caretRect.maxY + 6)
            .accessibilityIdentifier("slashMenu")
        }
    }
}

/// Floating glass tool palette.
struct ToolPalette: View {
    let model: DemoModel
    private let modes: [PenMode] = [.text, .pen, .pencil, .marker, .highlighter, .pixelEraser, .strokeEraser, .lasso]
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        let _ = model.revision
        let tools = model.editor.tools
        // UI-test diagnostics: does the palette re-render after a tool change (iOS 26.2 simulator)?
        let _ = model.isUITesting ? NSLog("DIAG palette body mode=%@ revision=%d", tools.mode.rawValue, model.revision) : ()
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
                        // Selected like `bg.selected` in the design system: a quiet tint, not accent.
                        .foregroundStyle(Color.primary)
                        .background(tools.mode == mode ? Color.primary.opacity(0.08) : Color.clear, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("tool.\(mode.rawValue)")
                .accessibilityLabel(mode.title)
                .accessibilityAddTraits(tools.mode == mode ? .isSelected : [])
            }
            // The swatch row is always present (dimmed when the tool has no ink) so the palette never
            // changes its structure under the finger: removing buttons while a tool button's touch
            // was still being delivered made UIKit's gesture environment throw.
            // On iPhone the eight tools fill the width; colours are in the palette sheet.
            if sizeClass != .compact {
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
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .glassEffect(.regular, in: Capsule())
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
            Text("прокрутка: \(Int(model.scrollOffset.rounded()))")
                .accessibilityIdentifier("hud.offset")
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
