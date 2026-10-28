@testable import DSEditor
import DSEditorModel
import DSInk
import UIKit
import UniformTypeIdentifiers
import WebKit
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
        // A test that hosts several editors (the ruled paper matrix) releases each one before the
        // next: dozens of live editors kept the main queue busy into the following test.
        window?.isHidden = true
        window?.rootViewController = nil
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
        // Generous: the CI simulator can be busy for seconds (it is a wait, not a measurement).
        wait(for: [done], timeout: 10)
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

    /// Build 13 feedback (iPad, Pencil): the eraser circle stuck at the touch-down point. Driven
    /// through the ink recognizer's callbacks, as UIKit delivers a drag, in a scrolled note.
    func testEraserIndicatorFollowsThePenAndHidesOnLift() throws {
        let doc = SampleDocument.make()
        let editor = host(doc, width: 700, height: 600)
        editor.textView.setContentOffset(CGPoint(x: 0, y: 300), animated: false)
        settle(editor)
        editor.tools.mode = .strokeEraser
        drainMainQueue()
        let input = try XCTUnwrap(editor.inkInput)
        let t0 = CACurrentMediaTime()
        func sample(_ p: CGPoint, _ i: Int) -> PenSample {
            PenSample(location: p, pressure: 0.5, altitude: 1, azimuth: 0, roll: 0, timestamp: t0 + Double(i) * 0.008, estimationIndex: nil)
        }
        let points = line(from: CGPoint(x: 100, y: 420), to: CGPoint(x: 400, y: 560), steps: 12)
        input.onBegan?(sample(points[0], 0))
        XCTAssertEqual(editor.indicatorCenter, points[0], "shown where the pen touches")
        for i in stride(from: 1, to: points.count, by: 3) {
            // Coalesced samples: the indicator sits at the latest one.
            let batch = (i..<min(i + 3, points.count)).map { sample(points[$0], $0) }
            input.onMoved?(batch, [])
            XCTAssertEqual(editor.indicatorCenter, batch.last?.location, "follows the pen, not stuck at the first point")
        }
        input.onEnded?(false)
        XCTAssertNil(editor.indicatorCenter, "hidden once the pen lifts")

        input.onBegan?(sample(points[0], 0))
        input.onMoved?([sample(points[5], 1)], [])
        input.onEnded?(true)
        XCTAssertNil(editor.indicatorCenter, "hidden when the touch is cancelled")

        editor.tools.mode = .pen
        drainMainQueue()
        input.onBegan?(sample(points[0], 0))
        input.onMoved?([sample(points[3], 1)], [])
        XCTAssertNil(editor.indicatorCenter, "ink tools show the stroke itself, no circle stuck under the pen")
        input.onEnded?(false)
    }

    func testStrokeFarBelowTheTextIsKeptAsFreeDrawing() {
        let pencilSeen = EditorView.pencilSeen
        EditorView.pencilSeen = true // the screen of room below the text is there once a Pencil was used
        defer {
            EditorView.pencilSeen = pencilSeen
            if !pencilSeen { UserDefaults.standard.removeObject(forKey: "ds.pencilSeen") }
        }
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

    func testNoScreenOfRoomBeforeAnyPencil() {
        let pencilSeen = EditorView.pencilSeen
        EditorView.pencilSeen = false
        defer { EditorView.pencilSeen = pencilSeen }
        let editor = host(InMemoryEditorDocument(blocks: [.title("T"), .paragraph("Hello")]))
        if editor.tools.allowsFingerDrawing { return }
        XCTAssertEqual(editor.textView.textContainerInset.bottom, 160, "no drawing yet: only the usual end room")
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

    // MARK: - Build 11: touch formatting

    /// What the keyboard does at the caret (programmatic `insertText` skips the delegate here).
    func typeAtCaret(_ editor: EditorView, _ text: String) {
        let tv = editor.textView
        let at = tv.selectedRange
        if editor.textView(tv, shouldChangeTextIn: at, replacementText: text) {
            tv.textStorage.replaceCharacters(in: at, with: text)
            tv.selectedRange = NSRange(location: at.location + text.utf16.count, length: 0)
            editor.textViewDidChange(tv)
        }
    }

    func testBoldAtCaretAppliesToTheNextTypedText() {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("ab")])
        let editor = host(doc)
        let r = flatRange(editor, of: "ab")
        editor.textView.selectedRange = NSRange(location: r.upperBound, length: 0)
        XCTAssertFalse(editor.formatState.has(MarkName.bold))
        editor.perform(.bold)
        XCTAssertTrue(editor.formatState.has(MarkName.bold), "the bar shows bold as on before anything is typed")
        typeAtCaret(editor, "C")
        let last = doc.inline(of: doc.blocks[1].id, range: 2..<3).first
        XCTAssertEqual(last?.marks.contains(MarkName.bold), true)
    }

    func testFormatStateForSelectionAndHeadingToggle() {
        let bold = MarkSet([MarkName.bold: MarkSet.plain])
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph([.text("жирный", bold), .text(" нет", .empty)])])
        let editor = host(doc)
        let r = flatRange(editor, of: "жирный")
        editor.textView.selectedRange = NSRange(location: r.lowerBound, length: r.count)
        XCTAssertTrue(editor.formatState.has(MarkName.bold))
        XCTAssertTrue(editor.formatState.hasSelection)
        XCTAssertEqual(editor.formatState.block, .paragraph)
        editor.perform(.heading2)
        XCTAssertEqual(editor.formatState.block, .heading2)
        editor.perform(.heading2)
        XCTAssertEqual(editor.formatState.block, .paragraph, "the same heading button turns it back into text")
    }

    func testSlashMenuOpensFiltersAndApplies() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph("")])
        let editor = host(doc)
        var menus: [SlashMenuState?] = []
        editor.onSlashMenu = { menus.append($0) }
        editor.textView.selectedRange = NSRange(location: editor.textView.textStorage.length, length: 0)
        typeAtCaret(editor, "/")
        XCTAssertEqual(menus.last??.query, "")
        typeAtCaret(editor, "заг")
        let menu = try XCTUnwrap(menus.last ?? nil)
        XCTAssertEqual(menu.items.map(\.id), ["heading1", "heading2", "heading3"])
        editor.applySlashCommand("heading2")
        XCTAssertNil(menus.last ?? nil, "the menu closes")
        XCTAssertEqual(doc.blocks[1].type, NodeType.heading)
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "", "the typed /query is removed")
    }

    func testTypedTextNextToAgentTextIsNotAgentMarkedInTheDocument() {
        let agent = MarkSet([MarkName.agentEdit: .object(["agent": "claude"])])
        let doc = InMemoryEditorDocument(blocks: [.title("T"), .paragraph([.text("агент", agent)])])
        let editor = host(doc)
        editor.textView.selectedRange = NSRange(location: flatRange(editor, of: "агент").upperBound, length: 0)
        typeAtCaret(editor, "я")
        let typed = doc.inline(of: doc.blocks[1].id, range: 5..<6).first
        XCTAssertEqual(typed?.marks.contains(MarkName.agentEdit), false)
    }

    // MARK: - Keyboard: no double counting (iPad report, build 9)

    private func keyboardDoc() -> InMemoryEditorDocument {
        let bold = MarkSet([MarkName.bold: MarkSet.plain])
        return InMemoryEditorDocument(blocks: [
            .title("Заметка"), .paragraph("Первый абзац заметки."), .heading("Раздел", level: 2),
            .taskList([.taskItem("Раз"), .taskItem("Два"), .taskItem("Три")]),
            .drawing(height: 200), .paragraph([.text("привет", bold)]),
        ])
    }

    private func postKeyboard(_ name: Notification.Name, top: CGFloat, in window: UIWindow) {
        let frame = CGRect(x: 0, y: top, width: window.bounds.width, height: window.bounds.height - top)
        let screen = window.convert(frame, to: window.screen.coordinateSpace)
        NotificationCenter.default.post(name: name, object: nil, userInfo: [UIResponder.keyboardFrameEndUserInfoKey: NSValue(cgRect: screen)])
    }

    /// The app shrinks the editor for the keyboard: the editor must not add the keyboard again,
    /// and a caret that is still visible must not move.
    func testShrinkingHostGetsNoKeyboardInsetAndNoScroll() throws {
        let editor = host(keyboardDoc(), width: 820, height: 1180)
        let r = flatRange(editor, of: "привет")
        editor.textView.selectedRange = NSRange(location: r.upperBound, length: 0)
        settle(editor)
        let before = editor.textView.contentOffset.y
        let keyboardTop: CGFloat = 820
        // Same order as SwiftUI keyboard avoidance: "will" → the host shrinks the editor → "did".
        postKeyboard(UIResponder.keyboardWillChangeFrameNotification, top: keyboardTop, in: window)
        editor.frame.size.height = keyboardTop
        settle(editor)
        postKeyboard(UIResponder.keyboardDidChangeFrameNotification, top: keyboardTop, in: window)
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(editor.textView.contentInset.bottom, 0, accuracy: 1, "the keyboard is not counted twice")
        let caret = editor.textView.caretRect(for: try XCTUnwrap(editor.textView.selectedTextRange).end)
        let visible = editor.textView.bounds.inset(by: editor.textView.adjustedContentInset)
        XCTAssertTrue(visible.contains(caret), "the caret line stays visible")
        XCTAssertEqual(editor.textView.contentOffset.y, before, accuracy: 1, "no scroll: the caret was already above the keyboard")
    }

    /// A full-height host: the editor insets itself and scrolls the least needed to show the caret.
    func testFullHeightHostScrollsTheCaretMinimally() throws {
        let editor = host(keyboardDoc(), width: 820, height: 1180)
        let r = flatRange(editor, of: "привет")
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder(), "editing (the inset logic scrolls only while editing)")
        editor.textView.selectedRange = NSRange(location: r.upperBound, length: 0)
        settle(editor)
        let caretBefore = editor.textView.caretRect(for: try XCTUnwrap(editor.textView.selectedTextRange).end)
        let keyboardTop = min(1100, caretBefore.maxY - editor.textView.contentOffset.y - 40)
        postKeyboard(UIResponder.keyboardDidChangeFrameNotification, top: keyboardTop, in: window)
        drainMainQueue()
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(editor.textView.contentInset.bottom, 1180 - keyboardTop, accuracy: 2)
        let caret = editor.textView.caretRect(for: try XCTUnwrap(editor.textView.selectedTextRange).end)
        let visible = editor.textView.bounds.inset(by: editor.textView.adjustedContentInset)
        XCTAssertTrue(visible.contains(caret), "the caret line is above the keyboard")
        XCTAssertLessThan(visible.maxY - caret.maxY, 80,
                          "only the needed amount: the caret stays just above the keyboard, not at the top")
    }

    // MARK: - Dictation (build 16 feedback)

    private func dictationDoc() -> InMemoryEditorDocument {
        InMemoryEditorDocument(blocks: [.title("Диктовка"), .paragraph("Первый абзац здесь"), .paragraph("Второй абзац")])
    }

    /// Dictation and input methods stream text as marked text: it lands at the caret, in the
    /// caret's paragraph, and the next paragraph is untouched.
    func testMarkedTextStreamedLikeDictationLandsAtTheCaret() throws {
        let doc = dictationDoc()
        let editor = host(doc)
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder())
        let at = flatRange(editor, of: "абзац здесь").lowerBound
        editor.textView.selectedRange = NSRange(location: at, length: 0)
        drainMainQueue()
        for chunk in ["При", "Привет", "Привет мир", "Привет мир, "] {
            editor.textView.setMarkedText(chunk, selectedRange: NSRange(location: chunk.utf16.count, length: 0))
            drainMainQueue()
            XCTAssertEqual(doc.flatText(of: doc.blocks[2].id), "Второй абзац", "the next paragraph is untouched while streaming")
        }
        editor.textView.unmarkText()
        drainMainQueue()
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "Первый Привет мир, абзац здесь")
        XCTAssertEqual(doc.flatText(of: doc.blocks[2].id), "Второй абзац")
        XCTAssertEqual(editor.textView.selectedRange.location, at + "Привет мир, ".utf16.count, "the caret follows the text")
        XCTAssertEqual(editor.textView.textStorage.length, Projection.build(doc.blocks).length, "text view and document agree")
    }

    /// Dictation's placeholder puts nothing into the text; the result is inserted at the caret.
    func testDictationPlaceholderKeepsTheCaretAndTheResultLandsThere() throws {
        let doc = dictationDoc()
        let editor = host(doc)
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder())
        let at = flatRange(editor, of: "абзац здесь").lowerBound
        editor.textView.selectedRange = NSRange(location: at, length: 0)
        let length = editor.textView.textStorage.length
        let placeholder = editor.textView.insertDictationResultPlaceholder
        drainMainQueue()
        XCTAssertEqual(editor.textView.textStorage.length, length, "no placeholder character in the text")
        XCTAssertEqual(editor.textView.selectedRange.location, at, "the caret stays")
        XCTAssertGreaterThan(editor.textView.frame(forDictationResultPlaceholder: placeholder).height, 0)
        editor.textView.removeDictationResultPlaceholder(placeholder, willInsertResult: true)
        editor.textView.insertText("продиктованный ")
        drainMainQueue()
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "Первый продиктованный абзац здесь")
        XCTAssertEqual(doc.flatText(of: doc.blocks[2].id), "Второй абзац")
    }

    /// Text the text view changed without asking the editor is mirrored into the document.
    func testEditTheTextViewDidNotReportIsMirrored() throws {
        let doc = dictationDoc()
        let editor = host(doc)
        let at = flatRange(editor, of: "здесь").lowerBound
        editor.textView.textStorage.replaceCharacters(in: NSRange(location: at, length: 0), with: "сказано ")
        editor.textView.selectedRange = NSRange(location: at + 8, length: 0)
        editor.textViewDidChange(editor.textView)
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "Первый абзац сказано здесь")
        XCTAssertEqual(doc.flatText(of: doc.blocks[2].id), "Второй абзац")
        XCTAssertEqual(editor.textView.textStorage.length, Projection.build(doc.blocks).length)
    }

    /// Links and date chips are accessibility elements that act like a tap (VoiceOver, UI tests).
    func testLinksAndDateChipsAreAccessibleAndActivate() throws {
        let doc = InMemoryEditorDocument(blocks: [
            .title("A11y"),
            .paragraph("См. [[Целевая заметка]] здесь"),
            .paragraph([.text("Чип: ", .empty), .atom(.noteLink(noteId: "note-42", label: "Чип-заметка"), .empty)]),
            .taskList([.taskItem("Задача с датой", scheduled: EditorView.isoDay(offset: 1))]),
        ])
        let editor = host(doc)
        var openedTitle: String?
        var openedId: String?
        editor.onOpenNoteTitled = { openedTitle = $0 }
        editor.onOpenNote = { openedId = $0 }
        XCTAssertTrue(editor.noteLinkFrames(in: editor).contains { $0.kind == .note }, "the chip is found as a note link")
        let elements = try XCTUnwrap(editor.accessibilityElements)
        XCTAssertTrue(elements.first as AnyObject === editor.textView, "the text view stays the first element")
        let link = try XCTUnwrap(elements.compactMap { $0 as? UIAccessibilityElement }.first { $0.accessibilityLabel == "Целевая заметка" })
        XCTAssertTrue(link.accessibilityTraits.contains(.link))
        XCTAssertTrue(link.accessibilityActivate())
        XCTAssertEqual(openedTitle, "Целевая заметка", "activating the element opens the link like a tap")
        let chipLink = try XCTUnwrap(elements.compactMap { $0 as? UIAccessibilityElement }.first { $0.accessibilityLabel == "Чип-заметка" })
        XCTAssertTrue(chipLink.accessibilityActivate())
        XCTAssertEqual(openedId, "note-42")
        let chipRange = flatRange(editor, of: "Чип: ").upperBound
        let chipFrame = try XCTUnwrap(editor.geometry.segmentFrame(chipRange..<(chipRange + 1)))
        XCTAssertNotNil(editor.noteLink(at: CGPoint(x: chipFrame.midX, y: chipFrame.midY)), "a tap on the chip finds the link")
        let chip = try XCTUnwrap(elements.compactMap { $0 as? UIAccessibilityElement }.first { $0.accessibilityLabel?.hasPrefix("Дата: ") == true })
        XCTAssertTrue(chip.accessibilityTraits.contains(.button))
        XCTAssertGreaterThan(chip.accessibilityFrame.width, 0)
    }

    /// D-51 notes-only mode: date chips are quiet labels (no tap, no menu, not a button), the dates
    /// stay in the document; switching back makes them actionable again.
    func testTaskDatesSwitchMakesChipsInertOrActionable() throws {
        let day = EditorView.isoDay(offset: 1)
        let doc = InMemoryEditorDocument(blocks: [.title("D"), .taskList([.taskItem("Задача с датой", scheduled: day)])])
        let editor = host(doc)
        func chipCentre() throws -> CGPoint {
            let f = try XCTUnwrap(editor.taskDateChipFrames(in: editor.textView).first, "the chip is drawn")
            return CGPoint(x: f.midX, y: f.midY)
        }
        func chipElement() -> UIAccessibilityElement? {
            editor.accessibilityElements?.compactMap { $0 as? UIAccessibilityElement }.first { $0.accessibilityLabel?.hasPrefix("Дата: ") == true }
        }
        XCTAssertTrue(editor.hasTapTarget(at: try chipCentre()), "on by default: the chip is tappable")
        XCTAssertEqual(chipElement()?.accessibilityTraits.contains(.button), true)

        editor.taskDatesEnabled = false
        settle(editor)
        XCTAssertFalse(editor.hasTapTarget(at: try chipCentre()), "off: a tap on the chip is an ordinary tap in the text")
        XCTAssertEqual(chipElement()?.accessibilityTraits.contains(.button), false, "off: a label, not a button")
        XCTAssertEqual(chipElement()?.accessibilityTraits.contains(.staticText), true)
        let item = doc.blocks[1].children[0].id
        XCTAssertEqual(doc.block(item)?.attrs["scheduled"]?.stringValue, day, "the date stays in the document")

        editor.taskDatesEnabled = true
        settle(editor)
        XCTAssertTrue(editor.hasTapTarget(at: try chipCentre()))
    }

    // MARK: - Title (Apple Notes style)

    func testFocusTitlePutsTheCaretInTheTitle() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Черновик"), .paragraph("текст")])
        let editor = host(doc)
        window.makeKey()
        editor.focusTitle()
        XCTAssertTrue(editor.textView.isFirstResponder, "the keyboard comes up")
        XCTAssertEqual(editor.textView.selectedRange.location, "Черновик".utf16.count, "the caret is at the end of the title")
    }

    func testReturnInAnEmptyTitleNamesTheNoteAndMovesToTheText() throws {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("Первый абзац")])
        let editor = host(doc)
        editor.defaultTitle = { "Заметка 26 октября 2026" }
        window.makeKey()
        editor.focusTitle()
        XCTAssertFalse(editor.textView(editor.textView, shouldChangeTextIn: NSRange(location: 0, length: 0), replacementText: "\n"))
        XCTAssertEqual(doc.flatText(of: doc.blocks[0].id), "Заметка 26 октября 2026")
        XCTAssertEqual(doc.blocks.count, 2, "Return in the title does not split it")
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "Первый абзац")
        XCTAssertEqual(editor.textView.selectedRange.location, flatRange(editor, of: "Первый").lowerBound, "the caret is at the start of the text")
    }

    func testReturnInANamedTitleMovesToTheTextAndCreatesItIfMissing() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Идеи")])
        let editor = host(doc)
        editor.defaultTitle = { "не нужно" }
        window.makeKey()
        editor.focusTitle()
        XCTAssertFalse(editor.textView(editor.textView, shouldChangeTextIn: NSRange(location: 2, length: 0), replacementText: "\n"))
        XCTAssertEqual(doc.flatText(of: doc.blocks[0].id), "Идеи", "a named title is kept and not split")
        XCTAssertEqual(doc.blocks.count, 2, "an empty paragraph for the text")
        XCTAssertEqual(doc.blocks[1].type, NodeType.paragraph)
        let bodyStart = try XCTUnwrap(Projection.build(doc.blocks).starts.dropFirst().first)
        XCTAssertEqual(editor.textView.selectedRange.location, bodyStart)
    }

    func testLeavingAnEmptyTitleNamesTheNote() throws {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("текст заметки")])
        let editor = host(doc)
        editor.defaultTitle = { "Заметка" }
        window.makeKey()
        editor.focusTitle()
        let inText = flatRange(editor, of: "заметки").lowerBound
        editor.textView.selectedRange = NSRange(location: inText, length: 0)
        editor.textViewDidChangeSelection(editor.textView)
        XCTAssertEqual(doc.flatText(of: doc.blocks[0].id), "Заметка")
        XCTAssertEqual(editor.textView.selectedRange.location, inText + "Заметка".utf16.count, "the caret stays on the same text")
        XCTAssertFalse(editor.commitDefaultTitleIfNeeded(), "a named title is not touched again")
    }

    func testAnEmptyNoteKeepsAnEmptyTitleWhenClosedOrLeft() throws {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("")])
        let editor = host(doc)
        editor.defaultTitle = { "Заметка" }
        window.makeKey()
        editor.focusTitle()
        XCTAssertFalse(editor.commitDefaultTitleIfNeeded(), "no text: the host drops the note, no title is invented")
        XCTAssertEqual(doc.flatText(of: doc.blocks[0].id), "")
    }

    // MARK: - Scroll on Return and while selecting (build 14 feedback)

    private func longDoc() -> InMemoryEditorDocument {
        var blocks: [BlockNode] = [.title("Длинная")]
        for i in 1...60 { blocks.append(.paragraph("Строка \(i) обычного текста")) }
        return InMemoryEditorDocument(blocks: blocks)
    }

    /// Return on the last visible line scrolls at most a line plus a line of margin — the new line
    /// sits just above the bottom, not far up the screen.
    func testReturnAtTheBottomScrollsJustEnough() throws {
        let editor = host(longDoc(), width: 700, height: 600)
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder())
        // The paragraph whose line is just above the bottom edge.
        let visibleBottom = editor.textView.contentOffset.y + editor.textView.bounds.height - editor.textView.adjustedContentInset.bottom
        var target = 0
        for i in 1...60 {
            let r = flatRange(editor, of: "Строка \(i) ")
            if let p = editor.geometry.placement(at: r.lowerBound), p.origin.y + 6 < visibleBottom - 4 { target = r.lowerBound + "Строка \(i) обычного текста".utf16.count }
        }
        editor.textView.selectedRange = NSRange(location: target, length: 0)
        settle(editor)
        let before = editor.textView.contentOffset.y
        XCTAssertFalse(editor.textView(editor.textView, shouldChangeTextIn: NSRange(location: target, length: 0), replacementText: "\n"))
        drainMainQueue()
        drainMainQueue()
        settle(editor)
        let line = editor.theme.bodyFont.lineHeight * EditorTheme.bodyLineHeightMultiple
        let delta = editor.textView.contentOffset.y - before
        XCTAssertLessThanOrEqual(delta, line * 2 + 24, "scrolled \(delta) pt for one new line (line \(line) pt)")
        let caret = editor.textView.caretRect(for: try XCTUnwrap(editor.textView.selectedTextRange).end)
        let visible = editor.textView.bounds.inset(by: editor.textView.adjustedContentInset)
        XCTAssertTrue(visible.contains(caret), "the new line is visible")
    }

    /// While a finger is on the text (dragging a selection handle), the editor never scrolls by
    /// itself: no keyboard-inset change, no late block height, no caret scroll moves the content.
    func testNothingScrollsTheTextWhileAFingerIsOnIt() throws {
        let source = "flowchart TD\n  S[Select] --> T[Touch]"
        var blocks: [BlockNode] = [.title("Выделение"), .mermaid(source)]
        for i in 1...60 { blocks.append(.paragraph("Абзац \(i) для выделения")) }
        let editor = host(InMemoryEditorDocument(blocks: blocks), width: 700, height: 600)
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder())
        editor.textView.setContentOffset(CGPoint(x: 0, y: 900), animated: false)
        settle(editor)
        // A selection reaching far below the screen (UIKit moves the handle; the editor reacts).
        let start = flatRange(editor, of: "Абзац 30 ").lowerBound
        editor.textView.selectedRange = NSRange(location: start, length: 600)
        settle(editor)
        drainMainQueue()
        drainMainQueue()
        editor.textView.setContentOffset(CGPoint(x: 0, y: 900), animated: false)
        settle(editor)
        editor.touchObserver.setTouchingForTesting(true)
        let before = editor.textView.contentOffset.y
        for _ in 0..<10 {
            editor.textViewDidChangeSelection(editor.textView)
            editor.scrollCaretIntoView()
            drainMainQueue()
        }
        postKeyboard(UIResponder.keyboardDidChangeFrameNotification, top: 300, in: window)
        MermaidRenderer.shared.store(UIGraphicsImageRenderer(size: CGSize(width: 600, height: 500)).image { _ in }, for: source, dark: false)
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(editor.textView.contentOffset.y, before, accuracy: 0.5, "no programmatic scroll while the finger is down")
        editor.touchObserver.setTouchingForTesting(false)
        drainMainQueue()
        drainMainQueue()
        settle(editor)
        XCTAssertGreaterThan(editor.textView.contentInset.bottom, 0, "the held-back keyboard inset is applied after the finger lifts")
    }

    // MARK: - Block rendering (build 16 feedback)

    static let clippedFormulas = [
        "\\int_0^{\\infty} e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}",
        "\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}",
    ]

    /// Block math showed without its limits and numerators: the block was as tall as SwiftMath's
    /// ascent + descent. Now the whole formula is inside the block with a margin.
    func testBlockMathShowsTheWholeFormula() throws {
        let editor = host(InMemoryEditorDocument(blocks: [.title("M"), .paragraph("x")]))
        let width: CGFloat = 600
        for latex in Self.clippedFormulas {
            let view = MathBlockView()
            view.configure(node: .math(latex), resolver: nil, theme: editor.theme)
            view.frame = CGRect(x: 0, y: 0, width: width, height: MathBlockView.height(latex: latex, width: width))
            view.layoutIfNeeded()
            let ink = try XCTUnwrap(InkBounds.of(layer: view.layer, size: view.bounds.size), "\(latex): nothing drawn")
            XCTAssertGreaterThanOrEqual(ink.minY, 4, "\(latex): cut at the top (ink \(ink) in \(view.bounds))")
            XCTAssertLessThanOrEqual(ink.maxY, view.bounds.height - 4, "\(latex): cut at the bottom (ink \(ink) in \(view.bounds))")
            // Drawn with all the room it wants, the formula is no taller: nothing was lost.
            let free = MathBlockView.makeLabel(latex: latex)
            free.frame = CGRect(x: 0, y: 0, width: width, height: 1000)
            free.layoutIfNeeded()
            let full = try XCTUnwrap(InkBounds.of(layer: free.layer, size: free.bounds.size))
            XCTAssertEqual(ink.height, full.height, accuracy: 1, "\(latex): the block shows the whole formula")
        }
    }

    /// Mermaid snapshots cut the top of a flowchart and the bottom of a sequence diagram.
    func testMermaidSnapshotsHoldTheWholeDiagram() throws {
        let editor = host(InMemoryEditorDocument(blocks: [.title("M"), .paragraph("x")]))
        MermaidRenderer.shared.host = editor
        let sources = [
            "flowchart TD\n  A[Начало] --> B{Есть идея?}\n  B -->|Да| C[Записать]\n  B -->|Нет| D[Подумать]\n  C --> E[Готово]\n  D --> B",
            "sequenceDiagram\n  participant U as Пользователь\n  participant S as Сервер\n  U->>S: Запрос\n  S-->>U: Ответ\n  Note over U,S: Синхронизация",
        ]
        for source in sources {
            let done = expectation(description: "rendered")
            var image: UIImage?
            MermaidRenderer.shared.render(source, dark: false) { img in
                image = img
                done.fulfill()
            }
            wait(for: [done], timeout: 60)
            let img = try XCTUnwrap(image, "Mermaid rendered nothing for \(source)")
            let ink = try XCTUnwrap(InkBounds.of(image: img), "empty diagram")
            let w = CGFloat(img.cgImage?.width ?? 0), h = CGFloat(img.cgImage?.height ?? 0)
            let line = source.split(separator: "\n").first ?? ""
            XCTAssertGreaterThan(ink.minY, 2, "\(line): the top is cut (ink \(ink) in \(w)x\(h))")
            XCTAssertLessThan(ink.maxY, h - 3, "\(line): the bottom is cut (ink \(ink) in \(w)x\(h))")
            XCTAssertGreaterThan(ink.minX, 2, "\(line): the left edge is cut")
            XCTAssertLessThan(ink.maxX, w - 3, "\(line): the right edge is cut")
            XCTAssertGreaterThan(ink.height, h * 0.6, "\(line): the diagram fills its snapshot (not a mostly empty box)")
        }
    }

    /// The callout's icon sat left of its box and the text touched the box's edge.
    func testCalloutIconSitsInsideTheBoxBeforeTheText() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("C"), .callout("Выноска от агента с текстом", tone: "info", emoji: "💡"), .paragraph("после")])
        let editor = host(doc)
        let tlm = try XCTUnwrap(editor.textView.textLayoutManager)
        var checked = false
        tlm.enumerateTextLayoutFragments(from: tlm.documentRange.location, options: [.ensuresLayout]) { frag in
            guard let block = frag as? BlockLayoutFragment, let geo = block.calloutGeometry, let icon = geo.icon,
                  let line = frag.textLineFragments.first else { return true }
            let dx = frag.layoutFragmentFrame.minX
            let box = geo.box.offsetBy(dx: dx, dy: 0), iconRect = icon.offsetBy(dx: dx, dy: 0)
            let textX = dx + line.typographicBounds.minX + line.glyphOrigin.x
            XCTAssertEqual(box.minX, 0, accuracy: 1, "the box starts at the column edge")
            XCTAssertGreaterThanOrEqual(iconRect.minX - box.minX, 12, "the icon is inside the box with padding")
            XCTAssertGreaterThanOrEqual(textX - iconRect.maxX, 4, "the text comes after the icon")
            XCTAssertGreaterThanOrEqual(textX - box.minX, 36, "the text keeps clear of the box's edge")
            XCTAssertLessThanOrEqual(iconRect.maxY, box.maxY)
            XCTAssertGreaterThanOrEqual(iconRect.minY, box.minY)
            checked = true
            return false
        }
        XCTAssertTrue(checked, "found the callout")
    }

    /// Right after opening, a late Mermaid render grew a block above the screen and the note
    /// jumped under the reader's finger. The text being read stays put.
    func testLateRenderAboveTheScreenKeepsTheVisibleText() throws {
        let source = "flowchart TD\n  A[Late] --> B[Render]"
        var blocks: [BlockNode] = [.title("Скролл"), .paragraph("Вступление"), .mermaid(source),
                                   .math(Self.clippedFormulas[1])]
        for i in 1...60 { blocks.append(.paragraph("Абзац номер \(i) с текстом, который надо читать.")) }
        let editor = host(InMemoryEditorDocument(blocks: blocks), width: 700, height: 600)
        editor.textView.setContentOffset(CGPoint(x: 0, y: 1400), animated: false)
        settle(editor)
        let probe = flatRange(editor, of: "Абзац номер 40 ").lowerBound
        let before = try XCTUnwrap(editor.geometry.placement(at: probe)).origin.y - editor.textView.contentOffset.y
        let tall = UIGraphicsImageRenderer(size: CGSize(width: 600, height: 520)).image { ctx in
            UIColor.gray.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: 600, height: 520))
        }
        MermaidRenderer.shared.store(tall, for: source, dark: false)
        MermaidRenderer.shared.store(tall, for: source, dark: true)
        drainMainQueue()
        settle(editor)
        let after = try XCTUnwrap(editor.geometry.placement(at: probe)).origin.y - editor.textView.contentOffset.y
        XCTAssertGreaterThan(editor.textView.contentOffset.y, 1000, "not reset to the top")
        XCTAssertEqual(after, before, accuracy: 1, "the text on screen did not move")
    }

    // MARK: - Ruled paper follows the text (build 13 check)

    /// Bottoms of every laid-out line (text lines and block attachments), in text container coordinates.
    /// Each with a description of its fragment, so a failure names the block that is off.
    private func lineBottoms(_ editor: EditorView) -> [(y: CGFloat, what: String)] {
        guard let lm = editor.textView.textLayoutManager else { return [] }
        var out: [(CGFloat, String)] = []
        lm.enumerateTextLayoutFragments(from: lm.documentRange.location, options: [.ensuresLayout]) { frag in
            let text = (frag.textElement as? NSTextParagraph)?.attributedString
            let font = text.flatMap { $0.length > 0 ? $0.attribute(.font, at: 0, effectiveRange: nil) as? UIFont : nil }
            let isAttachment = text.map { $0.length > 0 && $0.attribute(.attachment, at: 0, effectiveRange: nil) != nil } ?? false
            let what = "fragment \(isAttachment ? "attachment" : "text") \(text?.string.prefix(16) ?? "") at \(frag.layoutFragmentFrame.minY) "
                + "height \(frag.layoutFragmentFrame.height), font leading \(font?.leading ?? -1) lineHeight \(font?.lineHeight ?? -1)"
            for line in frag.textLineFragments where line.characterRange.length > 0 {
                out.append((frag.layoutFragmentFrame.minY + line.typographicBounds.maxY, what))
            }
            return true
        }
        return out
    }

    func testRuledPaperRulesStayUnderTheTextForEveryFontSizeAndWidth() throws {
        for font in DocumentStyle.Font.allCases {
            for size in [CGFloat(14), 17, 22] {
                for width in DocumentStyle.Width.allCases {
                    let doc = SampleDocument.make()
                    doc.setStyle(DocumentStyle(font: font, width: width, paper: .lines))
                    let editor = host(doc, width: 900, height: 1200)
                    editor.setBaseFontSize(size)
                    settle(editor)
                    let pitch = try XCTUnwrap(editor.theme.paperPitch)
                    XCTAssertEqual(pitch, (editor.theme.bodyFont.lineHeight * 1.22).rounded(), "pitch = body line height")
                    let bottoms = lineBottoms(editor)
                    XCTAssertGreaterThan(bottoms.count, 20)
                    // Only the first line off is reported: the ones after it are usually off by the same.
                    if let hit = bottoms.enumerated().first(where: { _, line in
                        let r = line.y.truncatingRemainder(dividingBy: pitch)
                        return min(r, pitch - r) >= 0.75
                    }) {
                        let (i, line) = (hit.offset, hit.element)
                        let before = i > 0 ? bottoms[i - 1].what : "none"
                        XCTFail("\(font) \(size) \(width): line \(i) ends at \(line.y), off the \(pitch) pt rules by "
                                + "\(line.y.truncatingRemainder(dividingBy: pitch)); \(line.what); previous: \(before)")
                    }
                    // The pattern's rules sit just under those line ends, in content coordinates.
                    let paper = try XCTUnwrap(editor.textView.subviews.first { $0 is PaperView } as? PaperView)
                    let ruleInContent = paper.frame.minY + PaperView.ruleY(pitch: paper.pitch, phaseY: paper.phase.y, lift: paper.ruleLift)
                    let lineEnd = ruleInContent + paper.ruleLift - editor.textView.textContainerInset.top
                    let r = lineEnd.truncatingRemainder(dividingBy: pitch)
                    XCTAssertTrue(min(abs(r), pitch - abs(r)) < 0.5, "\(font) \(size) \(width): rules are off the lines by \(r)")
                    window.isHidden = true
                }
            }
        }
    }

    // MARK: - The content does not move while typing (build 18 feedback)

    /// Brings a paragraph to the middle of the screen and puts the caret at its start.
    private func caretMidScreen(_ editor: EditorView, at word: String) throws -> Int {
        let start = flatRange(editor, of: word).lowerBound
        let placement = try XCTUnwrap(editor.geometry.placement(at: start))
        editor.textView.setContentOffset(CGPoint(x: 0, y: max(0, placement.origin.y - editor.textView.bounds.height / 2)), animated: false)
        editor.textView.selectedRange = NSRange(location: start, length: 0)
        settle(editor)
        drainMainQueue()
        settle(editor)
        return start
    }

    /// Backspace at the start of a paragraph in the middle of a note joins it to the previous one:
    /// nothing scrolls.
    func testBackspaceJoiningParagraphsKeepsTheOffset() throws {
        let editor = host(longDoc(), width: 700, height: 600)
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder())
        _ = try caretMidScreen(editor, at: "Строка 30 ")
        let before = editor.textView.contentOffset.y
        editor.textView.deleteBackward()
        drainMainQueue()
        drainMainQueue()
        settle(editor)
        XCTAssertTrue(editor.textView.textStorage.string.contains("текстаСтрока 30 "), "the paragraphs were joined")
        XCTAssertEqual(editor.textView.contentOffset.y, before, accuracy: 1, "joining paragraphs does not scroll")
    }

    /// Typing in the middle of a note, including a line that wraps, does not scroll.
    func testTypingMidDocumentKeepsTheOffset() throws {
        let editor = host(longDoc(), width: 700, height: 600)
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder())
        _ = try caretMidScreen(editor, at: "Строка 30 ")
        let before = editor.textView.contentOffset.y
        for word in ["Длинное ", "дописанное ", "предложение, ", "которое ", "переносится ", "на ", "новую ", "строку ", "и ", "ещё ", "дальше ", "по ", "ширине ", "колонки "] {
            editor.textView.insertText(word)
        }
        drainMainQueue()
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(editor.textView.contentOffset.y, before, accuracy: 1, "typing does not scroll while the caret is visible")
        editor.textView.deleteBackward()
        editor.textView.deleteBackward()
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(editor.textView.contentOffset.y, before, accuracy: 1, "deleting characters does not scroll")
    }

    /// A fresh note under a cover: the caret goes into the empty title, the keyboard comes up (the
    /// host shrinks the editor) and the header re-measures while the title is typed — the title
    /// line does not move down.
    func testTypingTheTitleOfAFreshNoteDoesNotMoveItDown() throws {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("")])
        let editor = host(doc, width: 820, height: 1180)
        // Drawing available (as with a Pencil): a screen of room below the text, so even an empty
        // note can scroll by the header's growth. Without it a short note cannot scroll and the
        // title moves with the header.
        editor.tools.allowsFingerDrawing = true
        drainMainQueue()
        let header = UIView()
        let height = header.heightAnchor.constraint(equalToConstant: 200)
        height.isActive = true
        editor.headerView = header
        settle(editor)
        // Every scroll change from here on, with who made it (a failure message prints them).
        var moves: [String] = []
        editor.textView.onScrollPositionChange = { old, new in
            guard abs(old - new) > 0.5 else { return }
            let callers = Thread.callStackSymbols.dropFirst(2).prefix(16)
                .map { $0.split(separator: " ").dropFirst(3).prefix(2).joined(separator: " ") }
                .joined(separator: " < ")
            moves.append("\(Int(old))→\(Int(new)): \(callers)")
        }
        defer { editor.textView.onScrollPositionChange = nil }
        func log() -> String { "offset \(editor.textView.contentOffset.y); moves:\n" + moves.joined(separator: "\n") }
        // Where the title line is on screen, from the layout (`caretRect` is wrong in an empty title).
        func titleLineY() throws -> CGFloat {
            let line = try XCTUnwrap(editor.geometry.lineFrame(at: 0))
            return line.minY - editor.textView.contentOffset.y
        }
        let top = editor.textView.contentOffset.y
        window.makeKey()
        editor.focusTitle()
        settle(editor)
        // The keyboard: the host shrinks the editor (SwiftUI keyboard avoidance).
        editor.frame.size.height = 760
        settle(editor)
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(editor.textView.contentOffset.y, top, accuracy: 1, "focusing the empty title does not scroll; \(log())")
        let before = try titleLineY()
        editor.textView.insertText("План")
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(try titleLineY(), before, accuracy: 1, "typing the title does not move it; \(log())")
        // The host's header grows (its metadata row re-measures after the first keystrokes).
        height.constant = 260
        editor.headerLayoutDidChange()
        settle(editor)
        editor.textView.insertText(" на неделю")
        drainMainQueue()
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(doc.flatText(of: doc.blocks[0].id), "План на неделю")
        XCTAssertEqual(try titleLineY(), before, accuracy: 1, "the title stays put when the header changes height; \(log())")
    }

    // MARK: - Photos (build 19)

    private final class ImageStore: EditorAttachmentResolver {
        var images: [String: UIImage] = [:]
        func image(for attachmentId: String) -> UIImage? { images[attachmentId] }
        func noteTitle(for noteId: String) -> String? { nil }
    }

    private func solidImage(_ size: CGSize, _ color: UIColor) -> UIImage {
        UIGraphicsImageRenderer(size: size).image { ctx in
            color.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
        }
    }

    /// An image goes in after the caret's paragraph with the host's attachment id; its local preview
    /// shows (and sets the block's height) until the host has the stored image.
    func testInsertImageShowsThePreviewUntilTheHostHasIt() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Фото"), .paragraph("Перед фото"), .paragraph("После")])
        let editor = host(doc)
        let store = ImageStore()
        editor.attachmentResolver = store
        editor.textView.selectedRange = NSRange(location: flatRange(editor, of: "Перед фото").upperBound, length: 0)
        let preview = solidImage(CGSize(width: 400, height: 200), .red)
        let block = editor.insertImage(attachmentId: "att-1", preview: preview, alt: "Закат")
        settle(editor)
        drainMainQueue()
        settle(editor)
        XCTAssertEqual(doc.blocks.map(\.type), [NodeType.title, NodeType.paragraph, NodeType.image, NodeType.paragraph])
        XCTAssertEqual(doc.blocks[2].id, block)
        XCTAssertEqual(doc.blocks[2].attrs["attachmentId"]?.stringValue, "att-1")
        XCTAssertEqual(doc.blocks[2].attrs["alt"]?.stringValue, "Закат")
        XCTAssertEqual(editor.factory.resolver?.image(for: "att-1"), preview, "the preview stands in for the image")
        XCTAssertEqual(editor.factory.height(for: doc.blocks[2], width: 600), 300, accuracy: 1, "the preview's aspect ratio sets the height")

        let stored = solidImage(CGSize(width: 300, height: 300), .blue)
        store.images["att-1"] = stored
        editor.imageDidLoad(attachmentId: "att-1")
        XCTAssertNil(editor.factory.previews["att-1"], "the preview is dropped once the host has the image")
        XCTAssertEqual(editor.factory.resolver?.image(for: "att-1"), stored)
        editor.undo()
        XCTAssertFalse(doc.blocks.contains { $0.type == NodeType.image }, "inserting an image is undoable")
    }

    /// Width from the menu or the iPad handle: snapped stops, full width stored as null, undoable.
    func testImageWidthIsStoredAndUndoable() throws {
        let image = BlockNode(type: NodeType.image, attrs: ["attachmentId": .string("att-2"), "width": .null])
        let doc = InMemoryEditorDocument(blocks: [.title("Ширина"), image, .paragraph("")])
        let editor = host(doc)
        editor.setImageWidth(image.id, fraction: 0.5)
        XCTAssertEqual(doc.block(image.id)?.attrs["width"]?.numberValue, 0.5)
        editor.setImageWidth(image.id, fraction: 1)
        XCTAssertNil(doc.block(image.id)?.attrs["width"], "full width is null: no attribute (document-model §4.1)")
        editor.undo()
        XCTAssertEqual(doc.block(image.id)?.attrs["width"]?.numberValue, 0.5)
        XCTAssertEqual(ImageBlockView.nearestStop(to: 0.4), 0.5)
        XCTAssertEqual(ImageBlockView.nearestStop(to: 0.2), 0.25)
        XCTAssertEqual(ImageBlockView.nearestStop(to: 0.9), 1)
    }

    /// A tap on an image (and VoiceOver activation) asks the host to zoom it, with its frame.
    func testImageTapAndActivationAskTheHostToZoom() throws {
        let image = BlockNode(type: NodeType.image, attrs: ["attachmentId": .string("att-3"), "width": .null, "alt": .string("Схема")])
        let doc = InMemoryEditorDocument(blocks: [.title("Зум"), .paragraph("Текст"), image, .paragraph("")])
        let editor = host(doc)
        let store = ImageStore()
        store.images["att-3"] = solidImage(CGSize(width: 200, height: 100), .green)
        editor.attachmentResolver = store
        var opened: (BlockID, String, CGRect)?
        editor.onImageTap = { opened = ($0, $1, $2) }
        settle(editor)
        drainMainQueue()
        settle(editor)
        let view = try XCTUnwrap(editor.factory.imageViews.first { $0.block == image.id }?.view, "the image view is laid out")
        let frame = view.convert(view.imageFrame, to: editor.textView)
        XCTAssertGreaterThan(frame.height, 20)
        let centre = CGPoint(x: frame.midX, y: frame.midY)
        XCTAssertEqual(editor.image(at: centre)?.block, image.id)
        XCTAssertTrue(editor.hasTapTarget(at: centre), "a tap on the image is the editor's, not caret placement")
        let element = try XCTUnwrap(editor.accessibilityElements?.compactMap { $0 as? UIAccessibilityElement }.first { $0.accessibilityLabel == "Схема" })
        XCTAssertTrue(element.accessibilityTraits.contains(.image))
        XCTAssertTrue(element.accessibilityActivate())
        XCTAssertEqual(opened?.0, image.id)
        XCTAssertEqual(opened?.1, "att-3")
        XCTAssertGreaterThan(opened?.2.width ?? 0, 20)
        editor.onImageTap = nil
        XCTAssertFalse(editor.hasTapTarget(at: centre), "without a zoom handler a tap on the image is an ordinary tap")
    }

    /// ⌘V with a copied photo goes to the host as item providers; text pastes as before.
    func testPastingAnImageHandsItToTheHost() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Вставка"), .paragraph("Текст")])
        let editor = host(doc)
        var received: [NSItemProvider] = []
        editor.onImagesReceived = { received = $0 }
        UIPasteboard.general.image = solidImage(CGSize(width: 20, height: 20), .orange)
        XCTAssertTrue(editor.textView.canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil))
        editor.textView.paste(nil)
        XCTAssertEqual(received.count, 1, "the pasted photo went to the host")
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "Текст", "nothing was pasted as text")
        UIPasteboard.general.items = []
    }

    /// Caption, description and replacement write the image block's attributes (undoable); the
    /// upload ring follows `setImageProgress`.
    func testImageCaptionReplaceAndUploadRing() throws {
        let image = BlockNode(type: NodeType.image, attrs: ["attachmentId": .string("att-4"), "width": .null])
        let doc = InMemoryEditorDocument(blocks: [.title("Подпись"), image, .paragraph("")])
        let editor = host(doc)
        editor.setImageAttributes(image.id, caption: "Вид с крыши", alt: "Город вечером")
        XCTAssertEqual(doc.block(image.id)?.attrs["caption"]?.stringValue, "Вид с крыши")
        XCTAssertEqual(doc.block(image.id)?.attrs["alt"]?.stringValue, "Город вечером")
        editor.setImageAttributes(image.id, caption: "", alt: "Город вечером")
        XCTAssertNil(doc.block(image.id)?.attrs["caption"]?.stringValue, "an empty caption removes it")
        editor.replaceImage(image.id, attachmentId: "att-5", preview: solidImage(CGSize(width: 10, height: 10), .gray))
        XCTAssertEqual(doc.block(image.id)?.attrs["attachmentId"]?.stringValue, "att-5")
        editor.undo()
        XCTAssertEqual(doc.block(image.id)?.attrs["attachmentId"]?.stringValue, "att-4", "replacing is undoable")
        editor.setImageProgress(attachmentId: "att-4", 0.4)
        XCTAssertEqual(editor.factory.uploadProgress["att-4"], 0.4)
        editor.setImageProgress(attachmentId: "att-4", nil)
        XCTAssertNil(editor.factory.uploadProgress["att-4"])
    }

    /// File blocks: a tap or VoiceOver activation asks the host to open the file.
    func testFileTapAsksTheHostToOpenIt() throws {
        let file = BlockNode(type: NodeType.file, attrs: ["attachmentId": .string("file-1"), "name": .string("Отчёт.pdf"),
                                                           "size": .number(2048), "mime": .string("application/pdf")])
        let doc = InMemoryEditorDocument(blocks: [.title("Файл"), .paragraph("Текст"), file, .paragraph("")])
        let editor = host(doc)
        var opened: (BlockID, String)?
        editor.onFileTap = { opened = ($0, $1) }
        settle(editor)
        drainMainQueue()
        settle(editor)
        let view = try XCTUnwrap(editor.factory.fileViews.first { $0.block == file.id }?.view)
        let frame = view.convert(view.bounds, to: editor.textView)
        XCTAssertTrue(editor.hasTapTarget(at: CGPoint(x: frame.midX, y: frame.midY)))
        let element = try XCTUnwrap(editor.accessibilityElements?.compactMap { $0 as? UIAccessibilityElement }.first { $0.accessibilityLabel == "Отчёт.pdf" })
        XCTAssertTrue(element.accessibilityActivate())
        XCTAssertEqual(opened?.0, file.id)
        XCTAssertEqual(opened?.1, "file-1")
    }

    /// «Фото» and «Файл» in the "/" menu are offered only to a host that handles them; choosing one
    /// removes the typed "/query" and hands the id to the host.
    func testHostSlashEntriesGoToTheHost() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Слэш"), .paragraph("")])
        let editor = host(doc)
        var menu: SlashMenuState?
        editor.onSlashMenu = { menu = $0 }
        window.makeKey()
        XCTAssertTrue(editor.textView.becomeFirstResponder())
        editor.textView.selectedRange = NSRange(location: editor.textView.textStorage.length, length: 0)
        editor.textView.insertText("/фот")
        XCTAssertEqual(menu?.items.map(\.id) ?? [], [], "no host handler: no «Фото»")
        var chosen: String?
        editor.onHostSlashCommand = { chosen = $0 }
        editor.textView.insertText("о")
        XCTAssertEqual(menu?.items.map(\.id), ["image"])
        editor.applySlashCommand("image")
        XCTAssertEqual(chosen, "image")
        XCTAssertEqual(doc.flatText(of: doc.blocks[1].id), "", "the typed /query is removed")
    }

    // MARK: - Rich paste (build 19)

    private func putHTML(_ html: String, plain: String) {
        UIPasteboard.general.items = [[UTType.html.identifier: Data(html.utf8), UTType.utf8PlainText.identifier: plain]]
    }

    /// A web page selection pastes as blocks with marks, images through the host, in one undo step.
    func testPastingHTMLInsertsBlocksAndOneUndoStep() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Вставка"), .paragraph("До ")])
        let editor = host(doc)
        var asked: [PastedImage] = []
        editor.onPastedImages = { images in asked = images; return images.map { _ in "att-paste" } }
        editor.textView.selectedRange = NSRange(location: flatRange(editor, of: "До ").upperBound, length: 0)
        putHTML("<p> и <b>после</b></p><h2>Раздел</h2><ul><li>один</li><li>два</li></ul><img src=\"https://example.com/a.png\" alt=\"Схема\">",
                plain: "и после")
        editor.textView.paste(nil)
        XCTAssertEqual(doc.blocks.map(\.type), [NodeType.title, NodeType.paragraph, NodeType.heading, NodeType.bulletList, NodeType.image, NodeType.paragraph])
        XCTAssertEqual(doc.blocks[1].plainText, "До и после")
        XCTAssertEqual(doc.blocks[1].inline?.last, .text("после", MarkSet([MarkName.bold: MarkSet.plain])))
        XCTAssertEqual(asked.first?.source, .url(URL(string: "https://example.com/a.png")!))
        XCTAssertEqual(doc.blocks[4].attrs["attachmentId"]?.stringValue, "att-paste")
        XCTAssertNil(doc.blocks[4].attrs[PasteFragment.pasteImageAttr], "the paste index never reaches the document")
        editor.undo()
        XCTAssertEqual(doc.blocks.map(\.plainText), ["Вставка", "До "], "one paste is one undo step")
        editor.redo()
        let image = try XCTUnwrap(doc.blocks.firstIndex { $0.type == NodeType.image })
        editor.imageFailed(attachmentId: "att-paste")
        XCTAssertEqual(doc.blocks[image].type, NodeType.paragraph, "a failed download leaves a link to the address")
        XCTAssertEqual(doc.blocks[image].inline?.first, .text("Схема", MarkSet([MarkName.link: .object(["href": "https://example.com/a.png"])])))
        UIPasteboard.general.items = []
    }

    /// In the title only plain text goes in, on one line; «Вставить без форматирования» pastes text.
    func testPasteInTheTitleAndPlainPaste() throws {
        let doc = InMemoryEditorDocument(blocks: [.title(""), .paragraph("")])
        let editor = host(doc)
        editor.textView.selectedRange = NSRange(location: 0, length: 0)
        putHTML("<h1>Большой заголовок</h1><p>и текст</p>", plain: "Большой заголовок\nи текст")
        editor.textView.paste(nil)
        XCTAssertEqual(doc.blocks[0].plainText, "Большой заголовок и текст", "the title is one line")
        XCTAssertEqual(doc.blocks.count, 2)
        editor.textView.selectedRange = NSRange(location: editor.textView.textStorage.length, length: 0)
        editor.textView.pasteWithoutFormatting(nil)
        XCTAssertEqual(doc.blocks.map(\.type), [NodeType.title, NodeType.paragraph, NodeType.paragraph], "plain text, its line break a new paragraph")
        XCTAssertEqual(doc.blocks[1].plainText, "Большой заголовок")
        XCTAssertEqual(doc.blocks[1].inline?.first?.marks, .empty)
        UIPasteboard.general.items = []
    }

    /// Plain text that reads as Markdown is parsed as Markdown.
    func testPastingMarkdownText() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Md"), .paragraph("")])
        let editor = host(doc)
        editor.textView.selectedRange = NSRange(location: editor.textView.textStorage.length, length: 0)
        UIPasteboard.general.string = "## План\n\n- [ ] купить\n- [x] позвонить\n\n**важно**"
        editor.textView.paste(nil)
        XCTAssertEqual(doc.blocks.map(\.type), [NodeType.title, NodeType.heading, NodeType.taskList, NodeType.paragraph])
        XCTAssertEqual(doc.blocks[2].children.map { $0.attrs["state"]?.stringValue }, ["open", "done"])
        UIPasteboard.general.items = []
    }

    // MARK: - Read-only mode (D-54 viewer)

    /// Read-only: no typing, keys, paste, cut, formatting, "/" or undo; copying works; switching
    /// back makes the editor editable again.
    func testReadOnlyRejectsTypingPasteFormattingAndUndo() throws {
        let doc = InMemoryEditorDocument(blocks: [.title("Только чтение"), .paragraph("Первый абзац")])
        let editor = host(doc)
        let tv = editor.textView
        let para = doc.blocks[1].id
        let start = flatRange(editor, of: "Первый").lowerBound
        // An edit made before the switch: undo must not take it back while read-only.
        tv.selectedRange = NSRange(location: start, length: 0)
        if editor.textView(tv, shouldChangeTextIn: NSRange(location: start, length: 0), replacementText: "Я") {
            tv.textStorage.replaceCharacters(in: NSRange(location: start, length: 0), with: "Я")
            tv.selectedRange = NSRange(location: start + 1, length: 0)
            editor.textViewDidChange(tv)
        }
        settle(editor)
        XCTAssertEqual(doc.flatText(of: para), "ЯПервый абзац")
        XCTAssertTrue(editor.canUndo)

        editor.isReadOnly = true
        drainMainQueue()
        XCTAssertTrue(editor.isEffectivelyReadOnly)
        XCTAssertFalse(tv.isEditable, "no keyboard")
        XCTAssertTrue(tv.isSelectable, "text can still be selected")
        XCTAssertEqual(tv.keyCommands?.count ?? 0, 0, "no editor key commands (hardware keyboard)")
        XCTAssertFalse(editor.canUndo)

        let range = flatRange(editor, of: "Первый")
        tv.selectedRange = NSRange(location: range.lowerBound, length: range.count)
        XCTAssertFalse(editor.textView(tv, shouldChangeTextIn: tv.selectedRange, replacementText: "x"))
        XCTAssertFalse(tv.canPerformAction(#selector(UIResponderStandardEditActions.paste(_:)), withSender: nil))
        XCTAssertFalse(tv.canPerformAction(#selector(UIResponderStandardEditActions.cut(_:)), withSender: nil))
        XCTAssertFalse(tv.canPerformAction(#selector(UIResponderStandardEditActions.delete(_:)), withSender: nil))
        XCTAssertFalse(tv.canPerformAction(#selector(EditorTextView.pasteWithoutFormatting(_:)), withSender: nil))
        XCTAssertFalse(tv.canPerformAction(#selector(UIResponderStandardEditActions.toggleBoldface(_:)), withSender: nil))
        XCTAssertTrue(tv.canPerformAction(#selector(UIResponderStandardEditActions.copy(_:)), withSender: nil), "copying works")
        XCTAssertNil(editor.textView(tv, editMenuForTextIn: tv.selectedRange, suggestedActions: []), "no format or task items")

        UIPasteboard.general.string = "вставка"
        tv.paste(nil)
        tv.pasteWithoutFormatting(nil)
        XCTAssertTrue(editor.pasteRich(), "a rich paste is swallowed")
        editor.pastePlainText()
        editor.perform(.bold)
        editor.perform(.heading1)
        editor.perform(.bulletList)
        editor.undo()
        editor.setStyle(DocumentStyle(font: .serif, width: .wide, paper: .grid, textColor: nil))
        settle(editor)
        XCTAssertEqual(doc.blocks.map(\.type), [NodeType.title, NodeType.paragraph])
        XCTAssertEqual(doc.flatText(of: para), "ЯПервый абзац", "nothing changed")
        XCTAssertEqual(doc.blocks[1].inline?.first?.marks, .empty)
        XCTAssertEqual(doc.style.paper, .plain)
        tv.becomeFirstResponder()
        XCTAssertFalse(editor.isEditingText, "selecting to copy is not editing (no format bar)")
        UIPasteboard.general.items = []

        editor.isReadOnly = false
        drainMainQueue()
        XCTAssertTrue(tv.isEditable)
        XCTAssertGreaterThan(tv.keyCommands?.count ?? 0, 0)
        XCTAssertTrue(editor.canUndo, "the earlier edit can be undone again")
        editor.undo()
        XCTAssertEqual(doc.flatText(of: para), "Первый абзац")
    }

    /// Read-only: no pen strokes, Scribble, task toggles or date menus, image width/delete,
    /// table edits, "/" entries or image insertion; links and image zoom stay; edits from
    /// elsewhere are shown.
    func testReadOnlyTurnsOffPenTasksImagesAndTablesButShowsRemoteEdits() throws {
        let day = EditorView.isoDay(offset: 1)
        let image = BlockNode(type: NodeType.image, attrs: ["attachmentId": .string("att-ro"), "width": .null])
        let table = EditorCommands.table(rows: 2, columns: 2, header: ["a", "b"])
        let agent = MarkSet([MarkName.agentEdit: .object(["agent": "claude"])])
        let doc = InMemoryEditorDocument(blocks: [
            .title("Вид"), .paragraph([.text("Абзац агента", agent)]), .taskList([.taskItem("Задача", scheduled: day)]),
            image, table, .paragraph(""),
        ])
        let editor = host(doc)
        let store = ImageStore()
        store.images["att-ro"] = solidImage(CGSize(width: 200, height: 100), .green)
        editor.attachmentResolver = store
        editor.onImageTap = { _, _, _ in }
        var hostSlash = false
        editor.onHostSlashCommand = { _ in hostSlash = true }
        settle(editor)
        drainMainQueue()
        settle(editor)
        let before = "\(doc.blocks)"

        editor.isReadOnly = true
        drainMainQueue()
        settle(editor)

        // Pen: the model takes no stroke even when the ink controller is driven directly.
        editor.tools.mode = .pen
        drainMainQueue()
        let t = CACurrentMediaTime()
        for (i, x) in stride(from: 40.0, through: 200.0, by: 20.0).enumerated() {
            let sample = PenSample(location: CGPoint(x: x, y: 80), pressure: 0.5, altitude: 1, azimuth: 0, roll: 0,
                                   timestamp: t + Double(i) * 0.01, estimationIndex: nil)
            if i == 0 { editor.ink.penBegan(sample) } else { editor.ink.penMoved([sample], predicted: []) }
        }
        editor.ink.penEnded(cancelled: false)
        XCTAssertTrue(doc.strokes.isEmpty, "no stroke was stored")
        XCTAssertFalse(editor.scribbleInteraction(UIScribbleInteraction(delegate: editor), shouldBeginAt: .zero), "no Scribble")
        editor.tools.mode = .text
        drainMainQueue()

        // Tasks: no check box toggle, no date chip menu.
        let item = try XCTUnwrap(doc.blocks[2].children.first?.id)
        let chip = try XCTUnwrap(editor.taskDateChipFrames(in: editor.textView).first, "the date chip is drawn")
        XCTAssertFalse(editor.hasTapTarget(at: CGPoint(x: chip.midX, y: chip.midY)), "a date chip opens no menu")
        let taskStart = flatRange(editor, of: "Задача").lowerBound
        editor.textView.selectedRange = NSRange(location: taskStart, length: 0)
        editor.perform(.toggleTask)
        editor.commands.toggleTask(item)
        XCTAssertEqual(doc.block(item)?.attrs["state"]?.stringValue, "open")

        // Agent edits: no banner, nothing to accept.
        let banner = editor.textView.subviews.first { $0.accessibilityIdentifier == "agentEdits.banner" }
        XCTAssertEqual(banner?.isHidden, true, "a viewer gets no accept banner")
        editor.acceptAgentEdits()
        XCTAssertTrue(editor.hasAgentEdits)

        // Images: zoom stays; width, delete and the resize handle go; nothing is inserted.
        let view = try XCTUnwrap(editor.factory.imageViews.first { $0.block == image.id }?.view)
        let frame = view.convert(view.imageFrame, to: editor.textView)
        XCTAssertTrue(editor.hasTapTarget(at: CGPoint(x: frame.midX, y: frame.midY)), "a tap still zooms")
        XCTAssertNil(editor.factory.imageMenu?(image.id), "no width or delete (and no host items here)")
        XCTAssertFalse(editor.factory.showsResizeHandle)
        editor.setImageWidth(image.id, fraction: 0.5)
        editor.insertImage(attachmentId: "att-new", preview: solidImage(CGSize(width: 10, height: 10), .red))
        XCTAssertNil(editor.factory.previews["att-new"])

        // Tables: cells do not edit, structure buttons are hidden and do nothing.
        let tableView = try XCTUnwrap(editor.factory.view(for: try XCTUnwrap(doc.block(table.id))) as? TableBlockView)
        XCTAssertFalse(tableView.textFieldShouldBeginEditing(UITextField()))
        editor.commands.setTableCell(table.id, row: 1, column: 0, text: "x")
        editor.commands.addTableRow(table.id)

        // "/" and host entries.
        editor.applySlashCommand("photo")
        XCTAssertFalse(hostSlash)

        XCTAssertEqual("\(doc.blocks)", before, "the note is unchanged")

        // Edits from elsewhere (sync) still arrive and are shown.
        let last = doc.blocks[5].id
        doc.transact(origin: .remote) { doc.insertText("от соавтора", marks: .empty, block: last, at: 0) }
        settle(editor)
        XCTAssertTrue(editor.textView.textStorage.string.contains("от соавтора"))
    }

    // MARK: - Mermaid hardening (security audit 2026-10-27)

    /// A huge diagram is captured at most at 16 megapixels; small ones at full size.
    func testMermaidSnapshotIsCappedInPixels() {
        XCTAssertEqual(MermaidRenderer.snapshotWidth(for: CGSize(width: 600, height: 400), scale: 3), 600, "small: full size")
        let width = MermaidRenderer.snapshotWidth(for: CGSize(width: 900, height: 6000), scale: 3)
        XCTAssertLessThan(width, 900)
        let pixels = width * (6000 * width / 900) * 9
        XCTAssertLessThanOrEqual(pixels, MermaidRenderer.maxPixels * 1.001, "within the pixel budget")
    }

    /// The diagram cache is bounded: the least recently used image goes first.
    func testMermaidCacheIsBounded() {
        let renderer = MermaidRenderer.shared
        let image = UIGraphicsImageRenderer(size: CGSize(width: 4, height: 4)).image { _ in }
        for i in 0...MermaidRenderer.maxImages { renderer.store(image, for: "cache-test-\(i)", dark: false) }
        XCTAssertNil(renderer.cachedImage(for: "cache-test-0", dark: false), "the oldest diagram was evicted")
        XCTAssertNotNil(renderer.cachedImage(for: "cache-test-\(MermaidRenderer.maxImages)", dark: false))
    }

    /// The rules that keep the diagram web view offline compile.
    func testMermaidNetworkRulesCompile() {
        let done = expectation(description: "rules compiled")
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "DSEditor.test.offline",
                                                                encodedContentRuleList: MermaidRenderer.networkRules) { list, error in
            XCTAssertNotNil(list, "rules compile: \(String(describing: error))")
            done.fulfill()
        }
        wait(for: [done], timeout: 10)
    }
}
