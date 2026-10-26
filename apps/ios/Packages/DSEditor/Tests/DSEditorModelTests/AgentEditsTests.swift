import DSEditorModel
import Foundation
import Testing

@MainActor
@Suite struct AgentEditsTests {
    let agent = MarkSet([MarkName.agentEdit: .object(["agent": "claude"])])

    func doc() -> InMemoryEditorDocument {
        InMemoryEditorDocument(blocks: [
            .title("T"),
            .paragraph([.text("mine ", .empty), .text("agent", agent), .text(" more", agent)]),
            .paragraph("untouched"),
            .bulletList(["x"]),
        ])
    }

    @Test func findsBlocksAndMergesRuns() {
        let d = doc()
        let item = d.blocks[3].children[0].children[0].id
        d.setMark(MarkName.agentEdit, value: .object(["agent": "claude"]), block: item, range: 0..<1)
        #expect(AgentEdits.blocks(in: d) == [d.blocks[1].id, item])
        #expect(AgentEdits.ranges(in: d, block: d.blocks[1].id) == [5..<15])
        #expect(AgentEdits.hasEdits(in: d))
    }

    @Test func acceptBlockKeepsTextAndOthers() {
        let d = doc()
        let item = d.blocks[3].children[0].children[0].id
        d.setMark(MarkName.agentEdit, value: .object(["agent": "claude"]), block: item, range: 0..<1)
        AgentEdits.accept(block: d.blocks[1].id, in: d)
        #expect(d.flatText(of: d.blocks[1].id) == "mine agent more")
        #expect(AgentEdits.blocks(in: d) == [item])
    }

    @Test func acceptAllIsOneUndoStep() {
        let d = doc()
        d.stopCapturing()
        AgentEdits.acceptAll(in: d)
        #expect(!AgentEdits.hasEdits(in: d))
        d.undo()
        #expect(AgentEdits.ranges(in: d, block: d.blocks[1].id) == [5..<15])
    }

    @Test func wikiLinksInPlainText() {
        let m = WikiLinks.matches(in: "См. [[Тест форматирования]] и [[ ]] и [[Идеи]].")
        #expect(m.map(\.title) == ["Тест форматирования", "Идеи"])
        #expect(m[0].range == 4..<27)
        #expect(WikiLinks.matches(in: "[[a\nb]] [[]]").isEmpty)
    }
}
