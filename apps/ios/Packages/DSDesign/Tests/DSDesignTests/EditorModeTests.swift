import Testing
import UIKit
@testable import DSDesign

@Suite("Editor modes")
struct EditorModeTests {
    @Test(arguments: DSPenMode.allCases)
    func modeRoundTrip(mode: DSPenMode) {
        var selection = DSPenSelection()
        selection.mode = mode
        #expect(selection.mode == mode)
        #expect(selection.tool == mode.tool)
    }

    @Test func modeMapping() {
        #expect(DSPenMode.text.tool == nil)
        #expect(DSPenMode.strokeEraser.tool == .eraser)
        #expect(DSPenMode.pixelEraser.eraserMode == .pixel)
        #expect(DSPenMode(tool: .eraser, eraserMode: .pixel) == .pixelEraser)
        var selection = DSPenSelection(tool: .eraser, eraserMode: .pixel)
        selection.mode = .pen
        #expect(selection.eraserMode == .pixel)
        #expect(selection.mode == .pen)
    }

    @Test func widthPoints() {
        #expect(DSPenWidth.medium.points(base: 2.4) == 2.4)
        #expect(abs(DSPenWidth.bold.points(base: 10) - 16) < 1e-9)
    }

    @Test func calloutTones() {
        #expect(DSCalloutTone.allCases.map(\.tint) == [.gray, .blue, .green, .yellow, .red])
        #expect(DSCalloutTone.warning.systemImage == "exclamationmark.triangle")
    }

    @Test func inlineChipStyles() {
        #expect(DSInlineChipStyle.tag.cornerRadius == nil)
        #expect(DSInlineChipStyle.wikiLink.cornerRadius == 5)
        #expect(DSInlineChipStyle.wikiLink(showsIcon: true).systemImage == "link")
        #expect(DSInlineChipStyle.tag(.red).foreground == DSTintToken.red.value.fg)
        #expect(DSInlineChipStyle.tag.uiFont(for: 17).pointSize == 15)
    }
}
