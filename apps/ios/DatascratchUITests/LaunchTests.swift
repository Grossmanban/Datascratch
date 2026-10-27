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

    // MARK: D-49: the server field

    private func launchToSignIn(_ extra: [String]) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-server", "https://sync.example.org"] + extra
        app.launch()
        app.buttons["welcome.signIn"].tap()
        XCTAssertTrue(app.textFields["signIn.server"].waitForExistence(timeout: 5), "no Server field on Sign In")
        return app
    }

    private func replaceServer(_ app: XCUIApplication, with text: String) {
        let field = app.textFields["signIn.server"]
        field.tap()
        let current = (field.value as? String) ?? ""
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 2))
        field.typeText(text + "\n")
    }

    /// The build's server is filled in.
    func testServerFieldStartsWithTheDefaultServer() throws {
        let app = launchToSignIn([])
        XCTAssertEqual(app.textFields["signIn.server"].value as? String, "sync.example.org")
    }

    /// A plain http:// address (not localhost) is refused before anything is sent.
    func testServerFieldRefusesAnInsecureAddress() throws {
        let app = launchToSignIn([])
        replaceServer(app, with: "http://notes.example.org")
        XCTAssertTrue(app.descendants(matching: .any)["signIn.serverError"].firstMatch.waitForExistence(timeout: 5),
                      "no error for an http:// address")
    }

    /// Another server is checked and shown by name and version before signing in.
    func testServerFieldChecksACustomServer() throws {
        let app = launchToSignIn(["-ui-testing-health-ok"])
        replaceServer(app, with: "notes.example.net")
        let info = app.descendants(matching: .any)["signIn.serverInfo"].firstMatch
        XCTAssertTrue(info.waitForExistence(timeout: 5), "the server was not checked")
        XCTAssertTrue(info.label.contains("notes.example.net"), "info: \(info.label)")
    }

    private static func groupIndex(_ placeholder: String?) -> Int {
        let digits = (placeholder ?? "").filter(\.isNumber)
        return max(0, (Int(digits) ?? 1) - 1)
    }
}

@MainActor
final class LibraryUITests: XCTestCase {
    /// D-51: tasks, calendar and tabs are the extended mode; their tests turn it on.
    static let extendedMode = ["-ds-extended-mode", "YES"]

    private func launchSignedIn(_ extra: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"] + extra
        app.launch()
        if UIDevice.current.userInterfaceIdiom == .pad, !keepsOrientation {
            // Landscape shows all three columns of the split view.
            XCUIDevice.shared.orientation = .landscapeLeft
        }
        return app
    }

    /// Set by `rotate`: the test chose its orientation.
    private var keepsOrientation = false

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

