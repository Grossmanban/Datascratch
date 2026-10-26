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

    /// Colour family of a drawing tool.
    public var colorFamily: DSPenColorFamily { self == .highlighter ? .highlight : .ink }
}

/// Stroke colour: an ink token, a highlight token or the user's own `#RRGGBB`
/// (contracts/strokes.md §1: `color` is a token or `#RRGGBB`).
public enum DSPenColor: Hashable, Sendable {
    case ink(DSInkToken)
    case highlight(DSHighlightToken)
    /// Custom colour as `#RRGGBB`. Same in both themes (custom colours are not lightened).
    case custom(String)

    public var pair: DSColorPair {
        switch self {
        case let .ink(token): return token.value
        case let .highlight(token): return token.value
        case let .custom(hex):
            let rgba = DSRGBA(hex: hex) ?? DSRGBA(0x1D1C_1AFF)
            return DSColorPair(light: rgba, dark: rgba)
        }
    }

    public var color: Color { pair.color }

    /// Token name (`black`, `yellow`) or `custom`.
    public var name: String {
        switch self {
        case let .ink(token): token.rawValue
        case let .highlight(token): token.rawValue
        case .custom: "custom"
        }
    }

    /// Normalized `#RRGGBB` of a custom colour, nil for tokens.
    public var hex: String? {
        if case let .custom(value) = self { return DSRecentPenColors.normalized(value) ?? value }
        return nil
    }

    /// Value for `strokes.md` §1: `ink.black`, `highlight.yellow` or `#A1B2C3`.
    public var tokenValue: String {
        switch self {
        case let .ink(token): "ink.\(token.rawValue)"
        case let .highlight(token): "highlight.\(token.rawValue)"
        case let .custom(value): DSRecentPenColors.normalized(value) ?? value
        }
    }

    /// Parses a `strokes.md` colour value (`ink.*`, `highlight.*` or `#RRGGBB`).
    public init?(tokenValue: String) {
        if tokenValue.hasPrefix("ink."), let token = DSInkToken(rawValue: String(tokenValue.dropFirst(4))) {
            self = .ink(token)
        } else if tokenValue.hasPrefix("highlight."), let token = DSHighlightToken(rawValue: String(tokenValue.dropFirst(10))) {
            self = .highlight(token)
        } else if let hex = DSRecentPenColors.normalized(tokenValue) {
            self = .custom(hex)
        } else {
            return nil
        }
    }

    var isHighlightToken: Bool {
        if case .highlight = self { return true }
        return false
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

    /// Diameter of the width dot in the palette (ink tools) — real relative thickness.
    var dotDiameter: CGFloat {
        switch self {
        case .fine: 4
        case .medium: 7
        case .bold: 11
        }
    }

    /// Bar thickness of the width preview for the highlighter.
    var barThickness: CGFloat {
        switch self {
        case .fine: 8
        case .medium: 12
        case .bold: 16
        }
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

/// Current pen tool, colour, width and modes. Token colours handle the dark
/// theme themselves (`DSInkToken` / `DSHighlightToken`); custom colours do not change.
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
        selecting(tool, from: current, lastInkColor: .ink(lastInk), lastHighlightColor: .highlight(lastHighlight))
    }

    /// Same as `selecting(_:from:lastInk:lastHighlight:)` with custom colours allowed.
    public static func selecting(
        _ tool: DSPenTool?,
        from current: DSPenSelection,
        lastInkColor: DSPenColor,
        lastHighlightColor: DSPenColor
    ) -> DSPenSelection {
        var next = current
        if tool == .eraser, current.tool == .eraser {
            next.eraserMode = current.eraserMode == .stroke ? .pixel : .stroke
            return next
        }
        next.tool = tool
        if tool == .highlighter, current.tool != .highlighter {
            next.color = lastHighlightColor
        } else if let tool, tool.usesInk {
            let holdsHighlight = current.tool == .highlighter
                || current.color.isHighlightToken
                || (current.color != lastInkColor && current.color == lastHighlightColor)
            if holdsHighlight { next.color = lastInkColor }
        }
        return next
    }
}

/// Floating pen palette («Тихая бумага», Apple Notes / GoodNotes feel): tools stand
/// in a quiet glass tray and peek out of its bottom edge, the selected one rises;
/// each nib shows its ink. Then colours (presets, recent custom colours, «+» for
/// the system picker), real-thickness widths, finger drawing, undo / redo and an
/// optional fold button. The editor positions it; this is only the tray.
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
    private let isCollapsed: Binding<Bool>?
    private let recentOverride: [String]?

