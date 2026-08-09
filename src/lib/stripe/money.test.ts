import { describe, it, expect } from "vitest";
import { computeCampCharge, SUGGESTED_MENTOR_DONATION_CENTS } from "./camp-fees";
import {
  grossUpForFees,
  feeSurchargeCents,
  bankSavingCents,
  worthSuggestingBank,
  validateAmountCents,
  formatCents,
  FEE_PERCENT,
  FEE_FIXED_CENTS,
  ACH_PERCENT,
  ACH_CAP_CENTS,
  MIN_CENTS,
  MAX_CENTS,
} from "./giving";

// Everything that decides how much money moves.
//
// This project has already shipped one arithmetic bug to production: the registration form
// derived a fee by stripping non-digits out of the display string "$37.50", which produced
// 3750 and would have charged $3,750. Amounts are in cents everywhere precisely so that
// class of mistake has one obvious shape, and these tests pin it.

describe("computeCampCharge", () => {
  it("does not charge a mentor to attend", () => {
    const c = computeCampCharge({ role: "Mentor", registrationFee: 75 });
    expect(c.totalCents).toBe(0);
  });

  // The shirt used to be a $25 opt-in. Selling one is a taxable retail sale in NC even for a
  // 501(c)(3); a camp fee is not. Every mentor gets a shirt now and nothing is charged for
  // it, which is what keeps the suggested donation a gift rather than a price.
  it("never charges a mentor for a shirt, whatever size they pick", () => {
    const c = computeCampCharge({ role: "Mentor", registrationFee: 75 });
    expect(c.lines.some((l) => /shirt/i.test(l.label))).toBe(false);
  });

  it("charges a mentee the registration fee", () => {
    const c = computeCampCharge({ role: "Mentee", registrationFee: 75 });
    expect(c.totalCents).toBe(7500);
  });

  it("adds a voluntary donation on top, itemised", () => {
    const c = computeCampCharge({
      role: "Mentor",
      registrationFee: 75,
      donationCents: SUGGESTED_MENTOR_DONATION_CENTS,
    });
    expect(c.totalCents).toBe(SUGGESTED_MENTOR_DONATION_CENTS);
    expect(c.lines.some((l) => /donation/i.test(l.label))).toBe(true);
  });

  // Declining must be exactly as easy as agreeing, or it is not voluntary.
  it("charges nothing when the donation is declined", () => {
    for (const donationCents of [0, undefined]) {
      const c = computeCampCharge({ role: "Mentor", registrationFee: 75, donationCents });
      expect(c.totalCents, `donation ${donationCents}`).toBe(0);
    }
  });

  // The only route to a negative donation is a tampered form, where it would read as a
  // discount on the registration fee.
  it("refuses to treat a negative donation as a discount", () => {
    const c = computeCampCharge({
      role: "Mentee",
      registrationFee: 75,
      donationCents: -5000,
    });
    expect(c.totalCents).toBe(7500);
  });

  // The bug that started all of this. A fee of 37.50 dollars is 3750 cents, and the total
  // must never be 375000.
  it("converts dollars to cents once, and only once", () => {
    const c = computeCampCharge({ role: "Mentee", registrationFee: 37.5 });
    expect(c.totalCents).toBe(3750);
  });

  it("treats a null, zero or negative fee as free", () => {
    for (const fee of [null, 0, -50]) {
      const c = computeCampCharge({ role: "Mentee", registrationFee: fee });
      expect(c.totalCents, `fee ${fee}`).toBe(0);
    }
  });

  it("charges for a linked minor as a second participant", () => {
    const c = computeCampCharge({
      role: "Mentee",
      registrationFee: 75,
      minorName: "Sam",
    });
    expect(c.totalCents).toBe(15000);
  });

  // A guardian's mentor exemption covers their own attendance, not the child they bring.
  it("still charges for the minor when the guardian is a mentor", () => {
    const c = computeCampCharge({
      role: "Mentor",
      registrationFee: 75,
      minorName: "Sam",
    });
    expect(c.totalCents).toBe(7500);
  });

  it("charges a background check even to a mentor who attends free", () => {
    const c = computeCampCharge({
      role: "Mentor",
      registrationFee: 75,
      backgroundCheckCents: 500,
    });
    expect(c.totalCents).toBe(500);
  });

  it("itemises every charge, so the total is never an unexplained number", () => {
    const c = computeCampCharge({
      role: "Mentee",
      registrationFee: 75,
      minorName: "Sam",
      backgroundCheckCents: 500,
    });
    expect(c.lines.reduce((n, l) => n + l.cents, 0)).toBe(c.totalCents);
    expect(c.lines.length).toBeGreaterThan(1);
  });
});

