import SwiftUI
#if canImport(DSDesign)
import DSDesign
#endif

struct SettingsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var path: [SettingsRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            SettingsPage(title: String(localized: "Settings")) {
                NavigationLink(value: SettingsRoute.account) {
                    DSProfileHeader(name: nil, email: app.accounts.account?.email ?? String(localized: "Account"),
                                    sync: app.sync.dsState, linkTitle: String(localized: "Account & Security"))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.vertical, -DSSpace.s4)
                .accessibilityIdentifier("settings.account")
                if !app.isRecoveryKeyConfirmed {
                    DSCallout(tone: .warning, title: String(localized: "Check your recovery key"),
                              message: String(localized: "It's the only way back to your notes if you forget the password."),
                              systemImage: "key", actionTitle: String(localized: "Check")) {
                        path.append(.recoveryKey)
                    }
                    .accessibilityIdentifier("settings.recoveryKeyReminder")
                }
                DSSettingsSection(String(localized: "Access")) {
                    NavigationLink(value: SettingsRoute.devices) {
                        DSSettingsRow(String(localized: "Devices"), systemImage: "ipad.and.iphone",
                                      value: app.access.devices.isEmpty ? nil : "\(app.access.devices.count)", accessory: .chevron)
                    }
                    NavigationLink(value: SettingsRoute.agents) {
                        DSSettingsRow(String(localized: "Agent Access"), systemImage: "sparkles", accessory: .chevron)
                    }
                    .accessibilityIdentifier("settings.agents")
                }
                .buttonStyle(.dsSettingsRow)
                DSSettingsSection(String(localized: "App")) {
                    NavigationLink(value: SettingsRoute.drawing) {
                        DSSettingsRow(String(localized: "Pencil & Drawing"), systemImage: "pencil.tip", accessory: .chevron)
                    }
                    .accessibilityIdentifier("settings.drawing")
                    NavigationLink(value: SettingsRoute.appearance) {
                        DSSettingsRow(String(localized: "Appearance"), systemImage: "circle.lefthalf.filled",
                                      value: app.settings.appearance.title, accessory: .chevron)
                    }
                }
                .buttonStyle(.dsSettingsRow)
                DSSettingsSection {
                    NavigationLink(value: SettingsRoute.about) {
                        DSSettingsRow(String(localized: "About Datascratch"), systemImage: "info.circle", accessory: .chevron)
                    }
                }
                .buttonStyle(.dsSettingsRow)
            }
            .navigationDestination(for: SettingsRoute.self) { route in
                switch route {
                case .account: AccountSettings()
                case .recoveryKey: RecoveryKeySettings()
                case .devices: DevicesSettings()
                case .agents: AgentTokensSettings()
                case .drawing: DrawingSettings()
                case .appearance: AppearanceSettings()
                case .about: AboutView()
                case .changePassword: ChangePasswordView()
                case .securityLog: SecurityLogView()
                }
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .accessibilityIdentifier("settings.done")
                }
            }
        }
    }
}

enum SettingsRoute: Hashable {
    case account, recoveryKey, devices, agents, drawing, appearance, about, changePassword, securityLog
}

/// A settings screen on the paper (design-system spec): serif title in the scroll, sections as
/// cards, at most 640 pt wide and centred; the bar shows the title only once scrolled.
struct SettingsPage<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DSSpace.s6) {
                Text(title)
                    .dsFont(.title)
                    .foregroundStyle(Color.dsPrimary)
                    .padding(.leading, DSSpace.s1)
                    .accessibilityAddTraits(.isHeader)
                content
            }
            .padding(.horizontal, DSSpace.s5)
            .padding(.top, DSSpace.s6)
            .padding(.bottom, DSSpace.s10)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Color.dsCanvas.ignoresSafeArea())
        .navigationTitle(title)
        .toolbarTitleDisplayMode(.inline)
        .settingsNavigationBar()
    }
}

