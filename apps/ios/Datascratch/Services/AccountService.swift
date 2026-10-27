import CryptoKit
import Foundation
import Observation
import UIKit

nonisolated struct Account: Codable, Hashable, Sendable {
    var userId: String
    var email: String
    var createdAt: Date
}

nonisolated enum AccountError: LocalizedError, Equatable, Sendable {
    case invalidEmail
    case weakPassword
    case passwordsDoNotMatch
    case wrongCredentials
    case accountExists
    case invalidRecoveryKey
    /// The server asked for password-KDF parameters below crypto.md §2 (a hostile or broken
    /// server making the login key cheap to guess); nothing was derived or sent.
    case unsafeServerParameters
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidEmail: String(localized: "Enter a valid email address.")
        case .weakPassword: String(localized: "Use at least 10 characters.")
        case .passwordsDoNotMatch: String(localized: "Passwords do not match.")
        case .wrongCredentials: String(localized: "Wrong email or password.")
        case .accountExists: String(localized: "An account with this email already exists on this device.")
        case .invalidRecoveryKey: String(localized: "This recovery key is not valid.")
        case .unsafeServerParameters: String(localized: "The server sent unsafe sign-in parameters. Nothing was sent; check the server address.")
        case .server(let message): message
        }
    }
}

/// Account lifecycle (D-34, contracts/crypto.md, contracts/api.md §auth).
/// The real implementation (Argon2id, key wrapping, REST) comes from DSCore;
/// `LocalAccountService` keeps the same flow working on one device meanwhile.
protocol AccountService: AnyObject {
    var account: Account? { get }
    /// `true` when accounts live on a server (sync available).
    var isServerBacked: Bool { get }
    func signUp(email: String, password: String) async throws -> RecoveryKey
    func signIn(email: String, password: String) async throws
    func recover(email: String, recoveryKey: RecoveryKey, newPassword: String) async throws
    func changePassword(current: String, new: String) async throws
    /// Issues a new recovery key (confirmed by the current password); the old one stops
    /// working at once. Show the new key once, like at sign-up (crypto.md §4).
    func rotateRecoveryKey(currentPassword: String) async throws -> RecoveryKey
    /// Password changes, recoveries and key rotations, newest first.
    func securityEvents() async throws -> [SecurityEvent]
    func signOut() async
    /// The account this device was signed out of by the server, if any (spec/07).
    var signedOutEmail: String? { get }
    /// Removes the library, keys and session from this device (spec/07).
    func deleteLocalData() async
    /// Changes and notebooks not yet on the server (spec/07, before signing out).
    var unsentChanges: Int { get }
    /// Waits until everything is sent; false when time ran out.
    func sendPending(timeout: Duration) async -> Bool
}

extension AccountService {
    var signedOutEmail: String? { nil }
    func deleteLocalData() async {}
    var unsentChanges: Int { 0 }
    func sendPending(timeout: Duration) async -> Bool { true }
}

/// One entry of the account security log (`GET /me/security-events`).
nonisolated struct SecurityEvent: Identifiable, Hashable, Sendable, Codable {
    nonisolated enum Kind: String, Codable, Sendable {
        case passwordChanged, recoveryUsed, recoveryKeyRotated
    }

    var id: String { "\(kind.rawValue)-\(date.timeIntervalSince1970)" }
    var kind: Kind
    var date: Date
    /// Nil for a recovery or a device that is gone.
    var deviceName: String?
}

enum Credentials {
    static let minimumPasswordLength = 10

    static func isValidEmail(_ email: String) -> Bool {
        let parts = email.trimmingCharacters(in: .whitespaces).split(separator: "@")
        return parts.count == 2 && parts[0].count >= 1 && parts[1].contains(".")
            && !parts[1].hasPrefix(".") && !parts[1].hasSuffix(".")
    }

    /// 0…4, a rough estimate for the strength meter.
    static func strength(_ password: String) -> Int {
        guard !password.isEmpty else { return 0 }
        var score = 0
        if password.count >= minimumPasswordLength { score += 1 }
        if password.count >= 14 { score += 1 }
        let classes = [
            password.contains { $0.isLowercase },
            password.contains { $0.isUppercase },
            password.contains { $0.isNumber },
            password.contains { !$0.isLetter && !$0.isNumber },
        ].filter { $0 }.count
        if classes >= 2 { score += 1 }
        if classes >= 3 { score += 1 }
        return min(score, 4)
    }

    static func normalizedEmail(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}

@Observable
final class LocalAccountService: AccountService {
    nonisolated private struct Record: Codable {
        var account: Account
        var salt: Data
        var passwordVerifier: Data
        var recoveryVerifier: Data
        var events: [SecurityEvent]? = nil
    }

