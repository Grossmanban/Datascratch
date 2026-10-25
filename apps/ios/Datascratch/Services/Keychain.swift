import Foundation
import Security

/// Minimal generic-password storage. `inMemory` keeps values for tests/previews.
nonisolated final class SecureStore: @unchecked Sendable {
    private let service: String
    private let inMemory: Bool
    private var memory: [String: Data] = [:]
    private let lock = NSLock()

    init(service: String = "com.datascratch.app", inMemory: Bool = false) {
        self.service = service
        self.inMemory = inMemory
    }

    func data(for key: String) -> Data? {
        if inMemory { return lock.withLock { memory[key] } }
        var query = baseQuery(key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess else { return nil }
        return item as? Data
    }

    func set(_ data: Data?, for key: String) {
        if inMemory {
            lock.withLock { memory[key] = data }
            return
        }
        SecItemDelete(baseQuery(key) as CFDictionary)
        guard let data else { return }
        var query = baseQuery(key)
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(query as CFDictionary, nil)
    }

    func codable<T: Decodable>(_ type: T.Type, for key: String) -> T? {
        data(for: key).flatMap { try? JSONDecoder().decode(type, from: $0) }
    }

    func setCodable<T: Encodable>(_ value: T?, for key: String) {
        set(value.flatMap { try? JSONEncoder().encode($0) }, for: key)
    }

    private func baseQuery(_ key: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: key]
    }
}
