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

    /// Runs every block already enqueued on the main queue (tool changes are applied there).
    func drainMainQueue() {
        let done = expectation(description: "main queue drained")
        DispatchQueue.main.async { done.fulfill() }
        wait(for: [done], timeout: 2)
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
        drainMainQueue()
        XCTAssertEqual(pan.minimumNumberOfTouches, 2, "finger drawing: scrolling with two fingers")
        editor.tools.mode = .text
        drainMainQueue()
        XCTAssertEqual(pan.minimumNumberOfTouches, 1)
    }

    func testRefreshReusesOutlinesOfStrokesThatDidNotMove() {
        let p = BlockNode.paragraph("Hello brave new world")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), p, .paragraph("Second paragraph here")])
        let editor = host(doc)
        let moving = underline(editor, range: flatRange(editor, of: "brave"))
        let still = underline(editor, range: flatRange(editor, of: "Second"))
        let built = editor.ink.outlinesBuilt
        let movingPath = editor.ink.renderedPath(of: moving.id)
        let stillPath = editor.ink.renderedPath(of: still.id)
        editor.ink.invalidateLayout()
        editor.ink.refresh()
        XCTAssertEqual(editor.ink.outlinesBuilt, built, "nothing moved: both outlines come from the cache")
        // Typing at the start of the first paragraph moves the stroke on "brave"; the one in the
        // second paragraph stays where it is and keeps its outline.
        // (Not `EditorCommands.typeText`: it reports keyboard input the text view already shows.)
        doc.insertText("Oh ", marks: .empty, block: p.id, at: 0)
        settle(editor)
        XCTAssertTrue(editor.ink.renderedPath(of: still.id) === stillPath, "the unmoved stroke reuses its outline")
        XCTAssertFalse(editor.ink.renderedPath(of: moving.id) === movingPath, "the moved stroke is outlined again")
    }

    func testTextToolLeavesFingerTouchesAlone() {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello")]))
        editor.tools.allowsFingerDrawing = true
        editor.tools.mode = .text
        drainMainQueue()
        XCTAssertTrue(editor.inkInput.isEnabled, "stays enabled (disabling it crashed UIKit), but never begins")
        XCTAssertEqual(editor.inkInput.state, .possible)
        XCTAssertEqual(editor.textView.panGestureRecognizer.minimumNumberOfTouches, 1, "one finger scrolls in the text tool")
        editor.tools.mode = .pen
        drainMainQueue()
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
        drainMainQueue()
        XCTAssertTrue(tapped)
        XCTAssertEqual(editor.textView.contentOffset, offset, "switching tools does not scroll")
    }

    func testTouchesOnTextGoToTheTextViewNotTextKitInternals() {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello brave new world")]))
        let r = flatRange(editor, of: "brave")
        let p = editor.geometry.placement(at: r.lowerBound)!
        let point = CGPoint(x: p.origin.x + 4, y: p.origin.y - p.fontSize * 0.3)
        let hit = editor.textView.hitTest(point, with: nil)
        XCTAssertTrue(hit === editor.textView, "text is hit-tested to the text view (got \(hit.map { NSStringFromClass(type(of: $0)) } ?? "nil"))")
    }

    func testAttachmentViewsAreReusedAcrossLayouts() {
        let math = BlockNode.math("a^2 + b^2 = c^2")
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Before"), math, .paragraph("After")]))
        let factory = editor.factory
        let first = factory.view(for: math)
        XCTAssertTrue(factory.view(for: math) === first, "the same block gets the same view on the next layout")
        var changed = math
        changed.attrs["latex"] = .string("e^{i\\pi} + 1 = 0")
        XCTAssertTrue(factory.view(for: changed) === first, "changed content updates the view in place")
        factory.pruneViews(keeping: [])
        XCTAssertFalse(factory.view(for: math) === first, "views of removed blocks are dropped")
    }

    /// Draws a pen stroke through the real input path (began/moved/ended) along `points`.
    func penStroke(_ editor: EditorView, _ points: [CGPoint]) {
        editor.tools.mode = .pen
        drainMainQueue()
        let t0 = CACurrentMediaTime()
        func sample(_ p: CGPoint, _ i: Int) -> PenSample {
            PenSample(location: p, pressure: 0.5, altitude: 1, azimuth: 0, roll: 0, timestamp: t0 + Double(i) * 0.008, estimationIndex: nil)
        }
        editor.ink.penBegan(sample(points[0], 0))
        editor.ink.penMoved(points.dropFirst().enumerated().map { sample($0.element, $0.offset + 1) }, predicted: [])
        editor.ink.penEnded(cancelled: false)
        settle(editor)
    }

    func line(from a: CGPoint, to b: CGPoint, steps: Int = 30) -> [CGPoint] {
        (0...steps).map { i in
            let t = CGFloat(i) / CGFloat(steps)
            return CGPoint(x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t)
        }
    }

    func testStrokeFarBelowTheTextIsKeptAsFreeDrawing() {
        let last = BlockNode.paragraph("The end of the note")
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello"), last])
        let editor = host(doc)
        let end = editor.geometry.placement(at: flatRange(editor, of: "note").lowerBound)!
        let y = end.origin.y + 400
        penStroke(editor, line(from: CGPoint(x: 80, y: y), to: CGPoint(x: 300, y: y + 60)))
        XCTAssertEqual(doc.strokes.count, 1, "the stroke is not dropped")
        let s = doc.strokes[0]
        XCTAssertEqual(s.anchorKind, .block)
        XCTAssertEqual(s.blockId, last.id, "anchored to the last paragraph")
        editor.ink.invalidateLayout()
        editor.ink.refresh()
        let drawn = editor.ink.resolved[s.id]?.first?.first?.location
        XCTAssertNotNil(drawn, "drawn after relayout")
        XCTAssertEqual(drawn?.y ?? 0, y, accuracy: 2, "where it was drawn")
        XCTAssertGreaterThanOrEqual(editor.textView.textContainerInset.bottom, editor.bounds.height, "a screen of room below the text")
    }

    func testStrokePartlyFarFromTextIsWhollyFreeDrawing() {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello brave new world")])
        let editor = host(doc)
        let w = editor.geometry.placement(at: flatRange(editor, of: "brave").lowerBound)!
        penStroke(editor, line(from: CGPoint(x: w.origin.x, y: w.origin.y + 2), to: CGPoint(x: w.origin.x + 40, y: w.origin.y + 300)))
        XCTAssertEqual(doc.strokes.count, 1)
        XCTAssertEqual(doc.strokes[0].anchorKind, .block, "one far point makes the whole stroke a free drawing")
    }

    func testUnderlineNearAWordStaysAnchoredToText() {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello brave new world")])
        let editor = host(doc)
        let a = editor.geometry.placement(at: flatRange(editor, of: "brave").lowerBound)!
        penStroke(editor, line(from: CGPoint(x: a.origin.x + 1, y: a.origin.y + 3), to: CGPoint(x: a.origin.x + 40, y: a.origin.y + 3)))
        XCTAssertEqual(doc.strokes.count, 1)
        XCTAssertEqual(doc.strokes[0].anchorKind, .text)
    }

    func testDateChipStaysInsideTheColumn() {
        let iso = { (d: Date) -> String in
            let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
            return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
        }
        let task = BlockNode.taskItem("Нажмите ⌘K, чтобы открыть палитру команд и найти всё что угодно",
                                      scheduled: iso(Date().addingTimeInterval(86_400 * 20)))
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .taskList([task])])
        for width in [360, 420, 520, 760] as [CGFloat] {
            let editor = host(doc, width: width)
            let off = flatRange(editor, of: "Нажмите").lowerBound
            guard let frag = editor.geometry.fragment(at: off) as? BlockLayoutFragment else { return XCTFail("no task fragment") }
            let frames = frag.dateChipFrames()
            XCTAssertFalse(frames.isEmpty)
            let column = editor.geometry.columnFrame
            for f in frames {
                let right = f.maxX + frag.layoutFragmentFrame.minX + editor.geometry.origin.x
                XCTAssertLessThanOrEqual(right, column.maxX + 0.5, "chip inside the column at width \(width)")
            }
        }
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

    // MARK: - Build 10 feedback

    /// Mermaid diagrams must be clearly visible: the snapshot carried the web view's near-zero
    /// alpha and the diagrams looked like empty grey boxes.
    func testMermaidRendersAnOpaqueDiagram() throws {
        let editor = host(InMemoryEditorDocument(blocks: [.title("M"), .paragraph("x")]))
        MermaidRenderer.shared.host = editor
        let done = expectation(description: "mermaid rendered")
        var image: UIImage?
        MermaidRenderer.shared.render("flowchart LR\n  A[Идея] --> B[Черновик] --> C[Готово]", dark: false) { img in
            image = img
            done.fulfill()
        }
        wait(for: [done], timeout: 60)
        let img = try XCTUnwrap(image, "Mermaid rendered nothing")
        XCTAssertGreaterThan(img.size.width, 100)
        XCTAssertGreaterThan(maxAlpha(of: img), 0.9, "the diagram is (nearly) transparent")
    }

    private func maxAlpha(of image: UIImage) -> CGFloat {
        guard let cg = image.cgImage else { return 0 }
        let w = cg.width, h = cg.height
        var pixels = [UInt8](repeating: 0, count: w * h * 4)
        let ctx = CGContext(data: &pixels, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        var best: UInt8 = 0
        for i in stride(from: 3, to: pixels.count, by: 4) where pixels[i] > best { best = pixels[i] }
        return CGFloat(best) / 255
    }

    func testAgentEditsBannerAcceptsAll() {
        let agent = MarkSet([MarkName.agentEdit: .object(["agent": "claude"])])
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph([.text("Написал агент", agent)]), .paragraph("моё")])
        let editor = host(doc)
        XCTAssertTrue(editor.hasAgentEdits)
        let banner = editor.textView.subviews.first { $0.accessibilityIdentifier == "agentEdits.banner" }
        XCTAssertEqual(banner?.isHidden, false, "the banner shows while there are agent edits")
        let deco = editor.textView.textStorage.attribute(.dsDecoration, at: flatRange(editor, of: "Написал").lowerBound,
                                                         effectiveRange: nil) as? ParagraphDecoration
        XCTAssertEqual(deco?.hasAgentEdit, true)
        XCTAssertNil(editor.textView.textStorage.attribute(.backgroundColor, at: flatRange(editor, of: "Написал").lowerBound,
                                                           effectiveRange: nil), "no tint on the text itself")
        editor.acceptAgentEdits()
        drainMainQueue()
        settle(editor)
        XCTAssertFalse(editor.hasAgentEdits)
        XCTAssertEqual(banner?.isHidden, true)
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "Написал агент")
        editor.undo()
        drainMainQueue()
        XCTAssertTrue(editor.hasAgentEdits, "accepting is undoable")
    }

    func testTypingInsideAgentTextIsNotMarkedAsAgent() {
        let agent = MarkSet([MarkName.agentEdit: .object(["agent": "claude"])])
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph([.text("агент", agent)])]))
        let r = flatRange(editor, of: "агент")
        editor.textView.selectedRange = NSRange(location: r.lowerBound + 2, length: 0)
        let marks = (editor.textView.typingAttributes[.dsMarks] as? MarksBox)?.marks
        XCTAssertEqual(marks?.contains(MarkName.agentEdit), false)
    }

    func testLiteralWikiLinkIsTappableByTitle() throws {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("См. [[Тест форматирования]] ниже")]))
        editor.onOpenNoteTitled = { _ in }
        let r = flatRange(editor, of: "форматирования")
        XCTAssertEqual(editor.textView.textStorage.attribute(.dsWikiLink, at: r.lowerBound, effectiveRange: nil) as? String,
                       "Тест форматирования")
        let frame = try XCTUnwrap(editor.geometry.segmentFrame(r.lowerBound..<(r.lowerBound + 3)))
        XCTAssertEqual(editor.noteLink(at: CGPoint(x: frame.midX, y: frame.midY)), .title("Тест форматирования"))
        let plain = try XCTUnwrap(editor.geometry.segmentFrame(flatRange(editor, of: "ниже")))
        XCTAssertNil(editor.noteLink(at: CGPoint(x: plain.midX, y: plain.midY)))
    }

    func testDismissKeyboardEndsEditing() {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("текст")]))
        editor.textView.becomeFirstResponder()
        XCTAssertTrue(editor.isEditingText)
        editor.dismissKeyboard()
        XCTAssertFalse(editor.isEditingText)
    }

    /// D-45: a note an agent created says so once, with «Понятно», instead of line-by-line marks.
    func testCreatedByAgentBannerAcknowledges() throws {
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Заметка агента")]))
        var acknowledged = false
        editor.onAcknowledgeCreatedByAgent = { acknowledged = true }
        editor.createdByAgent = "Claude"
        settle(editor)
        let banner = try XCTUnwrap(editor.textView.subviews.first { $0.accessibilityIdentifier == "agentEdits.banner" })
        XCTAssertFalse(banner.isHidden)
        let label = banner.subviews.compactMap { $0 as? UILabel }.first
        XCTAssertEqual(label?.text, "Создано агентом Claude")
        let ok = try XCTUnwrap(banner.subviews.compactMap { $0 as? UIButton }.first { $0.accessibilityIdentifier == "agentCreated.acknowledge" })
        ok.sendActions(for: .primaryActionTriggered)
        settle(editor)
        XCTAssertTrue(acknowledged)
        XCTAssertNil(editor.createdByAgent)
        XCTAssertTrue(banner.isHidden)
    }
}
