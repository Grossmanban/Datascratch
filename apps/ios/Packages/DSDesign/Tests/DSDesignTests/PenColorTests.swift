import Foundation
import Testing
@testable import DSDesign

@Suite("Pen colours")
struct PenColorTests {
    @Test func normalizesHex() {
        #expect(DSRecentPenColors.normalized("#a1b2c3") == "#A1B2C3")
        #expect(DSRecentPenColors.normalized("a1b2c3") == "#A1B2C3")
        #expect(DSRecentPenColors.normalized(" #A1B2C3 ") == "#A1B2C3")
        #expect(DSRecentPenColors.normalized("#A1B2C") == nil)
        #expect(DSRecentPenColors.normalized("#A1B2C3FF") == nil)
        #expect(DSRecentPenColors.normalized("#GGGGGG") == nil)
    }

    @Test func parsesHex() throws {
        let rgba = try #require(DSRGBA(hex: "#FF8000"))
        #expect(rgba.red == 1)
        #expect(abs(rgba.green - 128.0 / 255) < 1e-9)
        #expect(rgba.blue == 0)
        #expect(rgba.alpha == 1)
        #expect(rgba.hex == "#FF8000")
        #expect(DSRGBA(hex: "nope") == nil)
    }

    @Test func pushesRecentColours() {
        var list: [String] = []
        list = DSRecentPenColors.pushing("#aa0000", into: list)
        list = DSRecentPenColors.pushing("#00BB00", into: list)
        #expect(list == ["#00BB00", "#AA0000"])
        // Re-using a colour moves it to the front without duplicates.
        list = DSRecentPenColors.pushing("#AA0000", into: list)
        #expect(list == ["#AA0000", "#00BB00"])
        // Capped at six, newest first.
        for hex in ["#000001", "#000002", "#000003", "#000004", "#000005", "#000006"] {
            list = DSRecentPenColors.pushing(hex, into: list)
        }
        #expect(list.count == DSRecentPenColors.limit)
        #expect(list.first == "#000006")
        #expect(!list.contains("#00BB00"))
        // Invalid input leaves the list as it was.
        #expect(DSRecentPenColors.pushing("bad", into: list) == list)
    }

    @Test func persistsPerFamily() throws {
        let defaults = try #require(UserDefaults(suiteName: "ds.pen.tests.\(UUID().uuidString)"))
        DSRecentPenColors.push("#123456", family: .ink, defaults: defaults)
        DSRecentPenColors.push("#ABCDEF", family: .highlight, defaults: defaults)
        #expect(DSRecentPenColors.load(family: .ink, defaults: defaults) == ["#123456"])
        #expect(DSRecentPenColors.load(family: .highlight, defaults: defaults) == ["#ABCDEF"])
        DSRecentPenColors.clear(family: .ink, defaults: defaults)
        #expect(DSRecentPenColors.load(family: .ink, defaults: defaults).isEmpty)
        #expect(DSRecentPenColors.key(for: .ink) == "ds.pen.recent.ink")
    }

    @Test func tokenValues() {
        #expect(DSPenColor.ink(.black).tokenValue == "ink.black")
        #expect(DSPenColor.highlight(.yellow).tokenValue == "highlight.yellow")
        #expect(DSPenColor.custom("#a1b2c3").tokenValue == "#A1B2C3")
        #expect(DSPenColor(tokenValue: "ink.blue") == .ink(.blue))
        #expect(DSPenColor(tokenValue: "highlight.pink") == .highlight(.pink))
        #expect(DSPenColor(tokenValue: "#A1B2C3") == .custom("#A1B2C3"))
        #expect(DSPenColor(tokenValue: "ink.gold") == nil)
        #expect(DSPenColor.custom("#A1B2C3").hex == "#A1B2C3")
        #expect(DSPenColor.ink(.red).hex == nil)
        // Custom colours are the same in both themes.
        let pair = DSPenColor.custom("#A1B2C3").pair
        #expect(pair.light == pair.dark)
        #expect(pair.light.hex == "#A1B2C3")
    }

    @Test func customColourSwitching() {
        let teal = DSPenColor.custom("#2F6F6A")
        let mint = DSPenColor.custom("#B8F0C0")
        let pen = DSPenSelection(tool: .pen, color: teal)
        let hl = DSPenSelection.selecting(.highlighter, from: pen, lastInkColor: teal, lastHighlightColor: mint)
        #expect(hl.color == mint)
        let back = DSPenSelection.selecting(.marker, from: hl, lastInkColor: teal, lastHighlightColor: mint)
        #expect(back.color == teal)
        // Highlighter → eraser → pen still restores the ink.
        let eraser = DSPenSelection.selecting(.eraser, from: hl, lastInkColor: teal, lastHighlightColor: mint)
        let pen2 = DSPenSelection.selecting(.pen, from: eraser, lastInkColor: teal, lastHighlightColor: mint)
        #expect(pen2.color == teal)
    }
}
