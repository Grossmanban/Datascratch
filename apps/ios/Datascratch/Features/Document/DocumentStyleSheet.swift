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
                Section("Cover") {
                    GradientChooser(selection: Binding(
                        get: { library.note(noteId)?.cover ?? Backdrop.none },
                        set: { value in library.updateNote(noteId) { $0.cover = value == .none ? nil : value } }
                    ))
                }
                Section("Backdrop") {
                    GradientChooser(selection: Binding(
                        get: { library.note(noteId)?.backdrop ?? Backdrop.none },
                        set: { value in library.updateNote(noteId) { $0.backdrop = value } }
                    ))
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

struct GradientChooser: View {
    @Binding var selection: Backdrop

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Space.s3) {
                ForEach(Backdrop.allCases, id: \.self) { backdrop in
                    Button {
                        withAnimation(Theme.Motion.snappy) { selection = backdrop }
                        Haptics.selection()
                    } label: {
                        VStack(spacing: Theme.Space.s1) {
                            RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                                .fill(backdrop.gradient)
                                .frame(width: 64, height: 44)
                                .overlay {
                                    if backdrop == .none {
                                        Image(systemName: "nosign").foregroundStyle(Theme.Palette.textTertiary)
                                    }
                                }
                                .overlay {
                                    RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                                        .strokeBorder(selection == backdrop ? Theme.Palette.accent : Theme.Palette.separator,
                                                      lineWidth: selection == backdrop ? 2 : 1)
                                }
                            Text(backdrop.localizedName)
                                .font(Theme.Typography.caption)
                                .foregroundStyle(Theme.Palette.textSecondary)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selection == backdrop ? .isSelected : [])
                }
            }
            .padding(.vertical, Theme.Space.s2)
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
