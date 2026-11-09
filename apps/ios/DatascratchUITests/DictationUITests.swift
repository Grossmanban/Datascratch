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

    /// «Format…» from the document's menu, the voice's way accepted on the first use, «Document».
    private func format(_ app: XCUIApplication) {
        let style = app.buttons["voice.format.document"].firstMatch
        for _ in 0..<2 where !style.exists {
            app.buttons["document.more"].firstMatch.tap()
            let item = app.buttons["document.format"].firstMatch
            XCTAssertTrue(item.waitForExistence(timeout: 5), "no «Format…» in the menu; buttons: \(buttons(app))")
            item.tap()
            let accept = app.buttons["voice.consent.accept"].firstMatch
            if accept.waitForExistence(timeout: 3) {
                accept.tap()
                _ = accept.waitForNonExistence(timeout: 5)
            }
            _ = style.waitForExistence(timeout: 5)
        }
        XCTAssertTrue(style.exists, "no «How to Format?»; buttons: \(buttons(app))")
        style.tap()
        XCTAssertTrue(app.descendants(matching: .any)["voice.format.done"].firstMatch.waitForExistence(timeout: 20),
                      "no «Formatted» card; buttons: \(buttons(app))")
    }

    /// A note without a title takes the model's title with the text; «Reject» takes both back.
    func testFormattingAnUntitledNoteGivesItATitle() throws {
        let app = launch()
        _ = try openNewNote(app)
        app.typeText("\nmilk and bread")
        XCTAssertTrue(waitForText(app, containing: "milk and bread", timeout: 5), "the body was not typed; text: \(value(app))")
        format(app)
        XCTAssertTrue(waitForText(app, containing: "Formatted by Voice", timeout: 5), "no title from the model; text: \(value(app))")
        XCTAssertFalse(app.descendants(matching: .any)["voice.format.title"].firstMatch.exists, "offered a title that is already in")
        app.buttons["voice.format.reject"].firstMatch.tap()
        XCTAssertTrue(waitForText(app, containing: "milk and bread", timeout: 5), "the text did not come back; text: \(value(app))")
        XCTAssertFalse(value(app).contains("Formatted by Voice"), "the title stayed after «Reject»; text: \(value(app))")
    }

    /// A title of the note's own stays; the model's is offered, and «Replace» puts it in.
    func testFormattingOffersANewTitleForANamedNote() throws {
        let app = launch()
        _ = try openNewNote(app)
        app.typeText("Groceries\nmilk and bread")
        XCTAssertTrue(waitForText(app, containing: "milk and bread", timeout: 5), "the note was not typed; text: \(value(app))")
        format(app)
        let offer = app.descendants(matching: .any)["voice.format.title"].firstMatch
        XCTAssertTrue(offer.waitForExistence(timeout: 5), "the model's title is not offered; buttons: \(buttons(app))")
        XCTAssertTrue(value(app).contains("Groceries"), "the note's own title was replaced; text: \(value(app))")
        app.buttons["voice.format.titleReplace"].firstMatch.tap()
        XCTAssertTrue(waitForText(app, containing: "Formatted by Voice", timeout: 5), "«Replace» did not set the title; text: \(value(app))")
        XCTAssertFalse(value(app).contains("Groceries"), "the old title is still there; text: \(value(app))")
        XCTAssertTrue(offer.waitForNonExistence(timeout: 3), "the offer stayed after «Replace»")
    }

    private func settle(_ seconds: TimeInterval) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }
}
