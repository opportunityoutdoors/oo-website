import { describe, expect, it, vi } from "vitest";

// The module sends email through the service client. Only the pure timing rule is under test.
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({}) }));

import { registrationClosesDay, registrationReminderDue } from "./registration-reminder";

// 2026 Deer Camp: registration closes Friday, November 6, stored as midnight UTC. Everyone
// still unregistered was approved on October 22.
const closes = "2026-11-06T00:00:00+00:00";
const approvedAt = "2026-10-22T16:50:35Z";
const at = (iso: string, sent = 0, approved: string | null = approvedAt) =>
  registrationReminderDue({ closes, approvedAt: approved, sent, now: new Date(iso) });

describe("registrationReminderDue", () => {
  it("sends nothing 8 days out", () => {
    expect(at("2026-10-29T14:30:00Z")).toBeNull();
  });

  it("sends the first reminder 7 days before the close, October 30", () => {
    expect(at("2026-10-30T14:30:00Z")).toBe("first");
    expect(at("2026-10-31T14:30:00Z", 1)).toBeNull();
  });

  it("counts the day in Eastern: 10 PM on October 30 is still October 30", () => {
    expect(at("2026-10-31T02:00:00Z")).toBe("first");
  });

  it("sends the final reminder 2 days before the close, November 4", () => {
    expect(at("2026-11-03T14:30:00Z", 1)).toBeNull();
    expect(at("2026-11-04T14:30:00Z", 1)).toBe("final");
    expect(at("2026-11-05T14:30:00Z", 2)).toBeNull();
  });

  it("sends only the final reminder to someone who missed the first", () => {
    expect(at("2026-11-04T14:30:00Z", 0)).toBe("final");
  });

  it("still reminds on the closing day, and never after it", () => {
    expect(at("2026-11-06T14:30:00Z", 1)).toBe("final");
    expect(at("2026-11-07T14:30:00Z", 0)).toBeNull();
  });

  it("leaves someone approved in the last 2 days alone, because their invite is fresh", () => {
    expect(at("2026-11-04T14:30:00Z", 0, "2026-11-03T20:00:00Z")).toBeNull();
    expect(at("2026-11-04T14:30:00Z", 0, null)).toBe("final");
  });
});

describe("registrationClosesDay", () => {
  it("uses the close date when one is set", () => {
    expect(registrationClosesDay("2026-11-06T00:00:00+00:00", "2026-11-20T00:00:00+00:00")).toBe("2026-11-06");
  });

  // Decided 2026-10-29: two weeks for shirts and prep. Deer Camp starts Friday, November 20.
  it("defaults to two weeks before camp, November 6 for Deer Camp", () => {
    expect(registrationClosesDay(null, "2026-11-20T00:00:00+00:00")).toBe("2026-11-06");
  });
});
