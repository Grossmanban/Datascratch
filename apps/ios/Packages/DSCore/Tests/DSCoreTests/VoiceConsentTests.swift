import Testing
import Foundation
@testable import DSCore

/// `settings.voiceConsentAt` (D-65): asked once, then the same on every device.
@Suite struct VoiceConsentTests {
    @Test func consentTravelsAndCanBeWithdrawn() throws {
        let docId = EntityID.make()
        let phone = AccountDocument(CRDTDocument(kind: .account, docId: docId))
        let mac = AccountDocument(CRDTDocument(kind: .account, docId: docId))
        #expect(phone.voiceConsentAt == nil)

        let at = Date(timeIntervalSince1970: 1_762_600_000.25)
        try phone.setVoiceConsentAt(at)
        #expect(phone.setting("voiceConsentAt")?.stringValue == DSDate.iso(at))
        #expect(phone.voiceConsentAt == at)

        try mac.crdt.applyUpdate(phone.crdt.encodeStateAsUpdate())
        #expect(mac.voiceConsentAt == at)

        try mac.setVoiceConsentAt(nil)
        #expect(mac.setting("voiceConsentAt")?.isNull == true)
        try phone.crdt.applyUpdate(mac.crdt.encodeStateAsUpdate())
        #expect(phone.voiceConsentAt == nil)

        // The web writes plain ISO without fractions.
        try phone.setSetting("voiceConsentAt", .string(value: "2026-11-08T10:00:00Z"))
        #expect(phone.voiceConsentAt == DSDate.parseISO("2026-11-08T10:00:00.000Z"))
    }
}

/// `PUT /admin/voice/:userId`: an absent field keeps the minutes, `null` returns to the default.
@Suite struct PutAdminVoiceRequestTests {
    @Test func minutesEncodeThreeWays() throws {
        func json(_ r: PutAdminVoiceRequest) throws -> String {
            let e = JSONEncoder(); e.outputFormatting = .sortedKeys
            return String(decoding: try e.encode(r), as: UTF8.self)
        }
        #expect(try json(.init(enabled: true)) == #"{"enabled":true}"#)
        #expect(try json(.init(enabled: true, monthlyMinutes: .reset)) == #"{"enabled":true,"monthlyMinutes":null}"#)
        #expect(try json(.init(enabled: false, monthlyMinutes: .set(120))) == #"{"enabled":false,"monthlyMinutes":120}"#)
        for r in [PutAdminVoiceRequest(enabled: true), .init(enabled: true, monthlyMinutes: .reset), .init(enabled: false, monthlyMinutes: .set(5))] {
            #expect(try JSONDecoder().decode(PutAdminVoiceRequest.self, from: JSONEncoder().encode(r)) == r)
        }
    }
}
