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

    static let agentTitleId = "0192f3c4-0000-7000-8000-000000000002"

    /// (i) [stray empty title, stray empty paragraph, agent title, …]: rule 1 drops the empty
    /// title, rule 4 the empty paragraph that is left before the title.
    @Test func strayTitleAndParagraphBeforeTheAgentTitleGo() {
        let doc = InMemoryEditorDocument(blocks: [
            BlockNode(id: Self.newer, type: NodeType.title, inline: []),
            BlockNode(id: "01a179ea-5a5a-7e49-ab53-d3acec118202", type: NodeType.paragraph, inline: []),
            BlockNode(id: Self.agentTitleId, type: NodeType.title, inline: [.text("План", .empty)]),
            .paragraph("тело"),
        ])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(doc.blocks.map(\.id).first == Self.agentTitleId)
        #expect(doc.blocks.count == 2)
        #expect(!EditorCommands(document: doc).repairTitles())
    }

    /// (ii) [stray empty title, stray empty paragraph, demoted agent title (older), …]: the empty
    /// paragraphs are skipped, the demoted text goes back into the title, both paragraphs go.
    @Test func demotedTitleBehindAnEmptyParagraphIsRestored() {
        let strayParagraph = "01a179ea-5a5a-7e49-ab53-d3acec118202"
        let doc = InMemoryEditorDocument(blocks: [
            BlockNode(id: Self.newer, type: NodeType.title, inline: []),
            BlockNode(id: strayParagraph, type: NodeType.paragraph, inline: []),
            BlockNode(id: Self.older, type: NodeType.paragraph, inline: [.text("Стратегия продукта", .empty)]),
            .paragraph("тело"),
        ])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(doc.flatText(of: Self.newer) == "Стратегия продукта")
        #expect(doc.block(strayParagraph) == nil && doc.block(Self.older) == nil)
        #expect(doc.blocks.count == 2)
        #expect(!EditorCommands(document: doc).repairTitles())
    }

    /// Note 01a17944…: [empty title, agent title, older paragraph]. Rule 1 runs first and resolves
    /// it; the paragraph is not promoted.
    @Test func ruleOneRunsBeforeRuleTwo() {
        let doc = InMemoryEditorDocument(blocks: [
            BlockNode(id: Self.newer, type: NodeType.title, inline: []),
            BlockNode(id: Self.agentTitleId, type: NodeType.title, inline: [.text("Агент", .empty)]),
            BlockNode(id: Self.older, type: NodeType.paragraph, inline: [.text("2026-10-26 · план", .empty)]),
        ])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(doc.blocks.map(\.id) == [Self.agentTitleId, Self.older])
        #expect(doc.blocks[1].type == NodeType.paragraph, "the older paragraph stays a paragraph")
    }

    @Test func theRepairIsNotUndoable() {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .title("Название"), .paragraph("x")])
        #expect(EditorCommands(document: doc).repairTitles())
        #expect(!doc.canUndo, "a repair is not an edit of the person")
    }

    @Test func oneTitleOrNoneIsLeftAlone() {
        let one = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("x")])
        #expect(!EditorCommands(document: one).repairTitles())
        let none = InMemoryEditorDocument(blocks: [])
        #expect(!EditorCommands(document: none).repairTitles(), "an empty document gets no title")
        #expect(none.blocks.isEmpty)
    }
}
