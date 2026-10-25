import SwiftUI

/// Pen tools: the stroke tools of `contracts/strokes.md` plus eraser and lasso.
/// Text mode (the Pencil types and selects) is `DSPenSelection.tool == nil`.
public enum DSPenTool: String, CaseIterable, Sendable, Hashable {
    case pen
    case pencil
    case marker
    case highlighter
    case eraser
    case lasso

    public var systemImage: String {
        switch self {
        case .pen: "pencil.tip"
        case .pencil: "pencil"
        case .marker: "paintbrush.pointed"
        case .highlighter: "highlighter"
        case .eraser: "eraser"
        case .lasso: "lasso"
        }
    }

    public func title(_ language: DSLanguage = .current) -> String {
        let ru = language == .ru
        switch self {
        case .pen: return ru ? "Ручка" : "Pen"
        case .pencil: return ru ? "Карандаш" : "Pencil"
        case .marker: return ru ? "Маркер" : "Marker"
        case .highlighter: return ru ? "Текстовыделитель" : "Highlighter"
        case .eraser: return ru ? "Ластик" : "Eraser"
        case .lasso: return ru ? "Лассо" : "Lasso"
        }
    }

    /// Whether the tool draws with a colour.
    public var hasColor: Bool {
        switch self {
        case .pen, .pencil, .marker, .highlighter: true
        case .eraser, .lasso: false
        }
    }

    /// Ink tools take `ink.*`, the highlighter takes `highlight.*`.
    public var usesInk: Bool { hasColor && self != .highlighter }
}

/// Stroke colour: an ink for pen / pencil / marker, a highlight for the highlighter.
public enum DSPenColor: Hashable, Sendable {
    case ink(DSInkToken)
    case highlight(DSHighlightToken)

    public var pair: DSColorPair {
        switch self {
        case let .ink(token): token.value
        case let .highlight(token): token.value
        }
    }

    public var color: Color { pair.color }

    public var name: String {
        switch self {
        case let .ink(token): token.rawValue
        case let .highlight(token): token.rawValue
        }
    }
}

/// Width step. The editor owns the base width of each tool and multiplies it
/// (same steps as the web `PenToolbar`: 1 / 2 / 3).
public enum DSPenWidth: String, CaseIterable, Sendable, Hashable {
    case fine
    case medium
    case bold

    /// 1, 2 or 3 — the web `PenWidth`.
    public var step: Int {
        switch self {
        case .fine: 1
        case .medium: 2
        case .bold: 3
        }
    }

    /// Multiplier of the tool's base width.
    public var multiplier: CGFloat {
        switch self {
        case .fine: 0.6
        case .medium: 1.0
        case .bold: 1.6
        }
    }

    /// Fallback nominal width in points when the editor has no base width of its own.
    public func defaultPoints(for tool: DSPenTool) -> CGFloat {
        let base: CGFloat = switch tool {
        case .pen: 2.5
        case .pencil: 2
        case .marker: 5
        case .highlighter: 16
        case .eraser: 16
        case .lasso: 1
        }
        return base * multiplier
    }
}

/// Eraser removes whole strokes or erases under the tip.
public enum DSEraserMode: String, CaseIterable, Sendable, Hashable {
    case stroke
    case pixel

    public func title(_ language: DSLanguage = .current) -> String {
        switch self {
        case .stroke: language == .ru ? "штрих" : "stroke"
        case .pixel: language == .ru ? "пиксель" : "pixel"
        }
    }
}

/// Current pen tool, colour, width and modes. Colours come from tokens, so the
/// dark-theme variants are handled by `DSInkToken` / `DSHighlightToken`.
public struct DSPenSelection: Hashable, Sendable {
    /// `nil` = text mode.
    public var tool: DSPenTool?
    public var color: DSPenColor
    public var width: DSPenWidth
    public var eraserMode: DSEraserMode
    /// Draw with a finger too (otherwise Pencil only).
    public var drawWithFinger: Bool

