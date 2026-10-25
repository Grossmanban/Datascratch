import SwiftUI

/// Collapsible sidebar section (Favorites, Folders, Tags…) with a quiet caption header.
public struct DSSidebarSection<Content: View>: View {
    private let title: String
    private let external: Binding<Bool>?
    private let content: Content
    @State private var localExpanded = true
    @State private var isHovering = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(_ title: String, isExpanded: Binding<Bool>? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.external = isExpanded
        self.content = content()
    }

    private var isExpanded: Bool {
        external?.wrappedValue ?? localExpanded
    }

    private func toggle() {
        withAnimation(DSMotionToken.snappy.animation(reduceMotion: reduceMotion)) {
            if let external {
                external.wrappedValue.toggle()
            } else {
                localExpanded.toggle()
            }
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Button(action: toggle) {
                HStack(spacing: DSSpace.s1) {
                    Text(title)
                        .dsFont(.caption)
                        .foregroundStyle(.ds(.textTertiary))
                    Spacer(minLength: DSSpace.s2)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.ds(.textTertiary))
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                        .opacity(isHovering || !isExpanded ? 1 : 0)
                }
                .padding(.horizontal, DSSpace.s2)
                .padding(.top, DSSpace.s4)
                .padding(.bottom, DSSpace.s1)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .onHover { isHovering = $0 }
            .accessibilityLabel(title)
            .accessibilityValue(isExpanded ? Text(DSStrings.expanded) : Text(DSStrings.collapsed))
            .accessibilityAddTraits(.isHeader)

            if isExpanded {
                VStack(alignment: .leading, spacing: 1) {
                    content
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .clipped()
    }
}

/// A sidebar row: SF Symbol in a tint colour, title, optional count.
public struct DSSidebarItem: View {
    private let title: String
    private let systemImage: String
    private let tint: DSTintToken?
    private let count: Int?
    private let isSelected: Bool
    private let level: Int
    private let isExpanded: Binding<Bool>?
    private let action: () -> Void
    @State private var isHovering = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// - Parameters:
    ///   - tint: icon colour (folder / tag colour); `nil` uses secondary text colour.
    ///   - level: nesting depth for folders (indents the row).
    ///   - isExpanded: shows a disclosure chevron for rows with children.
    public init(
        _ title: String,
        systemImage: String,
        tint: DSTintToken? = nil,
        count: Int? = nil,
        isSelected: Bool = false,
        level: Int = 0,
        isExpanded: Binding<Bool>? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.systemImage = systemImage
        self.tint = tint
        self.count = count
        self.isSelected = isSelected
        self.level = level
        self.isExpanded = isExpanded
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: DSSpace.s2) {
                disclosure
                Image(systemName: systemImage)
                    .font(.system(size: 15, weight: .medium))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(tint.map(\.foreground) ?? Color.dsSecondary)
                    .frame(width: 22)
                Text(title)
                    .dsFont(.callout)
                    .fontWeight(isSelected ? .medium : .regular)
                    .foregroundStyle(.ds(.textPrimary))
                    .lineLimit(1)
                Spacer(minLength: DSSpace.s1)
                if let count, count > 0 {
                    Text(count, format: .number)
                        .dsFont(.footnote)
                        .monospacedDigit()
                        .foregroundStyle(.ds(.textTertiary))
                }
            }
            .padding(.leading, DSSpace.s2 + CGFloat(level) * DSSpace.s4)
            .padding(.trailing, DSSpace.s2)
            .frame(minHeight: 32)
            .background {
                RoundedRectangle(cornerRadius: DSRadius.sm + 2, style: .continuous)
                    .fill(Color.dsPrimary.opacity(isSelected ? 0.08 : (isHovering ? 0.04 : 0)))
            }
            .contentShape(RoundedRectangle(cornerRadius: DSRadius.sm + 2, style: .continuous))
        }
        .buttonStyle(.plain)
        .onHover { isHovering = $0 }
        .dsAnimation(.snappy, value: isSelected)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }

    @ViewBuilder
    private var disclosure: some View {
        if let isExpanded {
            Button {
                withAnimation(DSMotionToken.snappy.animation(reduceMotion: reduceMotion)) {
                    isExpanded.wrappedValue.toggle()
                }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.ds(.textTertiary))
                    .rotationEffect(.degrees(isExpanded.wrappedValue ? 90 : 0))
                    .frame(width: 12, height: 24)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isExpanded.wrappedValue ? Text(DSStrings.collapse) : Text(DSStrings.expand))
        } else if level > 0 {
            Color.clear.frame(width: 12, height: 1)
        }
    }
}

#Preview("Sidebar — light") {
    SidebarPreview()
}

#Preview("Sidebar — dark") {
    SidebarPreview()
        .preferredColorScheme(.dark)
}

private struct SidebarPreview: View {
    @State private var selection = "all"
    @State private var projectsOpen = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 1) {
                DSSidebarItem("Все документы", systemImage: "doc.on.doc", count: 128, isSelected: selection == "all") { selection = "all" }
                DSSidebarItem("Задачи", systemImage: "checkmark.circle", tint: .blue, count: 7, isSelected: selection == "tasks") { selection = "tasks" }
                DSSidebarItem("Календарь", systemImage: "calendar", tint: .red, isSelected: selection == "calendar") { selection = "calendar" }
                DSSidebarSection("Избранное") {
                    DSSidebarItem("Идеи для книги", systemImage: "star", tint: .yellow, isSelected: selection == "fav") { selection = "fav" }
                }
                DSSidebarSection("Папки") {
                    DSSidebarItem("Проекты", systemImage: "folder.fill", tint: .indigo, count: 12, isExpanded: $projectsOpen) { selection = "projects" }
                    if projectsOpen {
                        DSSidebarItem("Datascratch", systemImage: "folder.fill", tint: .teal, count: 5, level: 1) { selection = "ds" }
                        DSSidebarItem("Сайт", systemImage: "folder.fill", tint: .orange, count: 3, level: 1) { selection = "site" }
                    }
                    DSSidebarItem("Учёба", systemImage: "folder.fill", tint: .green, count: 9) { selection = "study" }
                }
                DSSidebarSection("Теги") {
                    DSSidebarItem("перо", systemImage: "number", tint: .purple) { selection = "tag" }
                }
            }
            .padding(DSSpace.s3)
        }
        .frame(width: 300)
        .background(.ds(.bgSidebar))
    }
}