    @State private var showsMore = false
    @State private var showsPicker = false
    @State private var recentVersion = 0
    @State private var lastInk: DSPenColor = .ink(.black)
    @State private var lastHighlight: DSPenColor = .highlight(.yellow)
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.locale) private var locale

    /// - Parameters:
    ///   - compact: iPhone layout — tools in a row (44 pt) and a «More» button with colours,
    ///     widths, finger drawing and undo / redo in a popover.
    ///   - isCollapsed: makes the palette foldable into a round button (nil = not foldable).
    ///   - recentColors: custom colours to show instead of the persisted ones (previews, snapshots).
    public init(
        selection: Binding<DSPenSelection>,
        axis: Axis = .horizontal,
        tools: [DSPenTool] = [.pen, .pencil, .marker, .highlighter, .eraser],
        showsTextMode: Bool = true,
        canUndo: Bool = false,
        canRedo: Bool = false,
        onUndo: (() -> Void)? = nil,
        onRedo: (() -> Void)? = nil,
        compact: Bool = false,
        isCollapsed: Binding<Bool>? = nil,
        recentColors: [String]? = nil
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
        self.isCollapsed = isCollapsed
        self.recentOverride = recentColors
    }

    private var language: DSLanguage { DSLanguage(locale: locale) }
    private var vertical: Bool { axis == .vertical }
    private var hasHistory: Bool { onUndo != nil || onRedo != nil }
    private var collapsed: Bool { isCollapsed?.wrappedValue ?? false }
    private var family: DSPenColorFamily { selection.tool?.colorFamily ?? .ink }

    private var recentColors: [String] {
        _ = recentVersion
        if let recentOverride { return Array(recentOverride.compactMap(DSRecentPenColors.normalized).prefix(DSRecentPenColors.limit)) }
        return DSRecentPenColors.load(family: family)
    }

    private var stack: AnyLayout {
        vertical ? AnyLayout(VStackLayout(spacing: 2)) : AnyLayout(HStackLayout(spacing: 2))
    }

    private var springAnimation: Animation {
        DSMotionToken.snappy.animation(reduceMotion: reduceMotion)
    }

    private func update(_ change: (inout DSPenSelection) -> Void) {
        withAnimation(springAnimation) {
            change(&selection)
        }
        remember(selection)
    }

    private func remember(_ value: DSPenSelection) {
        switch value.color {
        case .ink: lastInk = value.color
        case .highlight: lastHighlight = value.color
        case .custom:
            if value.tool == .highlighter { lastHighlight = value.color } else if value.tool?.usesInk == true { lastInk = value.color }
        }
    }

    public var body: some View {
        ZStack {
            if collapsed {
                expandButton
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
            } else {
                tray
                    .transition(.scale(scale: 0.92).combined(with: .opacity))
            }
        }
        .animation(springAnimation, value: collapsed)
        .sensoryFeedback(.selection, trigger: selection)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(DSStrings.tr("Перо", "Pen", language))
    }

    // MARK: Tray

    private var tray: some View {
        GlassEffectContainer(spacing: DSSpace.s2) {
            stack {
                toolsRow
                if compact {
                    separator
                    moreButton
                } else {
                    inlineControls
                }
                if isCollapsed != nil {
                    collapseButton
                }
            }
            .padding(vertical ? .vertical : .horizontal, DSSpace.s2)
            .padding(vertical ? .horizontal : .vertical, 2)
            .dsGlass(cornerRadius: 22)
        }
    }

    /// Tools standing in the tray; the bottom of each nib is clipped by the tray edge.
    private var toolsRow: some View {
        let layout = vertical ? AnyLayout(VStackLayout(spacing: 0)) : AnyLayout(HStackLayout(spacing: 0))
        return layout {
            if showsTextMode {
                textSlot
            }
            ForEach(tools, id: \.self) { tool in
                toolSlot(tool)
            }
        }
        .clipShape(Rectangle())
    }

    private var slotWidth: CGFloat { compact ? 44 : 40 }
    private let slotDepth: CGFloat = 56

    private func slotFrame<V: View>(_ content: V) -> some View {
        content
            .frame(width: vertical ? slotDepth : slotWidth, height: vertical ? slotWidth : slotDepth)
    }

    private var textSlot: some View {
        let isOn = selection.tool == nil
        return Button {
            update { $0 = DSPenSelection.selecting(nil, from: $0, lastInkColor: lastInk, lastHighlightColor: lastHighlight) }
        } label: {
            slotFrame(
                Image(systemName: "character.cursor.ibeam")
                    .font(.system(size: 19, weight: .medium))
                    .foregroundStyle(isOn ? Color.dsPrimary : Color.dsSecondary)
                    .offset(x: vertical ? (isOn ? -2 : 6) : 0, y: vertical ? 0 : (isOn ? -2 : 6))
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.92))
        .accessibilityLabel(DSStrings.tr("Текст", "Text", language))
        .accessibilityIdentifier("tool.text")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private func nibColor(_ tool: DSPenTool) -> Color {
        if selection.tool == tool { return selection.color.color }
        return tool == .highlighter ? lastHighlight.color : lastInk.color
    }

    private func toolSlot(_ tool: DSPenTool) -> some View {
        let isOn = selection.tool == tool
        // Sunk 18 pt into the tray edge; the selected tool rises by 10 pt.
        let sink: CGFloat = isOn ? 8 : 18
        return Button {
            update { $0 = DSPenSelection.selecting(tool, from: $0, lastInkColor: lastInk, lastHighlightColor: lastHighlight) }
        } label: {
            slotFrame(
                ZStack(alignment: vertical ? .trailing : .bottom) {
                    Color.clear
                    DSPenNib(tool: tool, color: nibColor(tool))
                        .shadow(color: Color.black.opacity(isOn ? 0.18 : 0), radius: 3, x: 0, y: 2)
                        .rotationEffect(.degrees(vertical ? -90 : 0))
                        .frame(width: vertical ? 52 : 20, height: vertical ? 20 : 52)
                        .offset(x: vertical ? sink : 0, y: vertical ? 0 : sink)
                }
                .overlay(alignment: vertical ? .leading : .top) {
                    if tool == .eraser, isOn {
                        Text(selection.eraserMode.title(language))
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color.dsCanvas)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Capsule().fill(Color.dsPrimary))
                            .fixedSize()
                            .padding(2)
                            .transition(.opacity)
                    }
                }
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.95))
        .accessibilityLabel(
            tool == .eraser
                ? "\(tool.title(language)): \(selection.eraserMode.title(language))"
                : tool.title(language)
        )
        .accessibilityIdentifier("tool.\(tool.rawValue)")
        .accessibilityHint(tool == .eraser && isOn ? DSStrings.tr("Нажмите ещё раз, чтобы сменить режим", "Tap again to switch mode", language) : "")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    // MARK: Controls

    /// Colours, widths, finger drawing and undo / redo inside the tray (regular mode).
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
                    Circle()
                        .fill(selection.color.color)
                        .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.15), lineWidth: 0.5))
                        .frame(width: 18, height: 18)
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
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 2) { swatches }
                }
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
        .frame(minWidth: 280, maxWidth: 360)
    }

    private var separator: some View {
        Rectangle()
            .fill(Color.dsSeparator)
            .frame(width: vertical ? 22 : 1, height: vertical ? 1 : 22)
            .padding(vertical ? .vertical : .horizontal, DSSpace.s1)
            .accessibilityHidden(true)
    }

    @ViewBuilder private var swatches: some View {
        if selection.tool == .highlighter {
            ForEach(DSHighlightToken.allCases, id: \.self) { token in
                swatch(.highlight(token), label: DSStrings.colorName(token.rawValue, language), id: "color.\(token.rawValue)")
            }
        } else {
            ForEach(DSInkToken.allCases, id: \.self) { token in
                swatch(.ink(token), label: DSStrings.colorName(token.rawValue, language), id: "color.\(token.rawValue)")
            }
        }
        ForEach(Array(recentColors.enumerated()), id: \.element) { index, hex in
            swatch(.custom(hex), label: DSStrings.tr("Недавний цвет", "Recent colour", language), id: "color.recent.\(index)")
        }
        addColorButton
    }

    private func isSelected(_ color: DSPenColor) -> Bool {
        if let a = selection.color.hex, let b = color.hex { return a == b }
        return selection.color == color
    }

    private func swatch(_ color: DSPenColor, label: String, id: String) -> some View {
        let isOn = isSelected(color)
        return Button {
            update { $0.color = color }
        } label: {
            ZStack {
                Circle()
                    .fill(color.color)
                    .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.15), lineWidth: 0.5))
                    .frame(width: isOn ? 18 : 22, height: isOn ? 18 : 22)
                if isOn {
                    Circle()
                        .strokeBorder(color.color, lineWidth: 2)
                        .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.18), lineWidth: 0.5))
                        .frame(width: 26, height: 26)
                        .transition(.scale(scale: 0.8).combined(with: .opacity))
                }
            }
            .frame(width: 30, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.88))
        .accessibilityLabel(label)
        .accessibilityIdentifier(id)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    /// «+» — the system colour picker; the result becomes a custom `#RRGGBB` colour.
    private var addColorButton: some View {
        Button {
            showsPicker = true
        } label: {
            Circle()
                .strokeBorder(Color.dsTertiary, style: StrokeStyle(lineWidth: 1.2, dash: [2.5, 2.5]))
                .overlay(
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.dsSecondary)
                )
                .frame(width: 22, height: 22)
                .frame(width: 30, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.88))
        .accessibilityLabel(DSStrings.tr("Свой цвет", "Custom colour", language))
        .accessibilityIdentifier("color.custom")
        .sheet(isPresented: $showsPicker) {
            DSSystemColorPicker(initial: selection.color.color) { hex in
                showsPicker = false
                guard let hex else { return }
                DSRecentPenColors.push(hex, family: family)
                recentVersion += 1
                update { $0.color = .custom(hex) }
            }
            .presentationDetents([.medium, .large])
        }
    }

    private func widthButton(_ width: DSPenWidth) -> some View {
        let isOn = selection.width == width
        let highlighter = selection.tool == .highlighter
        return Button {
            update { $0.width = width }
        } label: {
            ZStack {
                if isOn {
                    Circle()
                        .fill(Color.dsPrimary.opacity(0.08))
                        .frame(width: 28, height: 28)
                }
                if highlighter {
                    // Real relative thickness as a short bar, with an edge so pale highlights stay visible.
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(selection.color.color)
                        .overlay(
                            RoundedRectangle(cornerRadius: 2, style: .continuous)
                                .strokeBorder(Color.dsPrimary.opacity(0.25), lineWidth: 0.75)
                        )
                        .frame(width: 14, height: [6.0, 10.0, 14.0][max(0, min(2, width.step - 1))])
                } else {
                    Circle()
                        .fill(selection.color.color)
                        .overlay(Circle().strokeBorder(Color.dsPrimary.opacity(0.12), lineWidth: 0.5))
                        .frame(width: width.dotDiameter, height: width.dotDiameter)
                }
            }
            .frame(width: 30, height: 44)
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

    private var collapseButton: some View {
        Button {
            isCollapsed?.wrappedValue = true
        } label: {
            Image(systemName: vertical ? "chevron.left" : "chevron.down")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.dsSecondary)
                .frame(width: 28, height: 28)
                .background(Circle().fill(Color.dsPrimary.opacity(0.06)))
                .frame(width: 36, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.9))
        .accessibilityLabel(DSStrings.tr("Свернуть палитру", "Collapse palette", language))
        .accessibilityIdentifier("tool.collapse")
    }

    /// Collapsed state: one round glass button with the current tool.
    private var expandButton: some View {
        Button {
            isCollapsed?.wrappedValue = false
        } label: {
            ZStack(alignment: .bottom) {
                Color.clear
                if let tool = selection.tool {
                    DSPenNib(tool: tool, color: nibColor(tool))
                        .offset(y: 16)
                } else {
                    Image(systemName: "character.cursor.ibeam")
                        .font(.system(size: 19, weight: .medium))
                        .foregroundStyle(Color.dsPrimary)
                        .frame(maxHeight: .infinity)
                }
            }
            .frame(width: 52, height: 52)
            .clipShape(Circle())
            .dsGlass(cornerRadius: 26, interactive: true)
            .contentShape(Circle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.92))
        .accessibilityLabel(DSStrings.tr("Развернуть палитру", "Expand palette", language))
        .accessibilityIdentifier("tool.expand")
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

#Preview("Pen toolbar — light") {
    PenToolbarPreview()
}

#Preview("Pen toolbar — dark") {
    PenToolbarPreview()
        .preferredColorScheme(.dark)
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

private struct PenToolbarPreview: View {
    @State private var selection = DSPenSelection(color: .ink(.blue))
    @State private var collapsed = false
    @State private var vertical = DSPenSelection(tool: .highlighter, color: .highlight(.yellow))

    var body: some View {
        ZStack {
            Color.dsCanvas.ignoresSafeArea()
            VStack(spacing: DSSpace.s8) {
                DSPenToolbar(
                    selection: $selection,
                    canUndo: true,
                    onUndo: {},
                    onRedo: {},
                    isCollapsed: $collapsed,
                    recentColors: ["#2F6F6A", "#B5651D"]
                )
                DSPenToolbar(selection: $vertical, axis: .vertical, tools: DSPenTool.allCases)
            }
        }
    }
}
