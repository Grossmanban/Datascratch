import Foundation
import Testing
@testable import Datascratch

/// Presence on iOS speaks the web's awareness format (owner's feedback 2026-11-01).
@MainActor
struct PresenceTests {
    /// `encodeAwarenessUpdate` from y-protocols for client 1234567, clock 1 (made with the web's library).
    static let webUpdate = Data(hexBytes: "0187ad4b01397b2275736572223a7b226e616d65223a226f776e6572222c22636f6c6f72223a2223324535424442222c226b696e64223a2275736572227d7d")

    @Test func decodesTheWebsUpdateAndEncodesTheSameBytes() throws {
        let entries = try #require(AwarenessCodec.decode(Self.webUpdate))
        #expect(entries.count == 1)
        #expect(entries[0].client == 1_234_567 && entries[0].clock == 1)
        #expect(AwarenessCodec.encode(entries) == Self.webUpdate)
        let peer = try #require(PresenceCenter.peer(client: 1, json: entries[0].json ?? ""))
        #expect(peer.name == "owner" && peer.color == "#2E5BDB" && peer.initial == "O")
    }

    @Test func coloursMatchTheWeb() {
        // Values from the web's `colorFor` (apps/web/src/data/presence.ts).
        #expect(PresenceCenter.color(for: "owner@example.org") == "#C23F7A")
        #expect(PresenceCenter.color(for: "гриша@пример.рф") == "#7A4FD6")
        #expect(PresenceCenter.name(forEmail: "гриша@пример.рф") == "гриша")
    }

    @Test func peersJoinLeaveAndTimeOut() {
        var clock = Date(timeIntervalSince1970: 1_000)
        let center = PresenceCenter(now: { clock })
        var sent: [Data] = []
        center.send = { _, payload in sent.append(payload) }
        center.me = ("me", "#2E5BDB", nil)
        center.join("doc")
        #expect(sent.count == 1, "this device announces itself")
        center.receive("doc", Self.webUpdate)
        #expect(center.peers["doc"]?.map(\.name) == ["owner"])
        // A stale update (older clock) does not undo a newer one; «null» removes the peer.
        center.receive("doc", AwarenessCodec.encode([.init(client: 1_234_567, clock: 2, json: nil)]))
        #expect(center.peers["doc"]?.isEmpty == true)
        center.receive("doc", Self.webUpdate)
        #expect(center.peers["doc"]?.isEmpty == true, "clock 1 is older than the removal")
        // Silent for longer than the timeout: gone.
        center.receive("doc", AwarenessCodec.encode([.init(client: 7, clock: 1, json: ##"{"user":{"name":"guest","color":"#3E8E5A"}}"##)]))
        #expect(center.peers["doc"]?.count == 1)
        clock = clock.addingTimeInterval(PresenceCenter.timeout + 1)
        center.expire()
        #expect(center.peers["doc"]?.isEmpty == true)
        center.leave("doc")
        #expect(AwarenessCodec.decode(sent.last!)?.first?.json == nil, "leaving says goodbye")
    }

    /// Your own other devices are not someone else in the note (owner, build 35: his PC showed on
    /// his iPhone as «L»); another account and a client that sends no account are shown.
    @Test func ownAccountIsNotAnotherPerson() throws {
        let center = PresenceCenter()
        var sent: [Data] = []
        center.send = { _, payload in sent.append(payload) }
        center.me = ("lena", "#2E5BDB", "acc-me")
        center.join("doc")
        let mine = try #require(AwarenessCodec.decode(sent[0])?.first?.json)
        #expect(PresenceCenter.peer(client: 1, json: mine)?.account == "acc-me", "this device sends its account")

        func state(_ name: String, _ account: String?) -> String {
            let field = account.map { #","account":"\#($0)""# } ?? ""
            return ##"{"user":{"name":"\##(name)","color":"#3E8E5A"\##(field)}}"##
        }
        center.receive("doc", AwarenessCodec.encode([
            .init(client: 10, clock: 1, json: state("lena", "acc-me")),     // the web on my PC
            .init(client: 11, clock: 1, json: state("mark", "acc-mark")),   // someone else
            .init(client: 12, clock: 1, json: state("guest", nil)),         // an older client
        ]))
        #expect(Set(center.peers["doc"]?.map(\.name) ?? []) == ["mark", "guest"])
    }

    /// One avatar per person: two devices of one account, or two names of no account.
    @Test func onePersonWithTwoDevicesIsOneAvatar() {
        let center = PresenceCenter()
        center.me = ("me", "#2E5BDB", "acc-me")
        center.join("doc")
        center.receive("doc", AwarenessCodec.encode([
            .init(client: 20, clock: 1, json: ##"{"user":{"name":"mark","color":"#3E8E5A","account":"acc-mark"}}"##),
            .init(client: 21, clock: 1, json: ##"{"user":{"name":"mark","color":"#3E8E5A","account":"acc-mark"}}"##),
        ]))
        #expect(center.peers["doc"]?.count == 1)
    }

    @Test func rejectsWhatIsNotAPersonOrNotAColour() {
        #expect(PresenceCenter.peer(client: 1, json: #"{"cursor":{}}"#) == nil)
        #expect(PresenceCenter.peer(client: 1, json: #"{"user":{"name":"  "}}"#) == nil)
        let odd = PresenceCenter.peer(client: 1, json: #"{"user":{"name":"x","color":"red;background:url(x)"}}"#)
        #expect(odd?.color.hasPrefix("#") == true, "a non-hex colour is replaced")
        #expect(AwarenessCodec.decode(Data([0x05, 0x01])) == nil, "truncated update")
    }
}

private extension Data {
    init(hexBytes hex: String) {
        var bytes: [UInt8] = []
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2)
            bytes.append(UInt8(hex[index..<next], radix: 16)!)
            index = next
        }
        self.init(bytes)
    }
}