    /// Finger drawing sits in «More» in the compact palette and in the row when it is wide.
    private func toggleFingerDrawing(_ app: XCUIApplication) {
        let more = app.buttons["tool.more"].firstMatch
        if more.exists { more.tap() }
        let finger = app.descendants(matching: .any)["tool.finger"].firstMatch
        if finger.waitForExistence(timeout: 3) { finger.tap() }
        // Close the popover.
        if more.exists, app.descendants(matching: .any)["tool.finger"].firstMatch.exists {
            app.descendants(matching: .any)["editor"].firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)).tap()
        }
    }

    /// The palette reports "editor N, mode X, finger on|off".
    private func fingerDrawingIsOff(_ app: XCUIApplication) -> Bool {
        let value = app.descendants(matching: .any)["penPalette"].firstMatch.value as? String
        return value?.hasSuffix("finger off") == true
    }

    static func buttons(_ app: XCUIApplication) -> String {
        app.buttons.allElementsBoundByIndex.prefix(60).map { "\($0.identifier)|\($0.label)" }.joined(separator: ", ")
    }

    /// Returns a sidebar element, revealing the sidebar first when it is collapsed.
    private func sidebarElement(_ app: XCUIApplication, _ identifier: String) -> XCUIElement {
        // The identifier lands on the row's icon and text, not on the row: tap the cell holding
        // them (the icon alone is not hittable on iPad).
        let cell = app.cells.containing(.any, identifier: identifier).firstMatch
        let any = app.descendants(matching: .any)[identifier].firstMatch
        func best() -> XCUIElement { cell.exists ? cell : any }
        if any.waitForExistence(timeout: 3), best().isHittable { return best() }
        let toggle = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sidebar' AND NOT (label CONTAINS[c] 'hide')")).firstMatch
        if toggle.exists { toggle.tap() }
        let back = app.navigationBars.buttons.firstMatch
        if !any.waitForExistence(timeout: 3), back.exists { back.tap() }
        _ = any.waitForExistence(timeout: 5)
        return best()
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

    /// spec/04, like Apple Notes: a new note starts with the caret in its title; Return in an
    /// empty title gives it the default («Note Oct 26, 2026») and goes to the text; a new note
    /// left with nothing in it is not kept.
    func testNewNoteTitleLikeAppleNotes() throws {
        let app = launchSignedIn()
        let cards = app.descendants(matching: .any).matching(identifier: "document.card")
        XCTAssertTrue(cards.firstMatch.waitForExistence(timeout: 10), "no document list")
        let before = cards.count

        try openNewNoteInNativeEditor(app)
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "the new note's title did not get the caret")
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        let text = editor.textViews.firstMatch
        XCTAssertTrue(text.waitForExistence(timeout: 5), "no text view")
        text.typeText("\nBody")
        let value = { (text.value as? String) ?? "" }
        let titled = NSPredicate { _, _ in
            let v = value()
            return (v.hasPrefix("Note ") || v.hasPrefix("Заметка ")) && v.contains("Body")
        }
        XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: titled, evaluatedWith: nil)], timeout: 5), .completed,
                       "the empty title did not get the default; text: \(value())")
        leaveDocument(app)
        XCTAssertTrue(cards.firstMatch.waitForExistence(timeout: 5), "back to the list")
        XCTAssertEqual(cards.count, before + 1, "the written note is not in the list")

        // A new note left untouched is dropped.
        try openNewNoteInNativeEditor(app)
        settle(1)
        leaveDocument(app)
        XCTAssertTrue(cards.firstMatch.waitForExistence(timeout: 5), "back to the list")
        settle(1)
        XCTAssertEqual(cards.count, before + 1, "an empty new note was kept")
    }

    /// spec/05: in All Documents a new note goes to the notebook last opened in this space, and
    /// the button says where.
    func testNewNoteGoesToTheLastUsedNotebook() throws {
        let app = launchSignedIn(["-ui-testing-many"])
        _ = sidebarElement(app, "sidebar.allDocuments")
        let more = app.descendants(matching: .any)["sidebar.more.notebooks"].firstMatch
        if more.exists { more.tap() }
        let notebook = app.cells.containing(.staticText, identifier: "nb3").firstMatch
        let label = app.staticTexts["nb3"].firstMatch
        XCTAssertTrue(label.waitForExistence(timeout: 5), "no notebook nb3 in the sidebar")
        (notebook.exists ? notebook : label).tap()
        try openNewNoteInNativeEditor(app)
        leaveDocument(app)

        let all = sidebarElement(app, "sidebar.allDocuments")
        XCTAssertTrue(all.exists, "no All Documents; buttons: \(Self.buttons(app))")
        all.tap()
        let button = newNoteButton(app)
        XCTAssertTrue(button.exists, "no New Note button")
        let says = NSPredicate(format: "value CONTAINS 'nb3'")
        XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: says, evaluatedWith: button)], timeout: 5), .completed,
                       "the New Note button does not say it goes to nb3: \(String(describing: button.value))")
    }

    /// Back to the list: the back button on iPhone, «Close Document» on iPad.
    private func leaveDocument(_ app: XCUIApplication) {
        let close = app.buttons["document.close"].firstMatch
        if UIDevice.current.userInterfaceIdiom == .pad, close.waitForExistence(timeout: 3) {
            close.tap()
        } else {
            app.navigationBars.buttons.firstMatch.tap()
        }
        settle(1)
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
    /// iPhone feedback: while typing, «Hide Keyboard» ends editing; without a keyboard the button
    /// is gone (its slot stays, so nothing moves).
    func testHidingTheKeyboard() throws {
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        let text = editor.textViews.firstMatch.exists ? editor.textViews.firstMatch : editor
        text.tap()
        text.typeText("Keyboard")
        // The button is for the on-screen keyboard; a simulator with a hardware keyboard has none.
        guard app.keyboards.firstMatch.waitForExistence(timeout: 3) else {
            throw XCTSkip("no on-screen keyboard (hardware keyboard connected)")
        }
        let hide = app.buttons["editor.hideKeyboard"].firstMatch
        XCTAssertTrue(hide.waitForExistence(timeout: 5) && hide.isHittable, "no Hide Keyboard while typing; buttons: \(Self.buttons(app))")
        let palette = app.descendants(matching: .any)["penPalette"].firstMatch
        let x = palette.frame.minX
        hide.tap()
        settle(1)
        XCTAssertFalse(app.keyboards.firstMatch.exists, "the keyboard is still up")
        let gone = NSPredicate(format: "isHittable == false")
        let offered = XCTWaiter().wait(for: [expectation(for: gone, evaluatedWith: app.buttons["editor.hideKeyboard"].firstMatch)], timeout: 3)
        XCTAssertEqual(offered, .completed, "Hide Keyboard is still offered; format bar shown: \(app.descendants(matching: .any)["formatBar"].firstMatch.exists)")
        XCTAssertEqual(palette.frame.minX, x, accuracy: 1, "the palette moved when the button went")
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2), "app is gone")
    }

    /// Note links open notes (owner, build 14: nothing happened on iPhone): the chip of an
    /// existing note opens it; a literal [[Title]] of a missing note offers to create it.
    func testNoteLinksOpenNotes() throws {
        let app = launchSignedIn(["-ui-testing-links"])
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        XCTAssertTrue(editor.waitForExistence(timeout: 10), "the Links note did not open")
        let text = editor.textViews.firstMatch
        XCTAssertTrue(text.waitForExistence(timeout: 5), "no text view")
        settle(1)

        func linkElement(_ title: String) -> XCUIElement {
            let candidates = [text.links[title].firstMatch, editor.links[title].firstMatch,
                              editor.buttons[title].firstMatch,
                              editor.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch]
            return candidates.first { $0.exists } ?? candidates[0]
        }
        let chip = linkElement("Target")
        XCTAssertTrue(chip.waitForExistence(timeout: 3),
                      "no element for the Target link; editor: \(editor.debugDescription.prefix(3000))")
        chip.tap()
        let opened = NSPredicate(format: "value CONTAINS 'Target body'")
        let navigated = XCTWaiter().wait(for: [expectation(for: opened, evaluatedWith: editor.textViews.firstMatch)], timeout: 5)
        XCTAssertEqual(navigated, .completed, "tapping the note link did not open «Target»")

        // Back to Links: the literal link to a missing note offers to create it.
        let back = app.navigationBars.buttons.firstMatch
        if UIDevice.current.userInterfaceIdiom == .phone, back.exists { back.tap() }
        let links = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'Links'")).firstMatch
        if links.waitForExistence(timeout: 3) { links.tap() }
        let literal = linkElement("Nowhere")
        XCTAssertTrue(literal.waitForExistence(timeout: 5), "no element for the [[Nowhere]] link")
        literal.tap()
        XCTAssertTrue(app.buttons["Create Note"].waitForExistence(timeout: 5) || app.alerts.firstMatch.waitForExistence(timeout: 2),
                      "a link to a missing note did not offer to create it")
    }

    /// spec/12: a tap on a task's date chip opens the reschedule menu, and the app keeps running
    /// (build 14: the tap did nothing; later it crashed in the menu's gesture).
    func testTaskDateChipOpensTheRescheduleMenu() throws {
        let app = launchSignedIn(["-ui-testing-task-date"] + Self.extendedMode)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        XCTAssertTrue(editor.waitForExistence(timeout: 10), "the Dated note did not open")
        settle(1)
        let chip = editor.descendants(matching: .any)
            .matching(NSPredicate(format: "label BEGINSWITH 'Дата: ' OR label BEGINSWITH 'Дедлайн: '")).firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 5), "no date chip; editor: \(editor.debugDescription.prefix(3000))")
        chip.tap()
        let item = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label IN {'Сегодня', 'Завтра', 'След. неделя', 'Дата…', 'Today', 'Tomorrow', 'Next Week', 'Date…'}")).firstMatch
        XCTAssertTrue(item.waitForExistence(timeout: 10), "the reschedule menu did not open")
        XCTAssertEqual(app.state, .runningForeground, "the app quit after the tap")
    }

    /// spec/05: a notebook's folders show as a strip above its documents; a tap opens the folder,
    /// whose own subfolders and breadcrumb then show.
    func testFolderStripNavigates() throws {
        let app = launchSignedIn(["-ui-testing-folders"])
        let strip = app.descendants(matching: .any)["library.folderStrip"].firstMatch
        // The seeded scene starts on the notebook's list (iPhone too).
        XCTAssertTrue(strip.waitForExistence(timeout: 5), "no folder strip; buttons: \(Self.buttons(app))")
        let projects = app.buttons["folderCard.Projects"].firstMatch
        XCTAssertTrue(projects.exists && projects.isHittable, "no Projects card")
        projects.tap()
        let drafts = app.buttons["folderCard.Drafts"].firstMatch
        XCTAssertTrue(drafts.waitForExistence(timeout: 3), "the strip did not show Projects' subfolder")
        drafts.tap()
        let crumb = app.descendants(matching: .any)["library.breadcrumb"].firstMatch
        XCTAssertTrue(crumb.waitForExistence(timeout: 3), "no breadcrumb inside a nested folder")
        XCTAssertFalse(app.descendants(matching: .any)["library.folderStrip"].firstMatch.exists, "a strip without subfolders")
    }

    /// D-48: spaces are isolated — the starred note and the open tab of «Personal» are not shown
    /// in «Work» and come back with «Personal».
    func testSpacesKeepTheirStarredAndTabs() throws {
        let app = launchSignedIn(Self.extendedMode)
        // A tab in «Personal»; first-run seeding starred the welcome note there.
        try openNewNoteInNativeEditor(app)
        // Written in, so leaving it keeps the note (an empty new note is dropped).
        app.typeText("Tab note")
        let switcher = app.descendants(matching: .any)["sidebar.spaceSwitcher"].firstMatch
        // iPhone: choosing a space shows its documents; come back to the sidebar each time.
        func showSidebar() {
            for _ in 0..<3 where !(switcher.exists && switcher.isHittable) {
                let toggle = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sidebar' AND NOT (label CONTAINS[c] 'hide')")).firstMatch
                if toggle.exists && toggle.isHittable { toggle.tap() } else if app.navigationBars.buttons.firstMatch.exists { app.navigationBars.buttons.firstMatch.tap() }
                settle(1)
            }
        }
        showSidebar()
        XCTAssertTrue(switcher.waitForExistence(timeout: 5) && switcher.isHittable, "no space switcher; buttons: \(Self.buttons(app))")
        let starred = app.descendants(matching: .any)["sidebar.starredNote"].firstMatch
        let tab = app.descendants(matching: .any)["sidebar.tab"].firstMatch
        XCTAssertTrue(starred.waitForExistence(timeout: 5), "no starred note in Personal")
        XCTAssertTrue(tab.exists, "no tab in Personal")

        func choose(_ name: String) {
            showSidebar()
            switcher.tap()
            let item = app.buttons[name].firstMatch
            XCTAssertTrue(item.waitForExistence(timeout: 3), "no \(name) in the space menu; buttons: \(Self.buttons(app))")
            item.tap()
            settle(1)
            showSidebar()
        }
        choose("Work")
        XCTAssertFalse(starred.exists, "Personal's starred note shows in Work")
        XCTAssertFalse(tab.exists, "Personal's tab shows in Work")
        choose("Personal")
        XCTAssertTrue(starred.waitForExistence(timeout: 3), "the starred note did not come back with Personal")
        XCTAssertTrue(tab.waitForExistence(timeout: 3), "the tab did not come back with Personal")
    }

    /// spec/04: the format bar shows while text is written and lights the marks it switches on.
    func testBoldViaFormatBar() throws {
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        let text = editor.textViews.firstMatch.exists ? editor.textViews.firstMatch : editor
        text.tap()
        text.typeText("Format")
        let bar = app.descendants(matching: .any)["formatBar"].firstMatch
        XCTAssertTrue(bar.waitForExistence(timeout: 5), "no format bar while typing; buttons: \(Self.buttons(app))")
        // The bar sits above the palette, never over it, and stays inside the window.
        let palette = app.descendants(matching: .any)["penPalette"].firstMatch
        let window = app.windows.firstMatch.frame
        if palette.exists {
            XCTAssertLessThanOrEqual(bar.frame.maxY, palette.frame.minY + 1, "format bar overlaps the pen palette")
        }
        // Only the leading edge: the bar scrolls sideways, and the element reports its content.
        XCTAssertGreaterThanOrEqual(bar.frame.minX, window.minX - 1, "format bar starts off screen")
        let bold = bar.buttons["Bold"].firstMatch
        XCTAssertTrue(bold.exists && bold.isHittable, "no Bold on the format bar")
        XCTAssertFalse(bold.isSelected, "Bold is on before it was tapped")
        bold.tap()
        XCTAssertTrue(showsSelected(bold), "Bold is not lit after a tap")
        text.typeText(" bold")
        XCTAssertTrue(bold.isSelected, "Bold went off while typing bold text")
        let heading = bar.buttons["Heading 1"].firstMatch
        if !heading.isHittable { bar.swipeLeft() }
        heading.tap()
        XCTAssertTrue(showsSelected(heading), "Heading 1 is not lit on a heading")
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2), "app is gone")
    }

    /// spec/04: "/" opens the block menu at the caret; typing narrows it, a tap applies the entry.
    func testSlashMenuMakesAHeading() throws {
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        let text = editor.textViews.firstMatch.exists ? editor.textViews.firstMatch : editor
        text.tap()
        text.typeText("Slash\nPlan")
        text.typeText(" /")
        let menu = app.descendants(matching: .any)["slashMenu"].firstMatch
        XCTAssertTrue(menu.waitForExistence(timeout: 5), "no slash menu after typing /")
        text.typeText("h")
        // The filtered menu arrives a moment later and is shorter, so it can move (above or
        // below the caret): a tap on the unfiltered one landed where the entry no longer was (iPad).
        XCTAssertTrue(app.buttons["slash.quote"].firstMatch.waitForNonExistence(timeout: 5), "the menu did not filter for /h")
        settle(0.5)
        let heading = app.buttons["slash.heading2"].firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout: 3) && heading.isHittable, "no «Заголовок 2» for /h")
        heading.tap()
        XCTAssertTrue(menu.waitForNonExistence(timeout: 3), "the slash menu stays after applying an entry")
        let bar = app.descendants(matching: .any)["formatBar"].firstMatch
        if bar.waitForExistence(timeout: 3) {
            let lit = bar.buttons["Heading 2"].firstMatch
            if !lit.isHittable { bar.swipeLeft() }
            XCTAssertTrue(showsSelected(lit), "the paragraph is not a heading 2")
        }
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2), "app is gone")
    }

    /// D-15: the palette folds into a button at the trailing edge (the editor gets the room, the
    /// tool keeps working) and unfolds with a tap.
    func testCollapsingThePenPalette() throws {
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        let palette = app.descendants(matching: .any)["penPalette"].firstMatch
        XCTAssertTrue(palette.waitForExistence(timeout: 5), "palette not found")
        let pen = app.buttons["tool.pen"].firstMatch
        pen.tap()
        XCTAssertTrue(becomesSelected(pen), "Pen is not selected; \(paletteState(app))")
        settle(1)
        let tall = editor.frame.height

        let collapse = app.buttons["penPalette.collapse"].firstMatch
        XCTAssertTrue(collapse.waitForExistence(timeout: 3) && collapse.isHittable, "no fold button; buttons: \(Self.buttons(app))")
        collapse.tap()
        let button = app.buttons["penPalette.collapsed"].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 3), "no folded button")
        settle(1)
        XCTAssertFalse(palette.exists, "the palette is still shown")
        XCTAssertGreaterThan(editor.frame.height, tall + 10, "the editor did not get the room")
        XCTAssertTrue((button.value as? String ?? "").contains("mode pen"), "the tool changed: \(button.value ?? "")")
        let window = app.windows.firstMatch.frame
        XCTAssertGreaterThan(button.frame.midX, window.midX, "the button is not at the trailing edge")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "pen-palette-collapsed"
        shot.lifetime = .keepAlways
        add(shot)

        button.tap()
        XCTAssertTrue(palette.waitForExistence(timeout: 3), "the palette did not come back")
        XCTAssertFalse(button.exists, "the folded button is still shown")
        XCTAssertTrue(becomesSelected(pen), "the tool changed while folded; \(paletteState(app))")
    }

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
        for id in ["tool.pencil", "tool.marker", "tool.highlighter", "tool.eraser", "tool.pen"] {
            let button = app.buttons[id].firstMatch
            XCTAssertTrue(button.isHittable, "\(id) is not hittable")
            button.tap()
            XCTAssertTrue(becomesSelected(button), "\(id) is not selected after one tap; \(paletteState(app))")
            // The highlight follows too (build 4 on iPad: «Text» stayed highlighted).
            XCTAssertTrue(showsSelected(button), "\(id) works but is not shown as selected; \(paletteState(app))")
            // Bottom edge: the toolbar may change its own height by a point or two per tool.
            XCTAssertEqual(palette.frame.maxY, resting.maxY, accuracy: 1, "palette moved on \(id)")
        }

        // A colour: the editor takes it and the palette shows it.
        let more = app.buttons["tool.more"].firstMatch
        if more.exists { more.tap() }
        let red = app.descendants(matching: .any)["color.red"].firstMatch
        XCTAssertTrue(red.waitForExistence(timeout: 3), "no red swatch; \(paletteState(app))")
        red.tap()
        let reportsRed = { (palette.value as? String)?.contains("color ink.red") == true }
        let deadline = Date().addingTimeInterval(4)
        while !reportsRed(), Date() < deadline { settle(0.25) }
        XCTAssertTrue(reportsRed(), "red is not the pen colour; \(paletteState(app))")
        if red.exists { XCTAssertTrue(showsSelected(red), "red is not shown as selected") }
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 2))
    }

    /// The tool switches on the next run-loop turn: wait for the palette to report it. The palette's
    /// accessibility value ("editor N, mode X") follows the editor's mode, not the highlight animation.
    private func becomesSelected(_ button: XCUIElement, timeout: TimeInterval = 4) -> Bool {
        var mode = button.identifier.replacingOccurrences(of: "tool.", with: "")
        if mode == "eraser" { mode = "strokeEraser" }
        let palette = XCUIApplication().descendants(matching: .any)["penPalette"].firstMatch
        let reports = { (palette.value as? String)?.contains("mode \(mode),") == true }
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if reports() { return true }
            settle(0.25)
        }
        return reports()
    }

    private func showsSelected(_ element: XCUIElement, timeout: TimeInterval = 3) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if element.isSelected { return true }
            settle(0.25)
        }
        return element.isSelected
    }

    private func paletteState(_ app: XCUIApplication) -> String {
        ["tool.text", "tool.pen", "tool.pencil", "tool.marker", "tool.highlighter", "tool.eraser"].map { id in
            let b = app.buttons[id].firstMatch
            return "\(id)=\(b.exists ? (b.isSelected ? "on" : "off") : "missing")"
        }.joined(separator: " ") + " keyboard=\(app.keyboards.firstMatch.exists)"
            + " palette=\(app.descendants(matching: .any)["penPalette"].firstMatch.value as? String ?? "?")"
    }

    private func settle(_ seconds: TimeInterval = 0.6) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }

    /// iPad (build 4 feedback): in a narrow editor column the text and the palette stay inside
    /// the column, «Full Screen» gives the document the whole width and back.
    func testEditorColumnOnIPad() throws {
        try checkEditorColumn(.portrait)
    }

    func testEditorColumnOnIPadLandscape() throws {
        try checkEditorColumn(.landscapeLeft)
    }

    /// Turns the iPad before launch; the next test starts in portrait again.
    private func rotate(_ orientation: UIDeviceOrientation) {
        keepsOrientation = true
        XCUIDevice.shared.orientation = orientation
        addTeardownBlock { XCUIDevice.shared.orientation = .portrait }
    }

    private func checkEditorColumn(_ orientation: UIDeviceOrientation) throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        rotate(orientation)
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        let palette = app.descendants(matching: .any)["penPalette"].firstMatch
        let window = app.windows.firstMatch.frame

        func checkInside(_ label: String) {
            let column = editor.frame
            XCTAssertGreaterThanOrEqual(column.minX, window.minX - 1, "\(label): editor starts off screen")
            XCTAssertLessThanOrEqual(column.maxX, window.maxX + 1, "\(label): editor ends off screen")
            let text = editor.textViews.firstMatch
            if text.exists {
                XCTAssertGreaterThanOrEqual(text.frame.minX, column.minX - 1, "\(label): text shifted left of the column")
            }
            XCTAssertGreaterThanOrEqual(palette.frame.minX, column.minX - 1, "\(label): palette past the column's left edge")
            XCTAssertLessThanOrEqual(palette.frame.maxX, column.maxX + 1, "\(label): palette past the column's right edge")
        }

        // List | document (D-47): the narrowest editor.
        checkInside("list and document")
        let narrow = editor.frame.width

        let fullScreen = app.buttons["document.fullScreen"].firstMatch
        XCTAssertTrue(fullScreen.waitForExistence(timeout: 3), "no Full Screen button; buttons: \(Self.buttons(app))")
        fullScreen.tap()
        settle(1.5)
        XCTAssertGreaterThan(editor.frame.width, narrow + 100, "Full Screen did not widen the editor")
        XCTAssertGreaterThan(editor.frame.width, window.width * 0.9, "the document is not alone on screen")
        checkInside("full screen")
        fullScreen.tap()
        settle(1.5)
        XCTAssertLessThan(editor.frame.width, window.width * 0.9, "Full Screen did not toggle back")
        checkInside("back from full screen")
    }

    /// iPad: Tasks get the whole width when chosen, come back to the columns and go full
    /// screen again; the segment labels are never cut off (a menu replaces them when narrow).
    func testContentFullScreenOnIPad() throws {
        try checkContentFullScreen(.portrait)
    }

    func testContentFullScreenOnIPadLandscape() throws {
        try checkContentFullScreen(.landscapeLeft)
    }

    /// D-47: Tasks are level 2 — beside the sidebar, the rest of the width; lists carry no
    /// document buttons (no «Full Screen» of their own).
    private func checkContentFullScreen(_ orientation: UIDeviceOrientation) throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        rotate(orientation)
        let app = launchSignedIn(Self.extendedMode)
        let tasks = sidebarElement(app, "sidebar.tasks")
        XCTAssertTrue(tasks.exists, "no Tasks in the sidebar; buttons: \(Self.buttons(app))")
        tasks.tap()
        settle(1.5)
        let bucket = app.descendants(matching: .any)["tasks.bucket"].firstMatch
        XCTAssertTrue(bucket.waitForExistence(timeout: 3))
        let window = app.windows.firstMatch.frame
        XCTAssertTrue(sidebarIsShown(app), "choosing Tasks hid the sidebar")
        XCTAssertGreaterThan(bucket.frame.midX, window.width * 0.35, "Tasks did not take the rest of the width")
        let truncated = app.buttons.allElementsBoundByIndex.prefix(40).filter { $0.label.hasSuffix("…") && $0.label.count <= 3 }
        XCTAssertTrue(truncated.isEmpty, "cut-off labels: \(truncated.map(\.label))")
        XCTAssertEqual(app.buttons.matching(identifier: "content.fullScreen").count, 0, "a list has its own Full Screen")
    }

    /// The sidebar is on screen (not hidden or off the edge).
    private func sidebarIsShown(_ app: XCUIApplication) -> Bool {
        let row = app.cells.containing(.any, identifier: "sidebar.allDocuments").firstMatch
        return row.exists && row.isHittable && row.frame.minX >= 0
    }

    /// D-15 column rules: only the sidebar button hides the sidebar; opening and closing a
    /// document leave it alone; Full Screen hides it and the list, and leaving brings back the
    /// same layout.
    func testColumnRulesOnIPad() throws {
        try checkColumnRules(.portrait)
    }

    func testColumnRulesOnIPadLandscape() throws {
        try checkColumnRules(.landscapeLeft)
    }

    private func checkColumnRules(_ orientation: UIDeviceOrientation) throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        rotate(orientation)
        let app = launchSignedIn()
        let window = app.windows.firstMatch.frame
        XCTAssertTrue(app.cells.containing(.any, identifier: "sidebar.allDocuments").firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(sidebarIsShown(app), "no sidebar at launch (sidebar | list)")

        // Opening a document: list | document, the sidebar slides away.
        try openNewNoteInNativeEditor(app)
        settle(1)
        let editor = app.descendants(matching: .any)["editor"].firstMatch
        XCTAssertFalse(sidebarIsShown(app), "the sidebar stayed beside the document")
        XCTAssertTrue(app.descendants(matching: .any)["workspace.list"].firstMatch.exists, "no list beside the document")
        XCTAssertEqual(app.buttons.matching(identifier: "document.fullScreen").count, 1, "Full Screen is not the document's alone")
        let beside = editor.frame

        // The sidebar button: back to sidebar | list, the document waits.
        let sidebarButton = app.buttons["workspace.sidebar"].firstMatch
        XCTAssertTrue(sidebarButton.waitForExistence(timeout: 3), "no sidebar button; buttons: \(Self.buttons(app))")
        sidebarButton.tap()
        settle(1.5)
        XCTAssertTrue(sidebarIsShown(app), "the sidebar button did not bring the sidebar back")
        XCTAssertFalse(editor.exists, "the sidebar is beside the document")
        let card = app.descendants(matching: .any)["document.card"].firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 3), "no document card")
        card.tap()
        XCTAssertTrue(editor.waitForExistence(timeout: 5), "the document did not come back")
        settle(1)
        XCTAssertFalse(sidebarIsShown(app), "the sidebar stayed beside the document")

        // Full Screen and back: the same list | document.
        let fullScreen = app.buttons["document.fullScreen"].firstMatch
        fullScreen.tap()
        settle(1.5)
        XCTAssertGreaterThan(editor.frame.width, window.width * 0.9, "the document is not alone on screen")
        fullScreen.tap()
        settle(1.5)
        XCTAssertEqual(editor.frame.minX, beside.minX, accuracy: 2, "the layout is not as before")
        XCTAssertEqual(editor.frame.width, beside.width, accuracy: 2, "the layout is not as before")

        // × closes the document itself: sidebar | list.
        let close = app.buttons["document.close"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 3), "no Close Document button")
        close.tap()
        settle(1.5)
        XCTAssertFalse(editor.exists, "the document is still open")
        XCTAssertTrue(sidebarIsShown(app), "closing the document did not bring the sidebar back")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "levels-\(orientation == .portrait ? "portrait" : "landscape")"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// iPad: closing the document gives the screen beside it the whole width.
    func testClosingTheDocumentOnIPad() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let close = app.buttons["document.close"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 3), "no Close Document button; buttons: \(Self.buttons(app))")
        close.tap()
        settle(1.5)
        XCTAssertFalse(app.descendants(matching: .any)["editor"].firstMatch.exists, "the document is still open")
        let card = app.descendants(matching: .any)["document.card"].firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 3), "the document list is not shown")
        XCTAssertTrue(sidebarIsShown(app), "closing the document did not bring back sidebar | list")
    }

    /// iPad (build 8 feedback): after closing a document (list on the whole width), showing the
    /// sidebar and picking a notebook shows the list once — never a second copy in place of the
    /// document — and the sidebar's last row is not under the footer.
    func testNotebookListShowsOnceOnIPad() throws {
        try checkNotebookListShowsOnce(.portrait)
    }

    func testNotebookListShowsOnceOnIPadLandscape() throws {
        try checkNotebookListShowsOnce(.landscapeLeft)
    }

    private func checkNotebookListShowsOnce(_ orientation: UIDeviceOrientation) throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        rotate(orientation)
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let close = app.buttons["document.close"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 3), "no Close Document button")
        close.tap()
        settle(1.5)

        let notebook = sidebarElement(app, "sidebar.notebook")
        XCTAssertTrue(notebook.exists, "no notebook in the sidebar; buttons: \(Self.buttons(app))")
        notebook.tap()
        settle(1.5)
        XCTAssertEqual(app.buttons.matching(identifier: "library.newNote").count, 1, "the list shows more than once")
        XCTAssertEqual(app.buttons.matching(identifier: "content.fullScreen").count, 0, "a list has its own Full Screen")

        // The last sidebar row stays clear of the footer.
        let trash = sidebarElement(app, "sidebar.trash")
        let footer = app.descendants(matching: .any)["sidebar.footer"].firstMatch
        XCTAssertTrue(trash.exists && footer.exists, "no Trash or footer")
        // Scroll the sidebar to its end: the last row must stop above the footer.
        let firstRow = app.cells.containing(.any, identifier: "sidebar.allDocuments").firstMatch
        firstRow.swipeUp()
        firstRow.swipeUp()
        settle(1)
        XCTAssertLessThanOrEqual(trash.frame.maxY, footer.frame.minY + 1, "Trash is under the footer")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "notebook-list-once-\(orientation == .portrait ? "portrait" : "landscape")"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// Build 8 feedback: the sync status row in Account is one line high (the status no longer
    /// wraps letter by letter beside its label).
    func testAccountSyncStatusRowIsCompact() throws {
        let app = launchSignedIn()
        let palette = sidebarElement(app, "sidebar.commandPalette")
        XCTAssertTrue(palette.waitForExistence(timeout: 5), "command palette button not found")
        palette.tap()
        let field = app.textFields["palette.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 5), "palette field not found")
        field.tap()
        field.typeText("Settings\n")
        let account = app.descendants(matching: .any)["settings.account"].firstMatch
        XCTAssertTrue(account.waitForExistence(timeout: 5), "no Account row")
        account.tap()
        let status = app.descendants(matching: .any).matching(identifier: "sync.status").element(boundBy: 0)
        XCTAssertTrue(status.waitForExistence(timeout: 5), "no sync status in Account")
        XCTAssertLessThan(status.frame.height, 60, "the status row is \(status.frame.height) pt tall")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "account-settings"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// D-49: Settings shows the server of this device's account.
    func testSettingsShowsTheServer() throws {
        let app = launchSignedIn(["-ui-testing-server", "https://sync.example.org"])
        let palette = sidebarElement(app, "sidebar.commandPalette")
        XCTAssertTrue(palette.waitForExistence(timeout: 5), "command palette button not found")
        palette.tap()
        let field = app.textFields["palette.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 5), "palette field not found")
        field.tap()
        field.typeText("Settings\n")
        let account = app.descendants(matching: .any)["settings.account"].firstMatch
        XCTAssertTrue(account.waitForExistence(timeout: 5), "no Account row")
        account.tap()
        let server = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'sync.example.org' OR value CONTAINS 'sync.example.org'")).firstMatch
        XCTAssertTrue(server.waitForExistence(timeout: 5), "Settings does not show the server")
    }

    /// Tabs close with their own button.
    func testClosingATab() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad: sidebar beside the document") }
        let app = launchSignedIn(Self.extendedMode)
        try openNewNoteInNativeEditor(app)
        let showSidebar = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sidebar' AND NOT (label CONTAINS[c] 'hide')")).firstMatch
        if showSidebar.exists { showSidebar.tap(); settle(1) }
        let close = app.buttons["tab.close"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 5), "no tab close button; buttons: \(Self.buttons(app))")
        let count = app.buttons.matching(identifier: "tab.close").count
        close.tap()
        settle(1)
        XCTAssertEqual(app.buttons.matching(identifier: "tab.close").count, count - 1, "the tab did not close")
    }

    /// «Open in New Window» shows the document, not an empty (black) window.
    func testOpenInNewWindowShowsTheDocument() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("multiple windows: iPad") }
        let app = launchSignedIn()
        try openNewNoteInNativeEditor(app)
        let more = app.buttons["document.more"].firstMatch
        XCTAssertTrue(more.waitForExistence(timeout: 3), "no document menu; buttons: \(Self.buttons(app))")
        more.tap()
        let item = app.buttons["Open in New Window"].firstMatch
        XCTAssertTrue(item.waitForExistence(timeout: 3), "no Open in New Window item")
        item.tap()
        settle(3)
        guard app.windows.count >= 2 else { throw XCTSkip("the simulator did not open a second window") }
        let editors = app.descendants(matching: .any).matching(identifier: "editor")
        XCTAssertGreaterThanOrEqual(editors.count, 2, "the new window shows no document")
    }

    func testCommandPaletteOpensTasks() throws {
        let app = launchSignedIn(Self.extendedMode)
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

    /// §12.6: a crowded section shows its first rows and «N more», opens in full and back, folds
    /// from its title; tags form a tree and «All Tags» lists them all.
    func testCrowdedSidebarSectionsFold() throws {
        // iPad in portrait: the opened list fits on screen (rows of a lazy list off screen do not exist).
        if UIDevice.current.userInterfaceIdiom == .pad { rotate(.portrait) }
        let app = launchSignedIn(["-ui-testing-many"])
        let more = sidebarElement(app, "sidebar.more.notebooks")
        XCTAssertTrue(more.exists, "no «N more» under the notebooks; buttons: \(Self.buttons(app))")
        let rows = app.descendants(matching: .any).matching(identifier: "sidebar.notebook")
        let before = rows.count
        more.tap()
        let opened = NSPredicate { _, _ in rows.count > before }
        XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: opened, evaluatedWith: nil)], timeout: 5), .completed,
                       "no more notebooks after «N more»")
        // The list is lazy: «Show Less» at its end exists once scrolled to.
        let less = app.descendants(matching: .any)["sidebar.less.notebooks"].firstMatch
        if !less.waitForExistence(timeout: 2) { app.cells.firstMatch.swipeUp() }
        XCTAssertTrue(less.waitForExistence(timeout: 3), "no «Show Less» after the notebooks")
        less.tap()
        if !more.waitForExistence(timeout: 2) { app.cells.firstMatch.swipeDown() }
        XCTAssertTrue(more.waitForExistence(timeout: 3), "«Show Less» did not fold the list back")

        let header = app.descendants(matching: .any)["sidebar.section.notebooks"].firstMatch
        if !header.waitForExistence(timeout: 2) { app.cells.firstMatch.swipeDown() }
        XCTAssertTrue(header.waitForExistence(timeout: 3), "no notebooks title")
        header.tap()
        XCTAssertTrue(rows.firstMatch.waitForNonExistence(timeout: 3), "the notebooks did not fold")
        header.tap()
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 3), "the notebooks did not unfold")

        let allTags = app.descendants(matching: .any)["sidebar.allTags"].firstMatch
        if !allTags.isHittable { app.swipeUp() }
        XCTAssertTrue(allTags.waitForExistence(timeout: 3), "no «All Tags»")
        allTags.tap()
        let tag = app.descendants(matching: .any).matching(identifier: "allTags.tag").firstMatch
        XCTAssertTrue(tag.waitForExistence(timeout: 5), "«All Tags» lists no tags")
        // The list is lazy (only rows on screen exist): search finds a nested tag.
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 3), "no search in «All Tags»")
        search.tap()
        search.typeText("group/child5")
        let nested = app.descendants(matching: .any).matching(identifier: "allTags.tag").firstMatch
        XCTAssertTrue(nested.waitForExistence(timeout: 3) && nested.label.contains("group/child5"),
                      "«All Tags» does not list the nested tag; first: \(nested.label)")
    }

    /// D-51: by default the app is notes only — no Tasks, Calendar or tabs, and opening a note
    /// leaves no tab behind.
    func testNotesOnlyByDefault() throws {
        let app = launchSignedIn()
        let all = sidebarElement(app, "sidebar.allDocuments")
        XCTAssertTrue(all.exists, "no All Documents; buttons: \(Self.buttons(app))")
        XCTAssertFalse(app.descendants(matching: .any)["sidebar.tasks"].firstMatch.exists, "Tasks shown in the notes-only app")
        XCTAssertFalse(app.descendants(matching: .any)["sidebar.calendar"].firstMatch.exists, "Calendar shown in the notes-only app")
        all.tap()
        try openNewNoteInNativeEditor(app)
        // Something in it, so leaving does not drop it (an empty new note is not kept).
        app.typeText("Kept")
        // iPhone: back from the document and the list to the sidebar.
        let allRow = app.descendants(matching: .any)["sidebar.allDocuments"].firstMatch
        for _ in 0..<3 where !(allRow.exists && allRow.isHittable) {
            let back = app.navigationBars.buttons.firstMatch
            if back.exists { back.tap() }
            settle(1)
        }
        let again = sidebarElement(app, "sidebar.allDocuments")
        XCTAssertTrue(again.exists, "the sidebar did not come back; buttons: \(Self.buttons(app))")
        XCTAssertFalse(app.descendants(matching: .any)["sidebar.tab"].firstMatch.exists, "opening a note made a tab")
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
        // Rotate before launch so the app starts in landscape and screenshots match it.
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
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
        // The screen, not the app element: its image follows the device orientation.
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
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
