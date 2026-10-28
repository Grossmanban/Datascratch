import Foundation
import Testing
@testable import Datascratch

struct RoutingTests {
    let server = "notes.example.org"

    @Test func parsesTheWebsAppLinks() {
        let share = URL(string: "ds://share/0192f3c4-aaaa?server=notes.example.org#k=abc_DEF-123")!
        #expect(AppRoute.parse(share, server: server) == .share(shareId: "0192f3c4-aaaa", key: "abc_DEF-123", server: server))
        #expect(AppRoute.parse(URL(string: "ds://invite/i1?server=notes.example.org")!, server: server) == .invitation("i1"))
        #expect(AppRoute.parse(URL(string: "ds://note/n1?server=Notes.Example.org")!, server: server) == .note("n1"))
        #expect(AppRoute.parse(URL(string: "ds://notebook/b1?server=notes.example.org")!, server: server) == .notebook("b1"))
        // No server named: the account's.
        #expect(AppRoute.parse(URL(string: "ds://note/n1")!, server: server) == .note("n1"))
    }

    @Test func shareLinkWithoutKey() {
        let url = URL(string: "ds://share/abc?server=notes.example.org")!
        #expect(AppRoute.parse(url, server: server) == .share(shareId: "abc", key: nil, server: server))
    }

    @Test func guestLinkOpensOnItsOwnServer() {
        // A guest link needs no account: whatever server it names, it opens there.
        let url = URL(string: "ds://share/abc?server=other.example#k=x")!
        #expect(AppRoute.parse(url, server: server) == .share(shareId: "abc", key: "x", server: "other.example"))
        #expect(AppRoute.parse(url, server: nil) == .share(shareId: "abc", key: "x", server: "other.example"))
    }

    @Test func parsesCustomScheme() {
        #expect(AppRoute.parse(URL(string: "datascratch://note/n1")!, server: server) == .note("n1"))
        #expect(AppRoute.parse(URL(string: "datascratch://today")!, server: server) == .today)
    }

    @Test func linkOfAnotherServerIsNamedNotOpened() {
        let url = URL(string: "ds://invite/abc?server=other.example")!
        #expect(AppRoute.parse(url, server: server)
            == .otherServer(server: "other.example", webURL: URL(string: "https://other.example/invite/abc")))
        // Not signed in to any server.
        #expect(AppRoute.parse(URL(string: "ds://note/n1?server=other.example")!, server: nil)
            == .otherServer(server: "other.example", webURL: URL(string: "https://other.example/doc/n1")))
        // The port counts: another port is another server.
        #expect(AppRoute.parse(URL(string: "ds://note/n1?server=notes.example.org:8443")!, server: server)
            == .otherServer(server: "notes.example.org:8443", webURL: URL(string: "https://notes.example.org:8443/doc/n1")))
    }

    @Test func ignoresWhatIsNotOurs() {
        #expect(AppRoute.parse(URL(string: "https://notes.example.org/invite/abc")!, server: server) == nil)
        #expect(AppRoute.parse(URL(string: "ds://settings/account")!, server: server) == nil)
        #expect(AppRoute.parse(URL(string: "ds://note")!, server: server) == nil)
        // A server value that is not a host is ignored, not followed.
        #expect(AppRoute.linkServer(of: URL(string: "ds://note/n1?server=evil.example%2Fpath")!) == nil)
        #expect(AppRoute.linkServer(of: URL(string: "ds://note/n1?server=user%40evil.example")!) == nil)
    }

    @Test func webPagesOfLinks() {
        #expect(AppRoute.webURL(server: "notes.example.org", kind: "share", id: "s1", key: "k1")
            == URL(string: "https://notes.example.org/s/s1#k=k1"))
        #expect(AppRoute.webURL(server: "localhost:8080", kind: "note", id: "n1") == URL(string: "http://localhost:8080/doc/n1"))
        #expect(AppRoute.authority(of: URL(string: "https://Notes.Example.org")!) == "notes.example.org")
        #expect(AppRoute.authority(of: URL(string: "http://localhost:8080")!) == "localhost:8080")
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
        #expect(link.url.lastPathComponent == link.id)
        let key = link.url.fragment()?.split(separator: "=", maxSplits: 1).last.map(String.init)
        #expect(link.url.fragment()?.hasPrefix("k=") == true)
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

/// D-49: the address typed into «Server».
struct ServerAddressTests {
    @Test func addressesBecomeHTTPSBaseURLs() throws {
        #expect(try ServerAddress.parse("sync.example.org").get().absoluteString == "https://sync.example.org")
        #expect(try ServerAddress.parse(" https://notes.example.com/ ").get().absoluteString == "https://notes.example.com")
        #expect(try ServerAddress.parse("https://example.com:8443/ds").get().absoluteString == "https://example.com:8443/ds")
        #expect(try ServerAddress.parse("http://localhost:8080").get().absoluteString == "http://localhost:8080")
    }

    @Test func insecureAndBrokenAddressesAreRefused() {
        #expect(ServerAddress.parse("http://notes.example.com") == .failure(.notHTTPS))
        #expect(ServerAddress.parse("") == .failure(.empty))
        #expect(ServerAddress.parse("ftp://example.com") == .failure(.invalid))
        #expect(ServerAddress.parse("https://") == .failure(.invalid))
        #expect(ServerAddress.parse("https://example.com/?a=1") == .failure(.invalid))
    }

    @Test func httpsAddressesShowWithoutTheScheme() throws {
        #expect(ServerAddress.display(try ServerAddress.parse("sync.example.org").get()) == "sync.example.org")
        #expect(ServerAddress.display(try ServerAddress.parse("http://localhost:8080").get()) == "http://localhost:8080")
    }
}
