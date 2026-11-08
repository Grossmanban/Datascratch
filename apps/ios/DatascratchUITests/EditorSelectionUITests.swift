import XCTest

/// Build 37 feedback: dragging a selection handle (or the caret) to the edge of the text scrolled
/// far too fast, and the text moved by itself after the finger lifted. A bare editor with a long
/// note (`-bareEditorProbeLong`) shows its scroll offset and the drift since the last lift.
final class EditorSelectionUITests: XCTestCase {
    override func tearDown() async throws {
        await MainActor.run { XCUIDevice.shared.orientation = .portrait }
        try await super.tearDown()
    }

    @MainActor
    func testDraggingToTheEdgeScrollsAtAPaceAndStopsOnLift() throws {
        try dragToTheEdge(landscape: false)
    }

    /// Landscape with the keyboard leaves a strip of text: still paced, and still after the lift.
    @MainActor
    func testDraggingToTheEdgeInLandscapeWithTheKeyboard() throws {
        try dragToTheEdge(landscape: true)
    }

    @MainActor
    private func dragToTheEdge(landscape: Bool) throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-bareEditorProbe", "-bareEditorProbeLong"]
        app.launch()
        let editor = app.descendants(matching: .any)["bareEditor"].firstMatch
        XCTAssertTrue(editor.waitForExistence(timeout: 15), "bare editor not shown")
        let text = editor.textViews.firstMatch.exists ? editor.textViews.firstMatch : editor
        text.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        RunLoop.current.run(until: Date().addingTimeInterval(1))

        let offset = app.staticTexts["bareEditor.offset"]
        let drift = app.staticTexts["bareEditor.drift"]
        XCTAssertTrue(offset.waitForExistence(timeout: 5), "no offset reading")
        let before = Int(offset.label) ?? 0

        // The bottom of the text the person sees: above the keyboard when it is up.
        let frame = text.frame
        let keyboard = app.keyboards.firstMatch
        let bottom = keyboard.exists && keyboard.frame.minY > frame.minY ? min(keyboard.frame.minY, frame.maxY) : frame.maxY
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let start = origin.withOffset(CGVector(dx: frame.midX, dy: frame.minY + (bottom - frame.minY) * 0.4))
        let edge = origin.withOffset(CGVector(dx: frame.midX, dy: bottom - 6))
        let hold: TimeInterval = 2
        // A long press picks up the caret (as a handle would be), then it is held at the edge.
        start.press(forDuration: 0.8, thenDragTo: edge, withVelocity: .slow, thenHoldForDuration: hold)

        let after = Int(offset.label) ?? 0
        let moved = after - before
        // Paced (`EditorView.autoscrollMaxSpeed`, 700 pt/s): at most the hold plus the drag at top
        // speed — not screens at a time.
        XCTAssertLessThanOrEqual(moved, Int(700 * (hold + 1.5)), "autoscrolled \(moved) pt (\(before) → \(after))")
        XCTAssertGreaterThanOrEqual(moved, -2, "autoscroll went the wrong way (\(before) → \(after))")
        RunLoop.current.run(until: Date().addingTimeInterval(1))
        let moves = Int(drift.label) ?? -1
        XCTAssertGreaterThanOrEqual(moves, 0, "no drift reading")
        XCTAssertLessThanOrEqual(moves, 3, "the text moved \(moves) pt by itself after the finger lifted")
        XCTAssertEqual(app.state, .runningForeground)
    }
}