    public init(
        tool: DSPenTool? = .pen,
        color: DSPenColor = .ink(.black),
        width: DSPenWidth = .medium,
        eraserMode: DSEraserMode = .stroke,
        drawWithFinger: Bool = false
    ) {
        self.tool = tool
        self.color = color
        self.width = width
        self.eraserMode = eraserMode
        self.drawWithFinger = drawWithFinger
    }

    /// Whether colour and width controls apply (a drawing tool is active).
    public var isDrawing: Bool { tool?.hasColor ?? false }

    /// New selection after tapping `tool` (same rules as the web `PenToolbar`):
    /// tapping the active eraser toggles its mode; switching to the highlighter
    /// restores the last highlight, switching from it to an ink tool restores the last ink.
    public static func selecting(
        _ tool: DSPenTool?,
        from current: DSPenSelection,
        lastInk: DSInkToken,
        lastHighlight: DSHighlightToken
    ) -> DSPenSelection {
        var next = current
        if tool == .eraser, current.tool == .eraser {
            next.eraserMode = current.eraserMode == .stroke ? .pixel : .stroke
            return next
        }
        next.tool = tool
        if tool == .highlighter, current.tool != .highlighter {
            next.color = .highlight(lastHighlight)
        } else if let tool, tool.usesInk {
            if case .highlight = current.color { next.color = .ink(lastInk) }
        }
        return next
    }
}

/// Floating Liquid Glass pen palette: text mode, nibs coloured by ink, inks or
/// highlights, widths, eraser mode, finger drawing, undo / redo.
/// The editor positions it; this is only the capsule.
public struct DSPenToolbar: View {
    public enum Axis: Sendable {
        case horizontal
        case vertical
    }

