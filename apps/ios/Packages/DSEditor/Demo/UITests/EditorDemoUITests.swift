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
        try typing(extraArguments: [])
    }

    // Temporary bisection of the demo-only crash. The app's UI test (testPaletteWorksWithKeyboardOpen)
    // types without crashing; these variants copy its steps, then one more difference each: a new
    // empty note, an editor created in text mode, the app's document model (Yrs), no tool palette.
    @MainActor
    func testTypingBisectAppSteps() throws {
        try appStyleTyping(extraArguments: [])
    }

    @MainActor
    func testTypingBisectAppStepsEmptyNote() throws {
        try appStyleTyping(extraArguments: ["-sampleEmpty"])
    }

    @MainActor
    func testTypingBisectAppStepsStartInText() throws {
        try appStyleTyping(extraArguments: ["-startInText"])
    }

    @MainActor
    func testTypingBisectAppStepsCoreDocument() throws {
        try appStyleTyping(extraArguments: ["-coreDocument"])
    }

    @MainActor
    func testTypingBisectAppStepsNoPalette() throws {
        try appStyleTyping(extraArguments: ["-noPalette"])
    }

    /// Only the editor in the window: no palette, no navigation bar.
    @MainActor
    func testTypingBisectAppStepsBareEditor() throws {
        try appStyleTyping(extraArguments: ["-noPalette", "-noNavigation"])
    }

    /// The app test's steps: no tool switch, a tap in the middle of the text view, typing, 3 s wait.
    @MainActor
    private func appStyleTyping(extraArguments: [String]) throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting"] + extraArguments
        app.launch()
        let editor = app.textViews["editor.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        editor.tap()
        editor.typeText("Keyboard")
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        sleep(3)
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2), "app is gone after typing")
        XCTAssertTrue((editor.value as? String ?? "").contains("Keyboard"))
    }

    @MainActor
    private func typing(extraArguments: [String], undo: Bool = true) throws {
        let app = XCUIApplication()
        app.launchArguments = ["-uiTesting"] + extraArguments
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
        if undo { app.navigationBars.buttons["undo"].tap() }
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
        XCTAssertTrue(app.buttons["tool.marker"].isSelected, "the palette button really switches the tool")
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
            XCTAssertTrue(app.buttons[id].isSelected, "\(id) responds to the first tap")
            XCTAssertEqual(offsetLabel.label, offset, "tapping \(id) does not scroll the note")
        }
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
}
