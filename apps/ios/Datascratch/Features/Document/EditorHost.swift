import SwiftUI

/// Hosts the document editor. The native TextKit 2 + Yrs editor with the pen
/// layer comes from the DSEditor package (ios-editor stream); until it is
/// linked, a simple block editor over `NoteBody` keeps the app usable.
struct EditorHost: View {
    let noteId: String
    let style: NoteStyle
    var readOnly = false

    var body: some View {
        StandInBlockEditor(noteId: noteId, style: style, readOnly: readOnly)
    }
}

/// Minimal block editor: one text field per block, Markdown-style shortcuts
/// (`- `, `[] `, `# `, `> `, `---`), Return splits blocks.
struct StandInBlockEditor: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let noteId: String
    let style: NoteStyle
    let readOnly: Bool

    @FocusState private var focusedBlock: String?

    private var library: LibraryStore { app.library }

    var body: some View {
        let blocks = library.body(noteId).blocks
        VStack(alignment: .leading, spacing: Theme.Space.s2) {
            ForEach(blocks) { block in
                BlockRow(noteId: noteId, block: block, style: style, readOnly: readOnly,
                         focusedBlock: $focusedBlock,
                         onChangeText: { update(block.id, text: $0) },
                         onConvert: { convert(block.id, to: $0) },
                         onDelete: { delete(block.id) })
            }
            if !readOnly {
                Button {
                    append()
                } label: {
                    Color.clear.frame(height: 80).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Add block")
            }
        }
        .accessibilityIdentifier("editor")
    }

    private func mutate(_ change: (inout NoteBody) -> Void) {
        var body = library.body(noteId)
        change(&body)
        library.setBody(body, ofNote: noteId)
    }

    private func update(_ blockId: String, text: String) {
        var body = library.body(noteId)
        guard let index = body.blocks.firstIndex(where: { $0.id == blockId }) else { return }
        var block = body.blocks[index]

        if let newline = text.firstIndex(of: "\n") {
            // Return: split into two blocks (lists and tasks continue, others become paragraphs).
            block.text = String(text[..<newline])
            let rest = String(text[text.index(after: newline)...]).replacingOccurrences(of: "\n", with: " ")
            body.blocks[index] = block
            let continues = block.kind == .bullet || block.kind == .task
            if continues, block.text.isEmpty {
                body.blocks[index].kind = .paragraph
                body.blocks[index].task = nil
                library.setBody(body, ofNote: noteId)
                return
            }
            var next = NoteBlock.paragraph(rest)
            if continues {
                next.kind = block.kind
                if block.kind == .task { next.task = TaskAttributes(taskId: UUIDv7.make()) }
            }
            body.blocks.insert(next, at: index + 1)
            library.setBody(body, ofNote: noteId)
            focusedBlock = next.id
            return
        }

        block.text = text
        if block.kind == .paragraph, let match = Self.shortcut(text) {
            let kind = match.0
            block.kind = kind
            block.text = match.1
            if kind == .task { block.task = TaskAttributes(taskId: UUIDv7.make()) }
            if kind == .divider {
                body.blocks[index] = block
                let next = NoteBlock.paragraph()
                body.blocks.insert(next, at: index + 1)
                library.setBody(body, ofNote: noteId)
                focusedBlock = next.id
                return
            }
        }
        body.blocks[index] = block
        library.setBody(body, ofNote: noteId)
    }

    static func shortcut(_ text: String) -> (NoteBlock.Kind, String)? {
        let rules: [(String, NoteBlock.Kind)] = [
            ("### ", .heading3), ("## ", .heading2), ("# ", .heading1),
            ("[] ", .task), ("[ ] ", .task), ("- ", .bullet), ("* ", .bullet), ("> ", .quote),
        ]
        if text == "---" { return (.divider, "") }
        for (prefix, kind) in rules where text.hasPrefix(prefix) {
            return (kind, String(text.dropFirst(prefix.count)))
        }
        return nil
    }

    private func convert(_ blockId: String, to kind: NoteBlock.Kind) {
        mutate { body in
            guard let index = body.blocks.firstIndex(where: { $0.id == blockId }) else { return }
            body.blocks[index].kind = kind
            if kind == .task, body.blocks[index].task == nil {
                body.blocks[index].task = TaskAttributes(taskId: UUIDv7.make())
            } else if kind != .task {
                body.blocks[index].task = nil
            }
        }
    }

    private func delete(_ blockId: String) {
        library.deleteBlock(noteId: noteId, blockId: blockId)
    }

    private func append() {
        let blocks = library.body(noteId).blocks
        if let last = blocks.last, last.text.isEmpty, last.kind != .divider {
            focusedBlock = last.id
            return
        }
        let block = NoteBlock.paragraph()
        mutate { $0.blocks.append(block) }
        focusedBlock = block.id
    }
}

