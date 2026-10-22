import { describe, expect, it } from "vitest";
import { allDayRange, formatMeetingTime } from "./format-event-date";

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