struct AccountSettings: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var confirmSignOut = false

    var body: some View {
        SettingsPage(title: String(localized: "Account")) {
            DSProfileHeader(name: nil, email: app.accounts.account?.email ?? "—", sync: app.sync.dsState)
                .padding(.vertical, -DSSpace.s4)
            DSSettingsSection(String(localized: "Sync"),
                              footer: app.sync.isLocalOnly
                                ? String(localized: "Notes are stored only on this device until the Datascratch server is connected.")
                                : nil) {
                DSSettingsRow(String(localized: "Status"), systemImage: "arrow.triangle.2.circlepath",
                              accessory: .custom(AnyView(DSSyncChip(app.sync.dsState).accessibilityIdentifier("sync.status"))))
                DSSettingsRow(String(localized: "Server"), systemImage: "server.rack",
                              value: app.sync.serverURL?.host() ?? String(localized: "Not connected"))
                if case .notSent = app.sync.phase {
                    Button { app.sync.retryFailed() } label: {
                        DSSettingsRow(String(localized: "Retry"), systemImage: "arrow.clockwise", accessory: .chevron)
                    }
                    .buttonStyle(.dsSettingsRow)
                    .accessibilityIdentifier("sync.retry")
                }
            }
            DSSettingsSection(String(localized: "Security"),
                              footer: String(localized: "Your password also protects the encryption key. Your recovery key keeps working after a password change.")) {
                NavigationLink(value: SettingsRoute.recoveryKey) {
                    DSSettingsRow(String(localized: "Recovery Key"), systemImage: "key",
                                  accessory: app.isRecoveryKeyConfirmed ? .chevron : .badgeLink(String(localized: "Not checked"), .warning))
                }
                .accessibilityIdentifier("settings.recoveryKey")
                NavigationLink(value: SettingsRoute.changePassword) {
                    DSSettingsRow(String(localized: "Change Password"), systemImage: "lock", accessory: .chevron)
                }
                NavigationLink(value: SettingsRoute.securityLog) {
                    DSSettingsRow(String(localized: "Security Log"), systemImage: "list.bullet.rectangle", accessory: .chevron)
                }
                .accessibilityIdentifier("settings.securityLog")
            }
            .buttonStyle(.dsSettingsRow)
            DSSettingsSection(footer: String(localized: "You will need your password to sign in again.")) {
                Button { confirmSignOut = true } label: {
                    DSSettingsRow(String(localized: "Sign Out"), systemImage: "rectangle.portrait.and.arrow.right", role: .destructive)
                }
                .accessibilityIdentifier("settings.signOut")
            }
            .buttonStyle(.dsSettingsRow)
            .confirmationDialog("Sign out of Datascratch?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) {
                    Task {
                        await app.signOut()
                        dismiss()
                    }
                }
            } message: {
                Text("You will need your password to sign in again.")
            }
        }
    }
}

extension SyncCenter {
    /// The sync phase as the design system's chip shows it.
    var dsState: DSSyncState {
        switch phase {
        case .localOnly: .localOnly
        case .offline: .offline
        case .syncing: .syncing
        case .upToDate(let date): .synced(date)
        case .failed(let message): .error(message)
        case .notSent(let documents, _): .error(String(localized: "Not sent: \(documents)"))
        case .sessionEnded: .error(String(localized: "Signed out"))
        }
    }
}

extension AppSettings.Appearance {
    var title: String {
        switch self {
        case .system: String(localized: "System")
        case .light: String(localized: "Light")
        case .dark: String(localized: "Dark")
        }
    }
}

/// Shows the recovery key issued on this device and lets the user check it later.
struct RecoveryKeySettings: View {
    @Environment(AppModel.self) private var app
    @State private var isRevealed = false
    @State private var isChecking = false
    @State private var isRotating = false

