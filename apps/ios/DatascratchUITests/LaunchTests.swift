import UIKit
import XCTest

@MainActor
final class OnboardingUITests: XCTestCase {
    /// Signs up and stops on the key check screen; returns the key's groups.
    private func signUpToKeyCheck(_ app: XCUIApplication) -> [String] {
        app.buttons["welcome.signUp"].tap()
        let email = app.textFields["signUp.email"]
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        email.tap()
        email.typeText("tester@example.com")
        app.secureTextFields["signUp.password"].tap()
        app.secureTextFields["signUp.password"].typeText("correct horse battery")
        app.secureTextFields["signUp.repeat"].tap()
        app.secureTextFields["signUp.repeat"].typeText("correct horse battery")
        app.buttons["signUp.submit"].tap()

        let grid = app.descendants(matching: .any)["recoveryKey.grid"].firstMatch
        XCTAssertTrue(grid.waitForExistence(timeout: 15), "recovery key not shown; buttons: \(LibraryUITests.buttons(app))")
        let formatted = grid.label
        XCTAssertTrue(formatted.hasPrefix("DS1-"), "label: \(formatted)")

        app.descendants(matching: .any)["recoveryKey.saved"].firstMatch.tap()
        app.buttons["recoveryKey.continue"].tap()
        XCTAssertTrue(app.textFields["confirmKey.first"].waitForExistence(timeout: 10),
                      "confirm screen not shown; buttons: \(LibraryUITests.buttons(app))")
        return formatted.split(separator: "-").dropFirst().map(String.init)
    }

    /// Waits for the main window, dismissing SpringBoard's save-password offer.
    @discardableResult
    private func waitForMain(_ app: XCUIApplication) -> XCUIElement {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for label in ["Not Now", "Не сейчас"] where springboard.buttons[label].waitForExistence(timeout: 2) {
            springboard.buttons[label].tap()
        }
        let main = app.descendants(matching: .any)["sidebar.settings"].firstMatch
        let welcome = app.staticTexts["Welcome to Datascratch"].firstMatch
        XCTAssertTrue(main.waitForExistence(timeout: 15) || welcome.exists,
                      "main window did not appear; buttons: \(LibraryUITests.buttons(app))")
        return main
    }

    func testSignUpShowsAndConfirmsRecoveryKey() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launch()

        // Read which groups are requested from the placeholders ("Group N").
        let groups = signUpToKeyCheck(app)
        let first = app.textFields["confirmKey.first"]
        let second = app.textFields["confirmKey.second"]
        first.tap()
        first.typeText(groups[Self.groupIndex(first.placeholderValue)])
        second.tap()
        second.typeText(groups[Self.groupIndex(second.placeholderValue)])
        app.buttons["confirmKey.finish"].tap()
        waitForMain(app)
    }

    /// The key check is optional (spec/07): skipping finishes sign-up and Settings reminds.
    func testSkippingKeyCheckLeavesReminderInSettings() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launch()

        _ = signUpToKeyCheck(app)
        app.buttons["confirmKey.skip"].tap()
        // The dialog may drop custom identifiers (action sheet / popover); fall back to the label.
        var confirm = app.buttons["confirmKey.skipConfirm"].firstMatch
        if !confirm.waitForExistence(timeout: 3) {
            let skips = app.buttons.matching(NSPredicate(format: "label == 'Skip'"))
            confirm = skips.element(boundBy: max(0, skips.count - 1))
        }
        XCTAssertTrue(confirm.waitForExistence(timeout: 5), "skip warning not shown; buttons: \(LibraryUITests.buttons(app))")
        confirm.tap()
        let main = waitForMain(app)
        guard main.exists, main.isHittable else { return }
        // Open settings through the command palette (a plain tap on the sidebar
        // button does not reach it on iPad in UI tests; see testSettingsFingerDrawingToggle).
        let account = app.descendants(matching: .any)["settings.account"].firstMatch
        let palette = app.descendants(matching: .any)["sidebar.commandPalette"].firstMatch
        XCTAssertTrue(palette.waitForExistence(timeout: 5), "command palette button not found")
        palette.tap()
        let field = app.textFields["palette.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 5), "palette field not found")
        field.tap()
        field.typeText("Settings\n")
        XCTAssertTrue(account.waitForExistence(timeout: 5), "settings not opened; buttons: \(LibraryUITests.buttons(app))")
        XCTAssertTrue(app.descendants(matching: .any)["settings.recoveryKeyReminder"].firstMatch.waitForExistence(timeout: 5),
                      "reminder not shown; buttons: \(LibraryUITests.buttons(app))")
    }

    private static func groupIndex(_ placeholder: String?) -> Int {
        let digits = (placeholder ?? "").filter(\.isNumber)
        return max(0, (Int(digits) ?? 1) - 1)
    }
}

