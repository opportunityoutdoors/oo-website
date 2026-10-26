import { describe, expect, it } from "vitest";
import {
  allDayRange,
  easternYear,
  formatEastern,
  formatEventDateRange,
  formatEventDay,
  formatMeetingTime,
} from "./format-event-date";

describe("formatMeetingTime", () => {
  it("prints the Eastern evening, not the UTC midnight it is stored as", () => {
    // 2026 Deer Camp Info Session 1, exactly as stored.
    expect(formatMeetingTime("2026-10-14T00:00:00.000Z")).toBe(
      "Tuesday, October 13, 2026 at 8:00 PM ET"
    );
  });

  it("follows daylight saving time", () => {
    expect(formatMeetingTime("2026-12-02T01:00:00.000Z")).toBe(
      "Tuesday, December 1, 2026 at 8:00 PM ET"
    );
  });
});

describe("allDayRange", () => {
  it("keeps Deer Camp on Friday to Sunday, with Google's exclusive end", () => {
    // 2026 Deer Camp, exactly as stored.
    expect(allDayRange("2026-11-20T00:00:00+00:00", "2026-11-22T00:00:00+00:00")).toEqual({
      start: "2026-11-20",
      end: "2026-11-23",
    });
  });

  it("is a single day with no last day", () => {
    expect(allDayRange("2026-11-20T00:00:00Z", null)).toEqual({ start: "2026-11-20", end: "2026-11-21" });
  });

  it("rolls over a month end", () => {
    expect(allDayRange("2026-10-30T00:00:00Z", "2026-10-31T00:00:00Z")).toEqual({
      start: "2026-10-30",
      end: "2026-11-01",
    });
  });
});

describe("formatEventDateRange", () => {
  it("prints Deer Camp as stored, Nov 20 to 22", () => {
    expect(formatEventDateRange("2026-11-20T00:00:00+00:00", "2026-11-22T00:00:00+00:00")).toBe(
      "November 20–22, 2026"
    );
  });
});

describe("formatEventDay", () => {
  it("keeps a date-only day on its own day", () => {
    expect(formatEventDay("2026-10-10", { month: "long", day: "numeric", year: "numeric" })).toBe(
      "October 10, 2026"
    );
  });
});

describe("formatEastern", () => {
  it("puts a 9:30 PM Eastern moment on its Eastern day", () => {
    expect(formatEastern("2026-10-27T01:30:00Z")).toBe("10/26/2026");
  });

  it("prints a time in Eastern, standard time in November", () => {
    expect(formatEastern("2026-11-21T02:15:00Z", { dateStyle: "long", timeStyle: "short" })).toBe(
      "November 20, 2026 at 9:15 PM"
    );
  });

  it("uses only the options given", () => {
    expect(formatEastern("2026-10-27T01:30:00Z", { month: "long", day: "numeric" })).toBe("October 26");
  });
});

describe("easternYear", () => {
  it("is still the old year on New Year's Eve evening in Eastern", () => {
    expect(easternYear(new Date("2027-01-01T03:00:00Z"))).toBe(2026);
  });
});
