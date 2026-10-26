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

    @Test func extraNonEmptyTitlesAreLeftAlone() {
        let doc = InMemoryEditorDocument(blocks: [.title("Первый"), .paragraph("тело"), .title("Второй")])
        let ids = doc.blocks.map(\.id)
        #expect(!EditorCommands(document: doc).repairTitles(), "only empty titles are deleted")
        #expect(doc.blocks.map(\.id) == ids)
    }

    static let older = "0192f3c4-0000-7000-8000-000000000001"
    static let newer = "01a179ea-5a5a-7e49-ab53-d3acec118201"

    /// The damage of the empty-document race: an empty title (newer id) before a paragraph (older
    /// id) holding the real title. The text goes back into the title, the paragraph goes.
    @Test func demotedTitleIsRestored() {
        let bold = MarkSet([MarkName.bold: MarkSet.plain])
        let doc = InMemoryEditorDocument(blocks: [
            BlockNode(id: Self.newer, type: NodeType.title, inline: []),
            BlockNode(id: Self.older, type: NodeType.paragraph, inline: [.text("Стратегия ", .empty), .text("продукта", bold)]),
            .paragraph("тело"),
        ])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(doc.blocks.count == 2)
        #expect(doc.blocks[0].id == Self.newer && doc.blocks[0].type == NodeType.title)
        #expect(doc.flatText(of: Self.newer) == "Стратегия продукта")
        #expect(doc.inline(of: Self.newer, range: 10..<18).first?.marks == bold, "marks move with the text")
        #expect(doc.block(Self.older) == nil, "the demoted paragraph is gone")
        #expect(!EditorCommands(document: doc).repairTitles(), "idempotent")
    }

    @Test func aNewerParagraphAfterAnEmptyTitleIsNotATitle() {
        let doc = InMemoryEditorDocument(blocks: [
            BlockNode(id: Self.older, type: NodeType.title, inline: []),
            BlockNode(id: Self.newer, type: NodeType.paragraph, inline: [.text("первая строка", .empty)]),
        ])
        #expect(!EditorCommands(document: doc).repairTitles(), "an ordinary first paragraph under an empty title stays")
        #expect(doc.blocks[1].type == NodeType.paragraph)
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