struct BlockRow: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let noteId: String
    let block: NoteBlock
    let style: NoteStyle
    let readOnly: Bool
    var focusedBlock: FocusState<String?>.Binding
    let onChangeText: (String) -> Void
    let onConvert: (NoteBlock.Kind) -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s2) {
            leading
            if block.kind == .divider {
                Rectangle()
                    .fill(Theme.Palette.separator)
                    .frame(height: 1)
                    .padding(.vertical, Theme.Space.s3)
            } else {
                TextField(placeholder, text: Binding(get: { block.text }, set: onChangeText), axis: .vertical)
                    .font(font)
                    .foregroundStyle(textColor)
                    .strikethrough(block.task?.state == .done || block.task?.state == .cancelled,
                                   color: Theme.Palette.textTertiary)
                    .lineSpacing(font == bodyFont ? 17 * 0.5 : 4)
                    .focused(focusedBlock, equals: block.id)
                    .disabled(readOnly)
                if let task = block.task {
                    TaskDateChips(task: task)
                }
            }
        }
        .padding(.leading, block.kind == .quote ? Theme.Space.s3 : 0)
        .overlay(alignment: .leading) {
            if block.kind == .quote {
                Capsule().fill(Theme.Palette.accent.opacity(0.5)).frame(width: 3)
            }
        }
        .padding(.top, topPadding)
        .contextMenu {
            if !readOnly { menu }
        }
    }

    @ViewBuilder private var leading: some View {
        switch block.kind {
        case .bullet:
            Text("•").font(bodyFont).foregroundStyle(Theme.Palette.textSecondary)
        case .task:
            if let task = block.task {
                TaskCheckbox(state: task.state) {
                    app.library.updateTask(noteId: noteId, blockId: block.id) {
                        $0.state = $0.state == .open ? .done : .open
                    }
                }
                .disabled(readOnly)
            }
        default:
            EmptyView()
        }
    }

    @ViewBuilder private var menu: some View {
        if block.kind == .task, let task = block.task {
            TaskMenuItems(noteId: noteId, blockId: block.id, task: task, showOpenDocument: false)
            Divider()
        }
        Menu("Turn Into", systemImage: "arrow.triangle.swap") {
            Button("Text") { onConvert(.paragraph) }
            Button("Heading 1") { onConvert(.heading1) }
            Button("Heading 2") { onConvert(.heading2) }
            Button("Heading 3") { onConvert(.heading3) }
            Button("Bulleted List") { onConvert(.bullet) }
            Button("Task") { onConvert(.task) }
            Button("Quote") { onConvert(.quote) }
        }
        Button("Delete Block", systemImage: "trash", role: .destructive, action: onDelete)
    }

    private var bodyFont: Font { .system(size: 17, design: style.font.design) }

    private var font: Font {
        switch block.kind {
        case .heading1: .system(size: 28, weight: .semibold, design: style.font.design)
        case .heading2: .system(size: 22, weight: .semibold, design: style.font.design)
        case .heading3: .system(size: 19, weight: .semibold, design: style.font.design)
        case .quote: .system(size: 17, design: style.font.design).italic()
        default: bodyFont
        }
    }

    private var textColor: Color {
        if let state = block.task?.state, state != .open { return Theme.Palette.textTertiary }
        return block.kind == .quote ? Theme.Palette.textSecondary : Theme.Palette.textPrimary
    }

    private var topPadding: CGFloat {
        switch block.kind {
        case .heading1: Theme.Space.s5
        case .heading2: Theme.Space.s4
        case .heading3: Theme.Space.s3
        default: 0
        }
    }

    private var placeholder: LocalizedStringKey {
        switch block.kind {
        case .heading1, .heading2, .heading3: "Heading"
        case .task: "To-do"
        case .bullet: "List"
        case .quote: "Quote"
        default: "Write…"
        }
    }
}
