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

/// Agent access: a static token or an OAuth connection (Claude, ChatGPT) —
/// one list (contracts/agents-api.md §8, `GET /v1/agent-tokens`).
nonisolated struct AgentToken: Codable, Identifiable, Hashable, Sendable {
    nonisolated enum Kind: String, Codable, Sendable { case `static`, oauth }

    var id: String
    var kind: Kind = .static
    var name: String
    var clientId: String?
    var notebookIds: [String]
    var permission: AgentPermission
    var createdAt: Date
    var expiresAt: Date?
    var lastUsedAt: Date?
}

/// One entry of an agent's action log (`GET /v1/agent-tokens/:id/audit`).
nonisolated struct AgentAuditEntry: Codable, Identifiable, Hashable, Sendable {
    var id: String { "\(at.timeIntervalSince1970)-\(action)-\(noteId ?? "")" }
    var at: Date
    /// `mcp` or `rest`.
    var via: String
    /// MCP tool or REST action, e.g. `read_note`, `update_note`.
    var action: String
    var notebookId: String?
    var noteId: String?
    var ok: Bool
    var errorCode: String?
    var durationMs: Int?
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
    func auditLog(forToken id: String) async throws -> [AgentAuditEntry]
}

@Observable
final class LocalAccessService: AccessService {
    private(set) var devices: [Device] = []
    private(set) var agentTokens: [AgentToken] = []

    init() {
        devices = [Device(id: UUIDv7.make(), name: UIDevice.current.name,
                          platform: UIDevice.current.userInterfaceIdiom == .pad ? "iPadOS" : "iOS",
                          lastSeenAt: Date(), isCurrent: true)]
    }

    func refresh() async {}

    func revokeDevice(_ id: String) async throws {
        devices.removeAll { $0.id == id && !$0.isCurrent }
    }

    func createAgentToken(name: String, notebookIds: [String], permission: AgentPermission,
                          expiresAt: Date?) async throws -> String {
        let token = AgentToken(id: UUIDv7.make(), name: name, notebookIds: notebookIds,
                               permission: permission, createdAt: Date(), expiresAt: expiresAt)
        agentTokens.append(token)
        return "dsa_" + Base64URL.encode(Data((0..<32).map { _ in UInt8.random(in: 0...255) }))
    }

    func revokeAgentToken(_ id: String) async throws {
        agentTokens.removeAll { $0.id == id }
    }

    /// No server, no agents: the log stays empty until DSCore talks to the API.
    func auditLog(forToken id: String) async throws -> [AgentAuditEntry] { [] }
}
