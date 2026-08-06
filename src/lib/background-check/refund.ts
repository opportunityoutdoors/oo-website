import { getStripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";
import { FEE_FIXED_CENTS, FEE_PERCENT } from "@/lib/stripe/giving";
import { BACKGROUND_CHECK_FEE_CENTS } from "./eligibility";

// Refunds a camp registration after an adverse action completes.
//
// Fires from adverse_action.completed, which is the point at which a decision is final:
// VolunteerBadge only emits it after the pre-adverse notice, the five business day dispute
// window, and the final notice. A human made the decision several steps earlier, so the
// automation here is issuing money that is already owed, not deciding anything.
//
// WHAT IS WITHHELD, and why it is defensible: the Stripe processing fee is genuinely gone
// (Stripe does not return fees on refunds) and the background check has been run and paid
// for. Both are disclosed on the registration form before payment. Refunding the full
// amount would mean the org absorbing costs incurred on behalf of someone it then could not
// accept.

export type RefundOutcome =
  | { refunded: true; amountCents: number; refundId: string }
  | { refunded: false; reason: string };

/**
 * Refunds every paid, unrefunded registration for a contact.
 *
 * Plural because a declined person may have paid for more than one upcoming camp, and all
 * of them are now void. Past events are left alone: they attended, the money was earned.
 */
export async function refundAfterAdverseAction(
  contactId: string
): Promise<RefundOutcome[]> {
  const supabase = createServiceClient();

  const { data: regs } = await supabase
    .from("registrations")
    .select(
      "id, payment_status, payment_amount, stripe_payment_id, refunded_at, events(title, date_start)"
    )
    .eq("contact_id", contactId)
    .eq("payment_status", "paid");

  if (!regs?.length) return [{ refunded: false, reason: "no paid registrations" }];

  const results: RefundOutcome[] = [];

  for (const reg of regs) {
    const ev = Array.isArray(reg.events) ? reg.events[0] : reg.events;

    // A camp that has already happened is not refundable on these grounds. They attended;
    // the adverse action affects future participation.
    if (ev?.date_start && new Date(ev.date_start) < new Date()) {
      results.push({ refunded: false, reason: `${ev.title} already took place` });
      continue;
    }

    if (!reg.stripe_payment_id) {
      results.push({ refunded: false, reason: `${reg.id} has no payment intent` });
      continue;
    }

    const paidCents = Math.round(Number(reg.payment_amount ?? 0) * 100);
    if (paidCents <= 0) {
      results.push({ refunded: false, reason: `${reg.id} has no recorded amount` });
      continue;
    }

    // Stripe's cut on the ORIGINAL charge, which is what was actually lost. Computing it
    // from the refund amount instead would understate it.
    const stripeFee = Math.round(paidCents * FEE_PERCENT) + FEE_FIXED_CENTS;

    // Whether a check was charged is inferred from whether one was ordered. The fee
    // breakdown is not stored per registration, and re-deriving it from eligibility would
    // now return the wrong answer because the contact's status has since become 'declined'.
    const { data: contact } = await supabase
      .from("contacts")
      .select("background_check_id")
      .eq("id", contactId)
      .maybeSingle();
    const checkCents = contact?.background_check_id ? BACKGROUND_CHECK_FEE_CENTS : 0;

    const refundCents = paidCents - stripeFee - checkCents;

    if (refundCents <= 0) {
      // Happens on a registration that was almost entirely the check itself, for instance a
      // free camp where the $5 check was the whole charge. Nothing is owed back, and saying
      // so plainly beats attempting a zero or negative refund.
      results.push({
        refunded: false,
        reason: `nothing refundable: paid ${paidCents}c, fees ${stripeFee + checkCents}c`,
      });
      continue;
    }

    try {
      const refund = await getStripe().refunds.create({
        payment_intent: reg.stripe_payment_id,
        amount: refundCents,
        reason: "requested_by_customer",
        metadata: {
          kind: "adverse_action",
          registration_id: reg.id,
          withheld_stripe_fee_cents: String(stripeFee),
          withheld_check_cents: String(checkCents),
        },
      });

      await supabase
        .from("registrations")
        .update({
          payment_status: "refunded",
          refunded_at: new Date().toISOString(),
        })
        .eq("id", reg.id)
        // Guarded so a replayed webhook cannot refund the same registration twice. Stripe
        // would happily issue a second partial refund; the condition is what stops it.
        .eq("payment_status", "paid");

      console.log(
        `Adverse action refund: registration ${reg.id}, paid ${paidCents}c, ` +
          `withheld ${stripeFee}c stripe + ${checkCents}c check, refunded ${refundCents}c`
      );

      results.push({ refunded: true, amountCents: refundCents, refundId: refund.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Adverse action refund failed for ${reg.id}:`, message);
      results.push({ refunded: false, reason: `stripe error: ${message}` });
    }
  }

  return results;
}
