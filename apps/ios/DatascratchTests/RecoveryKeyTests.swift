import Testing
@testable import Datascratch

struct RecoveryKeyTests {
    @Test func formatsAs52CharactersInGroupsOfFour() {
        let key = RecoveryKey.random()
        #expect(key.base32.count == 52)
        #expect(key.groups.count == 13)
        #expect(key.groups.allSatisfy { $0.count == 4 })
        #expect(key.formatted.hasPrefix("DS1-"))
    }

    @Test func zeroKeyEncodesToZeros() throws {
        let key = try #require(RecoveryKey(bytes: [UInt8](repeating: 0, count: 32)))
        #expect(key.base32 == String(repeating: "0", count: 52))
    }

    @Test func allOnesUsesLastAlphabetCharacterAndPadding() throws {
        let key = try #require(RecoveryKey(bytes: [UInt8](repeating: 0xFF, count: 32)))
        // 256 bits = 51 full characters + 1 bit padded with four zero bits (0b10000 = "G").
        #expect(key.base32 == String(repeating: "Z", count: 51) + "G")
    }

    @Test func roundTripsThroughFormattedText() throws {
        for _ in 0..<50 {
            let key = RecoveryKey.random()
            let parsed = try #require(RecoveryKey(key.formatted))
            #expect(parsed == key)
        }
    }

    @Test func parsingIsLenient() throws {
        let key = RecoveryKey.random()
        let messy = key.formatted.lowercased().replacingOccurrences(of: "-", with: " ")
        #expect(RecoveryKey(messy) == key)
        #expect(RecoveryKey(key.base32) == key)
        let aliased = key.base32.replacingOccurrences(of: "0", with: "O").replacingOccurrences(of: "1", with: "l")
        #expect(RecoveryKey(aliased) == key)
    }

    @Test func rejectsInvalidInput() {
        #expect(RecoveryKey("") == nil)
        #expect(RecoveryKey("DS1-ABCD") == nil)
        #expect(RecoveryKey(String(repeating: "U", count: 52)) == nil) // U is not in the alphabet
        // Non-zero padding bits are invalid.
        #expect(RecoveryKey(String(repeating: "0", count: 51) + "1") == nil)
    }
}
