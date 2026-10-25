import Testing
@testable import DSDesign

@Suite("Editor tools")
struct EditorToolsTests {
    @Test func penSelectionDefaults() {
        let selection = DSPenSelection()
        #expect(selection.tool == .pen)
        #expect(selection.color == .ink(.black))
        #expect(selection.width == .medium)
        #expect(selection.eraserMode == .stroke)
        #expect(selection.drawWithFinger == false)
        #expect(selection.isDrawing)
        #expect(DSPenSelection(tool: nil).isDrawing == false)
        #expect(DSPenSelection(tool: .eraser).isDrawing == false)
    }

    // Same steps as the web PenToolbar (PenWidth 1 | 2 | 3).
    @Test func widths() {
        #expect(DSPenWidth.allCases.map(\.step) == [1, 2, 3])
        #expect(DSPenWidth.allCases.map(\.multiplier) == [0.6, 1.0, 1.6])
        #expect(DSPenWidth.medium.defaultPoints(for: .pen) == 2.5)
    }

    @Test func tools() {
        #expect(DSPenTool.allCases.map(\.rawValue) == ["pen", "pencil", "marker", "highlighter", "eraser", "lasso"])
        #expect(DSPenTool.allCases.filter(\.hasColor) == [.pen, .pencil, .marker, .highlighter])
        #expect(DSPenTool.allCases.filter(\.usesInk) == [.pen, .pencil, .marker])
        #expect(DSPenColor.highlight(.pink).pair == DSHighlightToken.pink.value)
        #expect(DSPenColor.ink(.blue).pair == DSInkToken.blue.value)
    }

    @Test func eraserToggle() {
        let eraser = DSPenSelection(tool: .eraser)
        let next = DSPenSelection.selecting(.eraser, from: eraser, lastInk: .black, lastHighlight: .yellow)
        #expect(next.tool == .eraser)
        #expect(next.eraserMode == .pixel)
        let back = DSPenSelection.selecting(.eraser, from: next, lastInk: .black, lastHighlight: .yellow)
        #expect(back.eraserMode == .stroke)
        // Switching to the eraser from another tool keeps the mode.
        let fromPen = DSPenSelection.selecting(.eraser, from: DSPenSelection(eraserMode: .pixel), lastInk: .black, lastHighlight: .yellow)
        #expect(fromPen.tool == .eraser)
        #expect(fromPen.eraserMode == .pixel)
    }

    @Test func colourSwitching() {
        let pen = DSPenSelection(color: .ink(.blue))
        let hl = DSPenSelection.selecting(.highlighter, from: pen, lastInk: .blue, lastHighlight: .pink)
        #expect(hl.tool == .highlighter)
        #expect(hl.color == .highlight(.pink))
        let backToInk = DSPenSelection.selecting(.pencil, from: hl, lastInk: .blue, lastHighlight: .pink)
        #expect(backToInk.color == .ink(.blue))
        let keep = DSPenSelection.selecting(.marker, from: pen, lastInk: .red, lastHighlight: .pink)
        #expect(keep.color == .ink(.blue))
        let text = DSPenSelection.selecting(nil, from: pen, lastInk: .blue, lastHighlight: .pink)
        #expect(text.tool == nil)
        #expect(text.color == .ink(.blue))
    }

    @Test func taskRowMuting() {
        #expect(DSTaskRow.isMuted(.open) == false)
        #expect(DSTaskRow.isMuted(.done))
        #expect(DSTaskRow.isMuted(.cancelled))
    }
}
