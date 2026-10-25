import Foundation
import Observation
import UIKit

nonisolated struct Device: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var platform: String
    var lastSeenAt: Date
    var isCurrent: Bool
}

nonisolated enum AgentPermission: String, Codable, CaseIterable, Sendable {
    case read
    case readWrite = "read_write"
}

/// Agent access token (contracts/api.md §agent-tokens, spec/09).
nonisolated struct AgentToken: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var notebookIds: [String]
    var permission: AgentPermission
    var createdAt: Date
    var expiresAt: Date?
}

/// Devices and agent tokens. DSCore talks to `/v1/devices` and `/v1/agent-tokens`;
/// the local stand-in shows this device and mints opaque tokens.
protocol AccessService: AnyObject {
    var devices: [Device] { get }
    var agentTokens: [AgentToken] { get }
    func refresh() async
    func revokeDevice(_ id: String) async throws
    /// Returns the secret, shown to the user exactly once.
    func createAgentToken(name: String, notebookIds: [String], permission: AgentPermission,
                          expiresAt: Date?) async throws -> String
    func revokeAgentToken(_ id: String) async throws
}

@Observable
final class LocalAccessService: AccessService {
    private(set) var devices: [Device] = []
    private(set) var agentTokens: [AgentToken] = []

    init() {
        devices = [Device(id: ID.make(), name: UIDevice.current.name,
                          platform: UIDevice.current.userInterfaceIdiom == .pad ? "iPadOS" : "iOS",
                          lastSeenAt: Date(), isCurrent: true)]
    }

    func refresh() async {}

    func revokeDevice(_ id: String) async throws {
        devices.removeAll { $0.id == id && !$0.isCurrent }
    }

    func createAgentToken(name: String, notebookIds: [String], permission: AgentPermission,
                          expiresAt: Date?) async throws -> String {
        let token = AgentToken(id: ID.make(), name: name, notebookIds: notebookIds,
                               permission: permission, createdAt: Date(), expiresAt: expiresAt)
        agentTokens.append(token)
        return "dsa_" + Base64URL.encode(Data((0..<32).map { _ in UInt8.random(in: 0...255) }))
    }

    func revokeAgentToken(_ id: String) async throws {
        agentTokens.removeAll { $0.id == id }
    }
}
