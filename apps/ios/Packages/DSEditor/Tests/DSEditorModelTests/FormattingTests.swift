import DSEditorModel
import Foundation
import Testing

@MainActor
@Suite struct FormattingTests {
    @Test func blockStyleOfParagraphs() {
        let doc = InMemoryEditorDocument(blocks: [
            .title("T"), .heading("H", level: 2), .paragraph("p"), .bulletList(["b"]), .orderedList(["o"]),
            .taskList([.taskItem("t")]), BlockNode(type: NodeType.blockquote, children: [.paragraph("q")]), .math("x"),
        ])
        let styles = Projection.build(doc.blocks).paragraphs.map(BlockStyle.init)
        #expect(styles == [.title, .heading2, .paragraph, .bulletList, .orderedList, .taskList, .quote, .other])
    }

    @Test func slashTriggerAtParagraphStartOrAfterSpace() {
        #expect(SlashCommands.trigger(in: "/")?.query == "")
        #expect(SlashCommands.trigger(in: "/заг")?.query == "заг")
        #expect(SlashCommands.trigger(in: "Текст /h2")?.slashOffset == 6)
        #expect(SlashCommands.trigger(in: "a/b") == nil, "a slash inside a word is not a menu (URLs, dates)")
        #expect(SlashCommands.trigger(in: "/two words") == nil)
    }

    @Test func slashFilterMatchesTitlesAndKeywords() {
        #expect(SlashCommands.matching("").count == SlashCommands.all.count)
        #expect(SlashCommands.matching("заг").map(\.id) == ["heading1", "heading2", "heading3"])
        #expect(SlashCommands.matching("h2").map(\.id) == ["heading2"])
        #expect(SlashCommands.matching("todo").map(\.id) == ["taskList"])
        #expect(SlashCommands.matching("ТАБЛ").map(\.id) == ["table"])
    }
}
