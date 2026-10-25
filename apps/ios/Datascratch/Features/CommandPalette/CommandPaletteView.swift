import SwiftUI

/// One entry of the ⌘K palette: an action or a document.
struct PaletteItem: Identifiable {
    enum Kind { case command, document }
    let id: String
    let kind: Kind
    let title: String
    let subtitle: String?
    let symbol: String
    let keywords: [String]
    let shortcut: String?
    let action: () -> Void
}

/// Fuzzy subsequence scoring: consecutive and word-start matches rank higher.
nonisolated enum FuzzyMatch {
    static func score(_ query: String, in text: String) -> Int? {
        let q = Array(query.lowercased().filter { !$0.isWhitespace })
        guard !q.isEmpty else { return 0 }
        let t = Array(text.lowercased())
        var score = 0
        var qi = 0
        var previousMatch = -2
        for (i, ch) in t.enumerated() where qi < q.count && ch == q[qi] {
            score += 1
            if i == previousMatch + 1 { score += 3 }
            if i == 0 || t[i - 1] == " " || t[i - 1] == "/" { score += 5 }
            previousMatch = i
            qi += 1
        }
        guard qi == q.count else { return nil }
        if text.lowercased().hasPrefix(query.lowercased()) { score += 10 }
        return score - t.count / 20
    }
}

