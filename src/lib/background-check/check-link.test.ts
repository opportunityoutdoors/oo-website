import { afterEach, describe, expect, it, vi } from "vitest";
import { checkLinkFor } from "./check-link";

const VB = "https://www.volunteerbadge.com/apply/c6c6573a-2033-4c9e-9c02-741b0273b706";

describe("checkLinkFor", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("puts the link on our domain, keyed on the registration token", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.opportunityoutdoors.org");
    expect(checkLinkFor("abc123", VB)).toBe(
      "https://www.opportunityoutdoors.org/background-check?token=abc123"
    );
  });

  it("does not double the slash when the site URL ends in one, as production's does", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.opportunityoutdoors.org/");
    expect(checkLinkFor("abc123", VB)).toBe(
      "https://www.opportunityoutdoors.org/background-check?token=abc123"
    );
  });

  it("falls back to the VolunteerBadge link when there is no token", () => {
    expect(checkLinkFor(null, VB)).toBe(VB);
  });
});
