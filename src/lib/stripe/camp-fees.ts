// What a camp registration costs. Single source of truth, imported by the registration
// form (to show a total) and by the server (to decide what to charge). They must not
// compute it separately: the form previously derived the fee by stripping non-digits out
// of the `cost` display string, which is a different number from what Sanity's numeric
// registrationFee says whenever an editor writes anything other than a bare "$75".
//
// Amounts here are in CENTS, matching lib/stripe/giving.ts.

/**
 * Optional t-shirt for mentors. Mentors are never charged to attend: they are volunteers
 * giving up a weekend, and charging them would be perverse. The shirt is the one thing
 * they can opt into.
 */
export const MENTOR_TSHIRT_CENTS = 2500;

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
  /** Mentors only: whether they opted into the shirt. */
  wantsTshirt: boolean;
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

  if (isMentor) {
    if (input.wantsTshirt) {
      lines.push({ label: "Mentor t-shirt", cents: MENTOR_TSHIRT_CENTS });
    }
  } else if (feeCents > 0) {
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
