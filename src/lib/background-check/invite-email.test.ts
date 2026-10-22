import { describe, expect, it } from "vitest";
import { INVITE_LINK_DAYS, inviteLinkExpiry, reminderDue } from "./invite-email";

const invited = "2026-10-21T19:37:28Z";
const at = (days: number) => new Date(new Date(invited).getTime() + days * 86_400_000);
const week = at(7).toISOString();

describe("reminderDue", () => {
  it("sends nothing in the first three days", () => {
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 0, now: at(2.9) })).toBe(null);
  });

  it("sends the first reminder from day 3, once", () => {
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 0, now: at(3.1) })).toBe("first");
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 1, now: at(4) })).toBe(null);
  });

  it("sends the final reminder inside the link's last 30 hours, once", () => {
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 1, now: at(5.7) })).toBe(null);
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 1, now: at(6.1) })).toBe("final");
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 2, now: at(6.5) })).toBe(null);
  });

  it("sends only the final reminder to someone first seen late", () => {
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 0, now: at(6.2) })).toBe("final");
  });

  it("never reminds about an expired link", () => {
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: week, sent: 1, now: at(7.01) })).toBe(null);
  });

  it("follows the provider's expiry over the 7-day default", () => {
    const expires = at(14).toISOString();
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: expires, sent: 1, now: at(7.5) })).toBe(null);
    expect(reminderDue({ invitedAt: invited, urlExpiresAt: expires, sent: 1, now: at(13.2) })).toBe("final");
  });

  it("sends nothing without an invite date", () => {
    expect(reminderDue({ invitedAt: null, urlExpiresAt: week, sent: 0, now: at(4) })).toBe(null);
  });
});

describe("inviteLinkExpiry", () => {
  it("counts INVITE_LINK_DAYS from the invite when the provider gave no expiry", () => {
    expect(inviteLinkExpiry(null, invited)?.toISOString()).toBe(at(INVITE_LINK_DAYS).toISOString());
  });

  it("uses the provider's own expiry when there is one", () => {
    expect(inviteLinkExpiry(week, invited)?.toISOString()).toBe(week);
  });
});
