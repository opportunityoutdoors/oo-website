import { describe, expect, it } from "vitest";
import { formatMeetingTime } from "./format-event-date";

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
