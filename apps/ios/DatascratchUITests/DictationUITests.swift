import XCTest

/// D-65 dictation with a stand-in microphone (it «hears» a fixed phrase) and a fake voice server
/// (`-ui-testing`): the first hold asks about the voice's way, then a hold puts the server's
/// cleaned text into the note; a slide left leaves nothing; hands free goes on until «Stop».
final class DictationUITests: XCTestCase {
    private func launch(_ extra: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"] + extra
        app.launch()
        return app
    }

    /// A new note in the native editor, ready for the microphone (skips with the stand-in editor).
    private func openNewNote(_ app: XCUIApplication) throws -> XCUIElement {
        let toolbar = app.buttons["library.newNote"].firstMatch
        let floating = app.buttons["library.newNote.floating"].firstMatch
        for _ in 0..<20 where !toolbar.exists && !floating.exists {
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        (toolbar.exists ? toolbar : floating).tap()
        guard app.buttons["tool.pen"].firstMatch.waitForExistence(timeout: 5) else {
            throw XCTSkip("Stand-in editor: no pen palette")
        }
        // Light queries only while a document is open (the whole tree timed out on CI).
        let mic = app.buttons["dictation.mic"].firstMatch
        XCTAssertTrue(mic.waitForExistence(timeout: 5), "no microphone in the document; buttons: \(buttons(app))")
        return mic
    }

    private func text(_ app: XCUIApplication) -> XCUIElement {
        app.textViews.firstMatch
    }

    private func value(_ app: XCUIApplication) -> String {
        (text(app).value as? String) ?? ""
    }

    private func waitForText(_ app: XCUIApplication, containing piece: String, timeout: TimeInterval = 20) -> Bool {
        let predicate = NSPredicate { _, _ in self.value(app).contains(piece) }
        return XCTWaiter().wait(for: [expectation(for: predicate, evaluatedWith: nil)], timeout: timeout) == .completed
    }

    private func acceptConsent(_ app: XCUIApplication, mic: XCUIElement) {
        mic.press(forDuration: 0.3)
        let accept = app.buttons["voice.consent.accept"].firstMatch
        XCTAssertTrue(accept.waitForExistence(timeout: 5), "no «where your voice goes» sheet before the first recording")
        accept.tap()
        XCTAssertTrue(accept.waitForNonExistence(timeout: 5), "the sheet did not close")
    }

    private func buttons(_ app: XCUIApplication) -> String {
        app.buttons.allElementsBoundByIndex.prefix(60).map { "\($0.identifier)|\($0.label)" }.joined(separator: ", ")
    }

    /// «Not Now» records nothing and asks again next time.
    func testNotNowRecordsNothing() throws {
        let app = launch()
        let mic = try openNewNote(app)
        mic.press(forDuration: 0.3)
        let decline = app.buttons["voice.consent.decline"].firstMatch
        XCTAssertTrue(decline.waitForExistence(timeout: 5), "no «Not Now» on the first use")
        decline.tap()
        XCTAssertTrue(decline.waitForNonExistence(timeout: 5), "the sheet did not close")
        mic.press(forDuration: 0.3)
        XCTAssertTrue(app.buttons["voice.consent.accept"].firstMatch.waitForExistence(timeout: 5), "not asked again after «Not Now»")
    }

    /// Hold, speak, let go: the server's cleaned text takes the preview's place in the note.
    func testHoldingTheMicrophoneDictatesIntoTheNote() throws {
        let app = launch()
        let mic = try openNewNote(app)
        acceptConsent(app, mic: mic)
        mic.press(forDuration: 1.5)
        XCTAssertTrue(waitForText(app, containing: "This is dictated text."),
                      "the dictated piece is not in the note; text: \(value(app))")
    }

    /// Slide left while holding: the piece is thrown away.
    func testSlidingLeftCancelsThePiece() throws {
        let app = launch()
        let mic = try openNewNote(app)
        acceptConsent(app, mic: mic)
        let start = mic.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 1.0, thenDragTo: start.withOffset(CGVector(dx: -160, dy: 0)))
        settle(2)
        XCTAssertFalse(value(app).contains("dictated"), "a cancelled piece went into the note; text: \(value(app))")
    }

    /// Slide up while holding: recording goes on hands free until «Stop».
    func testSlidingUpKeepsRecordingUntilStop() throws {
        let app = launch()
        let mic = try openNewNote(app)
        acceptConsent(app, mic: mic)
        let start = mic.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.6, thenDragTo: start.withOffset(CGVector(dx: 0, dy: -120)))
        let stop = app.buttons["Stop Dictation"].firstMatch
        XCTAssertTrue(stop.waitForExistence(timeout: 3), "not hands free after sliding up; buttons: \(buttons(app))")
        XCTAssertTrue(app.buttons["dictation.cancel"].firstMatch.exists, "no Cancel while hands free")
        settle(1)
        XCTAssertFalse(value(app).contains("dictated"), "the piece went in before «Stop»")
        // The button that locked is under the finger's last place: tap where it is now.
        stop.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertTrue(waitForText(app, containing: "This is dictated text."),
                      "the hands-free piece is not in the note after «Stop»; text: \(value(app))")
    }

    private func settle(_ seconds: TimeInterval) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }
}
