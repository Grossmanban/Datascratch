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
