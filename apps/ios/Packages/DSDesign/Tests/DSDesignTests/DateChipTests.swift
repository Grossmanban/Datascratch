import Foundation
import Testing
@testable import DSDesign

@Suite("Date chip")
struct DateChipTests {
    let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Moscow")!
        return calendar
    }()

    func date(_ year: Int, _ month: Int, _ day: Int, _ hour: Int = 12) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour))!
    }

    /// Sunday, 25 October 2026, 15:00.
    var now: Date { date(2026, 10, 25, 15) }

    func model(_ d: Date, _ language: DSLanguage, deadline: Bool = false, completed: Bool = false) -> DSDateChipModel {
        DSDateChipModel(date: d, now: now, calendar: calendar, language: language, isDeadline: deadline, isCompleted: completed)
    }

    @Test func relativeDays() {
        #expect(model(date(2026, 10, 25, 23), .ru).label == "Сегодня")
        #expect(model(date(2026, 10, 25, 0), .en).label == "Today")
        #expect(model(date(2026, 10, 26, 1), .ru).label == "Завтра")
        #expect(model(date(2026, 10, 26), .en).label == "Tomorrow")
        #expect(model(date(2026, 10, 24), .ru).label == "Вчера")
        #expect(model(date(2026, 10, 24), .en).label == "Yesterday")
    }

    @Test func weekdaysWithinAWeek() {
        #expect(model(date(2026, 10, 28), .ru).label == "Среда")
        #expect(model(date(2026, 10, 28), .en).label == "Wednesday")
        #expect(model(date(2026, 10, 31), .en).label == "Saturday")
    }

    @Test func absoluteDates() {
        #expect(model(date(2026, 11, 12), .ru).label == "12 ноя")
        #expect(model(date(2026, 11, 12), .en).label == "Nov 12")
        #expect(model(date(2027, 2, 3), .ru).label == "3 фев 2027")
        #expect(model(date(2027, 2, 3), .en).label == "Feb 3, 2027")
        #expect(model(date(2026, 10, 1), .ru).label == "1 окт")
    }

    @Test func tones() {
        #expect(model(date(2026, 10, 25), .ru).tone == .today)
        #expect(model(date(2026, 10, 27), .ru).tone == .normal)
        #expect(model(date(2026, 10, 24), .ru).tone == .overdue)
        #expect(model(date(2026, 9, 1), .ru).tone == .overdue)
        #expect(model(date(2026, 10, 24), .ru, completed: true).tone == .done)
        #expect(model(date(2026, 10, 26), .ru, deadline: true).tone == .soon)
        #expect(model(date(2026, 10, 25), .ru, deadline: true).tone == .soon)
        #expect(model(date(2026, 10, 30), .ru, deadline: true).tone == .normal)
        #expect(model(date(2026, 10, 30), .ru).dayOffset == 5)
    }
}
