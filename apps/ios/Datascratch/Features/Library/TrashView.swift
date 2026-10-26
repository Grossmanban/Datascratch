import SwiftUI

/// Trash: notes stay 30 days, then are deleted for good (spec/10).
struct TrashView: View {
    @Environment(AppModel.self) private var app
    @State private var confirmEmpty = false

    var body: some View {
        let library = app.library
        Group {
            if library.trashed.isEmpty {
                ContentUnavailableView("Trash is empty", systemImage: "trash",
                                       description: Text("Deleted documents stay here for 30 days."))
            } else {
                List {
                    Section {
                        ForEach(library.trashed) { note in
                            HStack {
                                DocumentRow(note: note)
                                Text("\(library.daysLeftInTrash(note)) d")
                                    .font(Theme.Typography.caption.monospacedDigit())
                                    .foregroundStyle(Theme.Palette.textTertiary)
                                    .accessibilityLabel(Text("\(library.daysLeftInTrash(note)) days left"))
                            }
                            .contextMenu {
                                Button("Restore", systemImage: "arrow.uturn.backward") { library.restoreFromTrash(note.id) }
                                Button("Delete Forever", systemImage: "trash", role: .destructive) {
                                    library.deleteForever(note.id)
                                }
                            }
                            .swipeActions(edge: .leading) {
                                Button("Restore", systemImage: "arrow.uturn.backward") { library.restoreFromTrash(note.id) }
                                    .tint(Theme.Palette.success)
                            }
                            .swipeActions(edge: .trailing) {
                                Button("Delete", systemImage: "trash", role: .destructive) { library.deleteForever(note.id) }
                            }
                        }
                    } footer: {
                        Text("Documents are deleted automatically after 30 days in the trash.")
                    }
                }
                .scrollContentBackground(.hidden)
            }
        }
        .background(Theme.Palette.canvas)
        .navigationTitle("Trash")
        .toolbar {
            // «Empty Trash» as a verb with the bin, not a bare «Empty» (read as the adjective).
            Button("Empty Trash", systemImage: "trash", role: .destructive) { confirmEmpty = true }
                .labelStyle(.titleAndIcon)
                .tint(Theme.Palette.danger)
                .disabled(library.trashed.isEmpty)
                .accessibilityIdentifier("trash.empty")
                .confirmationDialog(deleteTitle, isPresented: $confirmEmpty, titleVisibility: .visible) {
                    Button("Delete Forever", role: .destructive) { library.emptyTrash() }
                } message: {
                    Text("This cannot be undone.")
                }
        }
    }

    private var deleteTitle: LocalizedStringKey {
        let count = library.trashed.count
        let title: LocalizedStringKey = "Delete documents forever: \(count)?"
        return title
    }
}
