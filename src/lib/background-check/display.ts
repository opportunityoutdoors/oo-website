import { evaluateEligibility, type BackgroundCheckStatus } from "./eligibility";

// One vocabulary for describing where a person's background check stands.
//
// Shared by the admin pipeline and the alert emails deliberately. Those are the two places
// someone learns about a problem, and if they describe the same state differently, the
// person reading them has to reconcile the two. "Needs review" in an email and "Consider"
// in a table are the same thing, and nobody should have to know that.

export type CheckDisplay = {
  /** Short label for a table cell. */
  label: string;
  /** One line of context. Why this state matters, or what happens next. */
  detail: string;
  /** ok = nothing to do. wait = in flight. act = a human is blocking progress. */
  tone: "ok" | "wait" | "act";
  /** True when someone should look at this now. Drives counts and alerting alike. */
  needsAttention: boolean;
};

export function describeCheck(input: {
  dateOfBirth: string | null;
  status: BackgroundCheckStatus | string | null;
  expiresAt: string | null;
  invitedAt: string | null;
  /** Paid registrants are the ones who matter: unpaid people are not attending yet. */
  paid: boolean;
  /** Used to age an invite. An unfinished check three days out is urgent; a month out is not. */
  eventDate?: string | null;
}): CheckDisplay {
  const eligibility = evaluateEligibility({
    dateOfBirth: input.dateOfBirth,
    status: (input.status ?? "none") as BackgroundCheckStatus,
    expiresAt: input.expiresAt,
  });

  // Minors are never screened, so they are complete by definition rather than exempt-with-a-
  // caveat. Saying "not required" rather than "n/a" stops anyone wondering if it was missed.
  if (eligibility.kind === "minor") {
    return {
      label: "Not required",
      detail: "Under 18. Background checks are not run on minors.",
      tone: "ok",
      needsAttention: false,
    };
  }

  if (eligibility.kind === "unknown_age") {
    return {
      label: "Age unknown",
      detail:
        "No date of birth on file, so we cannot tell whether a check is required. Ask before the event.",
      tone: "act",
      needsAttention: true,
    };
  }

  if (input.status === "declined") {
    return {
      label: "Declined",
      detail: "Adjudicated and turned away. Must not attend.",
      tone: "act",
      needsAttention: true,
    };
  }

  if (input.status === "flagged") {
    return {
      label: "Needs review",
      detail:
        "Records were found and confirmed. Open the CRA reviewer note in VolunteerBadge and decide. Nothing happens until you do.",
      tone: "act",
      needsAttention: true,
    };
  }

  if (input.status === "error") {
    return {
      label: "Error",
      detail: "The provider could not complete this check. Needs a human.",
      tone: "act",
      needsAttention: true,
    };
  }

  if (eligibility.kind === "covered") {
    const until = new Date(eligibility.expiresAt);
    return {
      label: "Cleared",
      detail: `Valid until ${until.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}.`,
      tone: "ok",
      needsAttention: false,
    };
  }

  if (input.status === "invited" || input.status === "pending") {
    const days = input.invitedAt ? daysSince(input.invitedAt) : null;
    const daysToEvent = input.eventDate ? daysUntil(input.eventDate) : null;

    // An unfinished invite only becomes urgent as the event closes in. Flagging every
    // in-progress check would bury the ones that actually need chasing.
    const urgent =
      daysToEvent !== null && daysToEvent <= 14 && (days ?? 0) >= 2;

    return {
      label: urgent ? "Not finished" : "In progress",
      detail: urgent
        ? `Invited ${days} days ago and still unfinished, with the event ${daysToEvent} days away. They have paid and cannot attend until this is done.`
        : days !== null
          ? `Invited ${days} day${days === 1 ? "" : "s"} ago, waiting on them.`
          : "Invitation sent, waiting on them.",
      tone: urgent ? "act" : "wait",
      needsAttention: urgent,
    };
  }

  // Adult, paid, and nothing on file at all. Either the order failed or it was never placed:
  // exactly the state that went unnoticed for an hour on the first live run.
  return {
    label: input.paid ? "Not screened" : "Not started",
    detail: input.paid
      ? "Paid, but no background check has been ordered. Use Retry to order one."
      : "No check yet. One is ordered automatically when they pay.",
    tone: input.paid ? "act" : "wait",
    needsAttention: input.paid,
  };
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
