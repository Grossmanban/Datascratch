#if canImport(UIKit)
import DSInk
import Foundation

/// What the pen does.
public enum PenMode: String, CaseIterable, Sendable {
    /// Pencil types with Scribble and selects text; no ink.
    case text
    case pen, pencil, marker, highlighter
    case strokeEraser, pixelEraser
    case lasso

    public var inkTool: InkTool? {
        switch self {
        case .pen: .pen
        case .pencil: .pencil
        case .marker: .marker
        case .highlighter: .highlighter
        default: nil
        }
    }

    public var isEraser: Bool { self == .strokeEraser || self == .pixelEraser }
    public var capturesPen: Bool { self != .text }

    public var title: String {
        switch self {
        case .text: "Текст"
        case .pen: "Ручка"
        case .pencil: "Карандаш"
        case .marker: "Маркер"
        case .highlighter: "Выделитель"
        case .strokeEraser: "Ластик по штриху"
        case .pixelEraser: "Ластик"
        case .lasso: "Лассо"
        }
    }

    public var symbolName: String {
        switch self {
        case .text: "character.cursor.ibeam"
        case .pen: "pencil.tip"
        case .pencil: "pencil"
        case .marker: "paintbrush.pointed"
        case .highlighter: "highlighter"
        case .strokeEraser: "eraser.line.dashed"
        case .pixelEraser: "eraser"
        case .lasso: "lasso"
        }
    }
}

/// Paint settings of one ink tool.
public struct InkPaint: Equatable, Sendable {
    public var color: String
    /// Base width in pt at pressure 1 and 17 pt text (`strokes.md` §2).
    public var width: Double
    public var opacity: Double

    public init(color: String, width: Double, opacity: Double) {
        self.color = color
        self.width = width
        self.opacity = opacity
    }

    public static func defaults(for tool: InkTool) -> InkPaint {
        switch tool {
        case .pen: InkPaint(color: "ink.blue", width: 2.2, opacity: 1)
        case .pencil: InkPaint(color: "ink.black", width: 1.6, opacity: 0.85)
        case .marker: InkPaint(color: "ink.red", width: 3.5, opacity: 0.95)
        case .highlighter: InkPaint(color: "highlight.yellow", width: 16, opacity: 1)
        }
    }
}

/// Current pen tool and per-tool paint. Shared by the editor and its tool palette.
@MainActor
public final class InkToolState {
    public var mode: PenMode = .pen { didSet { if mode != oldValue { previousMode = oldValue; onChange?() } } }
    public private(set) var previousMode: PenMode = .text
    public var paints: [InkTool: InkPaint] = Dictionary(uniqueKeysWithValues: InkTool.allCases.map { ($0, InkPaint.defaults(for: $0)) }) {
        didSet { onChange?() }
    }
    /// D-06: draw with a finger (iPhone option). Off by default: fingers scroll and select.
    public var allowsFingerDrawing = false { didSet { onChange?() } }
    /// Pen gestures (zigzag delete, underline, strike) fire on "draw and hold".
    public var gesturesEnabled = true
    public var onChange: (() -> Void)?

    public init() {}

    public var currentPaint: InkPaint? { mode.inkTool.map { paints[$0] ?? .defaults(for: $0) } }

    public func setColor(_ token: String) {
        guard let tool = mode.inkTool else { return }
        paints[tool, default: .defaults(for: tool)].color = token
    }

    public func setWidth(_ width: Double) {
        guard let tool = mode.inkTool else { return }
        paints[tool, default: .defaults(for: tool)].width = width
    }

    /// Double-tap on the Pencil: toggle eraser / previous tool.
    public func toggleEraser() {
        mode = mode.isEraser ? (previousMode.isEraser ? .pen : previousMode) : .pixelEraser
    }
}
#endif
