import { createServiceClient } from "@/lib/supabase/server";
import { expiryFrom, type BackgroundCheckStatus } from "./eligibility";

// Recording what a human decided about a background check.
//
// This is the missing half of the screening system. Everything up to now could order a
// check and receive a result; nothing could act on one. A contact that came back 'flagged'
// stayed flagged forever, because only the provider webhook, the poller, and order.ts wrote
// the status column, and evaluateEligibility treats 'flagged' as needs_check. The practical
// effect was that a reviewed person got charged for and sent a new check every time they
// registered, while the panel's decision lived in somebody's memory.
//
// THE FCRA SEQUENCING MATTERS HERE and it is easy to get backwards. A panel that decides
// against someone does NOT decline them in this file. Declining on the strength of a
// consumer report requires a pre-adverse notice, a five business day window to dispute, and
// a final notice, and the provider's platform enforces that order. So 'adverse_action'
// records the decision and hands off; the provider's adverse_action.completed webhook is
// what eventually sets 'declined' and triggers the refund.
//
// The exception is 'disqualified', which covers grounds that have nothing to do with a
// report: refusing to consent, ignoring the process, concealing a pending charge. No report
// drove the decision, so no adverse action notice is owed, and that one declines and refunds
// in a single step.

export type ReviewDecision =
  | "cleared"
  | "adverse_action"
  | "disqualified"
  | "outside_check";

export type ReviewInput = {
  contactId: string;
  /** admin_users.id of whoever entered this. Null only if the row is somehow orphaned. */
  decidedBy: string | null;
  decision: ReviewDecision;
  /** Names of everyone at the review. Required by the screening policy. */
  panelPresent: string;
  /** Reasoning. Must never contain report contents. */
  reason: string;
  /** Only for outside_check. */
  outsideProvider?: string | null;
  outsideCompletedAt?: string | null;
};

export type ReviewOutcome =
  | {
      ok: true;
      statusAfter: BackgroundCheckStatus;
      reviewId: string;
      /** Present only for 'disqualified'. Human-readable refund results. */
      refunds?: string[];
    }
  | { ok: false; error: string };

/**
 * Applies a panel decision and logs it.
 *
 * The audit row is written BEFORE the status change, deliberately. If the status update
 * then fails, the result is a recorded decision that did not take effect: visible, fixable,
 * and retryable. The other ordering would risk someone being cleared with no record of who
 * cleared them or why, which is the one outcome the screening policy explicitly forbids.
 */
