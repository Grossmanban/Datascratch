import SwiftUI

/// Version history: browse snapshots and restore one (spec/10).
struct VersionHistoryView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let noteId: String
    @State private var selected: NoteVersion?

    var body: some View {
        let versions = app.library.versions(of: noteId)
        NavigationSplitView {
            List(versions, selection: $selected) { version in
                VStack(alignment: .leading, spacing: 2) {
                    Text(version.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.headline)
                    Text(version.title.isEmpty ? String(localized: "Untitled") : version.title)
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                }
                .tag(version)
            }
            .overlay {
                if versions.isEmpty {
                    ContentUnavailableView("No versions yet", systemImage: "clock",
                                           description: Text("Versions are saved as you edit."))
                }
            }
            .navigationTitle("Version History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
        } detail: {
            if let version = selected {
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.s3) {
                        Text(version.title.isEmpty ? String(localized: "Untitled") : version.title)
                            .font(Theme.Typography.title)
                        ForEach(version.body.blocks) { block in
                            Text(block.kind == .task ? "☐ " + block.text : block.text)
                                .font(block.kind.rawValue.hasPrefix("heading") ? Theme.Typography.h3 : Theme.Typography.body)
                        }
                    }
                    .frame(maxWidth: 720, alignment: .leading)
                    .padding(Theme.Space.s6)
                }
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Restore This Version") {
                            app.library.restore(version: version, ofNote: noteId)
                            Haptics.success()
                            dismiss()
                        }
                    }
                }
            } else {
                ContentUnavailableView("Select a version", systemImage: "clock.arrow.circlepath")
            }
        }
    }
}
