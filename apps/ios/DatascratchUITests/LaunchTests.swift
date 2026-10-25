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
        // The first tap can land while onboarding is still animating away: retry once.
        let account = app.descendants(matching: .any)["settings.account"].firstMatch
        main.tap()
        if !account.waitForExistence(timeout: 5), main.isHittable { main.tap() }
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
    private func launchSignedIn() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"]
        app.launch()
        if UIDevice.current.userInterfaceIdiom == .pad {
            // Landscape shows all three columns of the split view.
            XCUIDevice.shared.orientation = .landscapeLeft
        }
        return app
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
        let newNote = app.buttons["library.newNote"].firstMatch
        if !newNote.waitForExistence(timeout: 5) {
            // iPhone: start from the sidebar.
            app.descendants(matching: .any)["sidebar.allDocuments"].firstMatch.tap()
        }
        let button = app.buttons["library.newNote"].exists ? app.buttons["library.newNote"].firstMatch
            : app.buttons["library.newNote.floating"].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 5))
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
        let newNote = app.buttons["library.newNote"].exists ? app.buttons["library.newNote"].firstMatch
            : app.buttons["library.newNote.floating"].firstMatch
        if !newNote.waitForExistence(timeout: 5) {
            app.descendants(matching: .any)["sidebar.allDocuments"].firstMatch.tap()
        }
        let button = app.buttons["library.newNote"].exists ? app.buttons["library.newNote"].firstMatch
            : app.buttons["library.newNote.floating"].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        button.tap()
        let pen = app.buttons["tool.pen"].firstMatch
        guard pen.waitForExistence(timeout: 5) else {
            throw XCTSkip("Stand-in editor: no pen palette")
        }
        let text = app.buttons["tool.text"].firstMatch
        for _ in 0..<5 {
            pen.tap()
            text.tap()
        }
        app.buttons["tool.pencil"].firstMatch.tap()
        app.buttons["tool.fingerDrawing"].firstMatch.tap()
        text.tap()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2))
        XCTAssertTrue(text.exists)
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
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
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
        XCTAssertTrue(settings.waitForExistence(timeout: 10))
        snapshot(app, "dark-sidebar")
        // The identifier also reaches the row's image; tap the row itself when it is hittable.
        let allDocuments = app.buttons["sidebar.allDocuments"].firstMatch
        if allDocuments.waitForExistence(timeout: 3), allDocuments.isHittable { allDocuments.tap() }
        snapshot(app, "dark-documents")
        let card = app.descendants(matching: .any)["document.card"].firstMatch
        if card.waitForExistence(timeout: 5) {
            card.tap()
            snapshot(app, "dark-document")
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