    var body: some View {
        Form {
            if let key = app.savedRecoveryKey {
                Section {
                    if isRevealed {
                        RecoveryKeyGrid(key: key)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        RecoveryKeyActions(key: key)
                    } else {
                        Button("Show Key", systemImage: "eye") { withAnimation { isRevealed = true } }
                            .accessibilityIdentifier("recoveryKey.show")
                    }
                } footer: {
                    Text("If you forget your password, this key is the only way back to your notes. Keep it in a password manager or on paper.")
                }
                Section {
                    if app.isRecoveryKeyConfirmed {
                        Label("Key checked", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(Theme.Palette.success)
                    } else if isChecking {
                        RecoveryKeyCheck(key: key) {
                            withAnimation {
                                app.isRecoveryKeyConfirmed = true
                                isChecking = false
                            }
                        }
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                    } else {
                        Button("Check Key") { withAnimation { isChecking = true } }
                            .accessibilityIdentifier("recoveryKey.check")
                    }
                }
            } else {
                Section {
                    Label(app.isRecoveryKeyConfirmed ? LocalizedStringKey("Key checked") : "Not checked",
                          systemImage: app.isRecoveryKeyConfirmed ? "checkmark.seal.fill" : "exclamationmark.triangle")
                        .foregroundStyle(app.isRecoveryKeyConfirmed ? Theme.Palette.success : Theme.Palette.warning)
                } footer: {
                    Text("The key was shown on the device where you created the account. If you no longer have it, create a new one.")
                }
            }
            Section {
                Button("Create New Key…", systemImage: "arrow.triangle.2.circlepath") { isRotating = true }
                    .accessibilityIdentifier("recoveryKey.rotate")
            } footer: {
                Text("The current key stops working at once. Your notes are not re-encrypted and your devices stay signed in.")
            }
        }
        .navigationTitle("Recovery Key")
        .settingsNavigationBar()
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isRotating) {
            RotateRecoveryKeySheet { isRevealed = true }
        }
    }
}

/// Copy and save buttons under a shown key.
struct RecoveryKeyActions: View {
    let key: RecoveryKey

    var body: some View {
        HStack {
            Button("Copy", systemImage: "doc.on.doc") {
                UIPasteboard.general.string = key.formatted
                Haptics.success()
            }
            Spacer()
            SwiftUI.ShareLink(item: key.formatted) {
                Label("Save…", systemImage: "square.and.arrow.down")
            }
        }
        .buttonStyle(.borderless)
    }
}

/// Password → a new recovery key, shown once like at sign-up (crypto.md §4).
struct RotateRecoveryKeySheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    var onDone: () -> Void = {}
    @State private var password = ""
    @State private var newKey: RecoveryKey?
    @State private var saved = false
    @State private var error: String?
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            Form {
                if let newKey {
                    Section {
                        RecoveryKeyGrid(key: newKey)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        RecoveryKeyActions(key: newKey)
                    } header: {
                        Text("Your new recovery key")
                    } footer: {
                        Text("The old key no longer works. Save this one in a password manager or on paper.")
                    }
                    Section {
                        Toggle(isOn: $saved) {
                            Text("I saved the key somewhere safe — in a password manager or on paper.")
                        }
                        .toggleStyle(CheckboxToggleStyle())
                        .accessibilityIdentifier("rotateKey.saved")
                    }
                } else {
                    Section {
                        SecureField("Current Password", text: $password)
                            .textContentType(.password)
                            .accessibilityIdentifier("rotateKey.password")
                    } footer: {
                        Text("The current key stops working at once. Your notes are not re-encrypted and your devices stay signed in.")
                    }
                    if let error {
                        Section { Text(error).foregroundStyle(Theme.Palette.danger) }
                    }
                }
            }
            .navigationTitle("New Recovery Key")
            .settingsNavigationBar()
            .navigationBarTitleDisplayMode(.inline)
            .interactiveDismissDisabled(newKey != nil && !saved)
            .toolbar {
                if newKey == nil {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        if isWorking {
                            ProgressView()
                        } else {
                            Button("Create") { Task { await rotate() } }
                                .disabled(password.isEmpty)
                                .accessibilityIdentifier("rotateKey.create")
                        }
                    }
                } else {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            onDone()
                            dismiss()
                        }
                        .disabled(!saved)
                        .accessibilityIdentifier("rotateKey.done")
                    }
                }
            }
        }
    }

    private func rotate() async {
        isWorking = true
        defer { isWorking = false }
        do {
            let key = try await app.accounts.rotateRecoveryKey(currentPassword: password)
            // Keep it right away: the old key no longer works, this one must not get lost.
            app.adoptRotatedRecoveryKey(key)
            password = ""
            withAnimation { newKey = key }
            Haptics.success()
        } catch {
            Haptics.warning()
            withAnimation { self.error = error.localizedDescription }
        }
    }
}