    @Binding private var selection: DSPenSelection
    private let axis: Axis
    private let tools: [DSPenTool]
    private let showsTextMode: Bool
    private let canUndo: Bool
    private let canRedo: Bool
    private let onUndo: (() -> Void)?
    private let onRedo: (() -> Void)?
    private let compact: Bool
    @State private var showsMore = false
    @State private var lastInk: DSInkToken = .black
    @State private var lastHighlight: DSHighlightToken = .yellow
    @Namespace private var namespace
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.locale) private var locale

    public init(
        selection: Binding<DSPenSelection>,
        axis: Axis = .horizontal,
        tools: [DSPenTool] = [.pen, .pencil, .marker, .highlighter, .eraser],
        showsTextMode: Bool = true,
        canUndo: Bool = false,
        canRedo: Bool = false,
        onUndo: (() -> Void)? = nil,
        onRedo: (() -> Void)? = nil,
        compact: Bool = false
    ) {
        _selection = selection
        self.compact = compact
        self.axis = axis
        self.tools = tools
        self.showsTextMode = showsTextMode
        self.canUndo = canUndo
        self.canRedo = canRedo
        self.onUndo = onUndo
        self.onRedo = onRedo
    }

    private var language: DSLanguage { DSLanguage(locale: locale) }

    private var stack: AnyLayout {
        axis == .horizontal ? AnyLayout(HStackLayout(spacing: 2)) : AnyLayout(VStackLayout(spacing: 2))
    }

    private func update(_ change: (inout DSPenSelection) -> Void) {
        withAnimation(DSMotionToken.snappy.animation(reduceMotion: reduceMotion)) {
            change(&selection)
        }
        switch selection.color {
        case let .ink(token): lastInk = token
        case let .highlight(token): lastHighlight = token
        }
    }

    public var body: some View {
        GlassEffectContainer(spacing: DSSpace.s2) {
            stack {
                if showsTextMode {
                    textButton
                }
                ForEach(tools, id: \.self) { tool in
                    toolButton(tool)
                }
                if compact {
                    separator
                    moreButton
                } else {
                    inlineControls
                }
            }
            .padding(DSSpace.s1)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: DSRadius.xl, style: .continuous))
        }
        .sensoryFeedback(.selection, trigger: selection)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(DSStrings.tr("Перо", "Pen", language))
    }

    private var hasHistory: Bool { onUndo != nil || onRedo != nil }

    /// Colours, widths, finger drawing and undo / redo inside the capsule (regular mode).
    @ViewBuilder private var inlineControls: some View {
        if selection.isDrawing {
            separator
            swatches
            separator
            ForEach(DSPenWidth.allCases, id: \.self) { width in
                widthButton(width)
            }
        }
        separator
        fingerButton
        if hasHistory {
            historyButtons
        }
    }

    @ViewBuilder private var historyButtons: some View {
        iconButton("arrow.uturn.backward", id: "tool.undo", label: DSStrings.tr("Отменить", "Undo", language), enabled: canUndo) { onUndo?() }
        iconButton("arrow.uturn.forward", id: "tool.redo", label: DSStrings.tr("Повторить", "Redo", language), enabled: canRedo) { onRedo?() }
    }

    /// Compact mode: one trailing button that opens colours, widths, finger drawing, undo / redo.
    private var moreButton: some View {
        Button {
            showsMore = true
        } label: {
            HStack(spacing: 2) {
                if selection.isDrawing {
                    let dot = CGFloat(10 + selection.width.step * 3)
                    Circle()
                        .fill(selection.color.color)
                        .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.15), lineWidth: 0.5))
                        .frame(width: dot, height: dot)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Color.dsTertiary)
                } else {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.dsSecondary)
                }
            }
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .accessibilityLabel(DSStrings.tr("Цвет, толщина и другие настройки", "Colour, width and more", language))
        .accessibilityIdentifier("tool.more")
        .popover(isPresented: $showsMore) {
            morePanel
                .presentationCompactAdaptation(.popover)
        }
    }

    private var morePanel: some View {
        VStack(alignment: .leading, spacing: DSSpace.s2) {
            if selection.isDrawing {
                HStack(spacing: 2) { swatches }
                HStack(spacing: 2) {
                    ForEach(DSPenWidth.allCases, id: \.self) { width in
                        widthButton(width)
                    }
                }
                Divider().overlay(Color.dsSeparator)
            }
            HStack(spacing: 2) {
                fingerButton
                Text(DSStrings.tr("Рисовать пальцем", "Draw with finger", language))
                    .dsFont(.footnote)
                    .foregroundStyle(Color.dsSecondary)
                Spacer(minLength: DSSpace.s4)
                if hasHistory {
                    historyButtons
                }
            }
        }
        .padding(DSSpace.s3)
        .frame(minWidth: 260)
    }

    private var separator: some View {
        Rectangle()
            .fill(Color.dsSeparator)
            .frame(width: axis == .horizontal ? 1 : 22, height: axis == .horizontal ? 22 : 1)
            .padding(axis == .horizontal ? .horizontal : .vertical, DSSpace.s1)
            .accessibilityHidden(true)
    }

    private func selectedFill(_ isOn: Bool, id: String) -> some View {
        ZStack {
            if isOn {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.dsPrimary.opacity(0.08))
                    .matchedGeometryEffect(id: id, in: namespace)
            }
        }
    }

    private var textButton: some View {
        let isOn = selection.tool == nil
        return Button {
            update { $0 = DSPenSelection.selecting(nil, from: $0, lastInk: lastInk, lastHighlight: lastHighlight) }
        } label: {
            Image(systemName: "character.cursor.ibeam")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(isOn ? Color.dsPrimary : Color.dsSecondary)
                .frame(width: compact ? 44 : 38, height: compact ? 44 : 46)
                .background(selectedFill(isOn, id: "tool"))
                .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .accessibilityLabel(DSStrings.tr("Текст", "Text", language))
        .accessibilityIdentifier("tool.text")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private func nibColor(_ tool: DSPenTool) -> Color {
        if selection.tool == tool { return selection.color.color }
        return tool == .highlighter ? lastHighlight.color : lastInk.color
    }

    private func toolButton(_ tool: DSPenTool) -> some View {
        let isOn = selection.tool == tool
        return Button {
            update { $0 = DSPenSelection.selecting(tool, from: $0, lastInk: lastInk, lastHighlight: lastHighlight) }
        } label: {
            ZStack(alignment: .bottom) {
                Group {
                    if tool == .lasso {
                        Image(systemName: "lasso")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(isOn ? Color.dsPrimary : Color.dsSecondary)
                            .frame(maxHeight: .infinity)
                    } else {
                        DSPenNib(tool: tool, color: tool == .eraser ? Color.dsTint(.pink) : nibColor(tool))
                            .frame(width: 16, height: 32)
                    }
                }
                .offset(y: isOn ? -2 : 0)
                if tool == .eraser, isOn {
                    Text(selection.eraserMode.title(language))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Color.dsCanvas)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.dsPrimary))
                        .fixedSize()
                        .offset(y: 6)
                        .transition(.opacity)
                }
            }
            .frame(width: compact ? 44 : 38, height: compact ? 44 : 46)
            .background(selectedFill(isOn, id: "tool"))
            .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .accessibilityLabel(
            tool == .eraser
                ? "\(tool.title(language)): \(selection.eraserMode.title(language))"
                : tool.title(language)
        )
        .accessibilityIdentifier("tool.\(tool.rawValue)")
        .accessibilityHint(tool == .eraser && isOn ? DSStrings.tr("Нажмите ещё раз, чтобы сменить режим", "Tap again to switch mode", language) : "")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    @ViewBuilder private var swatches: some View {
        if selection.tool == .highlighter {
            ForEach(DSHighlightToken.allCases, id: \.self) { token in
                swatch(.highlight(token))
            }
        } else {
            ForEach(DSInkToken.allCases, id: \.self) { token in
                swatch(.ink(token))
            }
        }
    }

    private func swatch(_ color: DSPenColor) -> some View {
        let isOn = selection.color == color
        return Button {
            update { $0.color = color }
        } label: {
            Circle()
                .fill(color.color)
                .frame(width: isOn ? 16 : 20, height: isOn ? 16 : 20)
                .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.15), lineWidth: 0.5))
                .frame(width: 26, height: 26)
                .overlay {
                    if isOn {
                        Circle()
                            .strokeBorder(color.color, lineWidth: 2)
                            .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.2), lineWidth: 0.5))
                            .matchedGeometryEffect(id: "swatch", in: namespace)
                    }
                }
                .frame(width: 32, height: 38)
                .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.88))
        .accessibilityLabel(DSStrings.colorName(color.name, language))
        .accessibilityIdentifier("color.\(color.name)")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private func widthButton(_ width: DSPenWidth) -> some View {
        let isOn = selection.width == width
        let dot = CGFloat(3 + width.step * 3)
        return Button {
            update { $0.width = width }
        } label: {
            Circle()
                .fill(selection.color.color)
                .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.15), lineWidth: 0.5))
                .frame(width: dot, height: dot)
                .frame(width: 30, height: 30)
                .background {
                    if isOn {
                        Circle()
                            .fill(Color.dsPrimary.opacity(0.08))
                            .matchedGeometryEffect(id: "width", in: namespace)
                    }
                }
                .frame(width: 30, height: 38)
                .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.88))
        .accessibilityLabel(DSStrings.width(width, language))
        .accessibilityIdentifier("width.\(width.step)")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private var fingerButton: some View {
        let isOn = selection.drawWithFinger
        return Button {
            update { $0.drawWithFinger.toggle() }
        } label: {
            Image(systemName: "hand.point.up.left")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(isOn ? Color.dsAccent : Color.dsSecondary)
                .frame(width: 36, height: 36)
                .background(Circle().fill(isOn ? Color.dsAccent.opacity(0.12) : Color.clear))
                .contentShape(Circle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .accessibilityLabel(DSStrings.tr("Рисовать пальцем", "Draw with finger", language))
        .accessibilityIdentifier("tool.finger")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private func iconButton(_ systemImage: String, id: String, label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.dsSecondary)
                .frame(width: 36, height: 36)
                .contentShape(Circle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.35)
        .accessibilityLabel(label)
        .accessibilityIdentifier(id)
    }
}

/// Nib silhouette of a pen tool: a tip in the current ink over a paper-coloured
/// body (Goodnotes-like, quieter). Use it wherever a tool is shown, e.g. a custom
/// palette, so tools look the same as in `DSPenToolbar` and on the web.
/// Suggested frame: 16 × 32 pt. `.lasso` draws a rounded tip; prefer SF Symbol "lasso".
public struct DSPenNib: View {
    private let tool: DSPenTool
    private let tip: Color

    /// - Parameters:
    ///   - tool: tool whose silhouette to draw.
    ///   - color: tip colour (current ink or highlight; erasers usually `.dsTint(.pink)`).
    public init(tool: DSPenTool, color: Color) {
        self.tool = tool
        self.tip = color
    }

    public var body: some View {
        let wide = tool == .highlighter || tool == .eraser
        VStack(spacing: 0) {
            DSNibTip(tool: tool)
                .fill(tip)
                .frame(width: wide ? 12 : 9, height: 10)
            RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                .fill(Color.dsSurface)
                .overlay(
                    RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                        .strokeBorder(Color.dsPrimary.opacity(0.28), lineWidth: 0.8)
                )
                .frame(width: wide ? 12 : 9)
        }
        .accessibilityHidden(true)
    }
}

/// Tip shape per tool, drawn in a unit rect.
struct DSNibTip: Shape {
    let tool: DSPenTool

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width, h = rect.height, x = rect.minX, y = rect.minY
        switch tool {
        case .pen:
            p.move(to: CGPoint(x: x + w * 0.2, y: y + h))
            p.addLine(to: CGPoint(x: x + w * 0.5, y: y))
            p.addLine(to: CGPoint(x: x + w * 0.8, y: y + h))
        case .pencil:
            p.move(to: CGPoint(x: x, y: y + h))
            p.addLine(to: CGPoint(x: x + w * 0.5, y: y - h * 0.1))
            p.addLine(to: CGPoint(x: x + w, y: y + h))
        case .marker:
            p.move(to: CGPoint(x: x + w * 0.05, y: y + h))
            p.addLine(to: CGPoint(x: x + w * 0.15, y: y + h * 0.35))
            p.addLine(to: CGPoint(x: x + w * 0.85, y: y + h * 0.35))
            p.addLine(to: CGPoint(x: x + w * 0.95, y: y + h))
        case .highlighter:
            p.move(to: CGPoint(x: x, y: y + h))
            p.addLine(to: CGPoint(x: x, y: y + h * 0.45))
            p.addLine(to: CGPoint(x: x + w, y: y))
            p.addLine(to: CGPoint(x: x + w, y: y + h))
        case .eraser, .lasso:
            p.addRoundedRect(in: CGRect(x: x, y: y + h * 0.3, width: w, height: h * 0.9), cornerSize: CGSize(width: w * 0.35, height: w * 0.35))
        }
        p.closeSubpath()
        return p
    }
}

#Preview("Pen toolbar — light") {
    PenToolbarPreview()
}

#Preview("Pen toolbar — compact (iPhone)") {
    PenToolbarCompactPreview()
        .frame(width: 390)
}

private struct PenToolbarCompactPreview: View {
    @State private var selection = DSPenSelection()

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            DSPenToolbar(selection: $selection, canUndo: true, onUndo: {}, onRedo: {}, compact: true)
        }
    }
}

#Preview("Pen toolbar — dark") {
    PenToolbarPreview()
        .preferredColorScheme(.dark)
}

private struct PenToolbarPreview: View {
    @State private var selection = DSPenSelection()
    @State private var vertical = DSPenSelection(tool: .highlighter, color: .highlight(.yellow))

    var body: some View {
        ZStack {
            DSBackdrop(.sand).ignoresSafeArea()
            VStack(spacing: DSSpace.s8) {
                DSPenToolbar(selection: $selection, canUndo: true, onUndo: {}, onRedo: {})
                DSPenToolbar(selection: $vertical, axis: .vertical, tools: DSPenTool.allCases)
            }
        }
    }
}
