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

    /// Scrolls the editor until `element` is on screen (pulling toward the top first, then small
    /// steps down so nothing jumps past the screen).
    @MainActor
    private func scrollIntoView(_ element: XCUIElement, in editor: XCUIElement) -> Bool {
        for attempt in 0..<10 {
            if element.exists, editor.frame.insetBy(dx: 0, dy: 60).contains(CGPoint(x: element.frame.midX, y: element.frame.midY)) {
                return true
            }
            let (from, to): (CGFloat, CGFloat) = attempt < 2 ? (0.4, 0.6) : (0.6, 0.45)
            editor.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: from))
                .press(forDuration: 0.05, thenDragTo: editor.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: to)))
            sleep(1)
        }
        return false
    }

    /// The demo HUD's last editor diagnostics, for failure messages (`-hud` launches).
    @MainActor
    private func diagnostics(_ app: XCUIApplication) -> String {
        let e = app.descendants(matching: .any)["hud.diag"]
        return e.exists ? "diag: " + e.label : "diag: (HUD not found)"
    }

    /// A real touch at the centre of an element's frame (not an accessibility activation).
    @MainActor
    private func touch(_ element: XCUIElement, in app: XCUIApplication) {
        let f = element.frame
        app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: f.midX, dy: f.midY)).tap()
    }

    /// Build 14 feedback (iPhone): a single tap on a note link did nothing. Real taps, keyboard
    /// not shown: the chip opens its note, a literal [[Title]] of a missing note offers to create it.
    /// The links are found through their accessibility elements (VoiceOver, spec/05).
    @MainActor
    func testTappingNoteLinksOpensThem() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting", "-hud"]
        app.launch()
        let editor = app.textViews["editor.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        app.buttons["tool.text"].tap()

        let chip = app.links["Идеи"]
        XCTAssertTrue(scrollIntoView(chip, in: editor), "the note link chip is on screen and accessible")
        touch(chip, in: app)
        let opened = app.alerts["Открыть «Идеи»"]
        XCTAssertTrue(opened.waitForExistence(timeout: 10), "the chip opens its note; \(diagnostics(app))")
        XCTAssertEqual(app.keyboards.count, 0, "the tap opened the link instead of starting to type")
        opened.buttons["OK"].tap()

        let title = app.links["Новая заметка"]
        XCTAssertTrue(scrollIntoView(title, in: editor), "the [[Title]] link is on screen and accessible")
        touch(title, in: app)
        XCTAssertTrue(app.alerts["Заметки «Новая заметка» нет"].waitForExistence(timeout: 10),
                      "a missing [[Title]] offers to create the note; \(diagnostics(app))")
        XCTAssertEqual(app.state, .runningForeground)
    }

    /// Build 14 feedback (iPhone): task date chips did nothing on a tap. A real tap opens the
    /// reschedule menu (spec/12: Сегодня / Завтра / След. неделя / Дата…).
    @MainActor
    func testTappingATaskDateChipOpensTheRescheduleMenu() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting", "-hud"]
        app.launch()
        let editor = app.textViews["editor.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        app.buttons["tool.text"].tap()
        let chip = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Дата: ' OR label BEGINSWITH 'Дедлайн: '")).firstMatch
        XCTAssertTrue(scrollIntoView(chip, in: editor), "a date chip is on screen and accessible")
        touch(chip, in: app)
        // The edit menu may page its items: the first ones are always shown.
        let menuItem = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label IN {'Сегодня', 'Завтра', 'След. неделя', 'Дата…'}")).firstMatch
        XCTAssertTrue(menuItem.waitForExistence(timeout: 10), "the reschedule menu opens; \(diagnostics(app))")
        XCTAssertEqual(app.keyboards.count, 0, "the tap opened the menu instead of starting to type")
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
