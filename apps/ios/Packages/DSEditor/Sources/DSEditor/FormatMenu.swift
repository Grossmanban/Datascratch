#if canImport(UIKit)
import DSEditorModel
import UIKit

/// The "/" block menu as the host shows it (`EditorView.onSlashMenu`).
public struct SlashMenuState: Equatable {
    /// Text typed after "/".
    public var query: String
    /// Matching entries, in menu order (group headings in `SlashCommand.group`).
    public var items: [SlashCommand]
    /// Flattened range of "/query" (removed when an entry is applied).
    public var range: Range<Int>
    /// Caret rectangle in the editor's coordinates (place the menu below it).
    public var caretRect: CGRect
}

extension EditorView {
    /// «Формат» and «Стиль» for the text edit menu: selection → format without the bar.
    func formatMenu() -> [UIMenuElement] {
        let state = formatState
        func item(_ title: String, _ image: String, _ action: EditorAction, on: Bool) -> UIAction {
            UIAction(title: title, image: UIImage(systemName: image), state: on ? .on : .off) { [weak self] _ in
                self?.perform(action)
            }
        }
        var format: [UIMenuElement] = [
            item("Жирный", "bold", .bold, on: state.has(MarkName.bold)),
            item("Курсив", "italic", .italic, on: state.has(MarkName.italic)),
            item("Подчёркнутый", "underline", .underline, on: state.has(MarkName.underline)),
            item("Зачёркнутый", "strikethrough", .strike, on: state.has(MarkName.strike)),
            item("Код", "chevron.left.forwardslash.chevron.right", .code, on: state.has(MarkName.code)),
            item("Выделение", "highlighter", .highlight, on: state.has(MarkName.highlight)),
        ]
        if state.hasSelection {
            format.append(item(state.has(MarkName.link) ? "Убрать ссылку" : "Ссылка", "link", .link, on: state.has(MarkName.link)))
        }
        let style = UIMenu(title: "Стиль", image: UIImage(systemName: "textformat.size"), children: [
            item("Текст", "text.alignleft", .paragraph, on: state.block == .paragraph),
            item("Заголовок 1", "textformat.size.larger", .heading1, on: state.block == .heading1),
            item("Заголовок 2", "textformat.size", .heading2, on: state.block == .heading2),
            item("Заголовок 3", "textformat.size.smaller", .heading3, on: state.block == .heading3),
            item("Список", "list.bullet", .bulletList, on: state.block == .bulletList),
            item("Нумерованный список", "list.number", .orderedList, on: state.block == .orderedList),
            item("Задача", "checkmark.circle", .taskList, on: state.block == .taskList),
            item("Цитата", "text.quote", .quote, on: state.block == .quote),
        ])
        return [UIMenu(title: "Формат", image: UIImage(systemName: "bold.italic.underline"), children: format), style]
    }
}
#endif
