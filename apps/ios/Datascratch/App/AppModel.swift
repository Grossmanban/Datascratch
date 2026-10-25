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

    /// Recovery key waiting to be confirmed after sign-up. Kept in the Keychain
    /// until confirmed, so quitting the app mid-onboarding does not lose it (R-02).
    var pendingRecoveryKey: RecoveryKey? {
        didSet { secureStore.set(pendingRecoveryKey.map { Data($0.bytes) }, for: Self.pendingKeyItem) }
    }
    @ObservationIgnored private let secureStore: SecureStore
    private static let pendingKeyItem = "pending-recovery-key"
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
            secureStore = SecureStore(inMemory: true)
            settings = AppSettings(defaults: UserDefaults(suiteName: "ui-testing-\(UUID().uuidString)") ?? .standard)
            library = LibraryStore(persistence: .inMemory)
            sync = SyncCenter(serverURL: nil, monitorNetwork: false)
        } else {
            secureStore = SecureStore()
            settings = AppSettings()
            library = LibraryStore(persistence: .appSupport())
            sync = SyncCenter(serverURL: server)
        }
        accounts = LocalAccountService(store: secureStore)
        sharing = LocalSharingService(webHost: host)
        access = LocalAccessService()

        if options.uiTesting, options.signedIn {
            library.seedIfEmpty()
            signedInForTesting = true
        }
        library.purgeExpiredTrash()
        pendingRecoveryKey = secureStore.data(for: Self.pendingKeyItem).flatMap { RecoveryKey(bytes: [UInt8]($0)) }
        let sync = self.sync
        library.onLocalChange = { sync.noteLocalChange() }
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
