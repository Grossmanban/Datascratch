import SwiftUI

/// Realistic, filled pen tool (Apple Notes / GoodNotes feel, quieter): a paper
/// barrel with a soft gradient and a left highlight, a colour band and a tip
/// in the current ink. Use it wherever a tool is shown so tools look the same
/// as in `DSPenToolbar` and on the web. Natural size: 20 × 52 pt (tip up).
public struct DSPenNib: View {
    private let tool: DSPenTool
    private let ink: Color
    @Environment(\.colorScheme) private var colorScheme

    /// - Parameters:
    ///   - tool: tool to draw.
    ///   - color: current ink or highlight (the eraser and lasso ignore it).
    public init(tool: DSPenTool, color: Color) {
        self.tool = tool
        self.ink = color
    }

    public var body: some View {
        Group {
            switch tool {
            case .pen: pen
            case .pencil: pencil
            case .marker: marker
            case .highlighter: highlighter
            case .eraser: eraser
            case .lasso: lasso
            }
        }
        .frame(width: 20, height: 52, alignment: .bottom)
        .accessibilityHidden(true)
    }

    // MARK: Tools

    private var pen: some View {
        VStack(spacing: 0) {
            NibCone()
                .fill(ink)
                .overlay(NibCone().stroke(Color.black.opacity(0.22), lineWidth: 0.5))
                .frame(width: 9, height: 12)
            ferrule(width: 11, height: 5)
            band(width: 13)
            barrel(width: 13)
        }
    }

    private var pencil: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .top) {
                NibCone()
                    .fill(LinearGradient(
                        colors: [DSTintToken.yellow.background, DSTintToken.orange.background],
                        startPoint: .top, endPoint: .bottom
                    ))
                    .overlay(NibCone().stroke(Color.black.opacity(0.12), lineWidth: 0.5))
                NibCone()
                    .fill(ink)
                    .frame(width: 5, height: 6)
            }
            .frame(width: 13, height: 14)
            band(width: 13)
            barrel(width: 13)
        }
    }

    private var marker: some View {
        VStack(spacing: 0) {
            UnevenRoundedRectangle(topLeadingRadius: 5, topTrailingRadius: 5, style: .continuous)
                .fill(ink)
                .overlay(
                    UnevenRoundedRectangle(topLeadingRadius: 5, topTrailingRadius: 5, style: .continuous)
                        .stroke(Color.black.opacity(0.2), lineWidth: 0.5)
                )
                .frame(width: 11, height: 10)
            ferrule(width: 15, height: 3)
            band(width: 15)
            barrel(width: 15)
        }
    }

    private var highlighter: some View {
        VStack(spacing: 0) {
            NibChisel()
                .fill(ink.opacity(0.85))
                .overlay(NibChisel().stroke(Color.black.opacity(0.15), lineWidth: 0.5))
                .frame(width: 14, height: 12)
            ferrule(width: 17, height: 3)
            band(width: 17)
            barrel(width: 17)
        }
    }

    private var eraser: some View {
        VStack(spacing: 0) {
            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(DSTintToken.pink.background)
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(DSTintToken.pink.foreground.opacity(0.35))
                        .frame(height: 3)
                }
                .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 5, style: .continuous)
                        .strokeBorder(Color.black.opacity(0.12), lineWidth: 0.5)
                )
                .frame(width: 17, height: 15)
            barrel(width: 17)
        }
    }

    private var lasso: some View {
        VStack(spacing: 1) {
            Circle()
                .stroke(Color.dsSecondary, style: StrokeStyle(lineWidth: 1.6, lineCap: .round, dash: [3, 3]))
                .frame(width: 16, height: 16)
            barrel(width: 9)
        }
    }

    // MARK: Parts

    /// Paper barrel: surface gradient, hairline, a highlight on the left edge.
    private func barrel(width: CGFloat) -> some View {
        let shape = UnevenRoundedRectangle(bottomLeadingRadius: 3, bottomTrailingRadius: 3, style: .continuous)
        return shape
            .fill(Color.dsSurface)
            .overlay(
                shape.fill(LinearGradient(
                    colors: [Color.clear, Color.dsPrimary.opacity(0.06)],
                    startPoint: .top, endPoint: .bottom
                ))
            )
            .overlay(alignment: .leading) {
                Rectangle()
                    .fill(Color.white.opacity(colorScheme == .dark ? 0.15 : 0.6))
                    .frame(width: 1)
                    .padding(.leading, 1.5)
            }
            .overlay(shape.stroke(Color.dsSeparator, lineWidth: 0.5))
            .frame(width: width)
            .frame(maxHeight: .infinity)
    }

    /// Ring in the current ink near the top of the barrel.
    private func band(width: CGFloat) -> some View {
        Rectangle()
            .fill(ink)
            .frame(width: width, height: 4)
            .overlay(Rectangle().stroke(Color.black.opacity(0.12), lineWidth: 0.5))
    }

    /// Metal collar between the tip and the barrel.
    private func ferrule(width: CGFloat, height: CGFloat) -> some View {
        Rectangle()
            .fill(LinearGradient(
                colors: [Color.dsTertiary.opacity(0.55), Color.dsTertiary, Color.dsTertiary.opacity(0.55)],
                startPoint: .leading, endPoint: .trailing
            ))
            .frame(width: width, height: height)
    }
}

/// Fine cone tip.
struct NibCone: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.midX - rect.width * 0.08, y: rect.minY + rect.height * 0.08))
        p.addQuadCurve(
            to: CGPoint(x: rect.midX + rect.width * 0.08, y: rect.minY + rect.height * 0.08),
            control: CGPoint(x: rect.midX, y: rect.minY - rect.height * 0.04)
        )
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

/// Highlighter chisel: slanted flat tip.
struct NibChisel: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.45))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

#Preview("Nibs") {
    HStack(spacing: 14) {
        DSPenNib(tool: .pen, color: DSInkToken.blue.color)
        DSPenNib(tool: .pencil, color: DSInkToken.black.color)
        DSPenNib(tool: .marker, color: DSInkToken.red.color)
        DSPenNib(tool: .highlighter, color: DSHighlightToken.yellow.color)
        DSPenNib(tool: .eraser, color: .clear)
        DSPenNib(tool: .lasso, color: .clear)
    }
    .padding(30)
    .background(Color.dsCanvas)
}
