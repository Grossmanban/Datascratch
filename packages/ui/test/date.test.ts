import { describe, expect, it } from "vitest";
import { dateLabel, dayDiff, monthGrid } from "../src/lib/date";

// Same fixtures as apps/ios/Packages/DSDesign/Tests/DSDesignTests/DateChipTests.swift.
const now = new Date(2026, 9, 25, 15, 30); // Sunday 25 Oct 2026
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 9);

describe("dateLabel", () => {
  it("names nearby days", () => {
    expect(dateLabel(d(2026, 10, 25), now, "ru").label).toBe("Сегодня");
    expect(dateLabel(d(2026, 10, 26), now, "ru").label).toBe("Завтра");
    expect(dateLabel(d(2026, 10, 24), now, "ru").label).toBe("Вчера");
    expect(dateLabel(d(2026, 10, 26), now, "en").label).toBe("Tomorrow");
  });
  it("uses weekdays within a week", () => {
    expect(dateLabel(d(2026, 10, 27), now, "ru").label).toBe("Вторник");
    expect(dateLabel(d(2026, 10, 31), now, "en").label).toBe("Saturday");
  });
  it("formats other dates", () => {
    expect(dateLabel(d(2026, 11, 12), now, "ru").label).toBe("12 ноя");
    expect(dateLabel(d(2026, 11, 12), now, "en").label).toBe("Nov 12");
    expect(dateLabel(d(2027, 1, 3), now, "ru").label).toBe("3 янв 2027");
    expect(dateLabel(d(2027, 1, 3), now, "en").label).toBe("Jan 3, 2027");
    expect(dateLabel(d(2026, 9, 1), now, "ru").label).toBe("1 сен");
  });
  it("assigns tones", () => {
    expect(dateLabel(d(2026, 10, 25), now, "ru").tone).toBe("today");
    expect(dateLabel(d(2026, 10, 27), now, "ru").tone).toBe("normal");
    expect(dateLabel(d(2026, 10, 24), now, "ru").tone).toBe("overdue");
    expect(dateLabel(d(2026, 10, 24), now, "ru", { completed: true }).tone).toBe("done");
    expect(dateLabel(d(2026, 10, 26), now, "ru", { deadline: true }).tone).toBe("soon");
    expect(dateLabel(d(2026, 10, 25), now, "ru", { deadline: true }).tone).toBe("soon");
    expect(dateLabel(d(2026, 10, 30), now, "ru", { deadline: true }).tone).toBe("normal");
  });
});

describe("calendar helpers", () => {
  it("counts calendar days across DST", () => {
    expect(dayDiff(new Date(2026, 2, 28, 23), new Date(2026, 2, 30, 1))).toBe(2);
  });
  it("builds a 6-week grid starting on the week start", () => {
    const g = monthGrid(new Date(2026, 9, 1), 1);
    expect(g).toHaveLength(42);
    expect(g[0]!.getDay()).toBe(1);
    expect(g.some((x) => x.getMonth() === 9 && x.getDate() === 1)).toBe(true);
    expect(monthGrid(new Date(2026, 9, 1), 0)[0]!.getDay()).toBe(0);
  });
});
