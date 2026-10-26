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
                    ErrorText(message: error)
                    PrimaryButton(title: "Sign In", isWorking: isWorking, isDisabled: email.isEmpty || password.isEmpty) { submit() }
                        .accessibilityIdentifier("sessionEnded.signIn")
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
