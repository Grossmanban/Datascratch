@testable import DSEditor
import DSEditorModel
import DSInk
import UIKit
import XCTest

@MainActor
final class EditorViewTests: XCTestCase {
    var window: UIWindow!

    override func tearDown() async throws {
        await MainActor.run {
            window?.isHidden = true
            window = nil
        }
        try await super.tearDown()
    }

    func host(_ doc: EditorDocument, width: CGFloat = 700, height: CGFloat = 900) -> EditorView {
        let editor = EditorView(document: doc)
        if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first {
            window = UIWindow(windowScene: scene)
        } else {
            window = UIWindow()
        }
        window.frame = CGRect(x: 0, y: 0, width: width, height: height)
        let vc = UIViewController()
        vc.view = editor
        window.rootViewController = vc
        window.isHidden = false
        editor.frame = window.bounds
        settle(editor)
        return editor
    }

    func settle(_ editor: EditorView) {
        editor.setNeedsLayout()
        editor.layoutIfNeeded()
        editor.textView.layoutIfNeeded()
        editor.textView.textLayoutManager?.textViewportLayoutController.layoutViewport()
        editor.ink.invalidateLayout()
        editor.ink.refresh()
    }

    /// Draws a horizontal stroke under flattened text `range` through the real hit testing.
    func underline(_ editor: EditorView, range: Range<Int>) -> Stroke {
        let g = editor.geometry!
        let first = g.placement(at: range.lowerBound)!, last = g.placement(at: range.upperBound - 1)!
        var b = TextAnchorBuilder()
        let y = first.origin.y + 3
        var x = first.origin.x + 1
        let endX = last.origin.x + last.fontSize * 0.4
        while x <= endX {
            let p = CGPoint(x: x, y: y)
            let hit = g.characterHit(at: p)!
            b.append(InkSample(location: p), hit: hit)
            x += 3
        }
        let anchors = b.anchorOffsets.map { off -> Data in
            let pos = editor.projection.textPosition(at: off)!
            return editor.document.anchor(block: pos.block, offset: pos.offset)!
        }
        let s = Stroke(tool: .pen, color: "ink.blue", width: 2, anchorKind: .text, anchors: anchors, points: b.points, hint: .underline)
        editor.document.addStroke(s)
        settle(editor)
        return s
    }

    func flatRange(_ editor: EditorView, of word: String) -> Range<Int> {
        let r = (editor.textView.textStorage.string as NSString).range(of: word)
        XCTAssertNotEqual(r.location, NSNotFound)
        return r.location..<(r.location + r.length)
    }

