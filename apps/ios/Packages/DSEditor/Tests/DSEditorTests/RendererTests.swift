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
        let start = CACurrentMediaTime()
        let p = Projection.build(doc.blocks)
        let text = renderer().render(p, paragraphs: 0..<p.paragraphs.count)
        let elapsed = CACurrentMediaTime() - start
        print("RENDER_10K_WORDS_MS=\(Int(elapsed * 1000)) chars=\(text.length)")
        XCTAssertLessThan(elapsed, 1.0)
    }
}
#endif