describe("grossUpForFees", () => {
  // The obvious wrong formula is net * (1 + percent), which leaves the org short because
  // the fee is charged on the grossed-up total, not on the original amount.
  it("leaves the organisation whole after the processor takes its cut", () => {
    const net = 10000;
    const gross = grossUpForFees(net, "card");
    const fee = Math.round(gross * FEE_PERCENT) + FEE_FIXED_CENTS;
    expect(gross - fee).toBeGreaterThanOrEqual(net);
    // And it is not the naive multiplication.
    expect(gross).toBeGreaterThan(Math.round(net * (1 + FEE_PERCENT)));
  });

  it("charges less to cover a bank payment than a card", () => {
    expect(grossUpForFees(10000, "bank")).toBeLessThan(grossUpForFees(10000, "card"));
  });

  // Bank fees are capped, so above the cap the surcharge stops growing.
  it("respects the ACH cap on large gifts", () => {
    const big = 1_000_000;
    const surcharge = grossUpForFees(big, "bank") - big;
    expect(surcharge).toBeLessThanOrEqual(ACH_CAP_CENTS + 1);
    expect(Math.round(big * ACH_PERCENT)).toBeGreaterThan(ACH_CAP_CENTS);
  });

  it("keeps the organisation whole at the cap boundary too", () => {
    for (const net of [MIN_CENTS, 5000, 62_500, 100_000, 500_000]) {
      const gross = grossUpForFees(net, "bank");
      const fee = Math.min(Math.round(gross * ACH_PERCENT), ACH_CAP_CENTS);
      expect(gross - fee, `net ${net}`).toBeGreaterThanOrEqual(net);
    }
  });
});

describe("bank versus card guidance", () => {
  // An earlier version of this claimed card was cheaper below $40. Testing disproved it:
  // bank is cheaper at every amount, and the claim reached the copy before it was checked.
  it("is cheaper by bank at every amount we accept", () => {
    for (const net of [MIN_CENTS, 1000, 2500, 4000, 10000, 100_000]) {
      expect(
        grossUpForFees(net, "bank"),
        `bank should never cost more at ${net}`
      ).toBeLessThanOrEqual(grossUpForFees(net, "card"));
    }
  });

  it("only suggests a bank transfer when the saving is worth the extra step", () => {
    expect(worthSuggestingBank(MIN_CENTS)).toBe(false);
    expect(worthSuggestingBank(100_000)).toBe(true);
    expect(bankSavingCents(100_000)).toBeGreaterThan(0);
  });

  it("never reports a negative saving", () => {
    for (const net of [MIN_CENTS, 1000, 10000, 1_000_000]) {
      expect(bankSavingCents(net), `net ${net}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("agrees with grossUpForFees about the surcharge", () => {
    expect(feeSurchargeCents(10000, "card")).toBe(grossUpForFees(10000, "card") - 10000);
  });
});

describe("validateAmountCents", () => {
  it("rejects amounts outside the accepted range", () => {
    expect(validateAmountCents(MIN_CENTS - 1).ok).toBe(false);
    expect(validateAmountCents(MAX_CENTS + 1).ok).toBe(false);
    expect(validateAmountCents(MIN_CENTS).ok).toBe(true);
    expect(validateAmountCents(MAX_CENTS).ok).toBe(true);
  });

  it("rejects anything that is not a whole number of cents", () => {
    expect(validateAmountCents(1000.5).ok).toBe(false);
    expect(validateAmountCents(NaN).ok).toBe(false);
    expect(validateAmountCents(Infinity).ok).toBe(false);
  });
});

describe("formatCents", () => {
  // Whole dollars drop the cents on purpose: donation presets read as "$25", not "$25.00".
  // Pinned because it is a deliberate choice that looks like a rounding bug.
  it("drops trailing zeros on whole dollars and keeps them otherwise", () => {
    expect(formatCents(500)).toBe("$5");
    expect(formatCents(2500)).toBe("$25");
    expect(formatCents(3750)).toBe("$37.50");
    expect(formatCents(505)).toBe("$5.05");
    expect(formatCents(0)).toBe("$0");
  });

  it("groups thousands", () => {
    expect(formatCents(2_000_000)).toBe("$20,000");
  });
});