    func testHitTestingFindsCharacters() {
        let p = BlockNode.paragraph("Hello brave new world")
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), p]))
        let r = flatRange(editor, of: "brave")
        let g = editor.geometry!
        let pl = g.placement(at: r.lowerBound)!
        let hit = g.characterHit(at: CGPoint(x: pl.origin.x + 2, y: pl.origin.y - 4))
        XCTAssertEqual(hit?.offset, r.lowerBound)
        // A point exactly on the boundary between the space and "b" belongs to "b" (the right character).
        let boundary = g.characterHit(at: CGPoint(x: pl.origin.x + 0.01, y: pl.origin.y - 4))
        XCTAssertEqual(boundary?.offset, r.lowerBound)
        // Leading edges increase along the word.
        let xs = r.map { g.placement(at: $0)!.origin.x }
        XCTAssertEqual(xs, xs.sorted())
        XCTAssertGreaterThan(xs.last!, xs.first!)
    }

    func testStrokeFollowsTextInsertedBefore() {
        let p = BlockNode.paragraph("Hello brave new world")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p])
        let editor = host(doc)
        let s = underline(editor, range: flatRange(editor, of: "brave"))
        let before = editor.ink.resolved[s.id]!.first!.first!.location
        let glyphBefore = editor.geometry.placement(at: flatRange(editor, of: "brave").lowerBound)!.origin
        doc.insertText("Wonderful ", marks: .empty, block: p.id, at: 0)
        settle(editor)
        let after = editor.ink.resolved[s.id]!.first!.first!.location
        let glyphAfter = editor.geometry.placement(at: flatRange(editor, of: "brave").lowerBound)!.origin
        XCTAssertGreaterThan(after.x, before.x + 30)
        // Same offset from the anchored glyph before and after the edit.
        XCTAssertEqual(after.x - glyphAfter.x, before.x - glyphBefore.x, accuracy: 0.5)
        XCTAssertEqual(after.y - glyphAfter.y, before.y - glyphBefore.y, accuracy: 0.5)
    }

    func testStrokeBreaksAcrossLinesWhenColumnNarrows() {
        let text = "One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen"
        let p = BlockNode.paragraph(text)
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p])
        let editor = host(doc, width: 1000)
        let s = underline(editor, range: flatRange(editor, of: "five six seven eight nine ten"))
        XCTAssertEqual(editor.ink.resolved[s.id]?.count, 1)
        // Narrow the window: the phrase wraps and the underline is cut into pieces per line.
        window.frame = CGRect(x: 0, y: 0, width: 320, height: 900)
        editor.frame = window.bounds
        settle(editor)
        XCTAssertGreaterThanOrEqual(editor.ink.resolved[s.id]?.count ?? 0, 2)
        let ys = Set(editor.ink.resolved[s.id]!.map { Int($0.first!.location.y) })
        XCTAssertGreaterThanOrEqual(ys.count, 2)
    }

    func testDeletedTextHidesStrokeAndUndoRestores() {
        let p = BlockNode.paragraph("Hello brave new world")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p], clientID: 5)
        doc.captureTimeout = 0
        let editor = host(doc)
        let s = underline(editor, range: flatRange(editor, of: "brave"))
        XCTAssertNotNil(editor.ink.resolved[s.id])
        doc.stopCapturing()
        doc.deleteText(block: p.id, range: 6..<12)
        settle(editor)
        XCTAssertNil(editor.ink.resolved[s.id], "D-35: ink on deleted text is not drawn")
        XCTAssertNotNil(doc.stroke(s.id), "the stroke stays in the document")
        doc.undo()
        settle(editor)
        XCTAssertNotNil(editor.ink.resolved[s.id])
    }

    func testReturnInsideMarkedWordKeepsInk() {
        let p = BlockNode.paragraph("Hello brave new world")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p])
        let editor = host(doc)
        _ = underline(editor, range: flatRange(editor, of: "new world"))
        let r = flatRange(editor, of: "new")
        editor.textView.selectedRange = NSRange(location: r.lowerBound, length: 0)
        _ = editor.textView(editor.textView, shouldChangeTextIn: NSRange(location: r.lowerBound, length: 0), replacementText: "\n")
        settle(editor)
        XCTAssertEqual(doc.strokes.count, 1)
        XCTAssertNotNil(editor.ink.resolved[doc.strokes[0].id], "ink moved with the text to the new paragraph")
        XCTAssertTrue(editor.textView.textStorage.string.contains("Hello brave \nnew world"))
    }

    func testTypingThroughTextViewReachesDocument() {
        let p = BlockNode.paragraph("Hello")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p])
        let editor = host(doc)
        editor.tools.mode = .text
        let end = editor.projection.offset(block: p.id, offset: 5)!
        editor.textView.selectedRange = NSRange(location: end, length: 0)
        // What the keyboard does: ask the delegate, apply the text if allowed, report the change.
        // (Programmatic `insertText` does not consult the delegate in a hosted test.)
        let tv = editor.textView
        if editor.textView(tv, shouldChangeTextIn: NSRange(location: end, length: 0), replacementText: " world") {
            tv.textStorage.replaceCharacters(in: NSRange(location: end, length: 0), with: " world")
            tv.selectedRange = NSRange(location: end + 6, length: 0)
            editor.textViewDidChange(tv)
        }
        settle(editor)
        XCTAssertEqual(doc.flatText(of: p.id), "Hello world")
        XCTAssertTrue(tv.textStorage.string.contains("Hello world"))
        let caret = tv.selectedRange
        XCTAssertFalse(editor.textView(tv, shouldChangeTextIn: caret, replacementText: "\n"), "Return is a command")
        settle(editor)
        XCTAssertEqual(doc.blocks.count, 3, "Return splits the paragraph in the document")
        editor.undo()
        XCTAssertEqual(doc.blocks.count, 2)
    }

    func testPenRequestsProMotionOnlyWhileDrawing() {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello")]))
        editor.tools.mode = .pen
        XCTAssertFalse(editor.ink.frameRate.isActive, "idle editor does not hold 120 Hz")
        let sample = PenSample(location: CGPoint(x: 40, y: 80), pressure: 0.5, altitude: 1, azimuth: 0, roll: 0,
                               timestamp: CACurrentMediaTime(), estimationIndex: nil)
        editor.ink.penBegan(sample)
        XCTAssertTrue(editor.ink.frameRate.isActive)
        XCTAssertEqual(FrameRateBoost.drawingRange.preferred, 120)
        XCTAssertEqual(FrameRateBoost.drawingRange.minimum, 80)
        editor.ink.penEnded(cancelled: true)
        XCTAssertFalse(editor.ink.frameRate.isActive)
    }

    func testHeaderScrollsWithTextAndMovesInk() {
        let p = BlockNode.paragraph("Hello brave new world")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p])
        let editor = host(doc)
        let s = underline(editor, range: flatRange(editor, of: "brave"))
        let before = editor.ink.resolved[s.id]!.first!.first!.location

        let header = UIView()
        let label = UILabel()
        label.text = "Cover"
        label.translatesAutoresizingMaskIntoConstraints = false
        header.addSubview(label)
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: header.topAnchor),
            label.leadingAnchor.constraint(equalTo: header.leadingAnchor),
            label.bottomAnchor.constraint(equalTo: header.bottomAnchor),
            label.heightAnchor.constraint(equalToConstant: 120),
        ])
        editor.headerView = header
        settle(editor)

        XCTAssertEqual(editor.headerHeight, 120)
        XCTAssertTrue(header.isDescendant(of: editor.textView), "header scrolls with the text")
        XCTAssertEqual(header.frame, CGRect(x: 0, y: 0, width: editor.bounds.width, height: 120))
        XCTAssertEqual(editor.textView.textContainerInset.top, 152)
        let after = editor.ink.resolved[s.id]!.first!.first!.location
        XCTAssertEqual(after.y - before.y, 120, accuracy: 0.5, "ink stays on its word below the header")
        XCTAssertEqual(after.x, before.x, accuracy: 0.5)

        editor.headerView = nil
        settle(editor)
        XCTAssertEqual(editor.headerHeight, 0)
        XCTAssertNil(header.superview)
    }

    func testToolChangesNeverReconfigureRecognizersDuringDispatch() {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello")]))
        let pan = editor.textView.panGestureRecognizer
        for g in [editor.inkInput!] + (editor.textView.gestureRecognizers ?? []).filter({ $0.delegate === editor }) {
            XCTAssertFalse(g.delaysTouchesBegan, "\(type(of: g)) must not delay touches")
            XCTAssertFalse(g.delaysTouchesEnded, "\(type(of: g)) must not delay touches")
        }
        XCTAssertFalse(editor.textView.delaysContentTouches)
        XCTAssertEqual(pan.minimumNumberOfTouches, 1)
        // As if called from a button's or the pen's touch handler: nothing changes synchronously.
        editor.tools.allowsFingerDrawing = true
        editor.tools.mode = .marker
        editor.tools.mode = .pen
        XCTAssertEqual(pan.minimumNumberOfTouches, 1, "recognizers are reconfigured only after the event")
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        XCTAssertEqual(pan.minimumNumberOfTouches, 2, "finger drawing: scrolling with two fingers")
        editor.tools.mode = .text
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        XCTAssertEqual(pan.minimumNumberOfTouches, 1)
    }

    func testRefreshReusesOutlinesOfStrokesThatDidNotMove() {
        let p = BlockNode.paragraph("Hello brave new world")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p, .paragraph("Second paragraph here")])
        let editor = host(doc)
        _ = underline(editor, range: flatRange(editor, of: "brave"))
        _ = underline(editor, range: flatRange(editor, of: "Second"))
        let built = editor.ink.outlinesBuilt
        editor.ink.invalidateLayout()
        editor.ink.refresh()
        XCTAssertEqual(editor.ink.outlinesBuilt, built, "nothing moved: both outlines come from the cache")
        // Typing at the start of the first paragraph moves the stroke on "brave"; the one in the
        // second paragraph stays where it is.
        let pos = TextPosition(block: p.id, offset: 0)
        EditorCommands(document: doc).typeText("Oh ", marks: .empty, at: pos, replacing: 0)
        settle(editor)
        XCTAssertEqual(editor.ink.outlinesBuilt, built + 1, "only the moved stroke is outlined again")
    }

    func testTextToolLeavesFingerTouchesAlone() {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello")]))
        editor.tools.allowsFingerDrawing = true
        editor.tools.mode = .text
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        XCTAssertFalse(editor.inkInput.isEnabled, "the pen recognizer takes no part in the text tool")
        XCTAssertEqual(editor.textView.panGestureRecognizer.minimumNumberOfTouches, 1, "one finger scrolls in the text tool")
        editor.tools.mode = .pen
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        XCTAssertTrue(editor.inkInput.isEnabled)
        XCTAssertEqual(editor.textView.panGestureRecognizer.minimumNumberOfTouches, 2)
    }

    func testButtonOverTheEditorGetsItsTouchAndNothingScrolls() {
        let editor = host(SampleDocument.make())
        let button = UIButton(type: .system)
        button.frame = CGRect(x: 40, y: editor.bounds.maxY - 60, width: 44, height: 44)
        window.addSubview(button)
        var tapped = false
        button.addAction(UIAction { _ in tapped = true }, for: .touchUpInside)
        let center = button.convert(CGPoint(x: 22, y: 22), to: window)
        XCTAssertTrue(window.hitTest(center, with: nil) === button, "the overlay, not the editor, receives the touch")
        let offset = editor.textView.contentOffset
        button.sendActions(for: .touchUpInside)
        editor.tools.mode = .text
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        XCTAssertTrue(tapped)
        XCTAssertEqual(editor.textView.contentOffset, offset, "switching tools does not scroll")
    }

    func testOpenLargeNote() {
        let doc = SampleDocument.large()
        let start = CACurrentMediaTime()
        let editor = host(doc)
        let elapsed = CACurrentMediaTime() - start
        print("OPEN_10K_WORDS_MS=\(Int(elapsed * 1000)) (editor reported \(Int(editor.lastOpenDuration * 1000)))")
        // Target on device: 300 ms (`11-nfr.md`). CI simulators are slower and noisy, so the hard limit here is loose.
        XCTAssertLessThan(elapsed, 2.0)
    }
}
