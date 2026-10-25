import UIKit
import XCTest

@MainActor
final class OnboardingUITests: XCTestCase {
    func testSignUpShowsAndConfirmsRecoveryKey() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launch()

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
        XCTAssertTrue(grid.waitForExistence(timeout: 5))
        let formatted = grid.label
        XCTAssertTrue(formatted.hasPrefix("DS1-"), "label: \(formatted)")

        app.descendants(matching: .any)["recoveryKey.saved"].firstMatch.tap()
        app.buttons["recoveryKey.continue"].tap()

        // Read which groups are requested from the placeholders ("Group N").
        let groups = formatted.split(separator: "-").dropFirst().map(String.init)
        let first = app.textFields["confirmKey.first"]
        XCTAssertTrue(first.waitForExistence(timeout: 5))
        let second = app.textFields["confirmKey.second"]
        first.tap()
        first.typeText(groups[Self.groupIndex(first.placeholderValue)])
        second.tap()
        second.typeText(groups[Self.groupIndex(second.placeholderValue)])
        app.buttons["confirmKey.finish"].tap()

        XCTAssertTrue(app.staticTexts["Welcome to Datascratch"].firstMatch.waitForExistence(timeout: 10)
                      || app.buttons["sidebar.settings"].waitForExistence(timeout: 5))
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
