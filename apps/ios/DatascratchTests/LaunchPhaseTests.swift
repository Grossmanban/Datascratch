import Testing
@testable import Datascratch

/// The welcome screen only once it is known there is no stored session (owner, 2026-11-08: it
/// flashed for a split second at every launch).
struct LaunchPhaseTests {
    @Test func noWelcomeScreenWhileTheSessionIsRead() {
        #expect(AppModel.phase(signingUp: false, signedIn: false, restoring: true) == .launching)
        #expect(AppModel.phase(signingUp: false, signedIn: true, restoring: true) == .ready)
        #expect(AppModel.phase(signingUp: false, signedIn: false, restoring: false) == .onboarding)
        #expect(AppModel.phase(signingUp: false, signedIn: true, restoring: false) == .ready)
        #expect(AppModel.phase(signingUp: true, signedIn: true, restoring: false) == .onboarding, "the recovery key step")
    }
}