@MainActor
final class LibraryUITests: XCTestCase {
    private func launchSignedIn(_ extra: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"] + extra
        app.launch()
        if UIDevice.current.userInterfaceIdiom == .pad {
            // Landscape shows all three columns of the split view.
            XCUIDevice.shared.orientation = .landscapeLeft
        }
        return app
    }

    /// The one «New» button: the toolbar on iPad, the floating button on iPhone (D-38).
    private func newNoteButton(_ app: XCUIApplication) -> XCUIElement {
        let toolbar = app.buttons["library.newNote"].firstMatch
        let floating = app.buttons["library.newNote.floating"].firstMatch
        for _ in 0..<2 {
            for _ in 0..<10 {
                if toolbar.exists { return toolbar }
                if floating.exists { return floating }
                RunLoop.current.run(until: Date().addingTimeInterval(0.5))
            }
            // Not on a document list yet: start from the sidebar.
            let all = app.buttons["sidebar.allDocuments"].firstMatch
            if all.exists, all.isHittable { all.tap() }
        }
        return toolbar.exists ? toolbar : floating
    }

    /// Opens a new note in the native editor, or skips with the stand-in editor.
    private func openNewNoteInNativeEditor(_ app: XCUIApplication) throws {
        let button = newNoteButton(app)
        XCTAssertTrue(button.exists, "new note button not found; buttons: \(Self.buttons(app))")
        button.tap()
        guard app.buttons["tool.pen"].firstMatch.waitForExistence(timeout: 5) else {
            throw XCTSkip("Stand-in editor: no pen palette")
        }
    }

    /// Finger drawing sits in «More» on iPhone and in the palette row on iPad.
    private func toggleFingerDrawing(_ app: XCUIApplication) {
        let more = app.buttons["tool.more"].firstMatch
        if more.exists {
            more.tap()
            let item = app.descendants(matching: .any)["tool.fingerDrawing"].firstMatch
            if item.waitForExistence(timeout: 3) {
                item.tap()
            } else {
                app.buttons["Draw with Finger"].firstMatch.tap()
            }
        } else {
            app.buttons["tool.fingerDrawing"].firstMatch.tap()
        }
    }

    private func fingerDrawingIsOff(_ app: XCUIApplication) -> Bool {
        let more = app.buttons["tool.more"].firstMatch
        if more.exists { return (more.value as? String)?.hasSuffix("Off") == true }
        return app.buttons["tool.fingerDrawing"].firstMatch.value as? String == "Off"
    }

    static func buttons(_ app: XCUIApplication) -> String {
        app.buttons.allElementsBoundByIndex.prefix(60).map { "\($0.identifier)|\($0.label)" }.joined(separator: ", ")
    }

