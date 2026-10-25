import Foundation
import Testing
@testable import Datascratch

struct ModelTests {
    @Test func uuidV7HasVersionVariantAndTime() throws {
        let date = Date(timeIntervalSince1970: 1_761_393_600) // 2025-10-25
        let id = ID.make(date: date)
        #expect(id == id.lowercased())
        let uuid = try #require(UUID(uuidString: id))
        let b = uuid.uuid
        #expect(b.6 >> 4 == 7)
        #expect(b.8 >> 6 == 0b10)
        let ms = [b.0, b.1, b.2, b.3, b.4, b.5].reduce(UInt64(0)) { ($0 << 8) | UInt64($1) }
        #expect(ms == 1_761_393_600_000)
    }

    @Test func uuidV7IsTimeOrdered() {
        let a = ID.make(date: Date(timeIntervalSince1970: 1000))
        let b = ID.make(date: Date(timeIntervalSince1970: 2000))
        #expect(a < b)
    }

    @Test func scansTags() {
        #expect(TextScanner.tags(in: "Plan #work/project and #Ideas.") == ["work/project", "ideas"])
        #expect(TextScanner.tags(in: "no#tag here, (#ok)") == ["ok"])
        #expect(TextScanner.tags(in: "# heading") == [])
    }

    @Test func scansWikiLinks() {
        #expect(TextScanner.wikiLinks(in: "See [[Alpha]] and [[ Beta ]] but not [[]] or [[open")
                == ["Alpha", "Beta"])
    }

    @Test func dayKeys() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Moscow")!
        let date = calendar.date(from: DateComponents(year: 2026, month: 10, day: 25, hour: 23, minute: 30))!
        #expect(DayKey.from(date, calendar: calendar) == "2026-10-25")
        #expect(DayKey.adding(days: 7, to: "2026-10-25", calendar: calendar) == "2026-11-01")
        #expect(DayKey.adding(days: -25, to: "2026-10-25", calendar: calendar) == "2026-09-30")
        // 2026-10-25 is a Sunday → next week starts Monday 2026-10-26.
        #expect(DayKey.nextWeek(from: "2026-10-25", calendar: calendar) == "2026-10-26")
        // From a Monday → the following Monday.
        #expect(DayKey.nextWeek(from: "2026-10-26", calendar: calendar) == "2026-11-02")
    }

    @Test func bodyDerivesTagsAndLinks() {
        let body = NoteBody(blocks: [.paragraph("Hello #a"), .paragraph("[[Other]] #b #a")])
        #expect(body.tags == ["a", "b"])
        #expect(body.linkedTitles == ["Other"])
    }

    @Test func editorShortcuts() {
        #expect(StandInBlockEditor.shortcut("# Title")?.0 == .heading1)
        #expect(StandInBlockEditor.shortcut("## Sub")?.0 == .heading2)
        #expect(StandInBlockEditor.shortcut("[] buy milk")?.1 == "buy milk")
        #expect(StandInBlockEditor.shortcut("- item")?.0 == .bullet)
        #expect(StandInBlockEditor.shortcut("---")?.0 == .divider)
        #expect(StandInBlockEditor.shortcut("plain") == nil)
    }

    @Test func credentials() {
        #expect(Credentials.isValidEmail("a@b.co"))
        #expect(!Credentials.isValidEmail("a@b"))
        #expect(!Credentials.isValidEmail("ab.co"))
        #expect(Credentials.strength("") == 0)
        #expect(Credentials.strength("short") == 0)
        #expect(Credentials.strength("correct-Horse-battery-9") == 4)
    }

    @Test func fuzzyMatchRanksPrefixesHigher() throws {
        let prefix = try #require(FuzzyMatch.score("tod", in: "Today's Note"))
        let scattered = try #require(FuzzyMatch.score("tod", in: "Go to Calendar"))
        #expect(prefix > scattered)
        #expect(FuzzyMatch.score("xyz", in: "Today") == nil)
    }
}