/// Password changes, recoveries and key rotations (`GET /me/security-events`).
struct SecurityLogView: View {
    @Environment(AppModel.self) private var app
    @State private var events: [SecurityEvent]?
    @State private var error: String?

    var body: some View {
        List {
            if let events {
                if events.isEmpty {
                    ContentUnavailableView("No security events", systemImage: "lock.shield",
                                           description: Text("Password changes, recoveries and new recovery keys appear here."))
                        .listRowBackground(Color.clear)
                } else {
                    ForEach(events) { event in
                        HStack(spacing: Theme.Space.s3) {
                            Image(systemName: event.kind.symbol)
                                .foregroundStyle(Theme.Palette.accent)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.kind.title)
                                Text(event.deviceName ?? String(localized: "Without a signed-in device"))
                                    .font(Theme.Typography.footnote)
                                    .foregroundStyle(Theme.Palette.textSecondary)
                            }
                            Spacer()
                            Text(event.date, format: .dateTime.day().month().year().hour().minute())
                                .font(Theme.Typography.footnote)
                                .foregroundStyle(Theme.Palette.textTertiary)
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
            } else if let error {
                Text(error).foregroundStyle(Theme.Palette.danger)
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Security Log")
        .settingsNavigationBar()
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            events = try await app.accounts.securityEvents()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

extension SecurityEvent.Kind {
    var title: LocalizedStringResource {
        switch self {
        case .passwordChanged: "Password changed"
        case .recoveryUsed: "Signed in with the recovery key"
        case .recoveryKeyRotated: "New recovery key"
        }
    }

    var symbol: String {
        switch self {
        case .passwordChanged: "key"
        case .recoveryUsed: "lifepreserver"
        case .recoveryKeyRotated: "arrow.triangle.2.circlepath"
        }
    }
}

struct ChangePasswordView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var current = ""
    @State private var new = ""
    @State private var repeated = ""
    @State private var error: String?
    @State private var isWorking = false
    @State private var done = false

    var body: some View {
        Form {
            Section {
                SecureField("Current password", text: $current)
                    .textContentType(.password)
            }
            Section {
                SecureField("New password", text: $new)
                    .textContentType(.newPassword)
                PasswordStrengthMeter(password: new)
                SecureField("Repeat new password", text: $repeated)
                    .textContentType(.newPassword)
            } footer: {
                Text("At least 10 characters. Only the key wrapper is re-encrypted; your notes stay as they are.")
            }
            if let error {
                Section { Text(error).foregroundStyle(Theme.Palette.danger) }
            }
            Section {
                Button {
                    submit()
                } label: {
                    HStack {
                        Text("Change Password")
                        Spacer()
                        if isWorking { ProgressView() }
                    }
                }
                .disabled(current.isEmpty || new.isEmpty || isWorking)
            }
        }
        .navigationTitle("Change Password")
        .settingsNavigationBar()
        .alert("Password changed", isPresented: $done) {
            Button("OK") { dismiss() }
        }
    }

    private func submit() {
        guard new == repeated else {
            error = AccountError.passwordsDoNotMatch.errorDescription
            return
        }
        isWorking = true
        error = nil
        Task {
            do {
                try await app.accounts.changePassword(current: current, new: new)
                done = true
            } catch {
                self.error = error.localizedDescription
            }
            isWorking = false
        }
    }
}

struct DevicesSettings: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        List {
            Section {
                ForEach(app.access.devices) { device in
                    HStack(spacing: Theme.Space.s3) {
                        Image(systemName: device.platform == "iPadOS" ? "ipad" : device.platform == "web" ? "globe" : "iphone")
                            .font(.title2)
                            .foregroundStyle(Theme.Palette.accent)
                            .frame(width: 32)
                        VStack(alignment: .leading) {
                            Text(device.name).font(.headline)
                            Text(device.isCurrent ? String(localized: "This device")
                                 : device.lastSeenAt.formatted(.relative(presentation: .named)))
                                .font(Theme.Typography.footnote)
                                .foregroundStyle(Theme.Palette.textSecondary)
                        }
                    }
                    .swipeActions {
                        if !device.isCurrent {
                            Button("Sign Out", role: .destructive) {
                                Task { try? await app.access.revokeDevice(device.id) }
                            }
                        }
                    }
                }
            } footer: {
                Text("Signing a device out removes its access immediately.")
            }
        }
        .navigationTitle("Devices")
        .settingsNavigationBar()
        .task { await app.access.refresh() }
    }
}

struct DrawingSettings: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        @Bindable var settings = app.settings
        Form {
            Section {
                Toggle("Draw with Finger", isOn: $settings.fingerDrawing)
                    .accessibilityIdentifier("settings.fingerDrawing")
            } footer: {
                Text("When off, a finger scrolls and selects text and only Apple Pencil draws. Turn it on to draw with a finger, for example on iPhone.")
            }
            Section("Feedback") {
                Toggle("Haptics", isOn: $settings.hapticsEnabled)
            }
        }
        .navigationTitle("Pencil & Drawing")
        .settingsNavigationBar()
    }
}

