import SwiftUI

/// Version history (spec/10, D-54): who changed the note and when, what changed against the
/// version before (added highlighted, removed struck through), and restoring a version — for
/// those who may edit.
struct VersionHistoryView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let noteId: String

    @State private var versions: [HistoryVersion] = []
    @State private var selected: HistoryVersion?
    @State private var isLoading = true
    @State private var error: String?

    private var notebookId: String { app.library.note(noteId)?.notebookId ?? "" }

    var body: some View {
        NavigationSplitView {
            List(versions, selection: $selected) { version in
                VersionRow(version: version, authors: authorNames(version))
                    .tag(version)
            }
            .overlay {
                if isLoading {
                    ProgressView()
                } else if let error {
                    ContentUnavailableView("History isn’t available", systemImage: "exclamationmark.triangle",
                                           description: Text(error))
                } else if versions.isEmpty {
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
                VersionDetail(noteId: noteId, notebookId: notebookId, version: version,
                              previous: previous(of: version), authors: authorNames(version),
                              canRestore: canRestore) {
                    dismiss()
                }
                .id(version.id)
            } else {
                ContentUnavailableView("Select a version", systemImage: "clock.arrow.circlepath",
                                       description: Text("See what changed and who changed it."))
            }
        }
        .task { await load() }
        .accessibilityIdentifier("history")
    }

    /// Viewers read the history; restoring is an edit (D-54).
    private var canRestore: Bool {
        app.accountSharing.role(forNote: noteId, notebookId: notebookId) != .viewer
    }

    private func previous(of version: HistoryVersion) -> HistoryVersion? {
        guard let index = versions.firstIndex(of: version), index + 1 < versions.count else { return nil }
        return versions[index + 1]
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        // Members' emails for the authors (owner and people of a shared notebook).
        let notebook = ShareTarget(kind: .notebook, id: notebookId)
        if app.accountSharing.isAvailable { _ = try? await app.accountSharing.people(of: notebook) }
        do {
            versions = try await app.noteHistory.versions(of: noteId, notebookId: notebookId)
            if selected == nil { selected = versions.first }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func authorNames(_ version: HistoryVersion) -> [String] {
        version.authors.map { author in
            switch author {
            case .me: String(localized: "You")
            case .user(let id): app.accountSharing.name(ofUser: id) ?? String(localized: "Collaborator")
            case .guest: String(localized: "Guest")
            case .agent: String(localized: "AI agent")
            }
        }
    }
}

private struct VersionRow: View {
    let version: HistoryVersion
    let authors: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(version.createdAt.formatted(date: .abbreviated, time: .shortened))
                .font(.headline)
            if !authors.isEmpty {
                Label(authors.joined(separator: ", "), systemImage: authors.count > 1 ? "person.2" : "person")
                    .font(Theme.Typography.footnote)
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 2)
        .accessibilityIdentifier("history.version")
    }
}

/// One version against the one before it.
private struct VersionDetail: View {
    @Environment(AppModel.self) private var app
    let noteId: String
    let notebookId: String
    let version: HistoryVersion
    let previous: HistoryVersion?
    let authors: [String]
    let canRestore: Bool
    let onRestored: () -> Void

    @State private var lines: [TextDiff.Line] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var confirmRestore = false
    @State private var isRestoring = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.s4) {
                header
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity)
                } else if let error {
                    Text(error).foregroundStyle(Theme.Palette.danger)
                } else {
                    DiffText(lines: lines)
                }
            }
            .frame(maxWidth: 720, alignment: .leading)
            .padding(Theme.Space.s6)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.Palette.canvas)
        .toolbar {
            if canRestore {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Restore") { confirmRestore = true }
                        .disabled(isLoading || isRestoring)
                        .accessibilityIdentifier("history.restore")
                }
            }
        }
        .confirmationDialog("Restore this version?", isPresented: $confirmRestore, titleVisibility: .visible) {
            Button("Restore This Version") { restore() }
        } message: {
            Text("The note becomes this version again. The current text stays in the history.")
        }
        .task { await load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s2) {
            Text(version.createdAt.formatted(date: .complete, time: .shortened))
                .font(Theme.Typography.h2)
                .foregroundStyle(Theme.Palette.textPrimary)
            if !authors.isEmpty {
                let names = authors.joined(separator: ", ")
                Text("Changed by \(names)")
                    .font(Theme.Typography.callout)
                    .foregroundStyle(Theme.Palette.textSecondary)
            }
            HStack(spacing: Theme.Space.s4) {
                DiffLegend(change: .added)
                DiffLegend(change: .removed)
                Spacer()
            }
            .padding(.top, Theme.Space.s1)
            Text(previous == nil ? LocalizedStringKey("The first version: everything is new.")
                                 : "Compared with the version before.")
                .font(Theme.Typography.footnote)
                .foregroundStyle(Theme.Palette.textTertiary)
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let current = try await app.noteHistory.body(of: noteId, notebookId: notebookId, at: version)
            var before = NoteBody(blocks: [])
            if let previous { before = try await app.noteHistory.body(of: noteId, notebookId: notebookId, at: previous) }
            lines = TextDiff.compare(TextDiff.lines(of: before), TextDiff.lines(of: current))
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func restore() {
        isRestoring = true
        Task {
            do {
                try await app.noteHistory.restore(version, of: noteId, notebookId: notebookId)
                Haptics.success()
                onRestored()
            } catch {
                self.error = error.localizedDescription
            }
            isRestoring = false
        }
    }
}

/// The compared text: unchanged plain, added on a soft green, removed struck through in red.
struct DiffText: View {
    let lines: [TextDiff.Line]

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s2) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                Text(Self.attributed(line))
                    .font(Theme.Typography.body)
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, Theme.Space.s2)
                    .padding(.vertical, 2)
                    .background(Self.background(line.change), in: RoundedRectangle(cornerRadius: Theme.Radius.sm, style: .continuous))
                    .textSelection(.enabled)
            }
        }
        .accessibilityIdentifier("history.diff")
    }

    static func attributed(_ line: TextDiff.Line) -> AttributedString {
        var text = AttributedString()
        for segment in line.segments {
            var piece = AttributedString(segment.text)
            switch segment.change {
            case .same: break
            case .added:
                piece.backgroundColor = Theme.Palette.success.opacity(0.22)
                piece.accessibilityLabel = String(localized: "Added: \(segment.text)")
            case .removed:
                piece.strikethroughStyle = .single
                piece.foregroundColor = Theme.Palette.danger
                piece.accessibilityLabel = String(localized: "Removed: \(segment.text)")
            }
            text += piece
        }
        return text
    }

    private static func background(_ change: TextDiff.Change) -> Color {
        switch change {
        case .same: .clear
        case .added: Theme.Palette.success.opacity(0.08)
        case .removed: Theme.Palette.danger.opacity(0.06)
        }
    }
}

private struct DiffLegend: View {
    let change: TextDiff.Change

    var body: some View {
        HStack(spacing: 6) {
            if change == .added {
                Text("Added")
                    .padding(.horizontal, 4)
                    .background(Theme.Palette.success.opacity(0.22), in: RoundedRectangle(cornerRadius: 3))
            } else {
                Text("Removed").strikethrough().foregroundStyle(Theme.Palette.danger)
            }
        }
        .font(Theme.Typography.caption)
        .foregroundStyle(Theme.Palette.textSecondary)
    }
}
