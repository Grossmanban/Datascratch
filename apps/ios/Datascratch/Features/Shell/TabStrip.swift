import SwiftUI

/// Open documents as tabs (spec/12 §12.6, D-51 amendment 2026-11-02: «tabs, but beautiful,
/// elegant and handy»). iPad: a quiet strip above the document once two or more are open — the
/// active tab lifted on a surface, the rest as plain titles, a close button on the active one, the
/// strip scrolling to it; a button at the end opens the overview. iPhone: the overview only, from
/// the document's toolbar (as in Safari).
struct TabStrip: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var showsOverview = false

    var body: some View {
        let tabs = app.library.openTabs
        HStack(spacing: Theme.Space.s1) {
            ScrollViewReader { reader in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Space.s1) {
                        ForEach(tabs) { note in
                            TabPill(note: note, isActive: note.id == scene.selectedNoteId)
                                .id(note.id)
                        }
                    }
                    .padding(.horizontal, Theme.Space.s3)
                }
                .onAppear { scrollToActive(reader) }
                .onChange(of: scene.selectedNoteId) { _, _ in scrollToActive(reader) }
            }
            Button {
                showsOverview = true
            } label: {
                TabCountBadge(count: tabs.count)
            }
            .buttonStyle(.plain)
            .padding(.trailing, Theme.Space.s3)
            .accessibilityLabel(Text("Show All Tabs"))
            .accessibilityIdentifier("tabs.overview")
            .keyboardShortcut("\\", modifiers: [.command, .shift])
        }
        .padding(.vertical, Theme.Space.s1)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("tabs.strip")
        .sheet(isPresented: $showsOverview) { TabOverview() }
    }

    private func scrollToActive(_ reader: ScrollViewProxy) {
        guard let id = scene.selectedNoteId else { return }
        withAnimation(Theme.Motion.snappy) { reader.scrollTo(id, anchor: .center) }
    }
}

/// One tab: the notebook's colour dot and the title; the active one on a lifted surface with ×.
private struct TabPill: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let note: NoteMeta
    let isActive: Bool

    var body: some View {
        HStack(spacing: Theme.Space.s2) {
            Circle()
                .fill(app.library.notebook(note.notebookId)?.color.foreground ?? Theme.Palette.textTertiary)
                .frame(width: 6, height: 6)
            Text(note.title.isEmpty ? String(localized: "Untitled") : note.title)
                .font(Theme.Typography.footnote.weight(isActive ? .semibold : .regular))
                .foregroundStyle(isActive ? Theme.Palette.textPrimary : Theme.Palette.textSecondary)
                .lineLimit(1)
                .frame(maxWidth: 180, alignment: .leading)
            if isActive {
                Button {
                    scene.closeTab()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Theme.Palette.textTertiary)
                        .frame(width: 18, height: 18)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Close Tab"))
                .accessibilityIdentifier("tab.close")
            }
        }
        .padding(.leading, Theme.Space.s3)
        .padding(.trailing, isActive ? Theme.Space.s2 : Theme.Space.s3)
        .padding(.vertical, 6)
        .background {
            if isActive {
                Capsule().fill(Theme.Palette.surface)
                    .shadow(color: .black.opacity(0.06), radius: 6, y: 2)
            }
        }
        .contentShape(Capsule())
        .onTapGesture { if !isActive { scene.open(note.id) } }
        .contextMenu {
            Button("Close Tab", systemImage: "xmark") { close() }
            Button("Close Other Tabs", systemImage: "xmark.square") { app.library.closeOtherTabs(keeping: note.id); scene.open(note.id) }
        }
        .animation(Theme.Motion.snappy, value: isActive)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text(note.title.isEmpty ? String(localized: "Untitled") : note.title))
        .accessibilityAddTraits(isActive ? [.isButton, .isSelected] : .isButton)
        .accessibilityIdentifier("tab")
    }

    private func close() {
        if isActive { scene.closeTab() } else { app.library.closeTab(note.id) }
    }
}

/// The count of open tabs in a rounded square, like Safari's tab button.
struct TabCountBadge: View {
    let count: Int

    var body: some View {
        Text("\(count)")
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(Theme.Palette.textSecondary)
            .frame(minWidth: 22, minHeight: 22)
            .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous).strokeBorder(Theme.Palette.textSecondary, lineWidth: 1.5))
            .padding(6)
            .contentShape(Rectangle())
    }
}

/// iPhone: the toolbar button with the count of open tabs; opens the overview.
struct TabOverviewButton: View {
    @Environment(AppModel.self) private var app
    @State private var showsOverview = false

    var body: some View {
        Button {
            showsOverview = true
        } label: {
            TabCountBadge(count: app.library.openTabs.count)
        }
        .accessibilityLabel(Text("Show All Tabs"))
        .accessibilityIdentifier("tabs.overview")
        .sheet(isPresented: $showsOverview) { TabOverview() }
    }
}

/// All open tabs as cards (spec/12 §12.6): tap to switch, × to close, «Close Others».
struct TabOverview: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let tabs = app.library.openTabs
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 168, maximum: 260), spacing: Theme.Space.s4, alignment: .top)],
                          alignment: .leading, spacing: Theme.Space.s4) {
                    ForEach(tabs) { note in
                        DocumentCard(note: note, isSelected: note.id == scene.selectedNoteId)
                            .overlay(alignment: .topTrailing) {
                                Button {
                                    if note.id == scene.selectedNoteId { scene.closeTab() } else { app.library.closeTab(note.id) }
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 20))
                                        .symbolRenderingMode(.hierarchical)
                                        .foregroundStyle(Theme.Palette.textSecondary)
                                        .padding(Theme.Space.s2)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(Text("Close Tab"))
                                .accessibilityIdentifier("tabOverview.close")
                            }
                            .onTapGesture {
                                scene.open(note.id)
                                dismiss()
                            }
                    }
                }
                .padding(Theme.Space.s4)
                .animation(Theme.Motion.smooth, value: tabs.map(\.id))
                if tabs.isEmpty {
                    ContentUnavailableView("No Open Tabs", systemImage: "square.on.square")
                }
            }
            .background(Theme.Palette.canvas)
            .navigationTitle(Text("Tabs"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if tabs.count > 1, let active = scene.selectedNoteId {
                        Button("Close Others") { app.library.closeOtherTabs(keeping: active) }
                            .accessibilityIdentifier("tabOverview.closeOthers")
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .accessibilityIdentifier("tabs.overviewSheet")
    }
}
