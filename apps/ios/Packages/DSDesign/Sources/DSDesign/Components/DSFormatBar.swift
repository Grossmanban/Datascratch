import SwiftUI

/// One button of the format bar.
public struct DSFormatBarItem: Identifiable {
    public let id: String
    public let systemImage: String
    public let label: String
    public let isActive: Bool
    public let action: () -> Void

    public init(id: String, systemImage: String, label: String, isActive: Bool = false, action: @escaping () -> Void) {
        self.id = id
        self.systemImage = systemImage
        self.label = label
        self.isActive = isActive
        self.action = action
    }
}

/// Format bar content: buttons and separators.
public enum DSFormatBarElement: Identifiable {
    case item(DSFormatBarItem)
    case separator(id: String)

    public var id: String {
        switch self {
        case let .item(item): item.id
        case let .separator(id): "separator-\(id)"
        }
    }
}

/// Floating Liquid Glass bar of formatting actions (above the selection or keyboard).
public struct DSFormatBar: View {
    private let elements: [DSFormatBarElement]

    public init(items elements: [DSFormatBarElement]) {
        self.elements = elements
    }

    public var body: some View {
        HStack(spacing: 2) {
            ForEach(elements) { element in
                switch element {
                case let .item(item):
                    DSFormatBarButton(item: item)
                case .separator:
                    Rectangle()
                        .fill(Color.dsSeparator)
                        .frame(width: 1, height: 20)
                        .padding(.horizontal, DSSpace.s1)
                        .accessibilityHidden(true)
                }
            }
        }
        .padding(DSSpace.s1)
        .glassEffect(.regular, in: Capsule())
    }
}

private struct DSFormatBarButton: View {
    let item: DSFormatBarItem

    var body: some View {
        Button(action: item.action) {
            Image(systemName: item.systemImage)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(item.isActive ? Color.dsAccent : Color.dsPrimary)
                .frame(width: 36, height: 36)
                .background(Circle().fill(Color.dsPrimary.opacity(item.isActive ? 0.08 : 0)))
                .contentShape(Circle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .dsAnimation(.snappy, value: item.isActive)
        .accessibilityLabel(item.label)
        .accessibilityAddTraits(item.isActive ? .isSelected : [])
    }
}

#Preview("Format bar — light") {
    FormatBarPreview()
}

#Preview("Format bar — dark") {
    FormatBarPreview()
        .preferredColorScheme(.dark)
}

private struct FormatBarPreview: View {
    @State private var bold = true
    @State private var italic = false

    var body: some View {
        ZStack {
            DSBackdrop(.mist).ignoresSafeArea()
            DSFormatBar(items: [
                .item(DSFormatBarItem(id: "h", systemImage: "textformat.size", label: "Стиль")),
                .separator(id: "1"),
                .item(DSFormatBarItem(id: "b", systemImage: "bold", label: "Жирный", isActive: bold) { bold.toggle() }),
                .item(DSFormatBarItem(id: "i", systemImage: "italic", label: "Курсив", isActive: italic) { italic.toggle() }),
                .item(DSFormatBarItem(id: "u", systemImage: "underline", label: "Подчеркнуть") {}),
                .separator(id: "2"),
                .item(DSFormatBarItem(id: "link", systemImage: "link", label: "Ссылка") {}),
                .item(DSFormatBarItem(id: "task", systemImage: "checklist", label: "Задача") {}),
            ])
        }
    }
}