    private(set) var account: Account?
    var isServerBacked: Bool { false }

    @ObservationIgnored private let store: SecureStore
    private static let recordKey = "local-account"
    private static let sessionKey = "local-session"

    init(store: SecureStore) {
        self.store = store
        if store.data(for: Self.sessionKey) != nil {
            account = store.codable(Record.self, for: Self.recordKey)?.account
        }
    }

    func signUp(email: String, password: String) async throws -> RecoveryKey {
        let email = Credentials.normalizedEmail(email)
        guard Credentials.isValidEmail(email) else { throw AccountError.invalidEmail }
        guard password.count >= Credentials.minimumPasswordLength else { throw AccountError.weakPassword }
        if let existing = store.codable(Record.self, for: Self.recordKey), existing.account.email == email {
            throw AccountError.accountExists
        }
        let key = RecoveryKey.random()
        let salt = Self.randomSalt()
        let record = Record(account: Account(userId: UUIDv7.make(), email: email, createdAt: Date()),
                            salt: salt,
                            passwordVerifier: Self.verifier(password, salt: salt),
                            recoveryVerifier: Self.verifier(key.base32, salt: salt))
        store.setCodable(record, for: Self.recordKey)
        store.set(Data([1]), for: Self.sessionKey)
        account = record.account
        return key
    }

    func signIn(email: String, password: String) async throws {
        let email = Credentials.normalizedEmail(email)
        guard let record = store.codable(Record.self, for: Self.recordKey),
              record.account.email == email,
              record.passwordVerifier == Self.verifier(password, salt: record.salt) else {
            throw AccountError.wrongCredentials
        }
        store.set(Data([1]), for: Self.sessionKey)
        account = record.account
    }

    func recover(email: String, recoveryKey: RecoveryKey, newPassword: String) async throws {
        let email = Credentials.normalizedEmail(email)
        guard newPassword.count >= Credentials.minimumPasswordLength else { throw AccountError.weakPassword }
        guard var record = store.codable(Record.self, for: Self.recordKey), record.account.email == email,
              record.recoveryVerifier == Self.verifier(recoveryKey.base32, salt: record.salt) else {
            throw AccountError.invalidRecoveryKey
        }
        let salt = Self.randomSalt()
        record.recoveryVerifier = Self.verifier(recoveryKey.base32, salt: salt)
        record.passwordVerifier = Self.verifier(newPassword, salt: salt)
        record.salt = salt
        Self.log(.recoveryUsed, in: &record, device: nil)
        store.setCodable(record, for: Self.recordKey)
        store.set(Data([1]), for: Self.sessionKey)
        account = record.account
    }

    func changePassword(current: String, new: String) async throws {
        guard var record = store.codable(Record.self, for: Self.recordKey),
              record.passwordVerifier == Self.verifier(current, salt: record.salt) else {
            throw AccountError.wrongCredentials
        }
        guard new.count >= Credentials.minimumPasswordLength else { throw AccountError.weakPassword }
        record.passwordVerifier = Self.verifier(new, salt: record.salt)
        Self.log(.passwordChanged, in: &record)
        store.setCodable(record, for: Self.recordKey)
    }

    func rotateRecoveryKey(currentPassword: String) async throws -> RecoveryKey {
        guard var record = store.codable(Record.self, for: Self.recordKey),
              record.passwordVerifier == Self.verifier(currentPassword, salt: record.salt) else {
            throw AccountError.wrongCredentials
        }
        let key = RecoveryKey.random()
        record.recoveryVerifier = Self.verifier(key.base32, salt: record.salt)
        Self.log(.recoveryKeyRotated, in: &record)
        store.setCodable(record, for: Self.recordKey)
        return key
    }

    func securityEvents() async throws -> [SecurityEvent] {
        store.codable(Record.self, for: Self.recordKey)?.events ?? []
    }

    private static func log(_ kind: SecurityEvent.Kind, in record: inout Record,
                            device: String? = UIDevice.current.name) {
        var events = record.events ?? []
        events.insert(SecurityEvent(kind: kind, date: Date(), deviceName: device), at: 0)
        record.events = Array(events.prefix(100))
    }

    func signOut() async {
        store.set(nil, for: Self.sessionKey)
        account = nil
    }

    private static func randomSalt() -> Data {
        Data((0..<16).map { _ in UInt8.random(in: 0...255) })
    }

    /// Placeholder verifier (SHA-256). DSCore replaces this with Argon2id per crypto.md §2.
    private static func verifier(_ secret: String, salt: Data) -> Data {
        var hasher = SHA256()
        hasher.update(data: salt)
        hasher.update(data: Data(secret.precomposedStringWithCompatibilityMapping.utf8))
        return Data(hasher.finalize())
    }
}
