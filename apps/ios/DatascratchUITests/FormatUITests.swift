import XCTest

/// D-65 «Format» with the fake voice server (`-ui-testing`): «…» → «Format…» asks where the text
/// goes once, then «How to Format?»; the result replaces the note highlighted, and «Reject» puts
/// it back.
final class FormatUITests: XCTestCase {
    private func launch() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"]
        app.launch()
        return app
    }

    private func value(_ app: XCUIApplication) -> String {
        (app.textViews.firstMatch.value as? String) ?? ""
    }

    private func wait(_ app: XCUIApplication, timeout: TimeInterval = 8, until done: @escaping (String) -> Bool) -> Bool {
        let predicate = NSPredicate { _, _ in done(self.value(app)) }
        return XCTWaiter().wait(for: [expectation(for: predicate, evaluatedWith: nil)], timeout: timeout) == .completed
    }

    private func openFormat(_ app: XCUIApplication) {
        let more = app.buttons["document.more"].firstMatch
        XCTAssertTrue(more.waitForExistence(timeout: 5), "no «…» in the document")
        more.tap()
        let format = app.buttons["document.format"].firstMatch
        XCTAssertTrue(format.waitForExistence(timeout: 5), "no «Format…» in «…»")
        format.tap()
    }

    func testFormattingTheNoteAndRejectingIt() throws {
        let app = launch()
        let toolbar = app.buttons["library.newNote"].firstMatch
        let floating = app.buttons["library.newNote.floating"].firstMatch
        for _ in 0..<20 where !toolbar.exists && !floating.exists {
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        (toolbar.exists ? toolbar : floating).tap()
        guard app.buttons["tool.pen"].firstMatch.waitForExistence(timeout: 5) else {
            throw XCTSkip("Stand-in editor: no pen palette")
        }
        // The new note's title has the caret: a title, then the body.
        app.typeText("Groceries\nmilk and bread")
        XCTAssertTrue(wait(app) { $0.contains("milk and bread") }, "the body was not typed; text: \(value(app))")

        // The first time: where the text goes.
        openFormat(app)
        let accept = app.buttons["voice.consent.accept"].firstMatch
        XCTAssertTrue(accept.waitForExistence(timeout: 5), "no «where your voice goes» sheet before the first formatting")
        accept.tap()
        XCTAssertTrue(accept.waitForNonExistence(timeout: 5), "the consent sheet did not close")

        openFormat(app)
        let document = app.buttons["voice.format.document"].firstMatch
        XCTAssertTrue(document.waitForExistence(timeout: 5), "no «How to Format?» sheet")
        XCTAssertTrue(app.buttons["voice.format.minutes"].firstMatch.exists, "no «Meeting Minutes» style")
        document.tap()

        // The fake server puts a heading over the text.
        XCTAssertTrue(wait(app) { $0.contains("Document") && $0.contains("milk and bread") },
                      "the formatted text is not in the note; text: \(value(app))")
        let reject = app.buttons["voice.format.reject"].firstMatch
        XCTAssertTrue(reject.waitForExistence(timeout: 5), "no «Reject» after formatting")
        XCTAssertTrue(app.buttons["voice.format.original"].firstMatch.exists, "no «Show Original»")
        reject.tap()
        XCTAssertTrue(wait(app) { !$0.contains("Document") && $0.contains("milk and bread") },
                      "«Reject» did not put the note back; text: \(value(app))")
        XCTAssertTrue(reject.waitForNonExistence(timeout: 5), "the bar stayed after «Reject»")
    }
}
