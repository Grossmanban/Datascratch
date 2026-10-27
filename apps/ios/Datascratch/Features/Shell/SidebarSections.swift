import SwiftUI
#if canImport(DSDesign)
import DSDesign
#endif

/// §12.6: the sidebar sections (Starred, Notebooks, Tags) fold from their title; what is folded
/// is remembered on this device for each space.
struct SidebarCollapse: DynamicProperty {
    /// `spaceId/section` of the folded sections, one per line.
    @AppStorage("sidebar.collapsedSections") private var raw = ""

    private var folded: Set<String> { Set(raw.split(separator: "\n").map(String.init)) }

    func isCollapsed(_ section: String, in spaceId: String?) -> Bool {
        folded.contains("\(spaceId ?? "-")/\(section)")
    }

    func toggle(_ section: String, in spaceId: String?) {
        var set = folded
        let key = "\(spaceId ?? "-")/\(section)"
        if set.contains(key) { set.remove(key) } else { set.insert(key) }
        raw = set.sorted().joined(separator: "\n")
    }
}

/// A section title that folds the section: quiet chevron after the title, optional trailing
/// button (the notebooks' «+»).
struct SidebarSectionHeader<Accessory: View>: View {
    let title: LocalizedStringKey
    let identifier: String
    let isCollapsed: Bool
    let onToggle: () -> Void
    @ViewBuilder var accessory: Accessory

    var body: some View {
        HStack(spacing: Theme.Space.s1) {
            Button(action: onToggle) {
                HStack(spacing: Theme.Space.s1) {
                    Text(title)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Theme.Palette.textTertiary)
                        .rotationEffect(.degrees(isCollapsed ? -90 : 0))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("sidebar.section.\(identifier)")
            .accessibilityValue(isCollapsed ? Text("Collapsed") : Text("Expanded"))
            Spacer()
            accessory
        }
    }
}

extension SidebarSectionHeader where Accessory == EmptyView {
    init(title: LocalizedStringKey, identifier: String, isCollapsed: Bool, onToggle: @escaping () -> Void) {
        self.init(title: title, identifier: identifier, isCollapsed: isCollapsed, onToggle: onToggle) { EmptyView() }
    }
}

/// «12 more» under the first rows of a long section, and «Show Less» once it is open.
struct SidebarMoreRow: View {
    let hidden: Int
    let identifier: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if hidden > 0 { Text("\(hidden) more") } else { Text("Show Less") }
            }
                .font(Theme.Typography.footnote)
                .foregroundStyle(Theme.Palette.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(hidden > 0 ? "sidebar.more.\(identifier)" : "sidebar.less.\(identifier)")
    }
}

/// A tag and, folded under it, its children (`работа/клиенты`).
struct TagTreeRow: View {
    let node: TagNode
    @State private var isExpanded = false

    var body: some View {
        if node.children.isEmpty {
            TagRow(name: node.path, count: node.count, title: node.name)
        } else {
            DisclosureGroup(isExpanded: $isExpanded) {
                ForEach(node.children) { TagTreeRow(node: $0) }
            } label: {
                TagRow(name: node.path, count: node.count, title: node.name)
            }
        }
    }
}

/// «All Tags»: every tag of the space with search, its colour and count; a tap opens its list.
struct AllTagsSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    var body: some View {
        let library = app.library
        let all = TagNode.flattened(library.tagTree)
        let shown = query.isEmpty ? all : all.filter { $0.path.localizedCaseInsensitiveContains(query) }
        NavigationStack {
            List(shown) { tag in
                Button {
                    scene.show(.tag(tag.path))
                    dismiss()
                } label: {
                    HStack(spacing: Theme.Space.s2) {
                        Circle()
                            .fill((library.data.tagColors[tag.path] ?? .gray).foreground)
                            .frame(width: 8, height: 8)
                        Text(tag.path).lineLimit(1)
                        Spacer()
                        Text(tag.count, format: .number)
                            .font(Theme.Typography.footnote.monospacedDigit())
                            .foregroundStyle(Theme.Palette.textTertiary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("allTags.tag")
            }
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: Text("Search Tags"))
            .navigationTitle("All Tags")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
