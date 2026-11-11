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

    /// The editor's own text view (the one `testNewNoteTitleLikeAppleNotes` types into).
    private func editorText(_ app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any)["editor"].firstMatch.textViews.firstMatch
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

    private func voiceElements(_ app: XCUIApplication) -> String {
        app.descendants(matching: .any).matching(NSPredicate(format: "identifier CONTAINS 'voice'"))
            .allElementsBoundByIndex.prefix(40).map { "\($0.identifier)|\($0.label)" }.joined(separator: ", ")
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
        // The microphone is idle again before the test ends: terminating the app while it was
        // still winding down failed on CI («Failed to terminate»).
        XCTAssertTrue(stop.waitForNonExistence(timeout: 5), "still hands free after «Stop»")
        XCTAssertTrue(mic.waitForExistence(timeout: 5), "no microphone after «Stop»")
        settle(1)
    }

    /// The recording's placeholder in the text (DSEditor draws it, D-65).
    private func placeholder(_ app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH 'editor.dictationPlaceholder.'")).firstMatch
    }

    /// The owner's bug (build 45): recognition failed and the long piece was gone. Now the
    /// recording's placeholder stays where it was said, «Not recognised»; a tap on it shows the
    /// card with the cause, and «Retry» puts the text in its place.
    func testFailedRecognitionKeepsTheRecordingAndRetryPutsItIn() throws {
        // The first try and the three automatic retries fail; «Retry» gets through.
        let app = launch(["-ui-testing-voice-transcribe-fails", "4"])
        let mic = try openNewNote(app)
        acceptConsent(app, mic: mic)
        mic.press(forDuration: 1.5)
        let chip = placeholder(app)
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "no placeholder in the text for the recording; voice elements: \(voiceElements(app))")
        XCTAssertFalse(value(app).contains("dictated"), "nothing should be in the text yet; text: \(value(app))")
        let card = app.descendants(matching: .any)["voice.pending"].firstMatch
        XCTAssertFalse(card.exists, "the note is open: the placeholder, not the card, stands for the recording")
        // The automatic retries (a second apart here) end failed: then the tap shows the card.
        for _ in 0..<40 where !(chip.exists && chip.label.contains("не распознана")) { settle(0.5) }
        XCTAssertTrue(chip.label.contains("не распознана"), "the placeholder did not show the failure: \(chip.label)")
        let retry = app.buttons["voice.pending.retry"].firstMatch
        for _ in 0..<5 where !retry.exists {
            if chip.label.contains("не распознана") { chip.tap() }
            _ = retry.waitForExistence(timeout: 3)
        }
        XCTAssertTrue(retry.exists, "a tap on the failed placeholder did not show «Retry»; voice elements: \(voiceElements(app))")
        let code = app.descendants(matching: .any)["voice.pending.code"].firstMatch
        XCTAssertTrue(code.exists && code.label.contains("voice_upstream"), "the cause is not shown: \(code.exists ? code.label : "none")")
        for _ in 0..<6 where !value(app).contains("This is dictated text.") {
            if retry.exists, retry.isEnabled, retry.isHittable {
                retry.tap()
            } else if chip.exists, chip.label.contains("не распознана") {
                chip.tap()
            }
            settle(1.5)
        }
        XCTAssertTrue(waitForText(app, containing: "This is dictated text.", timeout: 10),
                      "«Retry» did not put the text in; text: \(value(app))")
        XCTAssertTrue(chip.waitForNonExistence(timeout: 5), "the placeholder stayed after the text went in")
        XCTAssertFalse(card.exists, "the card stayed after the text went in")
    }

    /// Tidying up failed: the transcript goes in as heard instead of nothing.
    func testFailedTidyingInsertsTheTranscriptAsHeard() throws {
        let app = launch(["-ui-testing-voice-clean-fails", "YES"])
        let mic = try openNewNote(app)
        acceptConsent(app, mic: mic)
        mic.press(forDuration: 1.5)
        XCTAssertTrue(waitForText(app, containing: "um so this is dictated text"),
                      "the transcript did not go in as heard; text: \(value(app))")
    }

    /// A recording not recognised is still there after the app is closed and opened again.
    func testKeptRecordingSurvivesARestart() throws {
        var app = launch(["-ui-testing-voice-transcribe-fails", "100"])
        let mic = try openNewNote(app)
        acceptConsent(app, mic: mic)
        mic.press(forDuration: 1.5)
        XCTAssertTrue(placeholder(app).waitForExistence(timeout: 15), "no placeholder for the recording")
        // Kept on disk before it is sent: the restart can come at once.
        settle(2)
        app.terminate()

        app = launch(["-ui-testing-keep-dictations", "-ui-testing-voice-transcribe-fails", "100"])
        let settings = app.buttons["sidebar.settings"].firstMatch
        // iPhone may open on the document list: back to the sidebar.
        if !settings.waitForExistence(timeout: 10), app.barBackButton.exists { app.barBackButton.tap() }
        XCTAssertTrue(settings.waitForExistence(timeout: 5), "no settings button; buttons: \(buttons(app))")
        settings.tap()
        let voice = app.descendants(matching: .any)["settings.voice"].firstMatch
        XCTAssertTrue(voice.waitForExistence(timeout: 5), "no Voice in Settings")
        voice.tap()
        XCTAssertTrue(app.descendants(matching: .any)["voice.pending"].firstMatch.waitForExistence(timeout: 10),
                      "the kept recording is gone after a restart; voice elements: \(voiceElements(app))")
    }

    /// The title (empty: Return gives it the automatic «Note <date>») and «milk and bread» in the
    /// body. As in `testNewNoteTitleLikeAppleNotes`, in one call; the body's keystrokes were
    /// sometimes lost while the caret moved out of the title (iPhone), so they go once more then.
    private func typeNote(_ app: XCUIApplication, title: String) {
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "the new note's title did not get the caret")
        editorText(app).typeText(title + "\nmilk and bread")
        if !waitForText(app, containing: "milk and bread", timeout: 5) {
            editorText(app).typeText("milk and bread")
        }
        XCTAssertTrue(waitForText(app, containing: "milk and bread", timeout: 5), "the body was not typed; text: \(value(app))")
    }

    /// «Format…» from the document's menu, the voice's way accepted on the first use, «Document».
    private func format(_ app: XCUIApplication) {
        let style = app.buttons["voice.format.document"].firstMatch
        let accept = app.buttons["voice.consent.accept"].firstMatch
        for _ in 0..<2 where !style.exists {
            // A closing sheet still in the tree made the menu's query time out (iPad).
            if accept.exists { _ = accept.waitForNonExistence(timeout: 10) }
            app.buttons["document.more"].firstMatch.tap()
            let item = app.buttons["document.format"].firstMatch
            XCTAssertTrue(item.waitForExistence(timeout: 5), "no «Format…» in the menu; buttons: \(buttons(app))")
            item.tap()
            if accept.waitForExistence(timeout: 3) {
                accept.tap()
                XCTAssertTrue(accept.waitForNonExistence(timeout: 10), "the «where your voice goes» sheet did not close")
                // Its dismissal finishes before the next sheet is looked for.
                settle(1)
            }
            _ = style.waitForExistence(timeout: 5)
        }
        XCTAssertTrue(style.exists, "no «How to Format?»; buttons: \(buttons(app))")
        // A tap while the sheet still slides in did nothing and left it open (iPhone, run
        // 43013246765): tap once it is hittable, and again if the sheet is still there.
        _ = waitUntil(5) { style.isHittable }
        style.tap()
        let done = app.descendants(matching: .any)["voice.format.done"].firstMatch
        // Only when the first tap started nothing: a second run would make the first result
        // the «original», and «Reject» would bring back the model's title (iPhone, run 43030735288).
        let working = app.descendants(matching: .any)["voice.format.working"].firstMatch
        if !done.waitForExistence(timeout: 3), !working.exists, !done.exists, style.exists, style.isHittable { style.tap() }
        XCTAssertTrue(done.waitForExistence(timeout: 20),
                      "no «Formatted» card; buttons: \(buttons(app))")
    }

    /// A note without a title takes the model's title with the text; «Reject» takes both back.
    func testFormattingAnUntitledNoteGivesItATitle() throws {
        let app = launch()
        _ = try openNewNote(app)
        // As in `testNewNoteTitleLikeAppleNotes`: the title has the keyboard; Return fills it with
        // the automatic «Note <date>» and moves to the body.
        typeNote(app, title: "")
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
        typeNote(app, title: "Groceries")
        format(app)
        let offer = app.descendants(matching: .any)["voice.format.title"].firstMatch
        XCTAssertTrue(offer.waitForExistence(timeout: 5), "the model's title is not offered; buttons: \(buttons(app))")
        XCTAssertTrue(value(app).contains("Groceries"), "the note's own title was replaced; text: \(value(app))")
        app.buttons["voice.format.titleReplace"].firstMatch.tap()
        // The title is in once the text holds the new one and not the old (polled often: the
        // expectation's one-second polling missed a value that was already there, iPhone).
        let replaced = waitUntil(10) {
            let text = self.value(app)
            return text.contains("Formatted by Voice") && !text.contains("Groceries")
        }
        XCTAssertTrue(replaced, "«Replace» did not set the title; text: \(value(app))")
        XCTAssertTrue(offer.waitForNonExistence(timeout: 3), "the offer stayed after «Replace»")
    }

    private func waitUntil(_ timeout: TimeInterval, _ condition: () -> Bool) -> Bool {
        let end = Date().addingTimeInterval(timeout)
        while Date() < end {
            if condition() { return true }
            settle(0.25)
        }
        return condition()
    }

    private func settle(_ seconds: TimeInterval) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }
}
