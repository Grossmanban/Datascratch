import Foundation
import Observation

/// Process-wide state and services, shared by every window.
@Observable
final class AppModel {
    enum Phase: Equatable {
        case onboarding
        case ready
    }

    nonisolated struct LaunchOptions: Sendable {
        /// Fresh in-memory state for UI tests (`-ui-testing`).
        var uiTesting = false
        /// Skip onboarding with a seeded library (`-ui-testing-signed-in`).
        var signedIn = false

        static func fromProcess() -> LaunchOptions {
            let args = ProcessInfo.processInfo.arguments
            return LaunchOptions(uiTesting: args.contains("-ui-testing"),
                                 signedIn: args.contains("-ui-testing-signed-in"))
        }
    }

    let settings: AppSettings
    let library: LibraryStore
    let accounts: any AccountService
    let sync: SyncCenter
    let sharing: any SharingService
    let access: any AccessService
    let webHost: String

    /// Recovery key waiting to be shown/confirmed after sign-up (never persisted).
    var pendingRecoveryKey: RecoveryKey?
    /// Sign-up in progress: stay in onboarding until the recovery key is confirmed.
    var isSigningUp = false
    /// A route that arrived before the main UI could show it.
    var pendingRoute: AppRoute?

    init(options: LaunchOptions = .fromProcess(), bundle: Bundle = .main) {
        let info = bundle.infoDictionary ?? [:]
        let host = (info["DSWebHost"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "datascratch.app"
        let server = (info["DSServerURL"] as? String).flatMap { $0.isEmpty ? nil : URL(string: $0) }
        webHost = host

        if options.uiTesting {
            settings = AppSettings(defaults: UserDefaults(suiteName: "ui-testing-\(UUID().uuidString)") ?? .standard)
            library = LibraryStore(persistence: .inMemory)
            accounts = LocalAccountService(store: SecureStore(inMemory: true))
            sync = SyncCenter(serverURL: nil, monitorNetwork: false)
        } else {
            settings = AppSettings()
            library = LibraryStore(persistence: .appSupport())
            accounts = LocalAccountService(store: SecureStore())
            sync = SyncCenter(serverURL: server)
        }
        sharing = LocalSharingService(webHost: host)
        access = LocalAccessService()

        if options.uiTesting, options.signedIn {
            library.seedIfEmpty()
            signedInForTesting = true
        }
        library.purgeExpiredTrash()
    }

    private var signedInForTesting = false

    var phase: Phase {
        if pendingRecoveryKey != nil || isSigningUp { return .onboarding }
        return accounts.account != nil || signedInForTesting ? .ready : .onboarding
    }

    /// Called once the user has an account and confirmed the recovery key.
    func finishOnboarding() {
        pendingRecoveryKey = nil
        isSigningUp = false
        library.seedIfEmpty()
    }

    func signOut() async {
        library.flush()
        await accounts.signOut()
        signedInForTesting = false
    }
}
