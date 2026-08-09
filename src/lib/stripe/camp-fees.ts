// What a camp registration costs. Single source of truth, imported by the registration
// form (to show a total) and by the server (to decide what to charge). They must not
// compute it separately: the form previously derived the fee by stripping non-digits out
// of the `cost` display string, which is a different number from what Sanity's numeric
// registrationFee says whenever an editor writes anything other than a bare "$75".
//
// Amounts here are in CENTS, matching lib/stripe/giving.ts.

/**
 * What OO suggests a mentor gives toward the cost of running a camp.
 *
 * A SUGGESTION, never a charge. This replaced a $25 t-shirt that mentors could opt into,
 * which was odd on two counts. It billed a volunteer for a shirt to wear while donating a
 * weekend. And selling a shirt is a retail sale of tangible personal property, which is
 * taxable in North Carolina even for a 501(c)(3), while a camp fee is exempt because of what
 * it buys: instruction and participation.
 *
 * Every mentor now gets a shirt regardless. That is what makes the suggested amount a gift
 * rather than a price: nothing is contingent on paying it, so there is no sale to tax and
 * nothing received in exchange. If the shirt were held back from anyone who declined, this
 * would be a purchase with a friendlier label, and relabelling does not change what a
 * transaction is.
 */
export const SUGGESTED_MENTOR_DONATION_CENTS = 2500;

export type FeeLine = { label: string; cents: number };

export type CampCharge = {
  lines: FeeLine[];
  totalCents: number;
};

export type CampChargeInput = {
  /** registrations.role. "Mentor" is the only value that avoids the registration fee. */
  role: string | null;
  /** events.registration_fee in DOLLARS, as stored. Null or 0 means a free event. */
  registrationFee: number | null;
  /**
   * A voluntary contribution toward camp costs, in cents. Zero or absent means they chose
   * not to, which must be as easy as choosing to.
   */
  donationCents?: number;
  /** A guardian registering a minor alongside themselves pays for both. */
  minorName?: string | null;
  /**
   * Cost of a background check for this person, or 0 when none is needed.
   *
   * Passed in rather than computed here, because deciding it needs their date of birth and
   * current check status, which are database facts. This module deals only in arithmetic so
   * it stays testable and so the client and server can run the identical calculation.
   *
   * Charged even to mentors, who otherwise attend free: the check is a cost per adult body,
   * not a fee for attending, and mentors are precisely the adults who most need screening.
   */
  backgroundCheckCents?: number;
};

/**
 * Computes the charge for one registration, including a linked minor.
 *
 * Called on the server before creating a Checkout Session, so this function, not the
 * browser, decides the amount. A tampered form cannot lower its own price.
 */
export function computeCampCharge(input: CampChargeInput): CampCharge {
  const isMentor = input.role === "Mentor";

  // Guard against a negative or non-finite fee reaching Stripe. A negative unit_amount is
  // rejected by the API, but failing here gives a clearer error than a 400 from Stripe.
  const feeDollars =
    Number.isFinite(input.registrationFee) && (input.registrationFee ?? 0) > 0
      ? (input.registrationFee as number)
      : 0;
  const feeCents = Math.round(feeDollars * 100);

  const lines: FeeLine[] = [];

  // Mentors are never charged to attend. They are giving up a weekend; billing them for the
  // privilege would be perverse, and the shirt they get is not a product.
  if (!isMentor && feeCents > 0) {
    lines.push({
      label: input.minorName ? "Your registration" : "Registration fee",
      cents: feeCents,
    });
  }

  // The minor is a second participant at the same event and is charged the same fee, even
  // when the guardian is a mentor: the guardian's exemption is for their own attendance as
  // a volunteer, not a family discount.
  if (input.minorName && feeCents > 0) {
    lines.push({
      label: `${input.minorName}'s registration`,
      cents: feeCents,
    });
  }

  // Last, and itemised rather than folded into the registration fee. Someone paying $12 for
  // a camp and $5 for a check should see both: a single unexplained $17 invites a support
  // email, and a line item is also the honest way to charge a mentor who otherwise attends
  // free. Only ever present when the person genuinely needs one, so a returning mentor with
  // a current check sees no charge and no line.
  const bgCents = Math.max(0, Math.round(input.backgroundCheckCents ?? 0));
  if (bgCents > 0) {
    lines.push({ label: "Background check", cents: bgCents });
  }

  // Voluntary, and last, so it reads as an addition to a total rather than part of one.
  // Clamped at zero: a negative "donation" would be a discount, and the only way to reach
  // one is a tampered form.
  const donationCents = Math.max(0, Math.round(input.donationCents ?? 0));
  if (donationCents > 0) {
    lines.push({ label: "Donation toward camp costs", cents: donationCents });
  }

  return {
    lines,
    totalCents: lines.reduce((sum, l) => sum + l.cents, 0),
  };
}

/** Cents to "$75" or "$7.50". Mirrors formatCents in giving.ts. */
export function formatFee(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
