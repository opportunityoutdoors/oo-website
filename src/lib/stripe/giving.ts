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
 * Stripe's processing rate, used only to compute the optional "cover the processing fee"
 * top-up shown to donors.
 *
 * Currently the STANDARD rate, 2.9% + 30c. This was verified against real settlement rather
 * than assumed: two $25.87 test gifts grossed $51.74 and settled $49.64, a $2.10 spread,
 * which is exactly 2.9% + 30c twice.
 *
 * It was briefly set to the 2.2% nonprofit rate, which under-covered by 18c per gift: the
 * donor paid an $0.87 top-up while Stripe took $1.05, so the org netted $24.82 on a gift
 * meant to deliver $25.00. Quietly failing to cover is the one outcome the checkbox exists
 * to prevent, so the rate now matches what Stripe actually charges.
 *
 * WHEN THE NONPROFIT RATE IS APPROVED (see the 80% donation-volume requirement), set
 * NEXT_PUBLIC_STRIPE_FEE_PERCENT=0.022 rather than editing this line.
 *
 * The NEXT_PUBLIC_ prefix is required, not decorative. This module is imported by
 * DonateForm, a client component, to show the donor their surcharge, and by the checkout
 * route to compute the actual charge. A server-only env var reads as undefined in the
 * browser, so the form would quote one number while the server charged another. Inlining it
 * at build time keeps both sides on the same rate.
 */
export const FEE_PERCENT =
  Number(process.env.NEXT_PUBLIC_STRIPE_FEE_PERCENT) || 0.029;
export const FEE_FIXED_CENTS = 30;

/**
 * ACH direct debit: 0.8% with a $5.00 ceiling, no fixed component.
 *
 * Bank is cheaper than card at EVERY amount, which is worth stating because the intuition
 * runs the other way. Card is 2.9% + 30c, and that fixed 30c makes it especially poor on
 * small gifts: $5 costs 46c by card and 4c by bank. There is no crossover. Verified across
 * $5 to $20,000, bank wins throughout.
 *
 * The cap is what makes it dramatic at the top: a $2,000 gift costs $5 by bank, $58.30 by
 * card.
 */
export const ACH_PERCENT = 0.008;
export const ACH_CAP_CENTS = 500;

/**
 * Minimum fee saving before suggesting bank over card.
 *
 * Because bank always wins, an unconditional prompt would appear on every gift, including
 * ones where it saves 42 cents and costs the donor a four-day wait. This makes the nudge
 * proportionate rather than constant.
 */
export const BANK_NUDGE_MIN_SAVING_CENTS = 200;

/**
 * How the donor pays. Chosen on OUR page rather than Stripe's, which is a deliberate
 * departure from the usual advice to let Checkout present every method.
 *
 * The reason is the fee-cover checkbox. The surcharge has to be computed before the session
 * is created, and card and bank have completely different rates, so if the donor picks the
 * method on Stripe's page we would already have charged them the wrong top-up. Quoting the
 * card rate to someone who then pays by bank overcharges them by up to $50 on a large gift.
 */
export type PayMethod = "card" | "bank";

/**
 * The gross charge needed for the org to net `netCents` after Stripe's cut.
 *
 * Card: solving net = gross - (gross * p + f) for gross gives gross = (net + f) / (1 - p).
 * Charging net * (1 + p) instead is the common mistake and always under-covers, because
 * the fee applies to the topped-up total, not the original amount.
 *
 * Bank: the same reasoning until the $5 cap binds, after which the fee stops growing and
 * the top-up is simply the cap. Solving the uncapped form first and then checking whether
 * the result would exceed the cap is what gets the boundary right; assuming one branch or
 * the other misprices every gift on the wrong side of roughly $625.
 */
export function grossUpForFees(
  netCents: number,
  method: PayMethod = "card"
): number {
  if (method === "bank") {
    const uncapped = Math.round(netCents / (1 - ACH_PERCENT));
    // Would Stripe's fee on that gross exceed the cap? If so the cap binds and the donor
    // only needs to add the flat $5.
    return uncapped * ACH_PERCENT <= ACH_CAP_CENTS
      ? uncapped
      : netCents + ACH_CAP_CENTS;
  }
  return Math.round((netCents + FEE_FIXED_CENTS) / (1 - FEE_PERCENT));
}

/** The donor-visible surcharge for covering fees. */
export function feeSurchargeCents(
  netCents: number,
  method: PayMethod = "card"
): number {
  return grossUpForFees(netCents, method) - netCents;
}

/** What the org saves in fees if this gift comes by bank rather than card. */
export function bankSavingCents(netCents: number): number {
  return (
    feeSurchargeCents(netCents, "card") - feeSurchargeCents(netCents, "bank")
  );
}

/**
 * Whether the saving is large enough to be worth asking the donor to wait four days.
 *
 * Not "is bank cheaper", which is always true. See BANK_NUDGE_MIN_SAVING_CENTS.
 */
export function worthSuggestingBank(netCents: number): boolean {
  return bankSavingCents(netCents) >= BANK_NUDGE_MIN_SAVING_CENTS;
}

/**
 * Validates a client-supplied amount. The client sends an amount, so the client can send
 * anything: this is the only thing standing between the form and a $0.01 or $9,999,999
 * charge. Returns cents on success, or a human-readable reason on failure.
 *
 * The upper bound is not about distrust of donors. A gift that large should be a
 * conversation (stock, DAF, and wire are all cheaper for both sides than a card fee, which
 * on $20,000 is roughly $580), and an unbounded field is an attractive target for carding.
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
