#if canImport(UIKit)
import DSEditorModel
import UIKit
import UniformTypeIdentifiers

/// Routes the system undo (⌘Z, shake, three-finger swipe, toolbar) to the document's unified
/// undo of text and strokes. UITextView's own registrations are ignored.
@MainActor
final class DocumentUndoManager: UndoManager {
    weak var document: EditorDocument?
    var afterChange: (() -> Void)?

    override var canUndo: Bool { document?.canUndo ?? false }
    override var canRedo: Bool { document?.canRedo ?? false }
    override func undo() {
        document?.undo()
        afterChange?()
    }
    override func redo() {
        document?.redo()
        afterChange?()
    }
    override var undoActionName: String { "" }
    override var redoActionName: String { "" }
    override func registerUndo(withTarget target: Any, selector: Selector, object anObject: Any?) {}
    override func prepare(withInvocationTarget target: Any) -> Any { self }
    override func beginUndoGrouping() {}
    override func endUndoGrouping() {}
    override var groupingLevel: Int { 0 }
    override func removeAllActions() {}
    override func removeAllActions(withTarget target: Any) {}
    override var isUndoRegistrationEnabled: Bool { false }
}

/// Text view of the editor: TextKit 2, key commands, layout hook for the pen layer.
@MainActor
final class EditorTextView: UITextView {
    var onLayout: (() -> Void)?
    var keyHandler: ((EditorAction) -> Void)?
    let documentUndo = DocumentUndoManager()

    override var undoManager: UndoManager? { documentUndo }

    override func layoutSubviews() {
        super.layoutSubviews()
        onLayout?()
    }

    /// Whether a point holds something a single tap acts on (a note link): the system's own taps
    /// (caret placement, which also brought up the keyboard and won over the link tap) do not
    /// begin there. Long press and selection still work for editing the link's text.
    var tapTargetAt: ((CGPoint) -> Bool)?
    /// Whether UIKit may scroll by itself (`scrollRectToVisible`): only while a finger is on the
    /// text (edge autoscroll when dragging a selection). Otherwise UIKit scrolled to its own caret
    /// rect, which is wrong in an empty paragraph — a fresh note's title went off screen on focus,
    /// with the keyboard and while typing (build 18); the editor scrolls the caret's line into view
    /// itself (`EditorView.scrollCaretIntoView`).
    var allowsSystemScroll: (() -> Bool)?

    override func scrollRectToVisible(_ rect: CGRect, animated: Bool) {
        guard allowsSystemScroll?() ?? true else { return }
        super.scrollRectToVisible(rect, animated: animated)
    }

    /// Every change of the scroll position, including those made through `bounds` (tests).
    var onScrollPositionChange: ((_ from: CGFloat, _ to: CGFloat) -> Void)?

    override var bounds: CGRect {
        didSet {
            if oldValue.origin.y != bounds.origin.y { onScrollPositionChange?(oldValue.origin.y, bounds.origin.y) }
        }
    }

    /// Pasted images go to the host (`EditorView.onImagesReceived`); nil: plain text paste only.
    var imagePaste: (([NSItemProvider]) -> Void)?

    /// The pasteboard holds images and nothing more useful as text (a copied photo; a web image
    /// with its address).
    private var pasteboardIsImages: Bool {
        let board = UIPasteboard.general
        guard board.hasImages else { return false }
        guard board.hasStrings else { return true }
        return board.hasURLs && !(board.strings ?? []).contains { URL(string: $0)?.scheme == nil }
    }

    /// Read-only editor (`EditorView.isReadOnly`, also `isEditable == false`): selecting and copying
    /// stay; pasting, cutting, deleting, formatting and the editor's key commands are off.
    var isReadOnly = false

