import XCTest

/// The document's bar on iPhone (owner, build 46): too many items made iOS fold its end into a
/// pill of its own, and «…» opened only on the second tap. Now the bar holds Insert, who is
/// here, «…» and Close; one tap on «…» opens the menu.
final class DocumentBarUITests: XCTestCase {
    func testOneTapOnMoreOpensTheMenu() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"]
        app.launch()
        let toolbar = app.buttons["library.newNote"].firstMatch
        let floating = app.buttons["library.newNote.floating"].firstMatch
        for _ in 0..<20 where !toolbar.exists && !floating.exists {
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        (toolbar.exists ? toolbar : floating).tap()
        let more = app.buttons["document.more"].firstMatch
        XCTAssertTrue(more.waitForExistence(timeout: 10), "no «…» in the document's bar")
        XCTAssertTrue(more.isHittable, "«…» is not reachable in the bar (folded into the system's overflow?)")
        more.tap()
        let history = app.buttons["Version History"].firstMatch
        XCTAssertTrue(history.waitForExistence(timeout: 3), "one tap on «…» did not open the menu")
        XCTAssertTrue(history.isHittable, "«Version History» is not reachable in the menu")
        if UIDevice.current.userInterfaceIdiom == .phone {
            // Find and Share moved into «…» on iPhone.
            XCTAssertTrue(app.buttons["Share"].firstMatch.exists, "no Share in «…» on iPhone")
            XCTAssertTrue(app.buttons["document.find"].firstMatch.exists, "no Find in «…» on iPhone")
        }
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "document-more-menu"
        shot.lifetime = .keepAlways
        add(shot)
    }
}
