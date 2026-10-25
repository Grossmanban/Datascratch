import Foundation
import Testing
@testable import Datascratch

struct RoutingTests {
    let host = "datascratch.app"

    @Test func parsesShareUniversalLink() {
        let url = URL(string: "https://datascratch.app/s/0192f3c4-aaaa#k=abc_DEF-123")!
        #expect(AppRoute.parse(url, webHost: host) == .share(shareId: "0192f3c4-aaaa", key: "abc_DEF-123"))
    }

    @Test func shareLinkWithoutKey() {
        let url = URL(string: "https://datascratch.app/s/abc")!
        #expect(AppRoute.parse(url, webHost: host) == .share(shareId: "abc", key: nil))
    }

    @Test func parsesCustomScheme() {
        #expect(AppRoute.parse(URL(string: "datascratch://note/n1")!, webHost: host) == .note("n1"))
        #expect(AppRoute.parse(URL(string: "datascratch://today")!, webHost: host) == .today)
    }

    @Test func ignoresForeignHosts() {
        #expect(AppRoute.parse(URL(string: "https://evil.example/s/abc#k=x")!, webHost: host) == nil)
        #expect(AppRoute.parse(URL(string: "http://datascratch.app/s/abc#k=x")!, webHost: host) == nil)
    }

    @Test func base64URLRoundTrip() {
        let data = Data((0..<64).map { UInt8($0 * 3 % 256) })
        let encoded = Base64URL.encode(data)
        #expect(!encoded.contains("=") && !encoded.contains("+") && !encoded.contains("/"))
        #expect(Base64URL.decode(encoded) == data)
    }
}

@MainActor
struct AccountServiceTests {
    @Test func signUpSignInRecoverAndChangePassword() async throws {
        let service = LocalAccountService(store: SecureStore(inMemory: true))
        let key = try await service.signUp(email: "Me@Example.com ", password: "correct horse battery")
        #expect(service.account?.email == "me@example.com")

        await service.signOut()
        #expect(service.account == nil)
        await #expect(throws: AccountError.wrongCredentials) {
            try await service.signIn(email: "me@example.com", password: "wrong password!!")
        }
        try await service.signIn(email: "me@example.com", password: "correct horse battery")
        #expect(service.account != nil)

        try await service.changePassword(current: "correct horse battery", new: "another long passphrase")
        await service.signOut()
        try await service.signIn(email: "me@example.com", password: "another long passphrase")

        await service.signOut()
        await #expect(throws: AccountError.invalidRecoveryKey) {
            try await service.recover(email: "me@example.com", recoveryKey: .random(), newPassword: "brand new password")
        }
        try await service.recover(email: "me@example.com", recoveryKey: key, newPassword: "brand new password")
        await service.signOut()
        try await service.signIn(email: "me@example.com", password: "brand new password")
    }

    @Test func rotatingTheRecoveryKeyRetiresTheOldOne() async throws {
        let service = LocalAccountService(store: SecureStore(inMemory: true))
        let old = try await service.signUp(email: "me@example.com", password: "correct horse battery")
        await #expect(throws: AccountError.wrongCredentials) {
            _ = try await service.rotateRecoveryKey(currentPassword: "not my password")
        }
        let new = try await service.rotateRecoveryKey(currentPassword: "correct horse battery")
        #expect(new != old)
        await service.signOut()
        await #expect(throws: AccountError.invalidRecoveryKey) {
            try await service.recover(email: "me@example.com", recoveryKey: old, newPassword: "brand new password")
        }
        try await service.recover(email: "me@example.com", recoveryKey: new, newPassword: "brand new password")
        try await service.changePassword(current: "brand new password", new: "another long passphrase")
        let kinds = try await service.securityEvents().map(\.kind)
        #expect(kinds == [.passwordChanged, .recoveryUsed, .recoveryKeyRotated])
    }

    @Test func rejectsWeakPasswordAndBadEmail() async {
        let service = LocalAccountService(store: SecureStore(inMemory: true))
        await #expect(throws: AccountError.weakPassword) {
            _ = try await service.signUp(email: "a@b.co", password: "short")
        }
        await #expect(throws: AccountError.invalidEmail) {
            _ = try await service.signUp(email: "nope", password: "long enough password")
        }
    }

    @Test func sharingMintsLinksWithKeyFragment() async throws {
        let sharing = LocalSharingService(webHost: "datascratch.app")
        let link = try await sharing.createLink(for: ShareTarget(kind: .note, id: "n1"), permission: .edit, expiresAt: nil)
        guard case .share(let id, let key)? = AppRoute.parse(link.url, webHost: "datascratch.app") else {
            Issue.record("link does not parse")
            return
        }
        #expect(id == link.id)
        #expect(Base64URL.decode(key ?? "")?.count == 32)
        try await sharing.revoke(link.id)
        #expect(sharing.links.isEmpty)
    }
}

@MainActor
struct RecoveryKeyFlowTests {
    @Test func skippingTheCheckKeepsTheKeyUnconfirmed() {
        let app = AppModel(options: .init(uiTesting: true))
        let key = RecoveryKey.random()
        app.pendingRecoveryKey = key
        app.finishOnboarding(keyConfirmed: false)
        #expect(app.pendingRecoveryKey == nil)
        #expect(app.savedRecoveryKey == key)
        #expect(app.isRecoveryKeyConfirmed == false)
    }

    @Test func aRotatedKeyIsKeptAndUnchecked() {
        let app = AppModel(options: .init(uiTesting: true))
        let key = RecoveryKey.random()
        app.adoptRotatedRecoveryKey(key)
        #expect(app.savedRecoveryKey == key)
        #expect(app.isRecoveryKeyConfirmed == false)
    }

    @Test func confirmingTheCheckKeepsTheKeyForSettings() {
        let app = AppModel(options: .init(uiTesting: true))
        let key = RecoveryKey.random()
        app.pendingRecoveryKey = key
        app.finishOnboarding()
        #expect(app.savedRecoveryKey == key)
        #expect(app.isRecoveryKeyConfirmed)
    }
}