    private static let editingActions: Set<Selector> = [
        #selector(UIResponderStandardEditActions.paste(_:)), #selector(UIResponderStandardEditActions.cut(_:)),
        #selector(UIResponderStandardEditActions.delete(_:)), #selector(EditorTextView.pasteWithoutFormatting(_:)),
        #selector(UIResponderStandardEditActions.pasteAndMatchStyle(_:)),
        #selector(UIResponderStandardEditActions.toggleBoldface(_:)),
        #selector(UIResponderStandardEditActions.toggleItalics(_:)),
        #selector(UIResponderStandardEditActions.toggleUnderline(_:)),
        #selector(UIResponder.captureTextFromCamera(_:)),
    ]

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if isReadOnly, Self.editingActions.contains(action) { return false }
        if action == #selector(paste(_:)), imagePaste != nil, UIPasteboard.general.hasImages { return true }
        if action == #selector(pasteWithoutFormatting(_:)) { return plainPaste != nil && UIPasteboard.general.hasStrings }
        return super.canPerformAction(action, withSender: sender)
    }

    /// Rich paste (HTML, RTF, Markdown); false leaves the plain text paste to UIKit.
    var richPaste: (() -> Bool)?
    /// «Вставить без форматирования» (⇧⌘V).
    var plainPaste: (() -> Void)?

    override func paste(_ sender: Any?) {
        guard !isReadOnly else { return }
        if let imagePaste, pasteboardIsImages {
            let providers = UIPasteboard.general.itemProviders.filter { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }
            if !providers.isEmpty {
                imagePaste(providers)
                return
            }
        }
        if richPaste?() == true { return }
        super.paste(sender)
    }

    /// «Вставить без форматирования» from the keyboard (⇧⌘V).
    @objc func pasteWithoutFormatting(_ sender: Any?) {
        guard !isReadOnly else { return }
        plainPaste?()
    }
    /// The editor's own tap recognizer (links, task boxes, date chips). The text view's own single
    /// taps wait for it to fail: it begins only on a tap target and fails at once elsewhere, so
    /// caret placement is not delayed, and on a target it always wins (date chip taps were taken
    /// by the caret tap on iPad, build 16).
    weak var editorTap: UIGestureRecognizer? {
        didSet { gestureRecognizers?.forEach(yieldToEditorTap) }
    }

    override func addGestureRecognizer(_ g: UIGestureRecognizer) {
        super.addGestureRecognizer(g)
        yieldToEditorTap(g)
    }

    private func yieldToEditorTap(_ g: UIGestureRecognizer) {
        guard let editorTap, g !== editorTap, let tap = g as? UITapGestureRecognizer, tap.numberOfTapsRequired == 1 else { return }
        tap.require(toFail: editorTap)
    }

    override func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
        if g !== editorTap, let tap = g as? UITapGestureRecognizer, tap.numberOfTapsRequired == 1,
           tapTargetAt?(g.location(in: self)) == true {
            EditorDiagnostics.log("system tap \(NSStringFromClass(type(of: g))) refused on a tap target")
            return false
        }
        return super.gestureRecognizerShouldBegin(g)
    }

    // MARK: - Dictation

    /// Dictation's "…" placeholder is not put into the text: UITextView inserts it as an
    /// attachment character that the editor took for a block insertion, which moved the caret to
    /// the next paragraph and dropped the result (iPhone, build 14). The result arrives as plain
    /// text input at the caret instead.
    private final class DictationPlaceholder: NSObject {
        let range: NSRange
        init(range: NSRange) { self.range = range }
    }

    override var insertDictationResultPlaceholder: Any {
        DictationPlaceholder(range: selectedRange)
    }

    override func frame(forDictationResultPlaceholder placeholder: Any) -> CGRect {
        guard let range = selectedTextRange else { return .zero }
        return caretRect(for: range.end)
    }

    override func removeDictationResultPlaceholder(_ placeholder: Any, willInsertResult: Bool) {}

    /// Touches that land on TextKit's internal drawing views (layout fragment and canvas views)
    /// are addressed to the text view itself. TextKit 2 recycles those views on any relayout or
    /// scroll (the keyboard appearing, a paragraph re-rendered); when the touched view left the
    /// window while a system recognizer still held the touch, UIKit's gesture environment crashed
    /// (`_delayTouchesForEvent`, nil insert). The text view never leaves, and it is where all
    /// text interactions are attached anyway.
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard let hit = super.hitTest(point, with: event) else { return nil }
        if hit === self { return hit }
        if Self.isTextKitInternal(hit) { return self }
        // Attachment views are recycled by TextKit on relayout too: only views that really handle
        // touches themselves (controls, text fields, their own recognizers) keep them.
        return Self.handlesTouches(hit, below: self) ? hit : self
    }

    /// Whether `view`, or one of its ancestors up to `root`, handles touches on its own.
    static func handlesTouches(_ view: UIView, below root: UIView) -> Bool {
        var v: UIView? = view
        while let current = v, current !== root {
            if current is UIControl || current is UITextInput || !(current.gestureRecognizers ?? []).isEmpty {
                return true
            }
            v = current.superview
        }
        return false
    }

    static func isTextKitInternal(_ view: UIView) -> Bool {
        let name = NSStringFromClass(type(of: view))
        return name.hasPrefix("_UITextLayout") || name.hasPrefix("_UITextCanvas") || name.contains("TextLayoutFragmentView")
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        EditorDiagnostics.log("text view touchesBegan \(touches.map { t in "\(t.type.rawValue)@\(t.view.map { NSStringFromClass(type(of: $0)) } ?? "nil")" })")
        super.touchesBegan(touches, with: event)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        EditorDiagnostics.log("text view touchesEnded")
        super.touchesEnded(touches, with: event)
    }

    override var keyCommands: [UIKeyCommand]? {
        guard !isReadOnly else { return [] }
        func cmd(_ title: String, _ input: String, _ mods: UIKeyModifierFlags, _ action: EditorAction) -> UIKeyCommand {
            let c = UIKeyCommand(title: title, action: #selector(handleKey(_:)), input: input, modifierFlags: mods,
                                 propertyList: action.rawValue)
            c.wantsPriorityOverSystemBehavior = true
            return c
        }
        return [
            cmd("Жирный", "b", .command, .bold),
            cmd("Курсив", "i", .command, .italic),
            cmd("Подчёркнутый", "u", .command, .underline),
            cmd("Зачёркнутый", "x", [.command, .shift], .strike),
            cmd("Код", "e", .command, .code),
            cmd("Выделение маркером", "h", [.command, .shift], .highlight),
            cmd("Заголовок 1", "1", [.command, .alternate], .heading1),
            cmd("Заголовок 2", "2", [.command, .alternate], .heading2),
            cmd("Заголовок 3", "3", [.command, .alternate], .heading3),
            cmd("Обычный текст", "0", [.command, .alternate], .paragraph),
            cmd("Маркированный список", "8", [.command, .shift], .bulletList),
            cmd("Нумерованный список", "7", [.command, .shift], .orderedList),
            cmd("Задача", "9", [.command, .shift], .taskList),
            cmd("Выполнить задачу", "\r", .command, .toggleTask),
            cmd("Цитата", ".", [.command, .shift], .quote),
            cmd("Сдвинуть вправо", "\t", [], .indent),
            cmd("Сдвинуть влево", "\t", .shift, .outdent),
            cmd("Ссылка", "k", .command, .link),
            {
                let c = UIKeyCommand(title: "Вставить без форматирования", action: #selector(pasteWithoutFormatting(_:)),
                                     input: "v", modifierFlags: [.command, .shift])
                c.wantsPriorityOverSystemBehavior = true
                return c
            }(),
        ]
    }

    @objc func handleKey(_ sender: UIKeyCommand) {
        guard !isReadOnly else { return }
        guard let raw = sender.propertyList as? String, let action = EditorAction(rawValue: raw) else { return }
        keyHandler?(action)
    }
}

/// Formatting and structure commands (keyboard shortcuts, toolbars).
public enum EditorAction: String, CaseIterable, Sendable {
    case bold, italic, underline, strike, code, highlight
    case heading1, heading2, heading3, paragraph, bulletList, orderedList, taskList, quote, toggleTask
    case indent, outdent, link
}
#endif
