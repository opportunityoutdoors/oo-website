// Who needs a background check, and is the one they have still good.
//
// Separate from any provider. This file answers questions about a person; provider.ts deals
// with ordering checks. Keeping them apart means swapping vendors touches one file, and
// means this logic can be tested without an account or a network.

/** Mirrors the background_check_status enum in migration 026. */
export type BackgroundCheckStatus =
  | "none"
  | "invited"
  | "pending"
  | "clear"
  | "flagged"
  | "declined"
  | "expired"
  | "error";

/** How long a clear check is honoured. Sector norm is annual re-screening. */
export const CHECK_VALID_MONTHS = 12;

/**
 * What the check costs the participant, in cents. Recovered inside the registration fee
 * rather than billed separately.
 *
 * Org-wide rather than per-event, so it lives here and not in the Sanity event schema: the
 * price comes from the provider contract, not from how a particular camp is run. Env
 * override so a provider price change is a config edit.
 *
 * NEXT_PUBLIC_ because the registration form computes the displayed total client-side and
 * the server computes the charge. A server-only var would have them disagree, which is a
 * bug this codebase has already shipped once with the Stripe fee rate.
 */
export const BACKGROUND_CHECK_FEE_CENTS =
  Number(process.env.NEXT_PUBLIC_BACKGROUND_CHECK_FEE_CENTS) || 500;

/** Legal adulthood. Below this nobody is screened, at any price. */
export const ADULT_AGE = 18;

export type CheckSubject = {
  dateOfBirth: string | null;
  status: BackgroundCheckStatus;
  expiresAt: string | null;
};

export type Eligibility =
  /** Under 18. Never screened. A consumer report on a child is not a thing we do. */
  | { kind: "minor"; feeCents: 0 }
  /** Has a clear check that has not lapsed. No charge, no action. */
  | { kind: "covered"; feeCents: 0; expiresAt: string }
  /** Already invited or in progress. Do not order or charge a second one. */
  | { kind: "in_progress"; feeCents: 0; status: BackgroundCheckStatus }
  /** Adult, nothing valid on file. This is the case that adds a line to the total. */
  | { kind: "needs_check"; feeCents: number }
  /** Previously declined. Registration must not proceed on price alone. */
  | { kind: "blocked"; feeCents: 0 }
  /**
   * No date of birth, so adulthood is unknown. NOT treated as an adult: guessing wrong
   * either charges a child for a check they must never have, or lets an unscreened adult
   * through. 592 of 600 existing contacts are in this state, so it is the common path, not
   * an edge case.
   */
  | { kind: "unknown_age"; feeCents: 0 };

/** Whole years old today, or null when the date of birth is unknown or unparseable. */
export function ageInYears(dateOfBirth: string | null, asOf: Date): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth + "T00:00:00Z");
  if (Number.isNaN(dob.getTime())) return null;

  // Compared in UTC throughout. Local-time arithmetic makes a birthday land a day early or
  // late depending on the server's zone, which around a birthday flips adult and minor.
  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = asOf.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Decides what a person needs and what it costs.
 *
 * Order matters. Minor is checked first because it overrides everything: a child with a
 * stale check record still must not be screened. Declined is checked before need, because
 * someone already turned away must not be quietly re-invited by the pricing path.
 */
export function evaluateEligibility(
  subject: CheckSubject,
  asOf: Date = new Date()
): Eligibility {
  const age = ageInYears(subject.dateOfBirth, asOf);

  if (age === null) return { kind: "unknown_age", feeCents: 0 };
  if (age < ADULT_AGE) return { kind: "minor", feeCents: 0 };

  if (subject.status === "declined") return { kind: "blocked", feeCents: 0 };

  if (subject.status === "invited" || subject.status === "pending") {
    return { kind: "in_progress", feeCents: 0, status: subject.status };
  }

  // 'clear' alone is not enough; an expired clear is not cover. Missing expiry is treated as
  // expired rather than eternal, so a bad write fails toward re-screening.
  if (subject.status === "clear" && subject.expiresAt) {
    const expires = new Date(subject.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires > asOf) {
      return { kind: "covered", feeCents: 0, expiresAt: subject.expiresAt };
    }
  }

  // Everything else (none, expired, error, flagged-but-not-adjudicated) needs a fresh check.
  // 'flagged' lands here deliberately: an unadjudicated flag is not permission to attend,
  // and re-running is the safe default if a human never resolved it.
  return { kind: "needs_check", feeCents: BACKGROUND_CHECK_FEE_CENTS };
}

/** Expiry for a check clearing now. */
export function expiryFrom(completedAt: Date): Date {
  const d = new Date(completedAt);
  d.setUTCMonth(d.getUTCMonth() + CHECK_VALID_MONTHS);
  return d;
}

/** Whether this person may take part. Only 'covered' and 'minor' qualify. */
export function mayParticipate(e: Eligibility): boolean {
  return e.kind === "covered" || e.kind === "minor";
}
