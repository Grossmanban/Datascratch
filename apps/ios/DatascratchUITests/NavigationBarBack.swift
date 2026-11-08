import XCTest

extension XCUIApplication {
    /// The navigation bar's back (or sidebar) button: the first bar button that is not the
    /// account's settings avatar, which sits in the sidebar's bar on iPhone too.
    var barBackButton: XCUIElement {
        navigationBars.buttons.matching(NSPredicate(format: "identifier != 'sidebar.settings'")).firstMatch
    }
}
