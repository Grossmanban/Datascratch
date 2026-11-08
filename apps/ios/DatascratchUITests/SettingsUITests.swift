import UIKit
import XCTest

/// The launch screen, the settings button and Settings (spec/10, owner's D-15 round).
@MainActor
final class SettingsUITests: XCTestCase {
    private func launch(_ extra: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing", "-ui-testing-signed-in"] + extra
        app.launch()
        return app
    }

    /// The sidebar, also on iPhone where the app may open on the document list.
    private func sidebarSettings(_ app: XCUIApplication) -> XCUIElement {
        let settings = app.buttons["sidebar.settings"].firstMatch
        if !settings.waitForExistence(timeout: 10), app.navigationBars.buttons.firstMatch.exists {
            app.navigationBars.buttons.firstMatch.tap()
        }
        XCTAssertTrue(settings.waitForExistence(timeout: 5), "no settings button; buttons: \(LibraryUITests.buttons(app))")
        return settings
    }

    /// The owner opened Trash instead of Settings: the button is a 44 pt target, well away
    /// from Trash, and opens Settings.
    func testSettingsButtonIsLargeAndAwayFromTrash() throws {
        let app = launch()
        let settings = sidebarSettings(app)
        XCTAssertTrue(settings.isHittable)
        XCTAssertGreaterThanOrEqual(settings.frame.width, 44, "frame \(settings.frame)")
        XCTAssertGreaterThanOrEqual(settings.frame.height, 44, "frame \(settings.frame)")
        let trash = app.descendants(matching: .any)["sidebar.trash"].firstMatch
        if trash.waitForExistence(timeout: 3) {
            let t = trash.frame, s = settings.frame
            let gap = max(t.minY - s.maxY, s.minY - t.maxY, t.minX - s.maxX, s.minX - t.maxX)
            XCTAssertGreaterThanOrEqual(gap, 12, "settings \(s), trash \(t)")
        }
        settings.tap()
        XCTAssertTrue(app.buttons["settings.done"].waitForExistence(timeout: 5), "Settings did not open")
        XCTAssertFalse(app.descendants(matching: .any)["trash.empty"].exists, "Trash opened")
    }

    /// Settings are grouped like iOS Settings, and Diagnostics has its report.
    func testSettingsSectionsAndDiagnostics() throws {
        let app = launch()
        sidebarSettings(app).tap()
        for id in ["settings.accountRow", "settings.appearance", "settings.sync", "settings.security", "settings.agents", "settings.about"] {
            XCTAssertTrue(app.descendants(matching: .any)[id].firstMatch.waitForExistence(timeout: 5), "no \(id)")
        }
        app.descendants(matching: .any)["settings.sync"].firstMatch.tap()
        let diagnostics = app.descendants(matching: .any)["settings.diagnostics"].firstMatch
        XCTAssertTrue(diagnostics.waitForExistence(timeout: 5))
        diagnostics.tap()
        XCTAssertTrue(app.descendants(matching: .any)["diagnostics.pending"].firstMatch.waitForExistence(timeout: 5))
        let check = app.descendants(matching: .any)["diagnostics.check"].firstMatch
        XCTAssertTrue(check.waitForExistence(timeout: 5))
        check.tap()
        // A check is recorded with its time and explanation.
        XCTAssertTrue(app.descendants(matching: .any)["diagnostics.event"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["diagnostics.copy"].firstMatch.exists)
        XCTAssertTrue(app.descendants(matching: .any)["diagnostics.share"].firstMatch.exists)
    }

    /// Cold start: the ink mark shows while the data «loads» (held 3 s in the test), then
    /// gives way to the interface.
    func testLaunchScreenDrawsThenGivesWay() throws {
        let app = launch(["-ui-testing-launch"])
        let screen = app.descendants(matching: .any)["launch.screen"].firstMatch
        XCTAssertTrue(screen.waitForExistence(timeout: 3), "no launch screen")
        XCTAssertEqual(screen.value as? String, "ink")
        let settings = app.buttons["sidebar.settings"].firstMatch
        XCTAssertTrue(settings.waitForExistence(timeout: 10) || app.navigationBars.buttons.firstMatch.exists,
                      "the interface did not come")
        let gone = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: screen)
        wait(for: [gone], timeout: 5)
    }

    /// Reduce Motion: no writing, a short cross-fade.
    func testLaunchScreenWithReduceMotionCrossFades() throws {
        let app = launch(["-ui-testing-launch", "-ui-testing-reduce-motion"])
        let screen = app.descendants(matching: .any)["launch.screen"].firstMatch
        XCTAssertTrue(screen.waitForExistence(timeout: 3), "no launch screen")
        XCTAssertEqual(screen.value as? String, "crossfade")
        let gone = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: screen)
        wait(for: [gone], timeout: 8)
        XCTAssertTrue(app.buttons["sidebar.settings"].firstMatch.waitForExistence(timeout: 5)
                      || app.navigationBars.buttons.firstMatch.exists)
    }
}
