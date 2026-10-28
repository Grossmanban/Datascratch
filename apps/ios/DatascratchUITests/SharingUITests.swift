import XCTest

/// D-54: sharing with other accounts — invitations, «Shared with me», «view only», and the
/// «People» part of Share (on-device stand-in service, `-ui-testing-sharing`).
final class SharingUITests: XCTestCase {
    private func launch(_ extra: [String]) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in", "-ui-testing-sharing"] + extra
        app.launch()
        return app
    }

    /// A note shared «view only» opens with the banner and without the pen palette.
    func testViewOnlyNoteHasNoEditingTools() throws {
        let app = launch(["-ui-testing-open-shared"])
        let banner = app.descendants(matching: .any)["viewOnly.banner"].firstMatch
        XCTAssertTrue(banner.waitForExistence(timeout: 10), "no «view only» banner")
        XCTAssertFalse(app.descendants(matching: .any)["penPalette"].firstMatch.exists, "the pen palette is shown to a viewer")
        XCTAssertFalse(app.buttons["editor.insert"].firstMatch.exists, "Insert is offered to a viewer")
        // The owner opened «Shared plans» to their agents: ✨ in the note's header (shown only).
        let agents = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] %@", "opened this notebook to AI agents")).firstMatch
        XCTAssertTrue(agents.waitForExistence(timeout: 3), "no ✨ on a note the owner's agents read")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "view-only"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// The owner invites someone by email: the invitation shows under «Invited».
    func testOwnerInvitesByEmail() throws {
        let app = launch(["-ui-testing-open-own"])
        let share = app.buttons["Share"].firstMatch
        XCTAssertTrue(share.waitForExistence(timeout: 10), "no Share button")
        share.tap()
        let email = app.textFields["share.email"].firstMatch
        XCTAssertTrue(email.waitForExistence(timeout: 5), "no email field in Share")
        email.tap()
        email.typeText("kate@example.org")
        app.buttons["share.invite"].firstMatch.tap()
        let invited = app.descendants(matching: .any)["share.invite.row"].firstMatch
        XCTAssertTrue(invited.waitForExistence(timeout: 5), "the invitation is not listed")
        XCTAssertTrue(app.staticTexts["kate@example.org"].exists, "the invited email is not shown")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "share-people"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// An invitation waits in «Shared with me»; accepting it takes it off the list.
    func testAcceptingAnInvitation() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        let invitations = revealSidebarElement(app, "sidebar.invitations")
        XCTAssertTrue(invitations.exists, "no Invitations row in the sidebar")
        invitations.tap()
        let accept = app.buttons["invitation.accept"].firstMatch
        if !accept.waitForExistence(timeout: 5), invitations.exists, invitations.isHittable { invitations.tap() }
        let sheetOpen = app.descendants(matching: .any)["invitations"].firstMatch.exists
        XCTAssertTrue(accept.waitForExistence(timeout: 5),
                      sheetOpen ? "no Accept button in Invitations" : "tapping the row did not open Invitations")
        accept.tap()
        XCTAssertTrue(app.descendants(matching: .any)["sidebar.sharedPending"].firstMatch.waitForExistence(timeout: 5)
                      || app.descendants(matching: .any)["sidebar.sharedNotebook"].firstMatch.waitForExistence(timeout: 2),
                      "the accepted notebook is not in «Shared with me»")
    }

    /// prod 2026-10-28: a shared notebook opened from «Shared with me» lists its notes.
    func testSharedNotebookListsItsNotes() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        let row = revealSidebarElement(app, "sidebar.sharedNotebook")
        XCTAssertTrue(row.exists, "no shared notebook in the sidebar")
        // The identifier lands on the row's icon and text: tap the cell holding them.
        let cell = app.cells.containing(.any, identifier: "sidebar.sharedNotebook").firstMatch
        (cell.exists ? cell : row).tap()
        XCTAssertTrue(app.staticTexts["Roadmap"].firstMatch.waitForExistence(timeout: 5),
                      "the shared notebook lists none of its notes")
    }

    /// ✨ on a shared notebook the owner opened to their agents (D-54), in «Shared with me».
    func testSharedNotebookShowsTheAgentsBadge() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        let row = revealSidebarElement(app, "sidebar.sharedNotebook")
        XCTAssertTrue(row.exists, "no shared notebook in the sidebar")
        let agents = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] %@", "opened this notebook to AI agents")).firstMatch
        XCTAssertTrue(agents.waitForExistence(timeout: 3), "no ✨ on the shared notebook")
    }

    /// An invitation link (`ds://`, D-56) starts the app (cold start): the invitation opens with «Accept».
    func testInvitationLinkOpensTheInvitation() throws {
        let app = launch(["-ui-testing-open-url", "ds://invite/0192f3c4-0000-7000-8000-00000000a11e"])
        let sheet = app.descendants(matching: .any)["invitationLink"].firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 10), "the invitation link opened nothing")
        let accept = app.buttons["invitation.accept"].firstMatch
        XCTAssertTrue(accept.waitForExistence(timeout: 5), "no Accept for the linked invitation")
        accept.tap()
        XCTAssertTrue(sheet.waitForNonExistence(timeout: 5), "the invitation stayed open after Accept")
    }

    /// A link of another server than the account's says so, with a way to the browser.
    func testLinkOfAnotherServerSaysSo() throws {
        let app = launch(["-ui-testing-open-url", "ds://invite/abc?server=notes.example.org"])
        // Alert buttons carry no identifiers on iPhone: found by their titles.
        let alert = app.alerts["This link is from another server"].firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10), "no message about another server's link")
        XCTAssertTrue(alert.buttons["Open in Browser"].exists, "no way to the browser in the message")
        XCTAssertTrue(alert.staticTexts.containing(NSPredicate(format: "label CONTAINS 'notes.example.org'")).firstMatch.exists,
                      "the message does not name the link's server")
    }

    private func revealSidebarElement(_ app: XCUIApplication, _ identifier: String) -> XCUIElement {
        let element = app.descendants(matching: .any)[identifier].firstMatch
        if element.waitForExistence(timeout: 5), element.isHittable { return element }
        let toggle = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sidebar' AND NOT (label CONTAINS[c] 'hide')")).firstMatch
        if toggle.exists { toggle.tap() }
        let back = app.navigationBars.buttons.firstMatch
        if !element.waitForExistence(timeout: 2), back.exists { back.tap() }
        for _ in 0..<4 where !element.exists || !element.isHittable {
            app.swipeUp()
        }
        _ = element.waitForExistence(timeout: 3)
        return element
    }
}
