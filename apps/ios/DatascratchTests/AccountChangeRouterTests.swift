import Foundation
import Testing
@testable import Datascratch

/// D-62: the server's `account_changed` becomes one refresh after a short pause.
@MainActor
struct AccountChangeRouterTests {
    @Test func onlyInvitationsIsTheSmallRefresh() {
        #expect(AccountChangeRouter.route(["invitations"]) == .invitations)
        #expect(AccountChangeRouter.route(["invitations", "spaces"]) == .everything)
        #expect(AccountChangeRouter.route(["keys"]) == .everything)
        #expect(AccountChangeRouter.route(["something-new"]) == .everything, "an unknown kind refreshes everything")
    }

    @Test func aBurstIsOneRefresh() async throws {
        var done: [AccountChangeRouter.Refresh] = []
        let router = AccountChangeRouter(delay: .milliseconds(50)) { done.append($0) }
        router.changed(["members"])
        router.changed(["keys"])
        router.changed(["notebooks"])
        #expect(done.isEmpty, "nothing before the pause")
        try await Task.sleep(for: .milliseconds(400))
        #expect(done == [.everything])
        router.changed(["invitations"])
        try await Task.sleep(for: .milliseconds(400))
        #expect(done == [.everything, .invitations], "a later change is a refresh of its own")
    }
}
