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
    #if canImport(DSCore)
    /// The document store behind `library` (nil when DSCore could not open).
    let core: CoreLibrary?
    /// The server connection when `DS_SERVER_URL` is set.
    let connection: ServerConnection?
    #endif
    let accounts: any AccountService
    let sync: SyncCenter
    let sharing: any SharingService
    let access: any AccessService
    let webHost: String
    let covers: CoverImages

    /// Recovery key waiting to be confirmed after sign-up. Kept in the Keychain
    /// until confirmed, so quitting the app mid-onboarding does not lose it (R-02).
    var pendingRecoveryKey: RecoveryKey? {
        didSet { secureStore.set(pendingRecoveryKey.map { Data($0.bytes) }, for: Self.pendingKeyItem) }
    }
    /// The recovery key issued on this device, kept in the Keychain so Settings can
    /// show it again (spec/07). Nil after signing in on another device.
    var savedRecoveryKey: RecoveryKey? {
        didSet { secureStore.set(savedRecoveryKey.map { Data($0.bytes) }, for: Self.savedKeyItem) }
    }
    /// False while the user skipped the key check or got a new key; Settings shows a
    /// quiet reminder. With a server it is `settings.recoveryKeyConfirmed` of the
    /// account document, so every device of the account agrees.
    var isRecoveryKeyConfirmed = true {
        didSet {
            secureStore.set(isRecoveryKeyConfirmed ? nil : Data([0]), for: Self.unconfirmedItem)
            #if canImport(DSCore)
            if accounts.isServerBacked, accounts.account != nil, let core,
               core.account.setting("recoveryKeyConfirmed")?.boolValue != isRecoveryKeyConfirmed {
                try? core.account.setRecoveryKeyConfirmed(isRecoveryKeyConfirmed)
            }
            #endif
        }
    }
    @ObservationIgnored private let secureStore: SecureStore
    private static let pendingKeyItem = "pending-recovery-key"
    private static let savedKeyItem = "recovery-key"
    private static let unconfirmedItem = "recovery-key-unconfirmed"
    /// Sign-up in progress: stay in onboarding until the recovery key is confirmed.
    var isSigningUp = false
    /// A route that arrived before the main UI could show it.
    var pendingRoute: AppRoute?

    init(options: LaunchOptions = .fromProcess(), bundle: Bundle = .main) {
        let coreLibrary: AnyObject?
        let info = bundle.infoDictionary ?? [:]
        let host = (info["DSWebHost"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "datascratch.app"
        let server = (info["DSServerURL"] as? String).flatMap { $0.isEmpty ? nil : URL(string: $0) }
        webHost = host
        let coverImages: CoverImages = options.uiTesting ? .temporary() : .appSupport()
        covers = coverImages

        if options.uiTesting {
            secureStore = SecureStore(inMemory: true)
            settings = AppSettings(defaults: UserDefaults(suiteName: "ui-testing-\(UUID().uuidString)") ?? .standard)
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-dark") { settings.appearance = .dark }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-no-finger") { settings.fingerDrawing = false }
            let made = Self.makeLibrary(inMemory: true)
            library = made.0
            coreLibrary = made.1
            sync = SyncCenter(serverURL: nil, monitorNetwork: false)
        } else {
            secureStore = SecureStore()
            settings = AppSettings()
            let made = Self.makeLibrary(inMemory: false)
            library = made.0
            coreLibrary = made.1
            sync = SyncCenter(serverURL: server)
        }
        #if canImport(DSCore)
        let coreStack = coreLibrary as? CoreLibrary
        core = coreStack
        if let server, let coreStack, !options.uiTesting {
            // An account on the Datascratch server: DSCore does auth, keys and sync.
            let connection = ServerConnection(serverURL: server, webHost: host, core: coreStack, sync: sync,
                                              attachmentsDirectory: coverImages.directory)
            self.connection = connection
            accounts = ServerAccountService(connection: connection)
            sharing = ServerSharingService(connection: connection)
            access = ServerAccessService(connection: connection)
            sync.onBackOnline = { connection.reconnect() }
            coverImages.remote = connection
        } else {
            connection = nil
            accounts = LocalAccountService(store: secureStore)
            sharing = LocalSharingService(webHost: host)
            access = LocalAccessService()
        }
        #else
        accounts = LocalAccountService(store: secureStore)
        sharing = LocalSharingService(webHost: host)
        access = LocalAccessService()
        #endif

        if options.uiTesting, options.signedIn {
            library.seedIfEmpty()
            signedInForTesting = true
        }
        library.purgeExpiredTrash()
        pendingRecoveryKey = secureStore.data(for: Self.pendingKeyItem).flatMap { RecoveryKey(bytes: [UInt8]($0)) }
        savedRecoveryKey = secureStore.data(for: Self.savedKeyItem).flatMap { RecoveryKey(bytes: [UInt8]($0)) }
        isRecoveryKeyConfirmed = secureStore.data(for: Self.unconfirmedItem) == nil
        let sync = self.sync
        library.onLocalChange = { sync.noteLocalChange() }
    }

    private var signedInForTesting = false

    /// The library on DSCore documents when the package is linked, else the JSON stand-in.
    private static func makeLibrary(inMemory: Bool) -> (LibraryStore, AnyObject?) {
        #if canImport(DSCore)
        do {
            if inMemory {
                let core = try CoreLibrary.inMemory()
                return (LibraryStore(backend: core), core)
            }
            let base = (try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                                     appropriateFor: nil, create: true))
                ?? FileManager.default.temporaryDirectory
            let core = try CoreLibrary.open(directory: base.appendingPathComponent("Library", isDirectory: true))
            CoreLibrary.importLegacy(from: .appSupport(), into: core)
            let library = LibraryStore(backend: core)
            return (library, core)
        } catch {
            // Keep working on the JSON stand-in rather than failing to launch.
            print("DSCore library unavailable, using the local JSON library: \(error)")
        }
        #endif
        return (LibraryStore(persistence: inMemory ? .inMemory : .appSupport()), nil)
    }

    var phase: Phase {
        if pendingRecoveryKey != nil || isSigningUp { return .onboarding }
        return accounts.account != nil || signedInForTesting ? .ready : .onboarding
    }

    /// Called once the user has an account and has confirmed — or chose to skip
    /// checking — the recovery key.
    func finishOnboarding(keyConfirmed: Bool = true) {
        // A server account signing in on a new device gets its library by sync; seed
        // first-run content only for new or local accounts.
        let seed = !accounts.isServerBacked || isSigningUp
        if let key = pendingRecoveryKey {
            savedRecoveryKey = key
            isRecoveryKeyConfirmed = keyConfirmed
        }
        pendingRecoveryKey = nil
        isSigningUp = false
        if seed { library.seedIfEmpty() }
    }

    /// Picks up the flag from the account document (changed on another device).
    func refreshRecoveryKeyState() {
        #if canImport(DSCore)
        // Accounts made before the flag existed had to check the key at sign-up.
        guard accounts.isServerBacked, accounts.account != nil, phase == .ready,
              let confirmed = core?.account.setting("recoveryKeyConfirmed")?.boolValue,
              confirmed != isRecoveryKeyConfirmed else { return }
        isRecoveryKeyConfirmed = confirmed
        #endif
    }

    /// A new key from «Create New Key»: shown once, kept here, unchecked until the user checks it.
    func adoptRotatedRecoveryKey(_ key: RecoveryKey) {
        savedRecoveryKey = key
        isRecoveryKeyConfirmed = false
    }

    func signOut() async {
        library.flush()
        await accounts.signOut()
        savedRecoveryKey = nil
        isRecoveryKeyConfirmed = true
        signedInForTesting = false
    }
}
