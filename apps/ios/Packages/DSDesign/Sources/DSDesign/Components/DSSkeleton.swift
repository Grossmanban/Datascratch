import SwiftUI

/// Loading placeholder with a soft shimmer (static when Reduce Motion is on).
public struct DSSkeleton: View {
    private let cornerRadius: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase: CGFloat = -1

    public init(cornerRadius: CGFloat = DSRadius.sm) {
        self.cornerRadius = cornerRadius
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        shape
            .fill(Color.dsPrimary.opacity(0.07))
            .overlay {
                if !reduceMotion {
                    GeometryReader { proxy in
                        LinearGradient(
                            colors: [.clear, Color.dsSurface.opacity(0.55), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: proxy.size.width * 0.6)
                        .offset(x: phase * proxy.size.width * 1.3)
                    }
                    .clipShape(shape)
                }
            }
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1.2
                }
            }
            .accessibilityLabel(DSStrings.loading)
    }
}

/// Text-line skeletons for a paragraph.
public struct DSSkeletonLines: View {
    private let lines: Int

    public init(lines: Int = 3) {
        self.lines = lines
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s2) {
            ForEach(0..<lines, id: \.self) { index in
                DSSkeleton()
                    .frame(height: 12)
                    .frame(maxWidth: index == lines - 1 ? 220 : CGFloat.infinity, alignment: .leading)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(DSStrings.loading)
    }
}

/// Small indeterminate spinner in the secondary ink colour.
public struct DSSpinner: View {
    private let size: CGFloat

    public init(size: CGFloat = 18) {
        self.size = size
    }

    public var body: some View {
        ProgressView()
            .progressViewStyle(.circular)
            .tint(Color.dsSecondary)
            .frame(width: size, height: size)
            .accessibilityLabel(DSStrings.loading)
    }
}

#Preview("Skeleton — light") {
    SkeletonPreview()
}

#Preview("Skeleton — dark") {
    SkeletonPreview()
        .preferredColorScheme(.dark)
}

private struct SkeletonPreview: View {
    var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s4) {
            DSSkeleton(cornerRadius: DSRadius.lg).frame(height: 96)
            DSSkeleton().frame(width: 180, height: 20)
            DSSkeletonLines(lines: 4)
            DSSpinner()
        }
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
    }
}
