import Foundation

/// D-51: by default the app is notes only. Tasks (the Tasks screen, Inbox, task dates and the
/// reschedule menu), the Calendar with daily notes and the open tabs are the extended mode: the
/// code is built and tested always, and these checks are the one place that hides it.
///
/// The build sets the mode (`DS_EXTENDED_MODE` in the xcconfig → `DSExtendedMode` in Info.plist,
/// off by default); a launch argument `-ds-extended-mode YES` overrides it (UI tests of the
/// extended features). Data is never changed: tasks with dates and the tabs of the account
/// document stay as they are, the notes-only app neither shows nor writes them.
nonisolated enum Features {
    static let extendedMode: Bool = {
        let arguments = UserDefaults.standard.volatileDomain(forName: UserDefaults.argumentDomain)
        if let override = arguments["ds-extended-mode"] { return flag(override) }
        return flag(Bundle.main.object(forInfoDictionaryKey: "DSExtendedMode"))
    }()

    /// The Tasks screen, Inbox, task dates and deadlines, reminders.
    static var tasks: Bool { extendedMode }
    /// The Calendar and daily notes («Today's Note»).
    static var calendar: Bool { extendedMode }
    /// Open tabs (the sidebar section, ⌘W closing a tab, the active tab restored per space).
    static var tabs: Bool { extendedMode }

    private static func flag(_ value: Any?) -> Bool {
        switch value {
        case let bool as Bool: bool
        case let number as NSNumber: number.boolValue
        case let string as String: ["yes", "true", "1"].contains(string.lowercased())
        default: false
        }
    }
}
