import Foundation

/// Sample content for the demo app and tests.
public enum SampleDocument {
    @MainActor
    public static func make() -> InMemoryEditorDocument {
        let bold = MarkSet([MarkName.bold: MarkSet.plain])
        let italic = MarkSet([MarkName.italic: MarkSet.plain])
        let highlight = MarkSet([MarkName.highlight: .object(["color": "highlight.yellow"])])
        let blocks: [BlockNode] = [
            .title("Живой штрих"),
            .paragraph([
                .text("Это демонстрация пера в тексте. Возьмите Apple Pencil и ", .empty),
                .text("подчеркните", bold),
                .text(" любую фразу, обведите слово или напишите заметку на полях. Потом поверните iPad, смените ширину колонки или ", .empty),
                .text("отредактируйте текст", italic),
                .text(" — пометки останутся на своих словах.", .empty),
            ]),
            .heading("Что проверить", level: 2),
            .taskList([
                .taskItem("Подчеркнуть фразу, которая переносится на две строки", scheduled: "2026-10-26"),
                .taskItem("Вставить слово перед подчёркнутым — штрих сдвигается вместе с текстом"),
                .taskItem("Удалить помеченное слово и отменить удаление (D-35)", deadline: "2026-10-31"),
                .taskItem("Сжать Pencil Pro — откроется палитра инструментов", state: "done"),
            ]),
            .heading("Инструменты", level: 2),
            .bulletList(["Ручка, карандаш, маркер и выделитель", "Ластик по штриху и по пикселю", "Лассо: текст и штрихи вместе"]),
            .orderedList(["Нарисуйте зигзаг по слову и задержите перо — слово удалится", "Линия под словом с задержкой — подчёркивание", "Линия через слово с задержкой — зачёркивание"]),
            .blockquote("Штрих привязан к словам, а не к экрану. При переносе фразы на две строки он разрезается на части по строкам."),
            .callout("Заметки на полях привязаны к абзацу и едут вместе с ним.", tone: "info", emoji: "💡"),
            .paragraph([
                .text("Ссылки на другие заметки: ", .empty),
                .atom(.noteLink(noteId: "0192f3c4-0000-7000-8000-000000000001", label: "Идеи"), .empty),
                .text(", теги: ", .empty),
                .atom(.tag("перо/прототип"), .empty),
                .text(" и ", .empty),
                .text("выделение маркером", highlight),
                .text(".", .empty),
            ]),
            .code("func greet(_ name: String) -> String {\n    // Code blocks are highlighted\n    return \"Hello, \\(name)!\"\n}", language: "swift"),
            .math("E = mc^2 \\quad \\int_0^1 x^2\\,dx = \\frac{1}{3}"),
            .mermaid("graph LR\n  A[Перо] --> B[Якорь]\n  B --> C[Перекладка]\n  C --> A"),
            .rule("dots"),
            .heading("Блок рисования", level: 3),
            .drawing(height: 220),
            .paragraph("The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Съешь же ещё этих мягких французских булок, да выпей чаю."),
            .paragraph(),
        ]
        return InMemoryEditorDocument(blocks: blocks)
    }

    /// A long note for performance checks (`11-nfr.md`: 10 000 words open within 300 ms).
    @MainActor
    public static func large(words: Int = 10_000) -> InMemoryEditorDocument {
        let vocabulary = ["перо", "текст", "штрих", "якорь", "строка", "заметка", "abc", "living", "stroke", "layout",
                          "glyph", "редактор", "бумага", "чернила", "лист", "слово", "фраза", "абзац", "note", "ink"]
        var blocks: [BlockNode] = [.title("Большая заметка")]
        var count = 0
        var paragraphIndex = 0
        while count < words {
            let n = min(80, words - count)
            let sentence = (0..<n).map { vocabulary[($0 * 7 + paragraphIndex * 3) % vocabulary.count] }.joined(separator: " ")
            if paragraphIndex % 12 == 0 {
                blocks.append(.heading("Раздел \(paragraphIndex / 12 + 1)", level: 2))
            }
            blocks.append(.paragraph(sentence + "."))
            count += n
            paragraphIndex += 1
        }
        return InMemoryEditorDocument(blocks: blocks)
    }
}
