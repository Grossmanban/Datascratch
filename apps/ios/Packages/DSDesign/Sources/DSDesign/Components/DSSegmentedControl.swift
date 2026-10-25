import SwiftUI

/// One option of `DSSegmentedControl`.
public struct DSSegment<Value: Hashable>: Identifiable {
    public let value: Value
    public let title: String
    public let systemImage: String?

    public var id: Value { value }

    public init(_ title: String, value: Value, systemImage: String? = nil) {
        self.title = title
        self.value = value
        self.systemImage = systemImage
    }
}

/// Segmented control with a sliding paper thumb.
public struct DSSegmentedControl<Value: Hashable>: View {
    @Binding private var selection: Value
    private let segments: [DSSegment<Value>]
    @Namespace private var namespace
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(selection: Binding<Value>, segments: [DSSegment<Value>]) {
        _selection = selection
        self.segments = segments
    }

    public var body: some View {
        HStack(spacing: 2) {
            ForEach(segments) { segment in
                let isSelected = segment.value == selection
                Button {
                    withAnimation(DSMotionToken.snappy.animation(reduceMotion: reduceMotion)) {
                        selection = segment.value
                    }
                } label: {
                    HStack(spacing: DSSpace.s1) {
                        if let symbol = segment.systemImage {
                            Image(systemName: symbol)
                                .font(.system(size: 12, weight: .semibold))
                        }
                        Text(segment.title)
                            .dsFont(.footnote)
                            .fontWeight(isSelected ? .semibold : .medium)
                            .lineLimit(1)
                    }
                    .foregroundStyle(isSelected ? Color.dsPrimary : Color.dsSecondary)
                    .padding(.horizontal, DSSpace.s3)
                    .frame(maxWidth: .infinity, minHeight: 28)
                    .background {
                        if isSelected {
                            RoundedRectangle(cornerRadius: DSRadius.sm, style: .continuous)
                                .fill(Color.dsSurface)
                                .dsShadow(.card)
                                .matchedGeometryEffect(id: "thumb", in: namespace)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
            }
        }
        .padding(2)
        .background(
            RoundedRectangle(cornerRadius: DSRadius.sm + 2, style: .continuous)
                .fill(Color.dsPrimary.opacity(0.06))
        )
        .sensoryFeedback(.selection, trigger: selection)
    }
}

#Preview("Segmented — light") {
    SegmentedPreview()
}

#Preview("Segmented — dark") {
    SegmentedPreview()
        .preferredColorScheme(.dark)
}

private struct SegmentedPreview: View {
    @State private var view = "list"

    var body: some View {
        DSSegmentedControl(selection: $view, segments: [
            DSSegment("Список", value: "list", systemImage: "list.bullet"),
            DSSegment("Карточки", value: "cards", systemImage: "square.grid.2x2"),
            DSSegment("Календарь", value: "calendar", systemImage: "calendar"),
        ])
        .frame(width: 360)
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
    }
}
