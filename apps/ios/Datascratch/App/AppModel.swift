#if canImport(DSCore)
import DSCore
#endif
import Foundation
import Observation
import UIKit

/// Process-wide state and services, shared by every window.
@Observable
final class AppModel {
    enum Phase: Equatable {
        /// The stored session is still being read: the launch screen's plain background.
        case launching
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
    /// The connection to `serverURL` (none in a local-only build without a server).
    private(set) var connection: ServerConnection?
    /// Who else is in a note: the server connection's, or the UI tests' stand-in.
    var presence: PresenceCenter? { connection?.presence ?? presenceForTesting }
    private(set) var presenceForTesting: PresenceCenter?
    #endif
    private(set) var accounts: any AccountService
    let sync: SyncCenter
    private(set) var sharing: any SharingService
    private(set) var access: any AccessService
    /// D-54: sharing with other accounts by email.
    private(set) var accountSharing: any AccountSharingService

    // MARK: Shared with me (D-63)

    /// Notebooks and documents shared with this account one by one (not through a space): their
    /// own section, outside every space. In the account document's order (`SharedRef.order`,
    /// newest first), then by when they were shared.
    var sharedItems: [SharedWithMe] {
        _ = sharedRefsRevision
        return accountSharing.sharedWithMe.filter { $0.target.kind != .space }
            .sorted { a, b in
                let (oa, ob) = (sharedOrder(a), sharedOrder(b))
                if oa != ob { return oa < ob }
                return (a.addedAt ?? .distantPast) > (b.addedAt ?? .distantPast)
            }
    }

    /// Bumped when this device writes «opened» or the records change: the lists read again.
    private(set) var sharedRefsRevision = 0

    /// Not opened yet on any of this person's devices (the account document's `openedAt`, the
    /// same on the web).
    func isNewShared(_ item: SharedWithMe) -> Bool {
        _ = sharedRefsRevision
        #if canImport(DSCore)
        guard let kind = Self.refKind(item), let ref = core?.account.sharedRef(kind, id: item.target.id) else { return false }
        return ref.isNew
        #else
        return false
        #endif
    }

    var newSharedCount: Int { sharedItems.filter(isNewShared).count }

    /// Opened: «new» no more, on every device (written once; a later open keeps the first date).
    func markSharedSeen(_ item: SharedWithMe) {
        #if canImport(DSCore)
        guard let kind = Self.refKind(item),
              (try? core?.account.markSharedOpened(kind, id: item.target.id)) == true else { return }
        sharedRefsRevision &+= 1
        #endif
    }

    /// The account document's records follow what is shared: one for each item that has none
    /// (new until opened), none for what is gone. What this device had marked seen before the
    /// records existed (`seenShared`) is carried over once.
    func syncSharedRefs() {
        #if canImport(DSCore)
        guard let account = core?.account else { return }
        let items = accountSharing.sharedWithMe.filter { $0.target.kind != .space }
        var changed = false
        var minOrder = account.sharedRefs().map(\.order).min() ?? 0
        for item in items.sorted(by: { ($0.addedAt ?? .distantPast) < ($1.addedAt ?? .distantPast) }) {
            guard let kind = Self.refKind(item), account.sharedRef(kind, id: item.target.id) == nil else { continue }
            minOrder -= 1
            let added = item.addedAt.map(DSCore.DSDate.iso) ?? DSCore.DSDate.iso(Date())
            try? account.putShared(SharedRef(kind: kind, targetId: item.target.id,
                                             spaceId: (kind == .note ? library.data.spaceId(ofNote: item.target.id)
                                                       : library.data.spaceId(ofNotebook: item.target.id)) ?? "",
                                             order: minOrder, addedAt: added))
            changed = true
        }
        let present = Set(items.compactMap { item in Self.refKind(item).map { SharedRef.key($0, item.target.id) } })
        // Not before the list has come (an empty list at launch is not «nothing is shared»).
        for ref in account.sharedRefs() where !present.contains(ref.id) && !items.isEmpty {
            try? account.removeShared(ref.kind, id: ref.targetId)
            changed = true
        }
        if let seen = settings.seenShared {
            for item in items where seen.contains(item.id) {
                if let kind = Self.refKind(item) { _ = try? account.markSharedOpened(kind, id: item.target.id) }
            }
            settings.seenShared = nil
            changed = true
        }
        if changed { sharedRefsRevision &+= 1 }
        #endif
    }

