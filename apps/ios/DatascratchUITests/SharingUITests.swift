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
        settle(1)
        openSharedWithMe(app)
        XCTAssertTrue(app.descendants(matching: .any)["sharedWithMe.pending"].firstMatch.waitForExistence(timeout: 5)
                      || app.descendants(matching: .any)["sharedWithMe.notebook"].firstMatch.waitForExistence(timeout: 2),
                      "the accepted notebook is not in «Shared with me»")
    }

    /// D-63 (owner, 2026-11-08): what is shared one by one is in its own section, from the space
    /// switcher — not in a space's sidebar, All Documents or search.
    func testSharedWithMeIsItsOwnSection() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        XCTAssertTrue(app.navigationBars["All Documents"].firstMatch.waitForExistence(timeout: 5)
                      || app.descendants(matching: .any)["sidebar.spaceSwitcher"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertFalse(app.descendants(matching: .any)["sidebar.sharedNotebook"].firstMatch.exists,
                       "a shared notebook is in the space's sidebar")
        XCTAssertFalse(app.staticTexts["Roadmap"].firstMatch.exists, "a shared note is in the space's All Documents")
        openSharedWithMe(app)
        let notebook = app.descendants(matching: .any)["sharedWithMe.notebook"].firstMatch
        XCTAssertTrue(notebook.waitForExistence(timeout: 5), "the shared notebook is not in «Shared with me»")
        XCTAssertTrue(notebook.label.contains("@"), "the row does not say who shared it: \(notebook.label)")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "shared-with-me"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// The space switcher's «Shared with Me».
    private func openSharedWithMe(_ app: XCUIApplication) {
        _ = openSpaceMenu(app)
        let entry = app.buttons["space.sharedWithMe"].firstMatch
        XCTAssertTrue(entry.waitForExistence(timeout: 3), "no «Shared with Me» in the space switcher")
        entry.tap()
        // The list's own identifier gives way to the column's (`workspace.list`): its title says it.
        XCTAssertTrue(app.navigationBars["Shared with me"].firstMatch.waitForExistence(timeout: 5),
                      "«Shared with me» did not open")
    }

    private func settle(_ seconds: TimeInterval) {
        _ = XCTWaiter().wait(for: [XCTestExpectation(description: "settle")], timeout: seconds)
    }

    /// D-62 (owner, 2026-11-08): accepting an invitation to a shared space opens that space —
    /// its notebooks in the sidebar — not «some time later».
    func testAcceptingASpaceInvitationOpensTheSpace() throws {
        let app = launch(["-ui-testing-space-invite"])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        XCTAssertFalse(app.staticTexts["Team notes"].firstMatch.exists, "the space is open before accepting")
        let invitations = revealSidebarElement(app, "sidebar.invitations")
        XCTAssertTrue(invitations.exists, "no Invitations row in the sidebar")
        invitations.tap()
        let accept = app.buttons["invitation.accept"].firstMatch
        if !accept.waitForExistence(timeout: 5), invitations.exists, invitations.isHittable { invitations.tap() }
        XCTAssertTrue(accept.waitForExistence(timeout: 5), "no Accept button in Invitations")
        accept.tap()
        let notebook = revealSidebarElement(app, "sidebar.notebook")
        XCTAssertTrue(notebook.exists, "no notebook in the sidebar after joining")
        XCTAssertTrue(app.staticTexts["Team notes"].firstMatch.waitForExistence(timeout: 5),
                      "the joined space did not open with its notebook")
    }

    /// prod 2026-10-28: a shared notebook opened from «Shared with me» lists its notes.
    func testSharedNotebookListsItsNotes() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        openSharedWithMe(app)
        let row = app.descendants(matching: .any)["sharedWithMe.notebook"].firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 5), "no shared notebook in «Shared with me»")
        row.tap()
        XCTAssertTrue(app.staticTexts["Roadmap"].firstMatch.waitForExistence(timeout: 5),
                      "the shared notebook lists none of its notes")
    }

    /// ✨ on a shared notebook the owner opened to their agents (D-54), in «Shared with me».
    func testSharedNotebookShowsTheAgentsBadge() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        openSharedWithMe(app)
        let row = app.descendants(matching: .any)["sharedWithMe.notebook"].firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 5), "no shared notebook in «Shared with me»")
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

    // MARK: D-62 shared spaces

    private func openSpaceMenu(_ app: XCUIApplication) -> XCUIElement {
        let switcher = revealSidebarElement(app, "sidebar.spaceSwitcher")
        XCTAssertTrue(switcher.exists, "no space switcher")
        switcher.tap()
        return switcher
    }

    /// One «Create Space» (owner, 2026-11-08; the web's wording): the sheet asks the kind, the name (typed at once,
    /// nothing made without it), glyph and colour with a live preview. Personal: created and open;
    /// for working together: «Invite People» follows.
    func testCreatingASpace() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        _ = openSpaceMenu(app)
        XCTAssertFalse(app.buttons["New Shared Space…"].exists, "two «new space» entries are back")
        let create = app.buttons["space.create"].firstMatch
        XCTAssertTrue(create.waitForExistence(timeout: 3), "no «Create Space» in the switcher")
        create.tap()
        let save = app.buttons["space.save"].firstMatch
        XCTAssertTrue(save.waitForExistence(timeout: 5), "the sheet did not open")
        XCTAssertFalse(save.isEnabled, "a space can be made without a name")
        XCTAssertTrue(app.buttons["space.kind.personal"].exists && app.buttons["space.kind.shared"].exists, "no kind cards")
        let name = app.textFields["space.name"].firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 3), "no name field")
        name.tap()
        name.typeText("Family")
        XCTAssertTrue(app.descendants(matching: .any)["space.preview"].firstMatch.label.contains("Family"),
                      "the preview does not follow the name")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "create-space"
        shot.lifetime = .keepAlways
        add(shot)
        save.tap()
        // iPhone: the new space's list is shown; the switcher is in the sidebar, one step back.
        let switcher = revealSidebarElement(app, "sidebar.spaceSwitcher")
        let isFamily = NSPredicate(format: "value CONTAINS 'Family' OR label CONTAINS 'Family'")
        XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: isFamily, evaluatedWith: switcher)], timeout: 5), .completed,
                       "the new space is not the open one")

        // For working together: «Invite People» follows.
        _ = openSpaceMenu(app)
        app.buttons["space.create"].firstMatch.tap()
        XCTAssertTrue(app.buttons["space.kind.shared"].firstMatch.waitForExistence(timeout: 5))
        app.buttons["space.kind.shared"].firstMatch.tap()
        let name2 = app.textFields["space.name"].firstMatch
        name2.tap()
        name2.typeText("Book club")
        app.buttons["space.save"].firstMatch.tap()
        XCTAssertTrue(app.descendants(matching: .any)["spaceMembers"].firstMatch.waitForExistence(timeout: 5),
                      "inviting people did not follow")
        let skip = app.buttons["space.invite.skip"].firstMatch
        XCTAssertTrue(skip.exists, "no «Skip» on the invite step")
        skip.tap()
    }

    /// A shared space this account joined is in the switcher; its notebook and note open.
    func testJoinedSharedSpaceIsInTheSwitcher() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        _ = openSpaceMenu(app)
        let team = app.buttons["Team"].firstMatch
        XCTAssertTrue(team.waitForExistence(timeout: 3), "no shared space «Team» in the switcher")
        team.tap()
        let notebook = revealSidebarElement(app, "sidebar.notebook")
        XCTAssertTrue(notebook.exists, "the shared space shows no notebook")
        let cell = app.cells.containing(.any, identifier: "sidebar.notebook").firstMatch
        (cell.exists ? cell : notebook).tap()
        XCTAssertTrue(app.staticTexts["Kickoff"].firstMatch.waitForExistence(timeout: 5),
                      "the shared space's notebook lists none of its notes")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "shared-space"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// «Invite to Space…» on a personal space: the invitation is listed; the space is shared.
    func testInvitingToAPersonalSpace() throws {
        let app = launch([])
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        _ = openSpaceMenu(app)
        let invite = app.buttons["Invite to Space…"].firstMatch
        XCTAssertTrue(invite.waitForExistence(timeout: 3), "no «Invite to Space…» for a personal space")
        invite.tap()
        let sheet = app.descendants(matching: .any)["spaceMembers"].firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 5), "the space's people sheet did not open")
        let email = app.textFields["share.email"].firstMatch
        XCTAssertTrue(email.waitForExistence(timeout: 5), "no email field")
        email.tap()
        email.typeText("lena@example.org")
        app.buttons["share.invite"].firstMatch.tap()
        XCTAssertTrue(app.descendants(matching: .any)["share.invite.row"].firstMatch.waitForExistence(timeout: 5),
                      "the invitation is not listed")
        // Now shared: the sheet is the space's members.
        XCTAssertTrue(app.navigationBars["Space Members"].firstMatch.waitForExistence(timeout: 3),
                      "inviting did not make the space shared")
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "space-members"
        shot.lifetime = .keepAlways
        add(shot)
    }

    private func revealSidebarElement(_ app: XCUIApplication, _ identifier: String) -> XCUIElement {
        let element = app.descendants(matching: .any)[identifier].firstMatch
        if element.waitForExistence(timeout: 5), element.isHittable { return element }
        let toggle = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sidebar' AND NOT (label CONTAINS[c] 'hide')")).firstMatch
        if toggle.exists { toggle.tap() }
        let back = app.barBackButton
        if !element.waitForExistence(timeout: 2), back.exists { back.tap() }
        for _ in 0..<4 where !element.exists || !element.isHittable {
            app.swipeUp()
        }
        _ = element.waitForExistence(timeout: 3)
        return element
    }
}
