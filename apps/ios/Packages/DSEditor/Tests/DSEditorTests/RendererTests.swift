#if canImport(UIKit)
@testable import DSEditor
import DSEditorModel
import UIKit
import XCTest

/// Rendering the document into attributed text — no window needed (package tests run without an app host).
/// Window-based editor tests live in the demo app (`Demo/UnitTests`).
@MainActor
final class RendererTests: XCTestCase {
    func renderer() -> AttributedRenderer {
        let theme = EditorTheme()
        return AttributedRenderer(theme: theme, attachments: AttachmentFactory(theme: theme))
    }

    func testTextMatchesProjection() {
        let doc = SampleDocument.make()
        let p = Projection.build(doc.blocks)
        let text = renderer().render(p, paragraphs: 0..<p.paragraphs.count)
        XCTAssertEqual(text.length, p.length)
        // Code newlines become line separators, otherwise characters are identical.
        XCTAssertEqual(text.string.replacingOccurrences(of: "\u{2028}", with: "\n").utf16.count, p.text.utf16.count)
        for (i, para) in p.paragraphs.enumerated() where para.length > 0 {
            let deco = text.attribute(.dsDecoration, at: p.starts[i], effectiveRange: nil) as? ParagraphDecoration
            XCTAssertEqual(deco?.blockId, para.blockId)
        }
    }

    func testMarksBecomeAttributes() {
        let bold = MarkSet([MarkName.bold: MarkSet.plain])
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph([.text("a", .empty), .text("b", bold)])])
        let p = Projection.build(doc.blocks)
        let text = renderer().render(p, paragraphs: 0..<p.paragraphs.count)
        let font = text.attribute(.font, at: p.starts[1] + 1, effectiveRange: nil) as? UIFont
        XCTAssertTrue(font?.fontDescriptor.symbolicTraits.contains(.traitBold) ?? false)
        let marks = text.attribute(.dsMarks, at: p.starts[1] + 1, effectiveRange: nil) as? MarksBox
        XCTAssertEqual(marks?.marks, bold)
    }

    func testRenderLargeNoteQuickly() {
        let doc = SampleDocument.large()
        // Warm up fonts and the theme cache: the first run on a cold CI simulator measures system
        // font loading, not the renderer. Best of three runs.
        let warm = Projection.build(SampleDocument.make().blocks)
        _ = renderer().render(warm, paragraphs: 0..<warm.paragraphs.count)
        var elapsed = Double.greatestFiniteMagnitude
        var length = 0
        for _ in 0..<3 {
            let start = CACurrentMediaTime()
            let p = Projection.build(doc.blocks)
            let text = renderer().render(p, paragraphs: 0..<p.paragraphs.count)
            elapsed = min(elapsed, CACurrentMediaTime() - start)
            length = text.length
        }
        print("RENDER_10K_WORDS_MS=\(Int(elapsed * 1000)) chars=\(length)")
        // Coarse regression guard only: shared CI simulators vary several-fold (0.6–1.9 s seen).
        // Opening a 10 000-word note end to end is measured by the hosted
        // `EditorViewTests.testOpenLargeNote` (0.34–0.38 s on CI) and the demo launch metric; the
        // 300 ms target itself needs a device.
        XCTAssertLessThan(elapsed, 5.0)
    }
}
#endif
