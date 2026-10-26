import SwiftUI

/// The server ended this device's session (from another device or the web): say so plainly,
/// keep everything on the device, and let the person sign in again right here.
struct SessionEndedView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isWorking = false
    @State private var confirmOtherAccount = false
    @State private var confirmDelete = false

    /// The typed e-mail is not the account this device was signed out of.
    private var isOtherAccount: Bool {
        guard let previous = app.accounts.signedOutEmail, !email.isEmpty else { return false }
        return Credentials.normalizedEmail(email) != previous
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.s4) {
                    Image(systemName: "person.crop.circle.badge.exclamationmark")
                        .font(.system(size: 44))
                        .foregroundStyle(Theme.Palette.danger)
                        .accessibilityHidden(true)
                    Text("This device was signed out")
                        .font(Theme.Typography.title)
                        .accessibilityIdentifier("sessionEnded.title")
                    Text("The session was ended from another device or in your account settings. Your notes stay on this device; changes made here will sync once you sign in again.")
                        .font(Theme.Typography.body)
                        .foregroundStyle(Theme.Palette.textSecondary)
                    FieldBox {
                        TextField("Email", text: $email)
                            .textContentType(.username)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .accessibilityIdentifier("sessionEnded.email")
                    }
                    FieldBox {
                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .onSubmit(submit)
                            .accessibilityIdentifier("sessionEnded.password")
                    }
                    if app.sync.pendingChanges > 0 {
                        Label {
                            Text("Unsent changes kept on this device: \(app.sync.pendingChanges)")
                        } icon: {
                            Image(systemName: "tray.full")
                        }
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .accessibilityIdentifier("sessionEnded.unsent")
                    }
                    if isOtherAccount {
                        Text("Signing in to another account removes this device's notes of the previous account.")
                            .font(Theme.Typography.footnote)
                            .foregroundStyle(Theme.Palette.danger)
                            .accessibilityIdentifier("sessionEnded.otherAccount")
                    }
                    ErrorText(message: error)
                    PrimaryButton(title: "Sign In", isWorking: isWorking, isDisabled: email.isEmpty || password.isEmpty) {
                        if isOtherAccount { confirmOtherAccount = true } else { submit() }
                    }
                    .accessibilityIdentifier("sessionEnded.signIn")
                    Button("Delete Data from This Device", role: .destructive) { confirmDelete = true }
                        .font(Theme.Typography.footnote)
                        .frame(maxWidth: .infinity)
                        .padding(.top, Theme.Space.s4)
                        .accessibilityIdentifier("sessionEnded.deleteData")
                }
                .padding(Theme.Space.s5)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Later") { dismiss() }
                        .accessibilityIdentifier("sessionEnded.later")
                }
            }
        }
        .onAppear { if email.isEmpty { email = app.accounts.account?.email ?? "" } }
        .confirmationDialog("Sign in to another account?", isPresented: $confirmOtherAccount, titleVisibility: .visible) {
            Button("Remove and Sign In", role: .destructive) { submit() }
        } message: {
            Text("The notes of the previous account, including unsent changes, will be removed from this device.")
        }
        .confirmationDialog("Delete everything on this device?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete Data", role: .destructive) {
                Task {
                    await app.accounts.deleteLocalData()
                    dismiss()
                }
            }
        } message: {
            Text("Notes, keys and unsent changes are removed from this device. What reached the server stays in your account.")
        }
    }

    private func submit() {
        isWorking = true
        error = nil
        Task {
            do {
                try await app.accounts.signIn(email: email, password: password)
                dismiss()
            } catch {
                withAnimation { self.error = error.localizedDescription }
            }
            isWorking = false
        }
    }
}
