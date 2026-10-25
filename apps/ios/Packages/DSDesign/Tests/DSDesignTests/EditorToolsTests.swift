import Testing
@testable import DSDesign

@Suite("Editor tools")
struct EditorToolsTests {
    @Test func penSelectionDefaults() {
        let selection = DSPenSelection()
        #expect(selection.tool == .pen)
        #expect(selection.ink == .black)
        #expect(selection.highlight == .yellow)
        #expect(selection.width == .medium)
        #expect(selection.points == 2.5)
        #expect(selection.color == DSInkToken.black.value)
    }

    // Same values as the web PenToolbar (parity).
    @Test func widthPoints() {
        #expect(DSPenWidth.allCases.map { $0.points(for: .pen) } == [1.5, 2.5, 4])
        #expect(DSPenWidth.allCases.map { $0.points(for: .highlighter) } == [10, 16, 24])
        #expect(DSPenWidth.allCases.map { $0.points(for: .eraser) } == [8, 16, 32])
    }

    @Test func tools() {
        #expect(DSPenTool.allCases.map(\.rawValue) == ["pen", "highlighter", "eraser", "lasso"])
        #expect(DSPenTool.allCases.filter(\.hasColor) == [.pen, .highlighter])
        #expect(DSPenSelection(tool: .highlighter, highlight: .pink).color == DSHighlightToken.pink.value)
        #expect(DSPenSelection(tool: .eraser).color == nil)
        #expect(DSPenSelection(tool: .lasso).color == nil)
    }

    @Test func taskRowMuting() {
        #expect(DSTaskRow.isMuted(.open) == false)
        #expect(DSTaskRow.isMuted(.done))
        #expect(DSTaskRow.isMuted(.cancelled))
    }
}
