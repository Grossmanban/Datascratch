import Foundation

/// D-53: why the server revoked this device (api.md, sync-protocol §7). The app wipes the
/// device's local data on it; DSCore only reports it and stops syncing.
public enum DeviceRevocationReason: String, Codable, Hashable, Sendable, CaseIterable {
    case user
    case passwordChange = "password_change"
    case recovery
    case tokenReuse = "token_reuse"
    case accountDeleted = "account_deleted"

    /// A reason from the server, tolerantly: unknown (newer) or absent → `user`. A revocation is
    /// a revocation whatever its reason.
    public init(lenient raw: String?) {
        self = raw.flatMap(Self.init(rawValue:)) ?? .user
    }
}

/// The server revoked this device (REST: `401` with `error.code == "device_revoked"`). Distinct
/// from `APIError.notAuthenticated` (expired or rejected tokens) and transport errors, which
/// never mean a wipe.
public struct DeviceRevokedError: Error, Equatable, Sendable {
    public var reason: DeviceRevocationReason

    public init(reason: DeviceRevocationReason) {
        self.reason = reason
    }
}

/// What a failed REST response means (api/failures.json). Bodies are read tolerantly here:
/// what matters is never mistaking a token expiry, a proxy page or a network failure for a
/// revocation, and never missing a revocation.
public enum APIFailure: Equatable, Sendable {
    /// `401` with our error body and `code: "device_revoked"` — only this wipes local data.
    case deviceRevoked(DeviceRevocationReason)
    /// Any other `401`: refresh the token.
    case unauthorized
    /// No response, or a gateway error (502–504) without our error body: retry later.
    case network
    case error(status: Int, code: String?, message: String)

    /// `status`: nil when there was no HTTP response.
    public static func classify(status: Int?, body: Data?) -> APIFailure {
        guard let status else { return .network }
        let fields = errorBody(body)
        if status == 401 {
            if let fields, fields.code == "device_revoked" { return .deviceRevoked(DeviceRevocationReason(lenient: fields.reason)) }
            return .unauthorized
        }
        if let fields { return .error(status: status, code: fields.code, message: fields.message) }
        if (502...504).contains(status) { return .network }
        return .error(status: status, code: nil, message: "HTTP \(status)")
    }

    /// `{ error: { code, message, reason? } }`, read tolerantly (any code string); nil when the
    /// body is not ours (a proxy page, empty).
    public static func errorBody(_ body: Data?) -> (code: String, message: String, reason: String?)? {
        let json = body.flatMap { try? JSONSerialization.jsonObject(with: $0, options: [.fragmentsAllowed]) }
        guard let inner = (json as? [String: Any])?["error"] as? [String: Any],
              let code = inner["code"] as? String, let message = inner["message"] as? String else { return nil }
        return (code, message, inner["reason"] as? String)
    }
}

extension SyncProtocol {
    /// WebSocket close code: this device was revoked (close reason = revocation reason).
    public static let closeDeviceRevoked = 4410
}
