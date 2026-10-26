import XCTest

/// Experiment for ios-editor: does a bare `EditorView` (no app screens around it) crash inside
/// the app process the way it does in the demo after a finger tap and typing?
final class BareEditorProbeTests: XCTestCase {
    func testBareEditorSurvivesTapAndTyping() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-bareEditorProbe"]
        app.launch()

        let editor = app.descendants(matching: .any)["bareEditor"].firstMatch
        XCTAssertTrue(editor.waitForExistence(timeout: 10), "bare editor not shown")
        let text = editor.textViews.firstMatch.exists ? editor.textViews.firstMatch : editor
        text.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        app.typeText("Ink")
        RunLoop.current.run(until: Date().addingTimeInterval(3))
        XCTAssertEqual(app.state, .runningForeground, "the app is gone after tapping and typing in the bare editor")
        XCTAssertTrue(editor.exists, "the bare editor is gone")
    }
}