    private func sharedOrder(_ item: SharedWithMe) -> Double {
        #if canImport(DSCore)
        guard let kind = Self.refKind(item) else { return .infinity }
        return core?.account.sharedRef(kind, id: item.target.id)?.order ?? .infinity
        #else
        return 0
        #endif
    }

    #if canImport(DSCore)
    private static func refKind(_ item: SharedWithMe) -> SharedRefKind? {
        switch item.target.kind {
        case .notebook: .notebook
        case .note: .note
        case .space: nil
        }
    }
    #endif

    /// D-49: the server this device signs in to — only one the person typed, got in an invite
    /// link, or signed in to earlier on this device. No address is built into the app.
    private(set) var serverURL: URL?
    private static let serverKey = "account.serverURL"
    @ObservationIgnored private let isUITesting: Bool

    /// D-65: the server's voice (recognition and clean-up), a fake one in UI tests
    /// (`-ui-testing-voice-error offline|disabled|quota`); nil on this device only.
    var voiceService: (any VoiceService)? {
        if isUITesting {
            let error = UserDefaults.standard.string(forKey: "ui-testing-voice-error").flatMap { code -> VoiceError? in
                switch code {
                case "offline": .offline
                case "disabled": .disabled
                case "quota": .quota
                default: nil
                }
            }
            return FakeVoiceService(error: error)
        }
        guard let connection else { return nil }
        let api = connection.api
        return ServerVoiceService(baseURL: api.baseURL, accessToken: { try await api.accessToken() })
    }

    /// The microphone, or a stand-in that «hears» a fixed phrase in UI tests (no microphone).
    func makeVoiceCapture() -> any VoiceCapture {
        isUITesting ? FakeVoiceCapture() : MicrophoneCapture()
    }
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
    /// A link that opened the app (`ds://` from the web, D-56, or `datascratch://`), kept as it came: it is
    /// read once the main window is up, against the server the account is on by then.
    var pendingLink: URL?
    /// Main (library) windows on screen; a note window that closes itself reopens one when none is.
    @ObservationIgnored var mainWindowCount = 0