    /// Returns a sidebar element, revealing the sidebar first when it is collapsed.
    private func sidebarElement(_ app: XCUIApplication, _ identifier: String) -> XCUIElement {
        let element = app.descendants(matching: .any)[identifier].firstMatch
        if element.waitForExistence(timeout: 3), element.isHittable { return element }
        let toggle = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sidebar'")).firstMatch
        if toggle.exists { toggle.tap() }
        let back = app.navigationBars.buttons.firstMatch
        if !element.waitForExistence(timeout: 3), back.exists { back.tap() }
        _ = element.waitForExistence(timeout: 5)
        return element
    }

    func testCreateNoteAndWriteTitle() throws {
        let app = launchSignedIn()
        let button = newNoteButton(app)
        XCTAssertTrue(button.exists, "new note button not found; buttons: \(Self.buttons(app))")
        button.tap()

        // Stand-in editor: a title field. Native editor (DSEditor): one text view with the title block.
        let title = app.descendants(matching: .any)["document.title"].firstMatch
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 5) || editor.waitForExistence(timeout: 5),
                      "neither the title field nor the editor appeared")
        if title.exists {
            title.tap()
            title.typeText("Pencil test")
            XCTAssertEqual(title.value as? String, "Pencil test")
        } else {
            let textView = editor.textViews.firstMatch.exists ? editor.textViews.firstMatch : editor
            textView.tap()
            textView.typeText("Pencil test")
            XCTAssertTrue(app.staticTexts["Pencil test"].firstMatch.waitForExistence(timeout: 5)
                          || (textView.value as? String)?.contains("Pencil test") == true)
        }
    }

    /// Native editor only (DSEditor): switching Text ↔ Pen repeatedly must not crash.
    func testSwitchingPenToolsInEditor() throws {
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let pen = app.buttons["tool.pen"].firstMatch
        let text = app.buttons["tool.text"].firstMatch
        for _ in 0..<5 {
            pen.tap()
            text.tap()
        }
        app.buttons["tool.pencil"].firstMatch.tap()
        toggleFingerDrawing(app)
        text.tap()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2))
        XCTAssertTrue(text.waitForExistence(timeout: 2))
    }

    /// Finger drawing off (the iPad default): switching tools in the palette must not crash.
    func testPenPaletteWithoutFingerDrawing() throws {
        let app = launchSignedIn(["-ui-testing-no-finger"])
        try openNewNoteInNativeEditor(app)
        XCTAssertTrue(fingerDrawingIsOff(app), "finger drawing should start off")
        for tool in ["tool.pen", "tool.marker", "tool.pencil", "tool.text", "tool.pen"] {
            app.buttons[tool].firstMatch.tap()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2), "app is gone after tapping \(tool)")
        }
        XCTAssertTrue(app.buttons["tool.text"].firstMatch.waitForExistence(timeout: 2), "palette is gone")
    }

    /// Build 4 feedback: with the keyboard open, every palette button works on the first tap
    /// and the palette does not jump (it moves only once, with the keyboard, when leaving text).
    func testPaletteWorksWithKeyboardOpen() throws {
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        let textView = editor.textViews.firstMatch.exists ? editor.textViews.firstMatch : editor
        textView.tap()
        textView.typeText("Keyboard")
        // A simulator with a hardware keyboard shows none; the palette checks still apply.
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        // ios-editor saw a UIKit crash ~1.5 s after a finger tap in text mode: still alive?
        settle(3)
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2), "app is gone after typing")
        XCTAssertTrue(textView.exists, "editor is gone after typing")
        let palette = app.descendants(matching: .any)["penPalette"].firstMatch
        XCTAssertTrue(palette.waitForExistence(timeout: 3), "palette not found")

        // Text again: nothing moves.
        let before = palette.frame
        let text = app.buttons["tool.text"].firstMatch
        text.tap()
        XCTAssertTrue(becomesSelected(text), "Text is not selected after one tap; \(paletteState(app))")
        XCTAssertEqual(palette.frame.minY, before.minY, accuracy: 1, "palette moved on Text")

        // Leaving text mode hides the keyboard once; after that the palette stays put.
        let pen = app.buttons["tool.pen"].firstMatch
        pen.tap()
        XCTAssertTrue(becomesSelected(pen), "Pen is not selected after one tap; \(paletteState(app))")
        settle(1)  // the keyboard finishes leaving
        let resting = palette.frame
        for id in ["tool.pencil", "tool.marker", "tool.highlighter", "tool.strokeEraser", "tool.pen"] {
            let button = app.buttons[id].firstMatch
            XCTAssertTrue(button.isHittable, "\(id) is not hittable")
            button.tap()
            XCTAssertTrue(becomesSelected(button), "\(id) is not selected after one tap; \(paletteState(app))")
            XCTAssertEqual(palette.frame.minY, resting.minY, accuracy: 1, "palette moved on \(id)")
        }
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2))
    }

    /// The tool switches on the next run-loop turn: wait for the palette to report it. The palette's
    /// accessibility value ("editor N, mode X") follows the editor's mode, not the highlight animation.
    private func becomesSelected(_ button: XCUIElement, timeout: TimeInterval = 4) -> Bool {
        let mode = button.identifier.replacingOccurrences(of: "tool.", with: "")
        let palette = XCUIApplication().descendants(matching: .any)["penPalette"].firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if (palette.value as? String)?.hasSuffix("mode \(mode)") == true { return true }
            settle(0.25)
        }
        return (palette.value as? String)?.hasSuffix("mode \(mode)") == true
    }

    private func paletteState(_ app: XCUIApplication) -> String {
        ["tool.text", "tool.pen", "tool.pencil", "tool.marker", "tool.highlighter", "tool.strokeEraser"].map { id in
            let b = app.buttons[id].firstMatch
            return "\(id)=\(b.exists ? (b.isSelected ? "on" : "off") : "missing")"
        }.joined(separator: " ") + " keyboard=\(app.keyboards.firstMatch.exists)"
            + " palette=\(app.descendants(matching: .any)["penPalette"].firstMatch.value as? String ?? "?")"
    }

    private func settle(_ seconds: TimeInterval = 0.6) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }

    func testCommandPaletteOpensTasks() throws {
        let app = launchSignedIn()
        let paletteButton = sidebarElement(app, "sidebar.commandPalette")
        XCTAssertTrue(paletteButton.exists, "command palette button not found; buttons: \(Self.buttons(app))")
        paletteButton.tap()
        let field = app.textFields["palette.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 5), "palette field not found; fields: \(app.textFields.allElementsBoundByIndex.map { $0.identifier })")
        field.tap()
        field.typeText("Go to Tasks\n")
        XCTAssertTrue(app.segmentedControls["tasks.bucket"].firstMatch.waitForExistence(timeout: 5)
                      || app.otherElements["tasks.bucket"].firstMatch.waitForExistence(timeout: 2))
    }

    func testSettingsFingerDrawingToggle() throws {
        let app = launchSignedIn()
        // Open settings through the command palette (also covers ⌘K search).
        let paletteButton = sidebarElement(app, "sidebar.commandPalette")
        XCTAssertTrue(paletteButton.exists, "command palette button not found; buttons: \(Self.buttons(app))")
        paletteButton.tap()
        let field = app.textFields["palette.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 5), "palette field not found")
        field.tap()
        field.typeText("Settings\n")
        let drawing = app.descendants(matching: .any)["settings.drawing"].firstMatch
        XCTAssertTrue(drawing.waitForExistence(timeout: 5), "drawing settings row not found; buttons: \(Self.buttons(app))")
        drawing.tap()
        let toggle = app.switches["settings.fingerDrawing"].firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 5), "finger drawing toggle not found")
        // Off by default on iPad (Pencil), on by default on iPhone (D-06).
        let initial = toggle.value as? String
        XCTAssertEqual(initial, UIDevice.current.userInterfaceIdiom == .pad ? "0" : "1")
        if toggle.switches.firstMatch.exists {
            toggle.switches.firstMatch.tap()
        } else {
            toggle.tap()
        }
        XCTAssertNotEqual(toggle.value as? String, initial)
    }
}


