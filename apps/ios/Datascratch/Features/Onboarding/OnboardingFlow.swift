import SwiftUI

/// Welcome → sign up → recovery key → confirm; or sign in / recover (D-34).
struct OnboardingFlow: View {
    @Environment(AppModel.self) private var app

    enum Step: Hashable {
        case signUp, signIn, recover, recoveryKey, confirmKey
    }

    @State private var path: [Step] = []

    var body: some View {
        NavigationStack(path: $path) {
            WelcomeView(path: $path)
                .navigationDestination(for: Step.self) { step in
                    switch step {
                    case .signUp: SignUpView(path: $path)
                    case .signIn: SignInView(path: $path)
                    case .recover: RecoverView()
                    case .recoveryKey: RecoveryKeyView(path: $path)
                    case .confirmKey: ConfirmRecoveryKeyView()
                    }
                }
        }
        .onAppear {
            // Resume if the app was relaunched while the key was on screen.
            if app.pendingRecoveryKey != nil, path.isEmpty { path = [.recoveryKey] }
        }
    }
}

struct WelcomeView: View {
    @Binding var path: [OnboardingFlow.Step]
    @State private var appeared = false

    var body: some View {
        ZStack {
            Backdrop.dusk.gradient.ignoresSafeArea()
            PaperPattern(paper: .lines, spacing: 34).opacity(0.5).ignoresSafeArea()
            VStack(spacing: Theme.Space.s6) {
                Spacer()
                VStack(spacing: Theme.Space.s4) {
                    Image(systemName: "pencil.and.scribble")
                        .font(.system(size: 64, weight: .light))
                        .foregroundStyle(Theme.Palette.accent)
                        .symbolEffect(.bounce, value: appeared)
                    Text("Datascratch")
                        .font(.system(size: 44, weight: .semibold, design: .serif))
                        .foregroundStyle(Theme.Palette.textPrimary)
                    Text("Notes where the pen lives in the text.\nMark up words with Apple Pencil — the ink moves with them.")
                        .font(Theme.Typography.callout)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .frame(maxWidth: 420)
                }
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 12)
                Spacer()
                VStack(spacing: Theme.Space.s3) {
                    Button {
                        path.append(.signUp)
                    } label: {
                        Text("Create Account").frame(maxWidth: .infinity)
                    }
                    .prominentGlass()
                    .controlSize(.large)
                    .accessibilityIdentifier("welcome.signUp")
                    Button {
                        path.append(.signIn)
                    } label: {
                        Text("Sign In").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.glass)
                    .controlSize(.large)
                    .accessibilityIdentifier("welcome.signIn")
                    Label("End-to-end encrypted. Only you hold the keys.", systemImage: "lock.fill")
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .padding(.top, Theme.Space.s2)
                }
                .frame(maxWidth: 380)
                .padding(.bottom, Theme.Space.s8)
            }
            .padding(.horizontal, Theme.Space.s6)
        }
        .onAppear { withAnimation(Theme.Motion.gentle.delay(0.1)) { appeared = true } }
    }
}

/// Shared card layout of the auth forms.
struct AuthCard<Content: View>: View {
    let title: LocalizedStringKey
    let subtitle: LocalizedStringKey
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.s5) {
                VStack(alignment: .leading, spacing: Theme.Space.s2) {
                    Text(title)
                        .font(Theme.Typography.title)
                        .foregroundStyle(Theme.Palette.textPrimary)
                    Text(subtitle)
                        .font(Theme.Typography.callout)
                        .foregroundStyle(Theme.Palette.textSecondary)
                }
                content
            }
            .frame(maxWidth: 440, alignment: .leading)
            .padding(Theme.Space.s6)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.Palette.canvas.ignoresSafeArea())
    }
}

struct FieldBox<Field: View>: View {
    @ViewBuilder var field: Field

    var body: some View {
        field
            .padding(.horizontal, Theme.Space.s4)
            .padding(.vertical, Theme.Space.s3)
            .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                    .strokeBorder(Theme.Palette.separator)
            }
    }
}

/// D-49: «Server» on the sign-in and sign-up screens. It starts with this device's server (the
/// build's by default); another address is checked (`GET /v1/health`, `https://` only) and named
/// with its version before the account goes there. Hidden in a build with no server at all.
struct ServerField: View {
    struct Entry: Equatable {
        var text: String?
        var status: Status = .unchecked
    }

    enum Status: Equatable {
        case unchecked
        case checking
        case reachable(ServerInfo)
        case failed(String)
    }

    @Environment(AppModel.self) private var app
    @Binding var state: Entry
    let identifier: String

    static func isShown(_ app: AppModel) -> Bool { app.serverURL != nil || app.defaultServerURL != nil }

