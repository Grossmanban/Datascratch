import SwiftUI

/// Flat pen mode for editors that keep their own state (ios-editor `InkToolState`):
/// text (the Pencil writes with Scribble), drawing tools, two erasers, lasso.
public enum DSPenMode: String, CaseIterable, Sendable, Hashable {
    case text
    case pen
    case pencil
    case marker
    case highlighter
    case strokeEraser
    case pixelEraser
    case lasso

    /// Tool of `DSPenSelection` (`nil` = text).
    public var tool: DSPenTool? {
        switch self {
        case .text: nil
        case .pen: .pen
        case .pencil: .pencil
        case .marker: .marker
        case .highlighter: .highlighter
        case .strokeEraser, .pixelEraser: .eraser
        case .lasso: .lasso
        }
    }

    /// Eraser mode for the two eraser cases.
    public var eraserMode: DSEraserMode? {
        switch self {
        case .strokeEraser: .stroke
        case .pixelEraser: .pixel
        default: nil
        }
    }

    public init(tool: DSPenTool?, eraserMode: DSEraserMode) {
        switch tool {
        case nil: self = .text
        case .pen: self = .pen
        case .pencil: self = .pencil
        case .marker: self = .marker
        case .highlighter: self = .highlighter
        case .eraser: self = eraserMode == .stroke ? .strokeEraser : .pixelEraser
        case .lasso: self = .lasso
        }
    }
}

extension DSPenSelection {
    /// Tool + eraser mode as one value.
    public var mode: DSPenMode {
        get { DSPenMode(tool: tool, eraserMode: eraserMode) }
        set {
            tool = newValue.tool
            if let eraser = newValue.eraserMode { eraserMode = eraser }
        }
    }
}

extension DSPenWidth {
    /// Width in points for a tool whose medium width is `base`
    /// (the editor owns base widths, e.g. pen 2.4 pt, highlighter 16 pt).
    public func points(base: CGFloat) -> CGFloat {
        base * multiplier
    }
}

extension DSPenToolbar {
    /// Toolbar bound to plain values instead of a `DSPenSelection`.
    public init(
        mode: Binding<DSPenMode>,
        color: Binding<DSPenColor>,
        width: Binding<DSPenWidth>,
        drawWithFinger: Binding<Bool>,
        canUndo: Bool = false,
        canRedo: Bool = false,
        onUndo: (() -> Void)? = nil,
        onRedo: (() -> Void)? = nil,
        tools: [DSPenTool] = [.pen, .pencil, .marker, .highlighter, .eraser],
        showsTextMode: Bool = true,
        axis: Axis = .horizontal
    ) {
        let selection = Binding<DSPenSelection>(
            get: {
                var value = DSPenSelection(
                    color: color.wrappedValue,
                    width: width.wrappedValue,
                    drawWithFinger: drawWithFinger.wrappedValue
                )
                value.mode = mode.wrappedValue
                return value
            },
            set: { value in
                mode.wrappedValue = value.mode
                color.wrappedValue = value.color
                width.wrappedValue = value.width
                drawWithFinger.wrappedValue = value.drawWithFinger
            }
        )
        self.init(
            selection: selection,
            axis: axis,
            tools: tools,
            showsTextMode: showsTextMode,
            canUndo: canUndo,
            canRedo: canRedo,
            onUndo: onUndo,
            onRedo: onRedo
        )
    }
}