struct AppearanceSettings: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        @Bindable var settings = app.settings
        Form {
            Section("Theme") {
                Picker("Theme", selection: $settings.appearance) {
                    Text("System").tag(AppSettings.Appearance.system)
                    Text("Light").tag(AppSettings.Appearance.light)
                    Text("Dark").tag(AppSettings.Appearance.dark)
                }
                .pickerStyle(.segmented)
            }
            Section("New documents") {
                Picker("Font", selection: $settings.defaultFont) {
                    Text("Serif").tag(NoteStyle.Font.serif)
                    Text("Sans").tag(NoteStyle.Font.sans)
                    Text("Mono").tag(NoteStyle.Font.mono)
                }
                Picker("Paper", selection: $settings.defaultPaper) {
                    Text("Plain").tag(NoteStyle.Paper.plain)
                    Text("Dots").tag(NoteStyle.Paper.dots)
                    Text("Grid").tag(NoteStyle.Paper.grid)
                    Text("Lines").tag(NoteStyle.Paper.lines)
                }
            }
        }
        .navigationTitle("Appearance")
        .settingsNavigationBar()
    }
}

struct AboutView: View {
    var body: some View {
        let info = Bundle.main.infoDictionary ?? [:]
        let version = info["CFBundleShortVersionString"] as? String ?? "—"
        let build = info["CFBundleVersion"] as? String ?? "—"
        List {
            Section {
                VStack(spacing: Theme.Space.s3) {
                    Image(systemName: "pencil.and.scribble")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(Theme.Palette.accent)
                    Text("Datascratch")
                        .font(Theme.Typography.h1)
                    Text("Notes where the pen lives in the text.")
                        .font(Theme.Typography.callout)
                        .foregroundStyle(Theme.Palette.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Theme.Space.s4)
                .listRowBackground(Color.clear)
            }
            #if DEBUG && canImport(DSDesign)
            Section {
                NavigationLink("Design System") { DSShowcase() }
            }
            #endif
            Section {
                LabeledContent("Version", value: "\(version) (\(build))")
                LabeledContent("Encryption", value: "XChaCha20-Poly1305 · Argon2id")
            }
        }
        .navigationTitle("About")
        .settingsNavigationBar()
    }
}

extension View {
    /// An opaque bar over settings screens: under the translucent default the rows showed
    /// through the title and the round back button sat on the content.
    func settingsNavigationBar() -> some View {
        toolbarBackgroundVisibility(.visible, for: .navigationBar)
            .toolbarBackground(Theme.Palette.canvas, for: .navigationBar)
    }
}