    var body: some View {
        if Self.isShown(app) {
            VStack(alignment: .leading, spacing: Theme.Space.s2) {
                FieldBox {
                    HStack(spacing: Theme.Space.s2) {
                        Image(systemName: "server.rack")
                            .foregroundStyle(Theme.Palette.textTertiary)
                        TextField("Server", text: Binding(
                            get: { state.text ?? app.serverURL.map(ServerAddress.display) ?? "" },
                            set: { state.text = $0; state.status = .unchecked }))
                            .textContentType(.URL)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onSubmit { Task { _ = await Self.check($state, app: app) } }
                            .accessibilityIdentifier("\(identifier).server")
                    }
                }
                switch state.status {
                case .unchecked:
                    EmptyView()
                case .checking:
                    Label("Checking the server…", systemImage: "hourglass")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textSecondary)
                case .reachable(let info):
                    Label("\(info.host) · \(info.version)", systemImage: "checkmark.seal")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .accessibilityIdentifier("\(identifier).serverInfo")
                case .failed(let message):
                    Text(message)
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.danger)
                        .accessibilityIdentifier("\(identifier).serverError")
                }
            }
        }
    }

    /// The typed server, checked; nil (with the reason shown) when it cannot be used.
    @MainActor
    private static func check(_ state: Binding<Entry>, app: AppModel) async -> URL? {
        let text = state.wrappedValue.text ?? app.serverURL.map(ServerAddress.display) ?? ""
        switch ServerAddress.parse(text) {
        case .failure(.notHTTPS):
            state.wrappedValue.status = .failed(String(localized: "Use an https:// address."))
            return nil
        case .failure:
            state.wrappedValue.status = .failed(String(localized: "This is not a server address."))
            return nil
        case .success(let url):
            // The server already in use needs no check.
            if url == app.serverURL, state.wrappedValue.text == nil { return url }
            if case .reachable = state.wrappedValue.status { return url }
            state.wrappedValue.status = .checking
            do {
                let info = try await app.checkServer(url)
                state.wrappedValue.status = .reachable(info)
                return url
            } catch {
                state.wrappedValue.status = .failed(String(localized: "Can’t reach this server. Check the address and the connection."))
                return nil
            }
        }
    }

    /// Before signing in or up: the typed server is checked and becomes the app's server.
    @MainActor
    static func use(_ state: Binding<Entry>, app: AppModel) async -> Bool {
        guard isShown(app) else { return true }
        guard let url = await check(state, app: app) else { return false }
        app.useServer(url)
        return true
    }
}

struct PasswordStrengthMeter: View {
    let password: String

    var body: some View {
        let strength = Credentials.strength(password)
        let color: Color = strength <= 1 ? Theme.Palette.danger : strength == 2 ? Theme.Palette.warning : Theme.Palette.success
        HStack(spacing: 4) {
            ForEach(0..<4, id: \.self) { index in
                Capsule()
                    .fill(index < strength ? color : Theme.Palette.separator)
                    .frame(height: 4)
            }
        }
        .animation(Theme.Motion.snappy, value: strength)
        .accessibilityElement()
        .accessibilityLabel("Password strength")
        .accessibilityValue("\(strength) of 4")
    }
}

struct ErrorText: View {
    let message: String?

    var body: some View {
        if let message {
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(Theme.Typography.footnote)
                .foregroundStyle(Theme.Palette.danger)
                .transition(.opacity)
                .accessibilityIdentifier("auth.error")
        }
    }
}

struct PrimaryButton: View {
    let title: LocalizedStringKey
    var isWorking = false
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Spacer()
                if isWorking { ProgressView().tint(Theme.Palette.onAccent) } else { Text(title) }
                Spacer()
            }
        }
        .prominentGlass()
        .controlSize(.large)
        .disabled(isDisabled || isWorking)
    }
}

struct SignUpView: View {
    @Environment(AppModel.self) private var app
    @Binding var path: [OnboardingFlow.Step]
    @State private var email = ""
    @State private var password = ""
    @State private var repeated = ""
    @State private var error: String?
    @State private var isWorking = false
    @State private var server = ServerField.Entry()

