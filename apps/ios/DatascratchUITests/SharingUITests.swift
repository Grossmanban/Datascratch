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
        XCTAssertTrue(accept.waitForExistence(timeout: 5), "no Accept button")
        accept.tap()
        XCTAssertTrue(app.descendants(matching: .any)["sidebar.sharedPending"].firstMatch.waitForExistence(timeout: 5)
                      || app.descendants(matching: .any)["sidebar.sharedNotebook"].firstMatch.waitForExistence(timeout: 2),
                      "the accepted notebook is not in «Shared with me»")
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
