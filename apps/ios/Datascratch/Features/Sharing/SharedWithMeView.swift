import SwiftUI

/// D-63 (owner, 2026-11-08): notebooks and documents other accounts share with this one, one by
/// one (not through a space) — their own section, outside every space, opened from the space
/// switcher. Who shared it, the role and the date; new ones in bold until opened.
struct SharedWithMeView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var query = ""

    var body: some View {
        let items = filtered
        List {
            ForEach(items) { item in
                Button { open(item) } label: { SharedWithMeRow(item: item, isNew: app.isNewShared(item)) }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier(identifier(item))
            }
        }
        .listStyle(.plain)
        .overlay {
            if items.isEmpty {
                if query.isEmpty {
                    ContentUnavailableView("Nothing here yet", systemImage: "person.2",
                                           description: Text("When someone shares a document or a notebook with you, it appears here."))
                } else {
                    ContentUnavailableView.search(text: query)
                }
            }
        }
        .navigationTitle("Shared with me")
        .searchable(text: $query, prompt: Text("Search shared"))
        .refreshable { await app.accountSharing.refresh() }
        .task { app.syncSharedRefs() }
        .accessibilityIdentifier("sharedWithMe")
    }

    /// By title or by who shared it.
    private var filtered: [SharedWithMe] {
        let q = LibraryStore.searchKey(query.trimmingCharacters(in: .whitespacesAndNewlines))
        guard !q.isEmpty else { return app.sharedItems }
        return app.sharedItems.filter { item in
            LibraryStore.searchKey(SharedWithMeRow.title(of: item, in: app.library)).contains(q)
                || LibraryStore.searchKey(item.ownerEmail).contains(q)
        }
    }

    private func identifier(_ item: SharedWithMe) -> String {
        guard isReady(item) else { return "sharedWithMe.pending" }
        return item.target.kind == .note ? "sharedWithMe.note" : "sharedWithMe.notebook"
    }

    private func isReady(_ item: SharedWithMe) -> Bool {
        switch item.target.kind {
        case .notebook: app.library.notebook(item.target.id) != nil
        case .note: app.library.note(item.target.id) != nil
        case .space: false
        }
    }

    private func open(_ item: SharedWithMe) {
        guard isReady(item) else { return }
        app.markSharedSeen(item)
        switch item.target.kind {
        case .notebook: scene.show(.notebook(item.target.id))
        case .note: scene.open(item.target.id)
        case .space: break
        }
    }
}

struct SharedWithMeRow: View {
    @Environment(AppModel.self) private var app
    let item: SharedWithMe
    let isNew: Bool

    static func title(of item: SharedWithMe, in library: LibraryStore) -> String {
        switch item.target.kind {
        case .notebook: library.notebook(item.target.id)?.name ?? String(localized: "Shared notebook")
        case .note:
            library.note(item.target.id).map { $0.title.isEmpty ? String(localized: "Untitled") : $0.title }
                ?? String(localized: "Shared document")
        case .space: ""
        }
    }

    private var title: String { Self.title(of: item, in: app.library) }

    private var symbol: String {
        item.target.kind == .note ? "doc.text" : "book.closed"
    }

    /// «anna@example.org · может редактировать · вчера» (the web's wording, D-63).
    private var detail: String {
        let role = item.role == .viewer ? String(localized: "view only") : String(localized: "can edit")
        var parts = [item.ownerEmail, role]
        if let date = item.addedAt { parts.append(Self.relative(date)) }
        return parts.joined(separator: " · ")
    }

    /// «today», «yesterday», else «3 Nov».
    static func relative(_ date: Date, now: Date = Date(), calendar: Calendar = .current) -> String {
        if calendar.isDate(date, inSameDayAs: now) { return String(localized: "today") }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), calendar.isDate(date, inSameDayAs: yesterday) {
            return String(localized: "yesterday")
        }
        return date.formatted(.dateTime.day().month(.abbreviated))
    }

    var body: some View {
        HStack(spacing: Theme.Space.s3) {
            // New until opened: an accent dot on the left (and the title in bold).
            Circle()
                .fill(isNew ? Theme.Palette.accent : .clear)
                .frame(width: 8, height: 8)
                .accessibilityHidden(!isNew)
                .accessibilityLabel("New")
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(Theme.Palette.textSecondary)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: Theme.Space.s2) {
                    Text(title)
                        .font(Theme.Typography.body.weight(isNew ? .bold : .regular))
                        .foregroundStyle(Theme.Palette.textPrimary)
                        .lineLimit(1)
                    if item.agentsMode {
                        SharedAgentsBadge(kind: item.target.kind == .note ? .note : .notebook)
                    }
                }
                Text(detail)
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
                if !item.isReadable {
                    Text("Opens when \(item.ownerEmail)’s device is online")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, Theme.Space.s2)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}