struct CommandPaletteView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.openWindow) private var openWindow
    @State private var query = ""
    @State private var highlighted = 0
    @FocusState private var fieldFocused: Bool

    var body: some View {
        let results = ranked
        ZStack(alignment: .top) {
            Color.black.opacity(0.18)
                .ignoresSafeArea()
                .onTapGesture { dismiss() }
                .accessibilityHidden(true)

            VStack(spacing: 0) {
                HStack(spacing: Theme.Space.s3) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Theme.Palette.textTertiary)
                    TextField("Search documents or type a command", text: $query)
                        .textFieldStyle(.plain)
                        .font(.system(size: 19))
                        .focused($fieldFocused)
                        .submitLabel(.go)
                        .onSubmit { run(results, at: highlighted) }
                        .onKeyPress(.downArrow) {
                            highlighted = min(highlighted + 1, max(results.count - 1, 0))
                            return .handled
                        }
                        .onKeyPress(.upArrow) {
                            highlighted = max(highlighted - 1, 0)
                            return .handled
                        }
                        .onKeyPress(.escape) {
                            dismiss()
                            return .handled
                        }
                        .accessibilityIdentifier("palette.field")
                    Text("esc")
                        .font(Theme.Typography.caption.monospaced())
                        .foregroundStyle(Theme.Palette.textTertiary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Theme.Palette.separator.opacity(0.6), in: RoundedRectangle(cornerRadius: 4))
                        .onTapGesture { dismiss() }
                }
                .padding(Theme.Space.s4)

                Divider()

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 2) {
                            ForEach(Array(results.enumerated()), id: \.element.id) { index, item in
                                PaletteRow(item: item, isHighlighted: index == highlighted)
                                    .id(index)
                                    .onTapGesture { run(results, at: index) }
                            }
                            if results.isEmpty {
                                Text("No results")
                                    .font(Theme.Typography.callout)
                                    .foregroundStyle(Theme.Palette.textTertiary)
                                    .padding(Theme.Space.s6)
                            }
                        }
                        .padding(Theme.Space.s2)
                    }
                    .onChange(of: highlighted) { _, index in proxy.scrollTo(index) }
                }
                .frame(maxHeight: 420)
            }
            .frame(maxWidth: 620)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: Theme.Radius.xl, style: .continuous))
            .shadow(color: .black.opacity(0.18), radius: 40, y: 20)
            .padding(.horizontal, Theme.Space.s4)
            .padding(.top, 80)
        }
        .onAppear { fieldFocused = true }
        .onChange(of: query) { _, _ in highlighted = 0 }
        .accessibilityAddTraits(.isModal)
    }

    private func dismiss() {
        scene.isCommandPalettePresented = false
        query = ""
    }

    private func run(_ results: [PaletteItem], at index: Int) {
        guard results.indices.contains(index) else { return }
        let item = results[index]
        dismiss()
        item.action()
    }

    private var ranked: [PaletteItem] {
        let all = commands + documents
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return commands + Array(documents.prefix(8)) }
        return all.compactMap { item -> (PaletteItem, Int)? in
            let candidates = [item.title] + item.keywords
            let best = candidates.compactMap { FuzzyMatch.score(q, in: $0) }.max()
            return best.map { (item, $0 + (item.kind == .command ? 2 : 0)) }
        }
        .sorted { $0.1 > $1.1 }
        .prefix(30)
        .map { $0.0 }
    }

    private var commands: [PaletteItem] {
        let library = app.library
        var items: [PaletteItem] = [
            PaletteItem(id: "new-note", kind: .command, title: String(localized: "New Note"), subtitle: nil,
                        symbol: "square.and.pencil", keywords: ["create", "note", "document"], shortcut: "⌘N") {
                scene.newNote()
            },
            PaletteItem(id: "today", kind: .command, title: String(localized: "Today's Note"), subtitle: nil,
                        symbol: "sun.max", keywords: ["daily", "journal"], shortcut: "⇧⌘T") {
                scene.openToday()
            },
            PaletteItem(id: "tasks", kind: .command, title: String(localized: "Go to Tasks"), subtitle: nil,
                        symbol: "checkmark.circle", keywords: ["todo"], shortcut: "⌘2") {
                scene.show(.tasks)
            },
            PaletteItem(id: "calendar", kind: .command, title: String(localized: "Go to Calendar"), subtitle: nil,
                        symbol: "calendar", keywords: ["days"], shortcut: "⌘3") {
                scene.show(.calendar)
            },
            PaletteItem(id: "all", kind: .command, title: String(localized: "All Documents"), subtitle: nil,
                        symbol: "doc.on.doc", keywords: ["library"], shortcut: "⌘1") {
                scene.show(.allDocuments)
            },
            PaletteItem(id: "trash", kind: .command, title: String(localized: "Open Trash"), subtitle: nil,
                        symbol: "trash", keywords: ["deleted"], shortcut: nil) {
                scene.show(.trash)
            },
            PaletteItem(id: "settings", kind: .command, title: String(localized: "Settings"), subtitle: nil,
                        symbol: "gearshape", keywords: ["preferences", "account"], shortcut: "⌘,") {
                scene.sheet = .settings
            },
        ]
        if let space = library.activeSpace {
            items.append(PaletteItem(id: "new-notebook", kind: .command, title: String(localized: "New Notebook"),
                                     subtitle: space.name, symbol: "book.closed", keywords: ["create"],
                                     shortcut: "⇧⌘N") {
                scene.sheet = .newNotebook(spaceId: space.id)
            })
        }
        for space in library.spaces where space.id != library.activeSpace?.id {
            items.append(PaletteItem(id: "space-\(space.id)", kind: .command,
                                     title: String(localized: "Switch to \(space.name)"), subtitle: nil,
                                     symbol: space.icon, keywords: ["space", space.name], shortcut: nil) {
                library.activateSpace(space.id)
                scene.sidebar = .allDocuments
            })
        }
        if let id = scene.selectedNoteId {
            items.append(PaletteItem(id: "new-window", kind: .command,
                                     title: String(localized: "Open Note in New Window"), subtitle: nil,
                                     symbol: "macwindow.badge.plus", keywords: ["window"], shortcut: "⌥⌘O") {
                openWindow(id: "note", value: id)
            })
            items.append(PaletteItem(id: "style", kind: .command, title: String(localized: "Document Style"),
                                     subtitle: nil, symbol: "textformat", keywords: ["font", "paper", "cover"],
                                     shortcut: nil) {
                scene.sheet = .documentStyle(noteId: id)
            })
            items.append(PaletteItem(id: "history", kind: .command, title: String(localized: "Version History"),
                                     subtitle: nil, symbol: "clock.arrow.circlepath", keywords: ["restore"],
                                     shortcut: nil) {
                library.recordVersion(ofNote: id)
                scene.sheet = .versions(noteId: id)
            })
        }
        return items
    }

    private var documents: [PaletteItem] {
        let library = app.library
        return library.documents.map { note in
            let notebook = library.notebook(note.notebookId)
            return PaletteItem(id: "doc-\(note.id)", kind: .document,
                               title: note.title.isEmpty ? String(localized: "Untitled") : note.title,
                               subtitle: notebook?.name, symbol: note.kind == .daily ? "sun.max" : "doc.text",
                               keywords: note.tags.map { "#" + $0 } + [note.snippet], shortcut: nil) {
                scene.open(note.id)
            }
        }
    }
}

struct PaletteRow: View {
    let item: PaletteItem
    let isHighlighted: Bool

    var body: some View {
        HStack(spacing: Theme.Space.s3) {
            Image(systemName: item.symbol)
                .frame(width: 22)
                .foregroundStyle(isHighlighted ? Theme.Palette.accent : Theme.Palette.textSecondary)
            VStack(alignment: .leading, spacing: 1) {
                Text(item.title)
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .lineLimit(1)
                if let subtitle = item.subtitle {
                    Text(subtitle)
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                        .lineLimit(1)
                }
            }
            Spacer()
            if let shortcut = item.shortcut {
                Text(shortcut)
                    .font(Theme.Typography.footnote.monospaced())
                    .foregroundStyle(Theme.Palette.textTertiary)
            }
        }
        .padding(.horizontal, Theme.Space.s3)
        .padding(.vertical, Theme.Space.s2 + 2)
        .background(isHighlighted ? Theme.Palette.accent.opacity(0.12) : .clear,
                    in: RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }
}
