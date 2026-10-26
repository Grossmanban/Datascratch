import XCTest

final class EditorDemoUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    @MainActor
    func testDrawStrokeOverTextAndUndo() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting", "-fingerDrawing", "-hud"]
        app.launch()

        let editor = app.textViews["editor.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        let strokes = app.staticTexts["hud.strokes"]
        XCTAssertTrue(strokes.waitForExistence(timeout: 5))
        XCTAssertEqual(strokes.label, "штрихов: 0")

        app.buttons["tool.pen"].tap()
        // Underline across the first paragraph with a finger (finger drawing enabled for the test).
        let start = editor.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.18))
        let end = editor.coordinate(withNormalizedOffset: CGVector(dx: 0.6, dy: 0.18))
        start.press(forDuration: 0.05, thenDragTo: end)

        let predicate = NSPredicate(format: "label == %@", "штрихов: 1")
        expectation(for: predicate, evaluatedWith: strokes)
        waitForExpectations(timeout: 5)

        app.buttons["undo"].tap()
        expectation(for: NSPredicate(format: "label == %@", "штрихов: 0"), evaluatedWith: strokes)
        waitForExpectations(timeout: 5)

        app.buttons["redo"].tap()
        expectation(for: NSPredicate(format: "label == %@", "штрихов: 1"), evaluatedWith: strokes)
        waitForExpectations(timeout: 5)

        // Change the column width: the stroke stays in the document and is re-laid out.
        app.buttons["style"].tap()
        app.buttons["width.full"].tap()
        XCTAssertEqual(strokes.label, "штрихов: 1")
    }

    @MainActor
    func testTypingGoesToDocument() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting"]
        app.launch()
        let editor = app.textViews["editor.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        app.buttons["tool.text"].tap()
        XCTAssertEqual(app.state, .runningForeground, "the app must survive switching to the text tool")
        XCTAssertTrue(editor.waitForExistence(timeout: 10), "editor still reachable after switching tools")
        // Tap into the first body paragraph (not on a block attachment).
        editor.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12)).tap()
        sleep(1)
        editor.typeText("Inkwell")
        XCTAssertTrue((editor.value as? String ?? "").contains("Inkwell"))
        // The software keyboard has its own "undo" key: use the editor's toolbar button.
        app.navigationBars.buttons["undo"].tap()
        XCTAssertEqual(app.state, .runningForeground)
    }

    /// Narrows down the tool-switch crash: an ink-to-ink switch, and the text tool with finger
    /// drawing on (the drawing test switches tools with finger drawing on and passes).
    @MainActor
    func testSwitchBetweenInkTools() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting"]
        app.launch()
        XCTAssertTrue(app.textViews["editor.text"].waitForExistence(timeout: 10))
        app.buttons["tool.marker"].tap()
        sleep(1)
        XCTAssertTrue(app.textViews["editor.text"].waitForExistence(timeout: 5), "app alive after switching to the marker")
        XCTAssertTrue(becomesSelected(app.buttons["tool.marker"]), "the palette button really switches the tool")
        app.buttons["tool.lasso"].tap()
        sleep(1)
        XCTAssertTrue(app.textViews["editor.text"].waitForExistence(timeout: 5), "app alive after switching to the lasso")
    }

    @MainActor
    func testSwitchToTextWithFingerDrawing() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting", "-fingerDrawing"]
        app.launch()
        XCTAssertTrue(app.textViews["editor.text"].waitForExistence(timeout: 10))
        app.buttons["tool.text"].tap()
        sleep(1)
        XCTAssertTrue(app.textViews["editor.text"].waitForExistence(timeout: 5), "app alive after switching to text")
    }

    /// Build 4 feedback (iPhone, text tool, keyboard open): palette taps must hit the palette and
    /// never move the text underneath.
    @MainActor
    func testPaletteTapsWithKeyboardOpenDoNotScroll() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting", "-hud", "-fingerDrawing"]
        app.launch()
        let editor = app.textViews["editor.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        app.buttons["tool.text"].tap()
        editor.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12)).tap()
        sleep(1)
        let offsetLabel = app.staticTexts["hud.offset"]
        XCTAssertTrue(offsetLabel.waitForExistence(timeout: 5))
        let offset = offsetLabel.label
        for id in ["tool.pen", "tool.text", "tool.marker", "tool.lasso", "tool.text"] {
            app.buttons[id].tap()
            XCTAssertTrue(becomesSelected(app.buttons[id]), "\(id) responds to the first tap")
            XCTAssertEqual(offsetLabel.label, offset, "tapping \(id) does not scroll the note")
        }
        XCTAssertEqual(app.state, .runningForeground)
    }

    /// Build 14 feedback (iPhone): a single tap on a note link did nothing. Real taps, keyboard
    /// not shown: the chip opens its note, a literal [[Title]] of a missing note offers to create it.
    @MainActor
    func testTappingNoteLinksOpensThem() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting", "-hud"]
        app.launch()
        let editor = app.textViews["editor.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        app.buttons["tool.text"].tap()
        let links = app.staticTexts["hud.links"]
        XCTAssertTrue(links.waitForExistence(timeout: 5))

        func centre(of kind: String) -> CGPoint? {
            let visible = editor.frame.insetBy(dx: 0, dy: 60)
            for part in links.label.split(separator: ";") {
                let fields = part.split(separator: ":")
                guard fields.count == 2, fields[0] == kind else { continue }
                let xy = fields[1].split(separator: ",").compactMap { Double($0) }
                guard xy.count == 2 else { continue }
                let p = CGPoint(x: xy[0], y: xy[1])
                if visible.contains(p) { return p }
            }
            return nil
        }
        func tap(_ p: CGPoint) {
            app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: p.x, dy: p.y)).tap()
        }
        func find(_ kind: String) -> CGPoint? {
            for _ in 0..<6 {
                if let p = centre(of: kind) { return p }
                // Scrolling also refreshes the HUD's link positions.
                editor.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7))
                    .press(forDuration: 0.05, thenDragTo: editor.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)))
                sleep(1)
            }
            return nil
        }

        let chip = try XCTUnwrap(find("note"), "the note link chip is on screen (links: \(links.label))")
        tap(chip)
        let opened = app.staticTexts["hud.openedNote"]
        XCTAssertTrue(opened.waitForExistence(timeout: 5))
        let openedChip = expectation(for: NSPredicate(format: "label CONTAINS '0192f3c4'"), evaluatedWith: opened)
        wait(for: [openedChip], timeout: 10)
        XCTAssertEqual(app.keyboards.count, 0, "the tap opened the link instead of starting to type")

        let title = try XCTUnwrap(find("title"), "the [[Title]] link is on screen (links: \(links.label))")
        tap(title)
        XCTAssertTrue(app.alerts["Заметки «Новая заметка» нет"].waitForExistence(timeout: 10),
                      "a missing [[Title]] offers to create the note")
        XCTAssertEqual(app.state, .runningForeground)
    }

    @MainActor
    func testOpenLargeNotePerformance() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting", "-large", "-hud"]
        let options = XCTMeasureOptions()
        options.iterationCount = 3
        measure(metrics: [XCTApplicationLaunchMetric()], options: options) {
            app.launch()
        }
    }

    /// The tool switch is applied on the next main-queue turn and the palette re-renders after it:
    /// wait for the selected state instead of reading it once (slow CI simulators).
    @MainActor
    /// The CI simulator can take ~4 s per accessibility snapshot: a 5 s wait then checked the
    /// button once, before it re-rendered (its hierarchy at failure showed it selected).
    private func becomesSelected(_ button: XCUIElement, timeout: TimeInterval = 15) -> Bool {
        let selected = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isSelected == true"), object: button)
        let ok = XCTWaiter.wait(for: [selected], timeout: timeout) == .completed
        if !ok {
            let tree = XCTAttachment(string: XCUIApplication().debugDescription)
            tree.name = "hierarchy when \(button.identifier) was not selected"
            tree.lifetime = .keepAlways
            XCTContext.runActivity(named: "palette state") { $0.add(tree) }
        }
        return ok
    }
}