    var body: some View {
        AuthCard(title: "Create account",
                 subtitle: "Your password signs you in and encrypts your notes. It never leaves this device.") {
            ServerField(state: $server, identifier: "signUp")
            FieldBox {
                TextField("Email", text: $email)
                    .textContentType(.username)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("signUp.email")
            }
            VStack(alignment: .leading, spacing: Theme.Space.s2) {
                FieldBox {
                    SecureField("Password", text: $password)
                        .textContentType(.newPassword)
                        .accessibilityIdentifier("signUp.password")
                }
                PasswordStrengthMeter(password: password)
                Text("At least 10 characters. A long phrase is easier to remember and harder to guess.")
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textTertiary)
            }
            FieldBox {
                SecureField("Repeat password", text: $repeated)
                    .textContentType(.newPassword)
                    .accessibilityIdentifier("signUp.repeat")
            }
            ErrorText(message: error)
            PrimaryButton(title: "Continue", isWorking: isWorking,
                          isDisabled: email.isEmpty || password.isEmpty || repeated.isEmpty) { submit() }
                .accessibilityIdentifier("signUp.submit")
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit() {
        guard password == repeated else {
            withAnimation { error = AccountError.passwordsDoNotMatch.errorDescription }
            return
        }
        isWorking = true
        error = nil
        Task {
            guard await ServerField.use($server, app: app) else {
                isWorking = false
                return
            }
            do {
                // Keep onboarding on screen until the key is confirmed.
                app.isSigningUp = true
                let key = try await app.accounts.signUp(email: email, password: password)
                app.pendingRecoveryKey = key
                path.append(.recoveryKey)
            } catch {
                app.isSigningUp = false
                withAnimation { self.error = error.localizedDescription }
            }
            isWorking = false
        }
    }
}

struct SignInView: View {
    @Environment(AppModel.self) private var app
    @Binding var path: [OnboardingFlow.Step]
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isWorking = false
    @State private var server = ServerField.Entry()

