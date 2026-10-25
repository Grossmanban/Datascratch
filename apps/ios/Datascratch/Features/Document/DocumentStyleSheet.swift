import SwiftUI

/// Font, width, paper, cover, backdrop and icon of a document (spec/12 §12.3).
struct DocumentStyleSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let noteId: String

    var body: some View {
        let library = app.library
        let note = library.note(noteId)
        let style = Binding<NoteStyle>(
            get: { library.note(noteId)?.style ?? NoteStyle() },
            set: { value in library.updateNote(noteId) { $0.style = value } }
        )
        NavigationStack {
            Form {
                Section("Font") {
                    Picker("Font", selection: style.font) {
                        Text("Serif").tag(NoteStyle.Font.serif)
                        Text("Sans").tag(NoteStyle.Font.sans)
                        Text("Mono").tag(NoteStyle.Font.mono)
                    }
                    .pickerStyle(.segmented)
                }
                Section("Width") {
                    Picker("Width", selection: style.width) {
                        Text("Normal").tag(NoteStyle.Width.normal)
                        Text("Wide").tag(NoteStyle.Width.wide)
                        Text("Full").tag(NoteStyle.Width.full)
                    }
                    .pickerStyle(.segmented)
                }
                Section("Paper") {
                    Picker("Paper", selection: style.paper) {
                        Text("Plain").tag(NoteStyle.Paper.plain)
                        Text("Dots").tag(NoteStyle.Paper.dots)
                        Text("Grid").tag(NoteStyle.Paper.grid)
                        Text("Lines").tag(NoteStyle.Paper.lines)
                    }
                    .pickerStyle(.segmented)
                }
                Section("Icon") {
                    EmojiField(emoji: Binding(
                        get: { library.note(noteId)?.icon ?? "" },
                        set: { value in library.updateNote(noteId) { $0.icon = value.isEmpty ? nil : String(value.prefix(1)) } }
                    ))
                }
            }
            .navigationTitle(note?.title.isEmpty == false ? note!.title : String(localized: "Style"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }
}

struct EmojiField: View {
    @Binding var emoji: String

    var body: some View {
        HStack {
            TextField("Emoji", text: $emoji)
                .font(.system(size: 28))
                .frame(width: 60)
            Spacer()
            if !emoji.isEmpty {
                Button("Remove", role: .destructive) { emoji = "" }
                    .buttonStyle(.borderless)
            }
        }
    }
}
