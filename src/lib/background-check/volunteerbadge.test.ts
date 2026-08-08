import { describe, it, expect } from "vitest";
import { mapStatus } from "./volunteerbadge";

// Translating the vendor's vocabulary into ours.
//
// Two failure modes matter here, and only one of them is loud. Mapping a real result to
// 'error' is visible: someone chases it. Mapping an unknown result to 'clear' is silent, and
// puts an unscreened person in a camp. Every ambiguous case must land on the safe side.

describe("mapStatus", () => {
  it("maps the vendor's clear vocabulary to clear", () => {
    for (const raw of ["clear", "Clear", "CLEAR", "completed", "passed", "all cleared"]) {
      expect(mapStatus(raw), raw).toBe("clear");
    }
  });

  // Their vocabulary mixes spaces, hyphens and underscores across the API, the dashboard and
  // the docs. Matching literal strings missed both spellings and sent a real records-found
  // result to 'error'.
  it("does not care how the vendor punctuates a status", () => {
    expect(mapStatus("under review")).toBe(mapStatus("under_review"));
    expect(mapStatus("under-review")).toBe(mapStatus("under_review"));
    expect(mapStatus("  Under Review  ".trim())).toBe(mapStatus("under_review"));
  });

  it("flags only results a human actually has to decide about", () => {
    for (const raw of ["consider", "records found", "flagged"]) {
      expect(mapStatus(raw), raw).toBe("flagged");
    }
  });

  // 'under review' means their CRA team is still assessing and is withholding the report.
  // Nothing is owed by us yet. Treating it as flagged would put unreviewed hits in front of
  // an admin who cannot act on them, and would train people to ignore the queue.
  it("treats an in-progress review as a wait, not a decision", () => {
    for (const raw of ["under review", "investigating hits", "processing", "submitted"]) {
      expect(mapStatus(raw), raw).toBe("pending");
    }
  });

  // The one that matters most. An unrecognised status must never read as permission.
  it("never lets an unknown status pass as clear", () => {
    for (const raw of ["", "banana", "needs_manual_check", "some_new_status_they_added", "???"]) {
      const mapped = mapStatus(raw);
      expect(mapped, `"${raw}" must not be clear`).not.toBe("clear");
      expect(mapped, `"${raw}" should be an error`).toBe("error");
    }
  });

  it("does not let a status containing the word clear sneak through", () => {
    // "not clear" and "unclear" must not match on substring.
    expect(mapStatus("not clear")).not.toBe("clear");
    expect(mapStatus("unclear")).not.toBe("clear");
  });
});
