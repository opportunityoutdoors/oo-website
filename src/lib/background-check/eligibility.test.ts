import { describe, it, expect } from "vitest";
import {
  ageInYears,
  evaluateEligibility,
  expiryFrom,
  mayParticipate,
  ADULT_AGE,
  CHECK_VALID_MONTHS,
  type BackgroundCheckStatus,
} from "./eligibility";

// Who needs a background check, and who may take part.
//
// This is the function every screening decision passes through: pricing, the welcome packet
// gate, the pipeline funnel. Getting it wrong in one direction charges a minor for a check
// they must never undergo; in the other it lets an unscreened adult into a camp.

const NOW = new Date("2026-08-08T12:00:00Z");

function subject(
  dateOfBirth: string | null,
  status: BackgroundCheckStatus,
  expiresAt: string | null = null
) {
  return { dateOfBirth, status, expiresAt };
}

const ADULT = "1990-01-01";
const MINOR = "2015-01-01";
const FUTURE = "2027-08-08T00:00:00Z";
const PAST = "2026-01-01T00:00:00Z";

describe("ageInYears", () => {
  it("is null when the date of birth is missing or unparseable", () => {
    expect(ageInYears(null, NOW)).toBeNull();
    expect(ageInYears("not-a-date", NOW)).toBeNull();
  });

  it("does not count a birthday that has not happened yet this year", () => {
    expect(ageInYears("1990-12-31", NOW)).toBe(35);
    expect(ageInYears("1990-01-01", NOW)).toBe(36);
  });

  // Local-time arithmetic makes a birthday land a day early or late depending on the
  // server's zone, and around a birthday that flips adult and minor.
  it("treats the birthday itself as the day the age changes, in UTC", () => {
    const eighteenToday = new Date("2026-08-08T00:00:00Z");
    expect(ageInYears("2008-08-08", eighteenToday)).toBe(18);
    expect(ageInYears("2008-08-09", eighteenToday)).toBe(17);
  });
});

describe("evaluateEligibility", () => {
  it("never screens a minor, whatever their record says", () => {
    for (const status of ["none", "clear", "flagged", "declined", "error"] as const) {
      const e = evaluateEligibility(subject(MINOR, status), NOW);
      expect(e.kind, `status ${status}`).toBe("minor");
      expect(e.feeCents).toBe(0);
    }
  });

  // 592 of 601 contacts were in this state after the 2023 import. Guessing either way is
  // worse than refusing to guess.
  it("refuses to assume an age when there is no date of birth", () => {
    const e = evaluateEligibility(subject(null, "none"), NOW);
    expect(e.kind).toBe("unknown_age");
    expect(mayParticipate(e)).toBe(false);
  });

  it("charges an adult with nothing on file", () => {
    const e = evaluateEligibility(subject(ADULT, "none"), NOW);
    expect(e.kind).toBe("needs_check");
    expect(e.feeCents).toBeGreaterThan(0);
  });

  it("does not charge twice for a check already in flight", () => {
    for (const status of ["invited", "pending"] as const) {
      const e = evaluateEligibility(subject(ADULT, status), NOW);
      expect(e.kind).toBe("in_progress");
      expect(e.feeCents).toBe(0);
    }
  });

  it("honours a clear check that has not lapsed", () => {
    const e = evaluateEligibility(subject(ADULT, "clear", FUTURE), NOW);
    expect(e.kind).toBe("covered");
    expect(mayParticipate(e)).toBe(true);
  });

  it("treats a lapsed clear as needing a fresh check", () => {
    const e = evaluateEligibility(subject(ADULT, "clear", PAST), NOW);
    expect(e.kind).toBe("needs_check");
  });

  // A bad write must fail toward re-screening, not toward permanent cover.
  it("treats a clear with no expiry as expired rather than eternal", () => {
    const e = evaluateEligibility(subject(ADULT, "clear", null), NOW);
    expect(e.kind).toBe("needs_check");
  });

  // An unadjudicated flag is not permission to attend. If a human never resolved it,
  // re-running is the safe default.
  it("does not let an unadjudicated flag pass as cover", () => {
    const e = evaluateEligibility(subject(ADULT, "flagged"), NOW);
    expect(e.kind).toBe("needs_check");
    expect(mayParticipate(e)).toBe(false);
  });

  it("blocks someone already declined, and checks that before pricing", () => {
    const e = evaluateEligibility(subject(ADULT, "declined"), NOW);
    expect(e.kind).toBe("blocked");
    expect(e.feeCents).toBe(0);
    expect(mayParticipate(e)).toBe(false);
  });

  it("does not treat a provider error as cover", () => {
    const e = evaluateEligibility(subject(ADULT, "error"), NOW);
    expect(mayParticipate(e)).toBe(false);
  });

  it("screens someone on the day they turn 18", () => {
    const eighteenth = new Date("2026-08-08T12:00:00Z");
    const e = evaluateEligibility(subject("2008-08-08", "none"), eighteenth);
    expect(e.kind).toBe("needs_check");

    const dayBefore = evaluateEligibility(subject("2008-08-09", "none"), eighteenth);
    expect(dayBefore.kind).toBe("minor");
  });
});

describe("mayParticipate", () => {
  // The whole point: only these two states get someone into a camp. Everything else,
  // including states added later, must default to no.
  it("accepts only a current clear check or a minor", () => {
    expect(mayParticipate(evaluateEligibility(subject(ADULT, "clear", FUTURE), NOW))).toBe(true);
    expect(mayParticipate(evaluateEligibility(subject(MINOR, "none"), NOW))).toBe(true);

    for (const status of ["none", "invited", "pending", "flagged", "declined", "error"] as const) {
      expect(
        mayParticipate(evaluateEligibility(subject(ADULT, status), NOW)),
        `adult with status ${status}`
      ).toBe(false);
    }
    expect(mayParticipate(evaluateEligibility(subject(null, "clear", FUTURE), NOW))).toBe(false);
  });
});

describe("expiryFrom", () => {
  it("runs the validity window from completion, not from today", () => {
    const completed = new Date("2026-03-15T10:00:00Z");
    const expires = expiryFrom(completed);
    expect(expires.getUTCFullYear()).toBe(2027);
    expect(expires.getUTCMonth()).toBe(2);
    expect(expires.getUTCDate()).toBe(15);
  });

  it("does not mutate the date it was given", () => {
    const completed = new Date("2026-03-15T10:00:00Z");
    const before = completed.getTime();
    expiryFrom(completed);
    expect(completed.getTime()).toBe(before);
  });
});

describe("constants the policy depends on", () => {
  // The screening policy states both of these in writing. If someone changes them here, the
  // adopted policy silently stops describing what the software does.
  it("screens at 18 and honours a check for 12 months", () => {
    expect(ADULT_AGE).toBe(18);
    expect(CHECK_VALID_MONTHS).toBe(12);
  });
});
