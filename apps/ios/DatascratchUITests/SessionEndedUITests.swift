import XCTest

/// The server refused this device's session without revoking it (an expired token): the app
/// says so plainly, keeps the library, and offers to sign in again. A revoked device (D-53)
/// is erased and the welcome screen explains why.
final class SessionEndedUITests: XCTestCase {
    func testRevokedDeviceExplainsTheWipe() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-device-revoked"]
        app.launch()

        let alert = app.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10), "no «device signed out» notice on the welcome screen")
        let message = alert.staticTexts.allElementsBoundByIndex.map(\.label).joined(separator: " ")
        XCTAssertTrue(message.contains("deleted"), "the notice does not say the data was deleted: \(message)")
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = "device-revoked"
        screenshot.lifetime = .keepAlways
        add(screenshot)

        // «Sign In» goes straight to the form.
        alert.buttons["Sign In"].tap()
        XCTAssertTrue(app.textFields["signIn.email"].waitForExistence(timeout: 5), "Sign In does not open the form")
    }

    func testEndedSessionSaysSoAndKeepsTheLibrary() throws {
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
