import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// One canned answer to every request.
private struct CannedTransport: HTTPTransport {
    let body: String
    var status = 200

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

/// Build 46: opening a version said «DSCore.APIError error 2». The payload is read however it is
/// encoded on the way, an unreadable answer says what it was, and errors read as words.
@Suite struct VersionPayloadTests {
    private func client(_ body: String, status: Int = 200) throws -> APIClient {
        let sessions = SecretSessionStore(store: InMemorySecretStore())
        let session = try JSONDecoder().decode(AuthSession.self, from: Data("""
        {"userId":"0192f3c4-0000-7000-8000-00000000000a","deviceId":"d","accessToken":"a","refreshToken":"r",
         "accessExpiresAt":"2999-01-01T00:00:00.000Z","wrappedMasterKeyPassword":"AQID",
         "accountDocId":"0192f3c4-0000-7000-8000-00000000000b"}
        """.utf8))
        try sessions.save(session)
        return APIClient(baseURL: URL(string: "https://example.com")!, transport: CannedTransport(body: body, status: status),
                         sessionStore: sessions)
    }

    @Test func canonicalPayload() async throws {
        let data = try await client(#"{"payload":"AQID"}"#).version(docId: "doc-1", seq: 3)
        #expect(data == Data([1, 2, 3]))
    }

    @Test func paddedOrStandardBase64StillOpens() async throws {
        #expect(try await client(#"{"payload":"AQ=="}"#).version(docId: "doc-1", seq: 3) == Data([1]))
        #expect(try await client(#"{"payload":"+/8="}"#).version(docId: "doc-1", seq: 3) == Data([0xfb, 0xff]))
    }

    @Test func unreadableAnswerSaysWhatItWas() async throws {
        do {
            _ = try await client("<html>Bad gateway</html>").version(docId: "doc-1", seq: 3)
            Issue.record("an HTML page was read as a version")
        } catch let error as APIError {
            #expect(error.detail.contains("GET /docs/doc-1/versions/3"), "\(error.detail)")
            #expect(error.detail.contains("<html>"), "the body's start is in the detail: \(error.detail)")
            #expect(!error.localizedDescription.contains("error 2"), "\(error.localizedDescription)")
        }
    }

    @Test func errorsReadAsWords() {
        #expect(APIError.invalidResponse("x").localizedDescription == "The server’s answer could not be read.")
        #expect(APIError.server(status: 404, code: "not_found", message: "version not found").localizedDescription == "version not found")
        #expect(APIError.server(status: 404, code: "not_found", message: "version not found").detail == "HTTP 404 not_found: version not found")
    }
}
