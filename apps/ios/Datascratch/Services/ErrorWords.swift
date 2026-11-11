import Foundation
#if canImport(DSCore)
import DSCore
#endif

extension Error {
    /// Plain, translated words for the person — never «DSCore.APIError error 2».
    var readableMessage: String {
        #if canImport(DSCore)
        if let api = self as? APIError {
            switch api {
            case .server(let status, let code, _) where status == 404 || code == "not_found":
                return String(localized: "It is no longer on the server.")
            case .server(403, _, _):
                return String(localized: "You don’t have access to it.")
            case .server(let status, _, _) where status >= 500:
                return String(localized: "The server had a problem — try again.")
            case .server(_, _, let message):
                return message
            case .notAuthenticated:
                return String(localized: "You are signed out. Sign in again.")
            case .invalidResponse:
                return String(localized: "The server’s answer could not be read — try again.")
            case .transport:
                return String(localized: "No connection to the server — try again.")
            }
        }
        if self is CryptoError { return String(localized: "It could not be decrypted on this device.") }
        #endif
        return localizedDescription
    }

    /// For Settings → Diagnostics: the method, path, status and what failed (never note content).
    var diagnosticDetail: String {
        #if canImport(DSCore)
        if let api = self as? APIError { return api.detail }
        #endif
        return String(describing: self)
    }

    /// A short code for Diagnostics (`invalid_response`, `http_404`, …).
    var diagnosticCode: String {
        #if canImport(DSCore)
        if let api = self as? APIError {
            switch api {
            case .server(let status, _, _): return "http_\(status)"
            case .notAuthenticated: return "not_signed_in"
            case .invalidResponse: return "invalid_response"
            case .transport: return "transport"
            }
        }
        if self is CryptoError { return "decrypt" }
        #endif
        return "client"
    }
}
