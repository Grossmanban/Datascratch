import Foundation
import Testing
@testable import DSCore

/// D-53: a revoked device learns it from REST (401 `device_revoked`) or sync (frame and/or close
/// 4410), reports it once and stops syncing; token expiry and network failures never do.
@Suite struct DeviceRevocationTests {
    @Test(.enabled(if: FileManager.default.fileExists(atPath: Vectors.root.appendingPathComponent("api/failures.json").path)))
    func failureVectors() throws {
        let file = try Vectors.json("api/failures.json")
        #expect(file["syncCloseDeviceRevoked"] as? Int == SyncProtocol.closeDeviceRevoked)
        #expect((file["reasons"] as! [String]) == DeviceRevocationReason.allCases.map(\.rawValue))
        for c in file["cases"] as! [[String: Any]] {
            let status = c["status"] as? Int
            let body: Data?
            switch c["body"] {
            case let s as String: body = Data(s.utf8)
            case let o as [String: Any]: body = try JSONSerialization.data(withJSONObject: o)
            default: body = nil
            }
            let e = c["expected"] as! [String: Any]
            let expected: APIFailure
            switch e["kind"] as! String {
            case "device_revoked": expected = .deviceRevoked(DeviceRevocationReason(rawValue: e["reason"] as! String)!)
            case "unauthorized": expected = .unauthorized
            case "network": expected = .network
            default: expected = .error(status: e["status"] as! Int, code: e["code"] as? String, message: e["message"] as! String)
            }
            #expect(APIFailure.classify(status: status, body: body) == expected, "\(c["name"]!)")
        }
    }