    init(options: LaunchOptions = .fromProcess()) {
        let coreLibrary: AnyObject?
        // Links use the account's server (`linkHost`); this one only stands in without a server
        // (D-56: the build carries no domain).
        let host = "datascratch.invalid"
        // UI tests: `-ui-testing-server <url>` stands for a server saved on this device.
        let testServer = UserDefaults.standard.volatileDomain(forName: UserDefaults.argumentDomain)["ui-testing-server"]
            .flatMap { $0 as? String }.flatMap(URL.init(string:))
        let stored = options.uiTesting ? nil : UserDefaults.standard.string(forKey: Self.serverKey).flatMap(URL.init(string:))
        let server = stored
        isUITesting = options.uiTesting
        webHost = host
        let coverImages: CoverImages = options.uiTesting ? .temporary() : .appSupport()
        covers = coverImages

        if options.uiTesting {
            secureStore = SecureStore(inMemory: true)
            settings = AppSettings(defaults: UserDefaults(suiteName: "ui-testing-\(UUID().uuidString)") ?? .standard)
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-dark") { settings.appearance = .dark }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-no-finger") { settings.fingerDrawing = false }
            // The UI tests were written against cards (`document.card`); rows are the default
            // for people (D-61) and have their own tests (`-ui-testing-rows`).
            if !ProcessInfo.processInfo.arguments.contains("-ui-testing-rows") { settings.libraryLayout = .grid }
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
        serverURL = options.uiTesting ? testServer : server
        #if canImport(DSCore)
        let coreStack = coreLibrary as? CoreLibrary
        core = coreStack
        if let server, let coreStack, !options.uiTesting {
            // An account on the Datascratch server: DSCore does auth, keys and sync.
            let side = Self.serverSide(server, webHost: host, core: coreStack, sync: sync, library: library, covers: coverImages)
            connection = side.connection
            accounts = side.accounts
            sharing = side.sharing
            access = side.access
            accountSharing = side.accountSharing
        } else {
            connection = nil
            accounts = LocalAccountService(store: secureStore)
            sharing = LocalSharingService(webHost: host)
            access = LocalAccessService()
            accountSharing = LocalAccountSharingService(webHost: host, demo: options.uiTesting)
        }
        #else
        accounts = LocalAccountService(store: secureStore)
        sharing = LocalSharingService(webHost: host)
        access = LocalAccessService()
        accountSharing = LocalAccountSharingService(webHost: host, demo: options.uiTesting)
        #endif

        if options.uiTesting, options.signedIn {
            library.seedIfEmpty()
            signedInForTesting = true
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-cover") { seedCoverForTesting() }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-sharing") { seedSharingForTesting() }
            // Two people in every note (the document's bar shows them).
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-presence") {
                let center = PresenceCenter()
                center.showForTesting([PresencePeer(id: 1, name: "Lena", color: "#2E5BDB", account: "acc-lena"),
                                       PresencePeer(id: 2, name: "Mark", color: "#3E8E5A", account: "acc-mark")])
                presenceForTesting = center
            }
            // `-ui-testing-open-url <url>`: the app starts from that link (cold start).
            if let link = UserDefaults.standard.string(forKey: "ui-testing-open-url") { pendingLink = URL(string: link) }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-folders"),
               let notebook = library.notebooks(in: library.activeSpace?.id).first {
                // A folder with a subfolder and a note in each (folder strip, breadcrumb).
                let projects = library.createFolder(in: notebook.id, parent: nil, name: "Projects", icon: "folder", color: .blue)
                let drafts = library.createFolder(in: notebook.id, parent: projects.id, name: "Drafts", icon: "folder", color: .orange)
                _ = library.createNote(in: notebook.id, folder: projects.id, title: "Plan")
                _ = library.createNote(in: notebook.id, folder: drafts.id, title: "Draft")
                notebookForTesting = notebook.id
            }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-links"),
               let notebook = library.notebooks(in: library.activeSpace?.id).first {
                // A note linking to an existing note (a chip) and to a missing one (literal).
                _ = library.createNote(in: notebook.id, folder: nil, title: "Target",
                                       body: NoteBody(blocks: [.paragraph("Target body")]))
                let links = library.createNote(in: notebook.id, folder: nil, title: "Links",
                                               body: NoteBody(blocks: [.paragraph("Go to [[Target]] or [[Nowhere]].")]))
                noteForTesting = links.id
            }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-many"),
               let space = library.activeSpace, let first = library.notebooks(in: space.id).first {
                // A crowded sidebar (§12.6): more notebooks and top-level tags than its first rows.
                for index in 1...7 { _ = library.createNotebook(in: space.id, name: "nb\(index)", mode: .private) }
                for index in 1...7 {
                    _ = library.createNote(in: first.id, folder: nil, title: "tagged\(index)",
                                           body: NoteBody(blocks: [.paragraph("#tag\(index) #group/child\(index)")]))
                }
            }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-task-date"),
               let notebook = library.notebooks(in: library.activeSpace?.id).first {
                // A task with a date chip (tap → the reschedule menu).
                let dated = library.createNote(in: notebook.id, folder: nil, title: "Dated",
                                               body: NoteBody(blocks: [.task("Call back", scheduled: DayKey.from(Date()))]))
                noteForTesting = dated.id
            }
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-long-note"),
               let notebook = library.notebooks(in: library.activeSpace?.id).first {
                // A note several screens long (scroll position across app switches and full screen).
                let blocks = (1...120).map { NoteBlock.paragraph("Paragraph \($0) of a long note.") }
                noteForTesting = library.createNote(in: notebook.id, folder: nil, title: "Long", body: NoteBody(blocks: blocks)).id
            }
            // The server ended this device's session (revoked elsewhere).
            if ProcessInfo.processInfo.arguments.contains("-ui-testing-session-ended") { sync.markSessionEnded() }
        }
        library.purgeExpiredTrash()
        pendingRecoveryKey = secureStore.data(for: Self.pendingKeyItem).flatMap { RecoveryKey(bytes: [UInt8]($0)) }
        savedRecoveryKey = secureStore.data(for: Self.savedKeyItem).flatMap { RecoveryKey(bytes: [UInt8]($0)) }
        isRecoveryKeyConfirmed = secureStore.data(for: Self.unconfirmedItem) == nil
        let sync = self.sync
        library.onLocalChange = { sync.noteLocalChange() }
        wireLocalWipe()
        wireSharing()
    }

    /// D-62: sharing learns which space a notebook is in (roles in a shared space); the
    /// stand-in without a server changes the library itself.
    private func wireSharing() {
        let library = self.library
        accountSharing.spaceOfNotebook = { [weak library] id in library?.notebook(id)?.spaceId }
        (accountSharing as? LocalAccountSharingService)?.library = library
    }

    /// Erasing the device (D-53 revocation, «Delete data») also forgets the recovery key kept
    /// on it and the cover cache.
    private func wireLocalWipe() {
        #if canImport(DSCore)
        connection?.onLocalDataWiped = { [weak self] in
            guard let self else { return }
            covers.forgetAll()
            pendingRecoveryKey = nil
            savedRecoveryKey = nil
            isRecoveryKeyConfirmed = true
        }
        #endif
    }

    private var signedInForTesting = false
    /// `-ui-testing-folders`: the notebook a new scene starts on.
    @ObservationIgnored var notebookForTesting: String?
    /// `-ui-testing-links` / `-ui-testing-task-date`: the note a new scene opens.
    @ObservationIgnored var noteForTesting: String?

    /// The seeded invitation (`-ui-testing-sharing`), so a test can open its link.
    nonisolated static let invitationForTesting = "0192f3c4-0000-7000-8000-00000000a11e"

    /// `-ui-testing-sharing` (D-54): an invitation, a notebook «Shared plans» shared with this
    /// account «view only» with one note, a member on the first notebook, and (D-62) a shared
    /// space «Team» joined as an editor.
    private func seedSharingForTesting() {
        guard let local = accountSharing as? LocalAccountSharingService, let spaceId = library.activeSpace?.id,
              let own = library.notebooks(in: spaceId).first else { return }
        // Where a shared notebook really is: its own space, shown in every space (D-54).
        let shared = library.createNotebook(in: Notebook.sharedSpaceId, name: "Shared plans", icon: "person.2", mode: .private)
        let note = library.createNote(in: shared.id, title: "Roadmap",
                                      body: NoteBody(blocks: [.paragraph("Only the owner edits this.")]))
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("-ui-testing-open-shared") { noteForTesting = note.id }
        if arguments.contains("-ui-testing-open-own") {
            noteForTesting = library.createNote(in: own.id, title: "Plan for two", body: NoteBody(blocks: [.paragraph("Ideas")])).id
        }
        // D-62: a shared space «Team» this account joined as an editor: a notebook with a note.
        let team = library.createSpace(name: "Team", icon: "person.2", color: .teal)
        library.updateSpace(team.id) { $0.sharing = .joined }
        let teamNotes = library.createNotebook(in: team.id, name: "Team notes", icon: "person.2", mode: .private)
        _ = library.createNote(in: teamNotes.id, title: "Kickoff", body: NoteBody(blocks: [.paragraph("Agenda")]))
        // `-ui-testing-space-invite`: the invitation is to the space «Team» (accepting opens it).
        let invitedTo = arguments.contains("-ui-testing-space-invite")
            ? ShareTarget(kind: .space, id: team.id) : ShareTarget(kind: .notebook, id: UUIDv7.make())
        local.seedForTesting(invitationId: Self.invitationForTesting, invitedTo: invitedTo,
                             viewOnly: ShareTarget(kind: .notebook, id: shared.id),
                             owned: ShareTarget(kind: .notebook, id: own.id))
        local.seedJoinedSpaceForTesting(ShareTarget(kind: .space, id: team.id), role: .editor)
    }

    /// `-ui-testing-cover`: the first document gets an image cover (screenshots, layout tests).
    private func seedCoverForTesting() {
        guard let note = library.documents.first else { return }
        let size = CGSize(width: 1200, height: 800)
        let image = UIGraphicsImageRenderer(size: size).image { context in
            let colors = [UIColor.systemTeal.cgColor, UIColor.systemIndigo.cgColor] as CFArray
            if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1]) {
                context.cgContext.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size.width, y: size.height), options: [])
            }
        }
        guard let data = image.pngData() else { return }
        let library = self.library, covers = self.covers
        Task {
            if let added = try? await covers.add(data, noteId: note.id) {
                library.setCover(added, ofNote: note.id, images: covers)
            }
        }
    }

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
        Self.phase(signingUp: pendingRecoveryKey != nil || isSigningUp,
                   signedIn: accounts.account != nil || signedInForTesting,
                   restoring: accounts.isRestoring)
    }

    /// The welcome screen only once it is known there is no session (owner, 2026-11-08: it
    /// flashed for a split second at every launch before the library).
    nonisolated static func phase(signingUp: Bool, signedIn: Bool, restoring: Bool) -> Phase {
        if signingUp { return .onboarding }
        if signedIn { return .ready }
        return restoring ? .launching : .onboarding
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

    /// Versions of a note: the server's (with authors, D-54) once signed in, else this device's.
    var noteHistory: any NoteHistorySource {
        #if canImport(DSCore)
        if let connection, accounts.isServerBacked, accounts.account != nil { return connection }
        #endif
        return LocalNoteHistory(library: library)
    }

    /// UI tests with no `-ui-testing-server`: accounts stay on the device, no server is asked for.
    var isLocalOnlyTesting: Bool { isUITesting && serverURL == nil }

    /// Share links and invites name the account's own server (the web app is served there).
    var linkHost: String { serverURL?.host() ?? webHost }
    /// The account's server as `ds://` links name it (`host[:port]`); nil without one.
    var linkServer: String? { serverURL.flatMap(AppRoute.authority) }
    /// The server named by a link that is waiting for sign-in: the sign-in screens start on it.
    var serverFromLink: String? { pendingLink.flatMap(AppRoute.linkServer) }

    #if canImport(DSCore)
    private static func serverSide(_ server: URL, webHost: String, core: CoreLibrary, sync: SyncCenter, library: LibraryStore,
                                   covers: CoverImages)
        -> (connection: ServerConnection, accounts: any AccountService, sharing: any SharingService, access: any AccessService,
            accountSharing: any AccountSharingService) {
        let connection = ServerConnection(serverURL: server, webHost: server.host() ?? webHost, core: core, sync: sync,
                                          attachmentsDirectory: covers.directory)
        connection.onLibraryCarried = { [library] justCarried in library.mergeCarriedDuplicates(anyName: justCarried) }
        sync.onBackOnline = { connection.reconnect() }
        covers.remote = connection
        let sharing = ServerSharingService(connection: connection)
        let accountSharing = ServerAccountSharingService(connection: connection) { [weak sharing] targets in
            await sharing?.recreateLinks(for: targets) ?? [:]
        }
        return (connection, ServerAccountService(connection: connection), sharing, ServerAccessService(connection: connection),
                accountSharing)
    }
    #endif

    /// D-49: what `GET /v1/health` says about a server, before signing in to it.
    func checkServer(_ url: URL) async throws -> ServerInfo {
        let host = url.host() ?? ServerAddress.display(url)
        if isUITesting {
            // UI tests reach no server: `-ui-testing-health-ok` stands for a healthy one.
            guard ProcessInfo.processInfo.arguments.contains("-ui-testing-health-ok") else { throw URLError(.cannotConnectToHost) }
            return ServerInfo(host: host, version: "test")
        }
        #if canImport(DSCore)
        let version = try await ServerConnection.healthVersion(of: url)
        return ServerInfo(host: host, version: version)
        #else
        throw URLError(.unsupportedURL)
        #endif
    }

    /// D-49: signing in or up on another server. Only while signed out: the account, its keys and
    /// library belong to one server.
    func useServer(_ url: URL) {
        guard accounts.account == nil else { return }
        // Saved even when it is already the current one: a device must never depend on an
        // address it did not keep (D-49 amendment; before build 22 the default was not saved).
        if !isUITesting { UserDefaults.standard.set(url.absoluteString, forKey: Self.serverKey) }
        guard url != serverURL else { return }
        serverURL = url
        guard !isUITesting else { return }
        sync.useServer(url)
        #if canImport(DSCore)
        guard let core else { return }
        let side = Self.serverSide(url, webHost: webHost, core: core, sync: sync, library: library, covers: covers)
        connection = side.connection
        accounts = side.accounts
        sharing = side.sharing
        access = side.access
        accountSharing = side.accountSharing
        wireLocalWipe()
        wireSharing()
        #endif
    }

    func signOut() async {
        library.flush()
        await accounts.signOut()
        savedRecoveryKey = nil
        isRecoveryKeyConfirmed = true
        signedInForTesting = false
    }
}
