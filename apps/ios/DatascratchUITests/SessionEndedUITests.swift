import XCTest

/// The server ended this device's session from another device: the app says so plainly,
/// keeps the library, and offers to sign in again.
final class SessionEndedUITests: XCTestCase {
    func testRevokedDeviceSaysSoAndKeepsTheLibrary() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in", "-ui-testing-session-ended"]
        app.launch()

        let title = app.staticTexts["sessionEnded.title"].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 10), "no «signed out on this device» screen")
        XCTAssertTrue(app.buttons["sessionEnded.signIn"].exists, "no Sign In button")
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = "session-ended"
        screenshot.lifetime = .keepAlways
        add(screenshot)

        // «Later»: the library is still there, and the badge reopens the sheet.
        app.buttons["sessionEnded.later"].firstMatch.tap()
        XCTAssertTrue(app.descendants(matching: .any)["document.card"].firstMatch.waitForExistence(timeout: 5)
                      || app.cells.firstMatch.waitForExistence(timeout: 2), "the library is gone")
        let signIn = app.buttons["sync.signIn"].firstMatch
        if !signIn.exists {
            let toggle = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sidebar' AND NOT (label CONTAINS[c] 'hide')")).firstMatch
            if toggle.exists { toggle.tap() }
            let back = app.navigationBars.buttons.firstMatch
            if !signIn.waitForExistence(timeout: 2), back.exists { back.tap() }
        }
        XCTAssertTrue(signIn.waitForExistence(timeout: 5), "no Sign In in the sync badge")
        signIn.tap()
        XCTAssertTrue(title.waitForExistence(timeout: 5), "the badge does not reopen the sheet")
    }
}
