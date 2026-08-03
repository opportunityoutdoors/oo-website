// Donation amounts, limits, and fee maths. Deliberately separate from client.ts and from
// the route handlers: these are the numbers most likely to change, and changing them
// should not mean touching payment logic.
//
// Everything here is in CENTS. Stripe works in the smallest currency unit, and mixing
// dollars and cents in the same codebase is how a donor gets charged 100x.

export const MIN_CENTS = 500; // $5. Below this the 30c fixed fee is a punitive share.
export const MAX_CENTS = 2_000_000; // $20,000. See note on the ceiling below.

/**
 * Preset one-time amounts. These mirror the three tiers already on the Donate page, so the
 * page copy and the checkout stay in agreement.
 */
export const ONE_TIME_PRESETS = [2500, 10000, 50000] as const;

/** Monthly presets. Lower than one-time, because the ask is twelve times a year. */
export const MONTHLY_PRESETS = [1000, 2500, 5000] as const;

export type Frequency = "once" | "monthly";

/**
 * Stripe's nonprofit rate: 2.2% + 30c. Used only to compute the optional "cover the
 * processing fee" top-up shown to donors.
 *
 * If the nonprofit application has not been approved yet the real rate is 2.9% + 30c, and
 * a donor covering fees will slightly under-cover. That is the right way to be wrong: the
 * alternative is over-charging donors for a discount we do not have.
 */
export const FEE_PERCENT = 0.022;
export const FEE_FIXED_CENTS = 30;

/**
 * The gross charge needed for the org to net `netCents` after Stripe's cut.
 *
 * Solving net = gross - (gross * p + f) for gross gives gross = (net + f) / (1 - p).
 * Charging net * (1 + p) instead is the common mistake and always under-covers, because
 * the fee applies to the topped-up total, not the original amount.
 */
export function grossUpForFees(netCents: number): number {
  return Math.round((netCents + FEE_FIXED_CENTS) / (1 - FEE_PERCENT));
}

/** The donor-visible surcharge for covering fees. */
export function feeSurchargeCents(netCents: number): number {
  return grossUpForFees(netCents) - netCents;
}

/**
 * Validates a client-supplied amount. The client sends an amount, so the client can send
 * anything: this is the only thing standing between the form and a $0.01 or $9,999,999
 * charge. Returns cents on success, or a human-readable reason on failure.
 *
 * The upper bound is not about distrust of donors. A gift that large should be a
 * conversation (stock, DAF, and wire are all cheaper for both sides than a 2.2% card fee,
 * which on $20,000 is $440), and an unbounded field is an attractive target for carding.
 */
export function validateAmountCents(
  raw: unknown
): { ok: true; cents: number } | { ok: false; reason: string } {
  const cents = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
    return { ok: false, reason: "Enter a valid amount." };
  }
  if (cents < MIN_CENTS) {
    return { ok: false, reason: `The minimum donation is ${formatCents(MIN_CENTS)}.` };
  }
  if (cents > MAX_CENTS) {
    return {
      ok: false,
      reason: `For gifts over ${formatCents(MAX_CENTS)}, please contact us directly so we can avoid the processing fee.`,
    };
  }
  return { ok: true, cents };
}

/** Cents to "$1,234" or "$12.50". Whole dollars drop the trailing ".00". */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
