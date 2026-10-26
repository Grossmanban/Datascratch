import DSEditorModel
import Foundation
import Testing

/// Repair of duplicate titles (`document-model.md`): deterministic, idempotent, creates nothing new.
@MainActor
@Suite struct TitleRepairTests {
    @Test func keepsTheFirstNonEmptyTitleAndDropsEmptyOnes() {
        let agent = BlockNode.title("Стратегия продукта")
        let doc = InMemoryEditorDocument(blocks: [.title(""), agent, .paragraph("текст")])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(doc.blocks.map(\.type) == [NodeType.title, NodeType.paragraph])
        #expect(doc.blocks[0].id == agent.id, "the agent's title block is kept")
        #expect(doc.flatText(of: agent.id) == "Стратегия продукта")
        #expect(!EditorCommands(document: doc).repairTitles(), "a second repair changes nothing")
    }

    @Test func extraNonEmptyTitlesBecomeParagraphsAfterTheKeptOne() {
        let first = BlockNode.title("Первый")
        let body = BlockNode.paragraph("тело")
        let second = BlockNode.title("Второй")
        let doc = InMemoryEditorDocument(blocks: [first, body, second])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(doc.blocks.map(\.id) == [first.id, second.id, body.id], "the extra title moves right after the kept one")
        #expect(doc.blocks[1].type == NodeType.paragraph)
        #expect(doc.flatText(of: second.id) == "Второй", "same block id and text")
    }

    @Test func allEmptyTitlesKeepTheFirst() {
        let first = BlockNode.title("")
        let doc = InMemoryEditorDocument(blocks: [first, .title(""), .paragraph("")])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(doc.blocks.map(\.id).first == first.id)
        #expect(doc.blocks.filter { $0.type == NodeType.title }.count == 1)
    }

    @Test func oneTitleOrNoneIsLeftAlone() {
        let one = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("x")])
        #expect(!EditorCommands(document: one).repairTitles())
        let none = InMemoryEditorDocument(blocks: [])
        #expect(!EditorCommands(document: none).repairTitles(), "an empty document gets no title")
        #expect(none.blocks.isEmpty)
    }
}