    static let revoked = Data(#"{"error":{"code":"device_revoked","message":"device revoked","reason":"password_change"}}"#.utf8)
    static let expired = Data(#"{"error":{"code":"unauthorized","message":"token expired"}}"#.utf8)

    func api(_ transport: StubTransport, expired: Bool = false) async throws -> APIClient {
        try await NetworkRetryTests().api(transport, signedIn: true, expired: expired)
    }

    @Test func restRevocationIsReportedOnceAndNeverRetried() async throws {
        let transport = StubTransport { _ in (401, Self.revoked) }
        let api = try await api(transport)
        let reported = Locked<[DeviceRevocationReason]>([])
        await api.setDeviceRevokedHandler { r in reported.withLock { $0.append(r) } }
        await #expect(throws: DeviceRevokedError(reason: .passwordChange)) { _ = try await api.me() }
        await #expect(throws: DeviceRevokedError(reason: .passwordChange)) { _ = try await api.devices() }
        #expect(reported.withLock { $0 } == [.passwordChange])
        // No refresh attempt, no retry: one request per call.
        #expect(transport.requests.withLock { $0.map(\.url!.path) } == ["/v1/me", "/v1/devices"])
        #expect(await api.revocation == .passwordChange)
    }

    /// The usual way a revoked device learns it: its refresh is refused.
    @Test func refreshRefusedAsRevoked() async throws {
        let transport = StubTransport { req in
            req.url!.path == "/v1/auth/refresh" ? (401, Self.revoked) : (200, Data("{}".utf8))
        }
        let api = try await api(transport, expired: true)
        let reported = Locked(0)
        await api.setDeviceRevokedHandler { _ in reported.withLock { $0 += 1 } }
        await #expect(throws: DeviceRevokedError(reason: .passwordChange)) { _ = try await api.me() }
        #expect(reported.withLock { $0 } == 1)
    }

    @Test func expiredTokensAndNetworkFailuresAreNotRevocations() async throws {
        let reported = Locked(0)
        // Refresh refused as unauthorized: signed out, not revoked.
        let refused = StubTransport { req in (401, req.url!.path == "/v1/auth/refresh" ? Self.expired : Self.expired) }
        let a = try await api(refused, expired: true)
        await a.setDeviceRevokedHandler { _ in reported.withLock { $0 += 1 } }
        await #expect(throws: APIError.notAuthenticated) { _ = try await a.me() }
        // A proxy's 401 page, a gateway error page.
        let proxy = StubTransport { _ in (401, Data("<html>401</html>".utf8)) }
        let b = try await api(proxy)
        await b.setDeviceRevokedHandler { _ in reported.withLock { $0 += 1 } }
        await #expect(throws: (any Error).self) { _ = try await b.me() }
        let gateway = StubTransport { _ in (502, Data("<html>Bad Gateway</html>".utf8)) }
        let c = try await api(gateway)
        await c.setDeviceRevokedHandler { _ in reported.withLock { $0 += 1 } }
        await #expect(throws: APIError.transport("HTTP 502")) { _ = try await c.me() }
        // device_revoked on a non-401 is not a revocation.
        let forbidden = StubTransport { _ in (403, Self.revoked) }
        let d = try await api(forbidden)
        await d.setDeviceRevokedHandler { _ in reported.withLock { $0 += 1 } }
        await #expect(throws: APIError.server(status: 403, code: "device_revoked", message: "device revoked")) { _ = try await d.me() }
        #expect(reported.withLock { $0 } == 0)
    }

    // MARK: Sync

    func device(_ server: FakeSyncServer) throws -> SyncEngine {
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "B", clientVersion: "test")
        config.minBackoff = .milliseconds(10)
        config.maxBackoff = .milliseconds(50)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let key = DSCrypto.newKey()
        return SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in key }, register: { await server.register($0.docId) })
    }

    /// Frame then close, close alone (reason from the close), unknown reason → user.
    @Test(arguments: [
        (ServerMessage.error(code: .deviceRevoked, message: "device revoked", ref: nil, reason: .tokenReuse), "token_reuse", DeviceRevocationReason.tokenReuse),
        (nil, "recovery", .recovery),
        (nil, "bored", .user),
        (nil, nil, .user),
    ] as [(ServerMessage?, String?, DeviceRevocationReason)])
    func syncRevocationStopsForGood(frame: ServerMessage?, closeReason: String?, expected: DeviceRevocationReason) async throws {
        let server = FakeSyncServer()
        let b = try device(server)
        let reported = Locked<[DeviceRevocationReason]>([])
        await b.setDeviceRevokedHandler { r in reported.withLock { $0.append(r) } }
        await b.start()
        #expect(try await eventually { await b.client.isConnected })
        await server.closeConnections(deviceId: "B", frame: frame, code: SyncProtocol.closeDeviceRevoked, reason: closeReason)
        #expect(try await eventually { await b.status().revoked == expected })
        #expect(await b.status().summary == .offline)
        let hellos = await server.helloCount()
        // Local edits after the revocation are not sent; no reconnect.
        let note = NoteDocument(noteId: EntityID.make())
        try await b.open(note.crdt, notebookId: "nb")
        try note.initialize(title: "after")
        await b.client.reconnectNow()
        await b.client.checkConnection()
        try await Task.sleep(for: .milliseconds(300))
        #expect(await server.helloCount() == hellos)
        #expect(await server.docs[note.noteId] == nil)
        #expect(reported.withLock { $0 } == [expected])
        await b.stop()
    }

    @Test func expiredTokenOrDroppedConnectionIsNotARevocation() async throws {
        let server = FakeSyncServer()
        let b = try device(server)
        let reported = Locked(0)
        await b.setDeviceRevokedHandler { _ in reported.withLock { $0 += 1 } }
        await b.start()
        #expect(try await eventually { await b.client.isConnected })
        // unauthorized frame + 4401, a plain drop: reconnects every time.
        await server.closeConnections(deviceId: "B", frame: .error(code: .unauthorized, message: "token expired", ref: nil), code: 4401, reason: nil)
        #expect(try await eventually { let n = await server.helloCount(); let c = await b.client.isConnected; return n >= 2 && c })
        await server.closeConnections(deviceId: "B", frame: nil, code: 1006, reason: nil)
        #expect(try await eventually { let n = await server.helloCount(); let c = await b.client.isConnected; return n >= 3 && c })
        #expect(reported.withLock { $0 } == 0)
        #expect(await b.status().revoked == nil)
        await b.stop()
    }
}