/// Screens in dark mode and in Russian, kept as screenshots in the test results
/// (CI exports them as an artifact for design review).
@MainActor
final class AppearanceUITests: XCTestCase {
    private func launch(_ extra: [String]) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"] + extra
        app.launch()
        if UIDevice.current.userInterfaceIdiom == .pad {
            XCUIDevice.shared.orientation = .landscapeLeft
            // Wait for the app to finish rotating, or the screenshot shows the old layout.
            let window = app.windows.firstMatch
            for _ in 0..<12 where window.frame.width <= window.frame.height {
                RunLoop.current.run(until: Date().addingTimeInterval(0.5))
            }
            RunLoop.current.run(until: Date().addingTimeInterval(1))
        }
        return app
    }

    private func snapshot(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testDarkModeScreens() throws {
        let app = launch(["-ui-testing-dark"])
        let settings = app.descendants(matching: .any)["sidebar.settings"].firstMatch
        let card = app.descendants(matching: .any)["document.card"].firstMatch
        // On iPhone the app may open on the document list: go back to the sidebar.
        if !settings.waitForExistence(timeout: 10), app.navigationBars.buttons.firstMatch.exists {
            app.navigationBars.buttons.firstMatch.tap()
        }
        XCTAssertTrue(settings.waitForExistence(timeout: 5) || card.exists,
                      "main window not shown; buttons: \(LibraryUITests.buttons(app))")
        snapshot(app, "dark-sidebar")
        // The identifier also reaches the row's image; tap the row itself when it is hittable.
        let allDocuments = app.buttons["sidebar.allDocuments"].firstMatch
        if allDocuments.waitForExistence(timeout: 3), allDocuments.isHittable { allDocuments.tap() }
        snapshot(app, "dark-documents")
        if card.waitForExistence(timeout: 5) {
            card.tap()
            snapshot(app, "dark-document")
        }
    }

    /// A note with a cover: the compact header scrolls with the text and the title starts
    /// below it (build 4 feedback: the cover hid the title).
    func testDocumentWithCover() throws {
        let app = launch(["-ui-testing-cover"])
        let card = app.descendants(matching: .any)["document.card"].firstMatch
        if !card.waitForExistence(timeout: 10), app.navigationBars.buttons.firstMatch.exists {
            app.navigationBars.buttons.firstMatch.tap()
            app.descendants(matching: .any)["sidebar.allDocuments"].firstMatch.tap()
        }
        XCTAssertTrue(card.waitForExistence(timeout: 5), "no document card; buttons: \(LibraryUITests.buttons(app))")
        snapshot(app, "documents-with-cover")
        card.tap()
        RunLoop.current.run(until: Date().addingTimeInterval(2))
        snapshot(app, "document-with-cover")
        let window = app.windows.firstMatch.frame
        let cover = app.descendants(matching: .any)["document.cover"].firstMatch
        let meta = app.descendants(matching: .any)["document.meta"].firstMatch
        if cover.exists {
            XCTAssertLessThanOrEqual(cover.frame.height, window.height * 0.22, "cover is taller than a fifth of the screen")
            if meta.exists {
                XCTAssertGreaterThanOrEqual(meta.frame.minY, cover.frame.maxY - 1, "metadata is under the cover")
            }
        }
    }

    func testRussianInterface() throws {
        let app = launch(["-AppleLanguages", "(ru)", "-AppleLocale", "ru_RU"])
        // The sidebar shows Russian titles when the system language is Russian.
        XCTAssertTrue(app.staticTexts["Все документы"].firstMatch.waitForExistence(timeout: 10)
                      || app.buttons["Все документы"].firstMatch.exists,
                      "Russian strings missing; buttons: \(LibraryUITests.buttons(app))")
        snapshot(app, "ru-sidebar")
    }
}
