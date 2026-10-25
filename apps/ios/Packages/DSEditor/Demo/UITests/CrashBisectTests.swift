import XCTest

/// Crash bisection (experiment branch): tap into the text, let the keyboard come up and type,
/// several times, with the parts named in `DS_DISABLE` (passed to the runner as
/// `TEST_RUNNER_DS_DISABLE`) switched off. Prints one `BISECT` line; never fails on a crash.
final class CrashBisectTests: XCTestCase {
    override func setUp() {
        continueAfterFailure = true
    }

    @MainActor
    func testTapIntoTextRepeatedly() throws {
        let variant = ProcessInfo.processInfo.environment["DS_DISABLE"] ?? ""
        let points: [CGFloat] = [0.12, 0.3, 0.12, 0.45, 0.12, 0.3]
        var crashes = 0
        var log: [String] = []
        for (i, y) in points.enumerated() {
            let app = XCUIApplication()
            app.launchArguments = ["-uiTesting"]
            app.launchEnvironment["DS_DISABLE"] = variant
            app.launch()
            let editor = app.textViews["editor.text"]
            guard editor.waitForExistence(timeout: 15) else {
                log.append("\(i):noeditor")
                continue
            }
            let textTool = app.buttons["tool.text"]
            if textTool.exists {
                textTool.tap()
                sleep(1)
            }
            guard app.state == .runningForeground else {
                crashes += 1
                log.append("\(i):tool")
                continue
            }
            editor.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: y)).tap()
            sleep(2)
            guard app.state == .runningForeground else {
                crashes += 1
                log.append("\(i):tap@\(y)")
                continue
            }
            editor.typeText("Ink")
            sleep(1)
            guard app.state == .runningForeground else {
                crashes += 1
                log.append("\(i):type")
                continue
            }
            // A second tap elsewhere while the keyboard is up.
            editor.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.2)).tap()
            sleep(1)
            if app.state != .runningForeground {
                crashes += 1
                log.append("\(i):tap2")
                continue
            }
            log.append("\(i):ok")
            app.terminate()
        }
        print("BISECT variant=\(variant.isEmpty ? "none" : variant) crashes=\(crashes)/\(points.count) \(log.joined(separator: " "))")
    }
}