    var body: some View {
        AuthCard(title: "Welcome back", subtitle: "Sign in with your email and password.") {
            ServerField(state: $server, identifier: "signIn")
            FieldBox {
                TextField("Email", text: $email)
                    .textContentType(.username)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("signIn.email")
            }
            FieldBox {
                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .onSubmit(submit)
                    .accessibilityIdentifier("signIn.password")
            }
            ErrorText(message: error)
            PrimaryButton(title: "Sign In", isWorking: isWorking, isDisabled: email.isEmpty || password.isEmpty) { submit() }
                .accessibilityIdentifier("signIn.submit")
            Button("Forgot password? Use your recovery key") { path.append(.recover) }
                .font(Theme.Typography.footnote)
                .frame(maxWidth: .infinity)
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit() {
        isWorking = true
        error = nil
        Task {
            guard await ServerField.use($server, app: app) else {
                isWorking = false
                return
            }
            do {
                try await app.accounts.signIn(email: email, password: password)
                app.finishOnboarding()
            } catch {
                withAnimation { self.error = error.localizedDescription }
            }
            isWorking = false
        }
    }
}

struct RecoverView: View {
    @Environment(AppModel.self) private var app
    @State private var email = ""
    @State private var keyText = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isWorking = false

    var body: some View {
        AuthCard(title: "Recover access",
                 subtitle: "Enter the recovery key you saved when you created the account, then choose a new password. Your notes stay intact.") {
            FieldBox {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
            FieldBox {
                TextField("DS1-XXXX-XXXX-…", text: $keyText, axis: .vertical)
                    .font(.system(.body, design: .monospaced))
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("recover.key")
            }
            FieldBox {
                SecureField("New password", text: $password)
                    .textContentType(.newPassword)
            }
            PasswordStrengthMeter(password: password)
            ErrorText(message: error)
            PrimaryButton(title: "Set New Password", isWorking: isWorking,
                          isDisabled: email.isEmpty || keyText.isEmpty || password.isEmpty) { submit() }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit() {
        guard let key = RecoveryKey(keyText) else {
            withAnimation { error = AccountError.invalidRecoveryKey.errorDescription }
            return
        }
        isWorking = true
        error = nil
        Task {
            do {
                try await app.accounts.recover(email: email, recoveryKey: key, newPassword: password)
                app.finishOnboarding()
            } catch {
                withAnimation { self.error = error.localizedDescription }
            }
            isWorking = false
        }
    }
}

struct RecoveryKeyView: View {
    @Environment(AppModel.self) private var app
    @Binding var path: [OnboardingFlow.Step]
    @State private var saved = false
    @State private var copied = false

    var body: some View {
        AuthCard(title: "Your recovery key",
                 subtitle: "If you forget your password, this key is the only way back to your notes. We can't reset it for you — nobody but you can read your notes.") {
            if let key = app.pendingRecoveryKey {
                RecoveryKeyGrid(key: key)
                HStack(spacing: Theme.Space.s3) {
                    Button(copied ? LocalizedStringKey("Copied") : "Copy", systemImage: copied ? "checkmark" : "doc.on.doc") {
                        SecretPasteboard.copy(key.formatted)
                        withAnimation { copied = true }
                        Haptics.success()
                    }
                    .buttonStyle(.glass)
                    SwiftUI.ShareLink(item: key.formatted) {
                        Label("Save…", systemImage: "square.and.arrow.down")
                    }
                    .buttonStyle(.glass)
                }
                Toggle(isOn: $saved) {
                    Text("I saved the key somewhere safe — in a password manager or on paper.")
                        .font(Theme.Typography.callout)
                }
                .toggleStyle(CheckboxToggleStyle())
                .accessibilityIdentifier("recoveryKey.saved")
                PrimaryButton(title: "Continue", isDisabled: !saved) { path.append(.confirmKey) }
                    .accessibilityIdentifier("recoveryKey.continue")
            }
        }
        .navigationBarBackButtonHidden()
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct RecoveryKeyGrid: View {
    let key: RecoveryKey

    var body: some View {
        let groups = key.groups
        VStack(alignment: .leading, spacing: Theme.Space.s3) {
            Text(RecoveryKey.prefix)
                .font(Theme.Typography.caption.weight(.semibold))
                .foregroundStyle(Theme.Palette.textTertiary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Theme.Space.s2), count: 4),
                      alignment: .leading, spacing: Theme.Space.s2) {
                ForEach(Array(groups.enumerated()), id: \.offset) { index, group in
                    HStack(spacing: 4) {
                        Text("\(index + 1)")
                            .font(.system(size: 10, weight: .medium).monospacedDigit())
                            .foregroundStyle(Theme.Palette.textTertiary)
                        Text(group)
                            .font(.system(.body, design: .monospaced).weight(.medium))
                            .foregroundStyle(Theme.Palette.textPrimary)
                    }
                }
            }
        }
        .padding(Theme.Space.s4)
        .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                .strokeBorder(Theme.Palette.separator)
        }
        .textSelection(.enabled)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(key.formatted))
        .accessibilityIdentifier("recoveryKey.grid")
        .hiddenWhenCaptured()
    }
}

/// Asks for two groups of the key to make sure it was written down. The check is
/// optional (spec/07): «Skip» finishes sign-up and Settings keeps reminding.
struct ConfirmRecoveryKeyView: View {
    @Environment(AppModel.self) private var app
    @State private var confirmSkip = false

    var body: some View {
        AuthCard(title: "Check your key",
                 subtitle: "Type two groups from your recovery key to make sure it's saved correctly.") {
            if let key = app.pendingRecoveryKey {
                RecoveryKeyCheck(key: key) { app.finishOnboarding() }
                Button("Skip") { confirmSkip = true }
                    .buttonStyle(.borderless)
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .frame(maxWidth: .infinity)
                    .accessibilityIdentifier("confirmKey.skip")
                    .confirmationDialog("Skip the check?", isPresented: $confirmSkip, titleVisibility: .visible) {
                        Button("Skip") { app.finishOnboarding(keyConfirmed: false) }
                            .accessibilityIdentifier("confirmKey.skipConfirm")
                    } message: {
                        Text("Without the key you can't get your notes back if you forget the password. You can show the key and check it later in Settings → Account.")
                    }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// Two random groups of the key typed back by the user.
struct RecoveryKeyCheck: View {
    let key: RecoveryKey
    let onConfirmed: () -> Void
    @State private var first = ""
    @State private var second = ""
    @State private var error: String?
    @State private var indices: (Int, Int) = (0, 0)

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s3) {
            FieldBox {
                TextField("Group \(indices.0 + 1)", text: $first)
                    .font(.system(.body, design: .monospaced))
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("confirmKey.first")
            }
            FieldBox {
                TextField("Group \(indices.1 + 1)", text: $second)
                    .font(.system(.body, design: .monospaced))
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("confirmKey.second")
            }
            ErrorText(message: error)
            PrimaryButton(title: "Finish", isDisabled: first.isEmpty || second.isEmpty) {
                let groups = key.groups
                if normalize(first) == groups[indices.0], normalize(second) == groups[indices.1] {
                    Haptics.success()
                    onConfirmed()
                } else {
                    Haptics.warning()
                    withAnimation { error = String(localized: "These groups don't match. Check the key you saved.") }
                }
            }
            .accessibilityIdentifier("confirmKey.finish")
        }
        .onAppear {
            let count = key.groups.count
            guard count > 2, indices == (0, 0) else { return }
            indices = (Int.random(in: 0..<(count / 2)), Int.random(in: (count / 2)..<count))
        }
    }

    private func normalize(_ text: String) -> String {
        text.uppercased().filter { !$0.isWhitespace && $0 != "-" }
            .map { $0 == "O" ? "0" : ($0 == "I" || $0 == "L") ? "1" : $0 }
            .reduce(into: "") { $0.append($1) }
    }
}

struct CheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
            Haptics.selection()
        } label: {
            HStack(alignment: .top, spacing: Theme.Space.s3) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundStyle(configuration.isOn ? Theme.Palette.accent : Theme.Palette.textTertiary)
                configuration.label
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .multilineTextAlignment(.leading)
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(configuration.isOn ? [.isToggle, .isSelected] : .isToggle)
    }
}
