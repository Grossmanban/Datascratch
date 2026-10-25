import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        AccountSettings()
                    } label: {
                        HStack(spacing: Theme.Space.s3) {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(Theme.Palette.accent)
                            VStack(alignment: .leading) {
                                Text(app.accounts.account?.email ?? String(localized: "Account"))
                                    .font(.headline)
                                SyncStatusBadge()
                            }
                        }
                    }
                    .accessibilityIdentifier("settings.account")
                }
                Section {
                    NavigationLink { DevicesSettings() } label: {
                        Label("Devices", systemImage: "ipad.and.iphone")
                    }
                    NavigationLink { AgentTokensSettings() } label: {
                        Label("Agent Access", systemImage: "sparkles")
                    }
                    .accessibilityIdentifier("settings.agents")
                }
                Section {
                    NavigationLink { DrawingSettings() } label: {
                        Label("Pencil & Drawing", systemImage: "pencil.tip")
                    }
                    .accessibilityIdentifier("settings.drawing")
                    NavigationLink { AppearanceSettings() } label: {
                        Label("Appearance", systemImage: "circle.lefthalf.filled")
                    }
                }
                Section {
                    NavigationLink { AboutView() } label: {
                        Label("About Datascratch", systemImage: "info.circle")
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .accessibilityIdentifier("settings.done")
                }
            }
        }
    }
}

struct AccountSettings: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var confirmSignOut = false

    var body: some View {
        Form {
            Section("Account") {
                LabeledContent("Email", value: app.accounts.account?.email ?? "—")
                if let created = app.accounts.account?.createdAt {
                    LabeledContent("Member since", value: created.formatted(date: .long, time: .omitted))
                }
            }
            Section {
                NavigationLink("Change Password") { ChangePasswordView() }
            } footer: {
                Text("Your password also protects the encryption key. Your recovery key keeps working after a password change.")
            }
            Section("Sync") {
                LabeledContent("Status") { SyncStatusBadge() }
                LabeledContent("Server", value: app.sync.serverURL?.host() ?? String(localized: "Not connected"))
                if app.sync.isLocalOnly {
                    Text("Notes are stored only on this device until the Datascratch server is connected.")
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                }
            }
            Section {
                Button("Sign Out", role: .destructive) { confirmSignOut = true }
                    .confirmationDialog("Sign out of Datascratch?", isPresented: $confirmSignOut,
                                        titleVisibility: .visible) {
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
        .navigationTitle("Account")
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
            Section {
                LabeledContent("Version", value: "\(version) (\(build))")
                LabeledContent("Encryption", value: "XChaCha20-Poly1305 · Argon2id")
            }
        }
        .navigationTitle("About")
    }
}
