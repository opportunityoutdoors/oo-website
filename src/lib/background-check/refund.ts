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
  | { refunded: true; amountCents: number; refundId: string; where: string }
  | { refunded: false; reason: string };

/**
 * Cents as dollars, for text a person reads.
 *
 * Every `reason` on this type is surfaced verbatim in the admin UI. "paid 500c, fees 545c"
 * was accurate and unreadable: internal units have no business in a sentence shown to
 * someone deciding whether a refund went wrong.
 */
function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Refunds every paid, unrefunded registration for a contact.
 *
 * Plural because a declined person may have paid for more than one upcoming camp, and all
 * of them are now void. Past events are left alone: they attended, the money was earned.
 */
export async function refundAfterAdverseAction(
  contactId: string,
  /**
   * Why the money is going back, recorded on the Stripe refund.
   *
   * 'adverse_action' is the FCRA path: a report drove the decision and the provider ran the
   * notice sequence. 'disqualified' is the other one: refusal to consent, non-compliance, a
   * concealed charge. No report, so no notice was owed, and an admin issued it directly.
   * Stripe's dashboard is where someone will look to reconstruct why a refund happened, and
   * labelling both the same would lose the distinction that matters.
   */
  kind: "adverse_action" | "disqualified" = "adverse_action"
): Promise<RefundOutcome[]> {
  const supabase = createServiceClient();

  const { data: regs, error } = await supabase
    .from("registrations")
    .select(
      "id, payment_status, payment_amount, stripe_payment_id, refunded_at, events(title, date_start)"
    )
    .eq("contact_id", contactId)
    .eq("payment_status", "paid");

  // Checked, not swallowed. This query previously named a column that did not exist, so
  // PostgREST rejected it, `data` came back null, and the next line read that null as "this
  // person has no paid registrations". The caller was told there was nothing to refund and
  // logged a clean run. Money that was owed simply never moved, and nothing anywhere said so.
  // A query that fails and a person who owes nothing must never look the same.
  if (error) {
    throw new Error(`Could not read registrations for refund: ${error.message}`);
  }

  if (!regs?.length) {
    return [{ refunded: false, reason: "They have no paid registrations." }];
  }

  const results: RefundOutcome[] = [];

  for (const reg of regs) {
    const ev = Array.isArray(reg.events) ? reg.events[0] : reg.events;
    const where = ev?.title ?? "an event";

    // A camp that has already happened is not refundable on these grounds. They attended;
    // the adverse action affects future participation.
    if (ev?.date_start && new Date(ev.date_start) < new Date()) {
      results.push({
        refunded: false,
        reason: `${where} has already taken place, so it is not refunded.`,
      });
      continue;
    }

    if (!reg.stripe_payment_id) {
      results.push({
        refunded: false,
        reason: `${where}: no Stripe payment is recorded against this registration, so there is nothing to refund automatically. Check it by hand.`,
      });
      continue;
    }

    const paidCents = Math.round(Number(reg.payment_amount ?? 0) * 100);
    if (paidCents <= 0) {
      results.push({
        refunded: false,
        reason: `${where}: no amount is recorded against this registration. Check it by hand.`,
      });
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
      const parts = [`${money(stripeFee)} processing`];
      if (checkCents > 0) parts.push(`${money(checkCents)} background check`);

      results.push({
        refunded: false,
        reason:
          `${where}: nothing to refund. They paid ${money(paidCents)}, and the ` +
          `non-refundable fees (${parts.join(" plus ")}) come to ${money(stripeFee + checkCents)}.`,
      });
      continue;
    }

    try {
      const refund = await getStripe().refunds.create({
        payment_intent: reg.stripe_payment_id,
        amount: refundCents,
        reason: "requested_by_customer",
        metadata: {
          kind,
          registration_id: reg.id,
          withheld_stripe_fee_cents: String(stripeFee),
          withheld_check_cents: String(checkCents),
        },
      });

      const { error: markError } = await supabase
        .from("registrations")
        .update({
          payment_status: "refunded",
          refunded_at: new Date().toISOString(),
          refunded_amount: refundCents / 100,
        })
        .eq("id", reg.id)
        // Guarded so a replayed webhook cannot refund the same registration twice. Stripe
        // would happily issue a second partial refund; the condition is what stops it.
        .eq("payment_status", "paid");

      // The money has already left Stripe by this point, so this cannot throw and undo it.
      // But a failure here is serious rather than cosmetic: the row still reads 'paid', so
      // the guard above no longer protects anything and a replayed webhook WOULD refund a
      // second time. Shout, and say exactly which registration to fix by hand.
      if (markError) {
        console.error(
          `REFUNDED ${refundCents}c FOR REGISTRATION ${reg.id} BUT COULD NOT RECORD IT: ` +
            `${markError.message}. The row still reads 'paid', so a repeat event could refund ` +
            `again. Set payment_status='refunded' by hand.`
        );
      }

      console.log(
        `Refund (${kind}): registration ${reg.id}, paid ${money(paidCents)}, ` +
          `withheld ${money(stripeFee)} stripe + ${money(checkCents)} check, ` +
          `refunded ${money(refundCents)}`
      );

      results.push({
        refunded: true,
        amountCents: refundCents,
        refundId: refund.id,
        where,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Refund (${kind}) failed for ${reg.id}:`, message);
      results.push({
        refunded: false,
        reason: `${where}: Stripe refused the refund (${message}). Issue it by hand.`,
      });
    }
  }

  return results;
}
