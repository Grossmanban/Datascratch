#if canImport(UIKit)
import DSEditorModel
import UIKit

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

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        EditorDiagnostics.log("text view touchesBegan \(touches.map { "\($0.type.rawValue)@\(String(describing: type(of: $0.view as Any)))" })")
        super.touchesBegan(touches, with: event)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        EditorDiagnostics.log("text view touchesEnded")
        super.touchesEnded(touches, with: event)
    }

    override var keyCommands: [UIKeyCommand]? {
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
        ]
    }

    @objc func handleKey(_ sender: UIKeyCommand) {
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
