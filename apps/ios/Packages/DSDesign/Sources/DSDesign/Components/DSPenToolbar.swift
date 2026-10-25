import SwiftUI

/// Pen tools of the handwriting layer.
public enum DSPenTool: String, CaseIterable, Sendable, Hashable {
    case pen
    case highlighter
    case eraser
    case lasso

    public var systemImage: String {
        switch self {
        case .pen: "pencil.tip"
        case .highlighter: "highlighter"
        case .eraser: "eraser"
        case .lasso: "lasso"
        }
    }

    public var title: String {
        let ru = DSLanguage.current == .ru
        switch self {
        case .pen: return ru ? "Перо" : "Pen"
        case .highlighter: return ru ? "Маркер" : "Highlighter"
        case .eraser: return ru ? "Ластик" : "Eraser"
        case .lasso: return ru ? "Лассо" : "Lasso"
        }
    }

    /// Whether the tool draws with a colour (pen / highlighter).
    public var hasColor: Bool { self == .pen || self == .highlighter }
}

/// Stroke width presets.
public enum DSPenWidth: String, CaseIterable, Sendable, Hashable {
    case fine
    case medium
    case bold

    /// Nominal stroke width in points for a tool (pressure modulates around it).
    public func points(for tool: DSPenTool) -> CGFloat {
        switch (tool, self) {
        case (.highlighter, .fine): 10
        case (.highlighter, .medium): 16
        case (.highlighter, .bold): 24
        case (.eraser, .fine): 8
        case (.eraser, .medium): 16
        case (.eraser, .bold): 32
        case (_, .fine): 1.5
        case (_, .medium): 2.5
        case (_, .bold): 4
        }
    }
}

/// Current pen tool, colours and width. Ink colours come from tokens, so dark
/// theme variants are handled by `DSInkToken` / `DSHighlightToken`.
public struct DSPenSelection: Hashable, Sendable {
    public var tool: DSPenTool
    public var ink: DSInkToken
    public var highlight: DSHighlightToken
    public var width: DSPenWidth

    public init(tool: DSPenTool = .pen, ink: DSInkToken = .black, highlight: DSHighlightToken = .yellow, width: DSPenWidth = .medium) {
        self.tool = tool
        self.ink = ink
        self.highlight = highlight
        self.width = width
    }

    /// Stroke width in points for the current tool.
    public var points: CGFloat { width.points(for: tool) }

    /// Stroke colour for the current tool (`nil` for eraser and lasso).
    public var color: DSColorPair? {
        switch tool {
        case .pen: ink.value
        case .highlighter: highlight.value
        case .eraser, .lasso: nil
        }
    }
}

/// Floating Liquid Glass palette: tools, colours (inks or highlights) and widths.
public struct DSPenToolbar: View {
    public enum Axis: Sendable {
        case horizontal
        case vertical
    }

    @Binding private var selection: DSPenSelection
    private let axis: Axis
    @Namespace private var namespace
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(selection: Binding<DSPenSelection>, axis: Axis = .horizontal) {
        _selection = selection
        self.axis = axis
    }

    private var stack: AnyLayout {
        axis == .horizontal ? AnyLayout(HStackLayout(spacing: DSSpace.s1)) : AnyLayout(VStackLayout(spacing: DSSpace.s1))
    }

    private func update(_ change: (inout DSPenSelection) -> Void) {
        withAnimation(DSMotionToken.snappy.animation(reduceMotion: reduceMotion)) {
            change(&selection)
        }
    }

    public var body: some View {
        GlassEffectContainer(spacing: DSSpace.s2) {
            stack {
                ForEach(DSPenTool.allCases, id: \.self) { tool in
                    toolButton(tool)
                }
                if selection.tool.hasColor {
                    separator
                    swatches
                }
                separator
                ForEach(DSPenWidth.allCases, id: \.self) { width in
                    widthButton(width)
                }
            }
            .padding(DSSpace.s1)
            .glassEffect(.regular, in: Capsule())
        }
        .sensoryFeedback(.selection, trigger: selection)
    }

    private var separator: some View {
        Rectangle()
            .fill(Color.dsSeparator)
            .frame(width: axis == .horizontal ? 1 : 20, height: axis == .horizontal ? 20 : 1)
            .padding(axis == .horizontal ? .horizontal : .vertical, DSSpace.s1)
            .accessibilityHidden(true)
    }

    private func toolButton(_ tool: DSPenTool) -> some View {
        let isOn = selection.tool == tool
        return Button {
            update { $0.tool = tool }
        } label: {
            Image(systemName: tool.systemImage)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(isOn ? Color.dsAccent : Color.dsPrimary)
                .frame(width: 38, height: 38)
                .background {
                    if isOn {
                        Circle()
                            .fill(Color.dsPrimary.opacity(0.08))
                            .matchedGeometryEffect(id: "tool", in: namespace)
                    }
                }
                .contentShape(Circle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .accessibilityLabel(tool.title)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    @ViewBuilder private var swatches: some View {
        if selection.tool == .highlighter {
            ForEach(DSHighlightToken.allCases, id: \.self) { token in
                swatch(color: token.color, isOn: selection.highlight == token, label: token.rawValue) {
                    update { $0.highlight = token }
                }
            }
        } else {
            ForEach(DSInkToken.allCases, id: \.self) { token in
                swatch(color: token.color, isOn: selection.ink == token, label: token.rawValue) {
                    update { $0.ink = token }
                }
            }
        }
    }

    private func swatch(color: Color, isOn: Bool, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Circle()
                .fill(color)
                .frame(width: 20, height: 20)
                .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.12), lineWidth: 0.5))
                .padding(3)
                .overlay {
                    if isOn {
                        Circle()
                            .strokeBorder(Color.dsPrimary.opacity(0.85), lineWidth: 2)
                            .matchedGeometryEffect(id: "swatch", in: namespace)
                    }
                }
                .frame(width: 32, height: 38)
                .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.88))
        .accessibilityLabel(label)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private func widthButton(_ width: DSPenWidth) -> some View {
        let isOn = selection.width == width
        let dot: CGFloat = switch width {
        case .fine: 4
        case .medium: 7
        case .bold: 11
        }
        return Button {
            update { $0.width = width }
        } label: {
            Circle()
                .fill(isOn ? Color.dsPrimary : Color.dsTertiary)
                .frame(width: dot, height: dot)
                .frame(width: 30, height: 38)
                .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.88))
        .accessibilityLabel(DSStrings.width(width))
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

#Preview("Pen toolbar — light") {
    PenToolbarPreview()
}

#Preview("Pen toolbar — dark") {
    PenToolbarPreview()
        .preferredColorScheme(.dark)
}

private struct PenToolbarPreview: View {
    @State private var selection = DSPenSelection()
    @State private var vertical = DSPenSelection(tool: .highlighter)

    var body: some View {
        ZStack {
            DSBackdrop(.sand).ignoresSafeArea()
            HStack(spacing: DSSpace.s8) {
                DSPenToolbar(selection: $selection)
                DSPenToolbar(selection: $vertical, axis: .vertical)
            }
        }
    }
}