export async function recordReview(input: ReviewInput): Promise<ReviewOutcome> {
  const supabase = createServiceClient();

  const reason = input.reason?.trim() ?? "";
  const panelPresent = input.panelPresent?.trim() ?? "";
  if (!reason) return { ok: false, error: "A reason is required." };
  if (!panelPresent) {
    return { ok: false, error: "Record who took part in the review." };
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, background_check_status, background_check_provider")
    .eq("id", input.contactId)
    .maybeSingle();

  if (!contact) return { ok: false, error: "Contact not found." };

  const before = contact.background_check_status as BackgroundCheckStatus;

  const guard = validate(input.decision, before);
  if (guard) return { ok: false, error: guard };

  // Work out the resulting state before touching anything, so a bad input fails without
  // having written half of a decision.
  let after: BackgroundCheckStatus;
  const patch: Record<string, unknown> = {
    background_check_reviewed_at: new Date().toISOString(),
    background_check_reviewed_by: input.decidedBy,
    // The status is changing, so any previous alert describes a state that no longer
    // exists. Clearing it lets a genuinely new problem alert again rather than being
    // silenced by a stamp from the last one.
    background_check_alerted_at: null,
  };

  if (input.decision === "cleared") {
    after = "clear";
    const now = new Date();
    patch.background_check_status = after;
    patch.background_check_completed_at = now.toISOString();
    patch.background_check_expires_at = expiryFrom(now).toISOString();
  } else if (input.decision === "outside_check") {
    const completed = new Date(input.outsideCompletedAt ?? "");
    if (Number.isNaN(completed.getTime())) {
      return { ok: false, error: "Enter the date the outside check completed." };
    }
    if (completed > new Date()) {
      return { ok: false, error: "The completion date is in the future." };
    }

    // Expiry runs from when the outside check completed, not from today. Accepting a check
    // that is already ten months old buys two months of cover, not a fresh year. Doing it
    // the other way would let anyone launder an expiring check into a new one.
    const expires = expiryFrom(completed);
    if (expires <= new Date()) {
      return {
        ok: false,
        error: "That check is more than 12 months old and cannot be accepted.",
      };
    }

    after = "clear";
    patch.background_check_status = after;
    patch.background_check_completed_at = completed.toISOString();
    patch.background_check_expires_at = expires.toISOString();
    patch.background_check_provider = `outside:${(input.outsideProvider ?? "").trim() || "unnamed"}`;
  } else if (input.decision === "disqualified") {
    after = "declined";
    patch.background_check_status = after;
    patch.background_check_expires_at = null;
  } else {
    // adverse_action: nothing changes about their eligibility yet. They stay flagged, which
    // correctly keeps them out of events, while the provider runs the notice sequence.
    after = before;
  }

  // The record first. See the note on ordering above.
  const { data: review, error: reviewError } = await supabase
    .from("background_check_reviews")
    .insert({
      contact_id: input.contactId,
      decided_by: input.decidedBy,
      decision: input.decision,
      panel_present: panelPresent,
      reason,
      status_before: before,
      status_after: after,
      outside_provider:
        input.decision === "outside_check"
          ? (input.outsideProvider ?? "").trim() || null
          : null,
      outside_completed_at:
        input.decision === "outside_check" ? input.outsideCompletedAt : null,
    })
    .select("id")
    .single();

  if (reviewError || !review) {
    return {
      ok: false,
      error: `Could not record the review: ${reviewError?.message ?? "unknown error"}`,
    };
  }

  // Guarded on the status we read, so two admins acting at the same moment cannot both
  // apply a decision. Same pattern as order.ts.
  const { data: updated, error: updateError } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", input.contactId)
    .eq("background_check_status", before)
    .select("id");

  if (updateError || !updated?.length) {
    return {
      ok: false,
      error:
        `The decision was logged (${review.id}) but not applied: ` +
        (updateError?.message ??
          "this person's status changed while the review was open. Reload and check before deciding again."),
    };
  }

  console.log(
    `Background check review ${review.id}: contact ${input.contactId} ` +
      `${input.decision}, ${before} -> ${after}, by ${input.decidedBy ?? "unknown"}`
  );

  // A screening decision is about the person, so it lands on every registration they hold.
  // Deliberate: somebody reading one camp's history should see that a panel decided
  // something, even if the decision was prompted by a different camp entirely.
  try {
    const { data: theirRegs } = await supabase
      .from("registrations")
      .select("id")
      .eq("contact_id", input.contactId);

    const { logRegistrationEvent } = await import("@/lib/registration-log");
    await Promise.all(
      (theirRegs ?? []).map((r) =>
        logRegistrationEvent({
          registrationId: r.id,
          kind: "panel_decision",
          source: "admin",
          actorId: input.decidedBy,
          detail: input.decision,
        })
      )
    );
  } catch {
    // The decision and its reasoning are already saved in background_check_reviews, which is
    // the record the policy requires. A missing timeline row is a display gap, not a lost
    // decision, and must not fail the thing that mattered.
  }

  // Only a non-report disqualification refunds here. A report-driven decline refunds when
  // the provider's adverse_action.completed webhook arrives, at the end of the dispute
  // window, not now.
  if (input.decision === "disqualified") {
    try {
      const { refundAfterAdverseAction } = await import("./refund");
      const outcomes = await refundAfterAdverseAction(input.contactId, "disqualified");
      return {
        ok: true,
        statusAfter: after,
        reviewId: review.id,
        // Reasons arrive as complete sentences, so they are shown as written rather than
        // prefixed. The admin reading this is deciding whether a refund went wrong, and a
        // label like "Skipped:" in front of a full sentence just adds noise.
        refunds: outcomes.map((o) =>
          o.refunded
            ? `Refunded $${(o.amountCents / 100).toFixed(2)} for ${o.where}.`
            : o.reason
        ),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Disqualification refund failed for contact ${input.contactId}; ISSUE IT BY HAND:`,
        message
      );
      return {
        ok: true,
        statusAfter: after,
        reviewId: review.id,
        refunds: [`Refund FAILED, issue it by hand: ${message}`],
      };
    }
  }

  return { ok: true, statusAfter: after, reviewId: review.id };
}

/**
 * Whether a decision makes sense from the state the person is actually in.
 *
 * Returns an error string, or null when the move is allowed.
 */
function validate(
  decision: ReviewDecision,
  before: BackgroundCheckStatus
): string | null {
  if (before === "declined") {
    return "This person has already been declined. Reversing that is not something this screen does.";
  }

  if (decision === "cleared" || decision === "adverse_action") {
    if (before !== "flagged") {
      return `There is nothing to adjudicate: this check is '${before}', not 'flagged'.`;
    }
    return null;
  }

  if (decision === "outside_check") {
    // Accepting an outside clear check on top of our own finding would be a way to wash a
    // flag out of the record. If our check found something, the panel adjudicates it.
    if (before === "flagged") {
      return "This check came back flagged. Adjudicate it rather than replacing it with an outside check.";
    }
    return null;
  }

  // disqualified is reachable from anywhere: someone can refuse to consent before a check
  // is ever ordered, or abandon one halfway through.
  return null;
}

/** Past decisions for a contact, newest first. */
export async function listReviews(contactId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("background_check_reviews")
    .select(
      "id, decided_at, decision, panel_present, reason, status_before, status_after, outside_provider, outside_completed_at, admin_users(email)"
    )
    .eq("contact_id", contactId)
    .order("decided_at", { ascending: false });

  return data ?? [];
}
