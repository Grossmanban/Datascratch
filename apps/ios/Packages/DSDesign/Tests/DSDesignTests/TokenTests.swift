import Foundation
import SwiftUI
import Testing
@testable import DSDesign

@Suite("Tokens")
struct TokenTests {
    @Test func rgbaParsing() {
        let color = DSRGBA(0xFF80_0040)
        #expect(color.red == 1)
        #expect(abs(color.green - 128.0 / 255) < 1e-9)
        #expect(color.blue == 0)
        #expect(abs(color.alpha - 64.0 / 255) < 1e-9)
        #expect(color.hex == "#FF800040")
        #expect(DSRGBA(0xFAF8_F4FF).hex == "#FAF8F4")
    }

    @Test func contractNames() {
        #expect(DSColorToken.allCases.map(\.rawValue) == [
            "bg.canvas", "bg.surface", "bg.sidebar", "bg.elevated",
            "text.primary", "text.secondary", "text.tertiary", "text.onAccent", "line.separator",
            "accent", "danger", "success", "warning",
        ])
        #expect(DSInkToken.allCases.map(\.rawValue) == ["black", "blue", "red", "green", "purple", "brown"])
        #expect(DSHighlightToken.allCases.map(\.rawValue) == ["yellow", "green", "pink", "blue"])
        #expect(DSTintToken.allCases.count == 10)
        #expect(DSBackdropToken.allCases.map(\.rawValue) == ["sand", "dusk", "mist", "meadow", "ember"])
        #expect(DSShadowToken.allCases.map(\.rawValue) == ["card", "popover"])
        #expect(DSMotionToken.allCases.map(\.rawValue) == ["snappy", "smooth", "gentle"])
    }

    @Test(arguments: DSColorToken.allCases)
    func themesDiffer(token: DSColorToken) {
        #expect(token.value.light != token.value.dark)
    }

    @Test func darkInksAreLighter() {
        func luma(_ c: DSRGBA) -> Double { 0.2126 * c.red + 0.7152 * c.green + 0.0722 * c.blue }
        for ink in DSInkToken.allCases {
            #expect(luma(ink.value.dark) > luma(ink.value.light), "\(ink.rawValue)")
        }
    }

    @Test func typeScale() {
        let sizes = Dictionary(uniqueKeysWithValues: DSTypeToken.allCases.map { ($0.rawValue, $0.value.size) })
        #expect(sizes == ["title": 34, "h1": 28, "h2": 22, "h3": 19, "body": 17, "callout": 16, "footnote": 13, "caption": 12])
        for token in DSTypeToken.allCases {
            let spec = token.value
            #expect(spec.lineHeight == (spec.family == .display ? 1.2 : 1.5))
        }
        #expect(DSTypeToken.h1.value.family.design == .serif)
        #expect(DSTypeToken.body.value.textStyle.swiftUI == .body)
    }

    @Test func spacingAndRadii() {
        #expect(DSSpace.s1 == 4)
        #expect(DSSpace.s10 == 40)
        #expect(DSRadius.md == 10)
        #expect(DSDocumentWidth.normal.points == 720)
        #expect(DSDocumentWidth.full.points == nil)
    }

    @Test func springs() {
        #expect(DSMotionToken.snappy.value == DSSpringSpec(response: 0.3, damping: 0.85))
        #expect(DSMotionToken.smooth.value == DSSpringSpec(response: 0.45, damping: 0.9))
        #expect(DSMotionToken.gentle.value == DSSpringSpec(response: 0.6, damping: 1))
        #expect(DSFeedback.taskComplete.sensoryFeedback == .success)
        #expect(DSFeedback.delete.sensoryFeedback == .warning)
    }

    @Test func backdropGradientDirection() {
        // CSS 180deg runs top -> bottom.
        let start = DSBackdrop.start(angle: 180)
        let end = DSBackdrop.end(angle: 180)
        #expect(abs(start.x - 0.5) < 1e-9 && abs(start.y - 0) < 1e-9)
        #expect(abs(end.x - 0.5) < 1e-9 && abs(end.y - 1) < 1e-9)
        for token in DSBackdropToken.allCases {
            #expect(token.light.base.count >= 2)
            #expect(!token.dark.blobs.isEmpty)
        }
    }

    @Test func avatarHelpers() {
        #expect(DSAvatar.initials(of: "Анна Петрова") == "АП")
        #expect(DSAvatar.initials(of: "claude") == "C")
        #expect(DSAvatar.tint(for: "Ben") == DSAvatar.tint(for: "Ben"))
        #expect(DSAvatar.tint(for: "Ben") != .gray)
    }
}
