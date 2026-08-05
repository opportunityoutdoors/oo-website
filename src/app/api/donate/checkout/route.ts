import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import {
  grossUpForFees,
  validateAmountCents,
  type Frequency,
  type PayMethod,
} from "@/lib/stripe/giving";

// Creates a Stripe Checkout Session and hands the URL back for the browser to follow.
//
// Checkout rather than a self-hosted card form on purpose: the card number never touches
// our origin, which keeps this site out of PCI scope entirely. It also brings Apple Pay,
// Google Pay, Link, and 3D Secure with no work on our side.
//
// NOTHING is written to the database here. A created session is an intent to pay, not a
// payment: the donor can close the tab, the card can decline, the 3DS challenge can fail.
// Recording a gift at this point would inflate totals with money that never arrived. The
// webhook is the only writer, because it is the only thing that hears about success.

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const frequency: Frequency = body.frequency === "monthly" ? "monthly" : "once";
  const coverFees = body.coverFees === true;

  // Card or bank, chosen on our page rather than Stripe's. See the note on PayMethod in
  // lib/stripe/giving.ts: the fee-cover surcharge has to be computed before the session
  // exists, and the two methods have completely different rates, so letting Checkout offer
  // both would mean quoting a number we cannot honour.
  //
  // ACH is one-time only. A bank debit can fail days after the fact, and a subscription
  // whose renewals silently bounce is a worse problem than a slightly pricier card fee.
  const payMethod: PayMethod =
    body.payMethod === "bank" && frequency === "once" ? "bank" : "card";

  // The gift itself, before any fee top-up. Client-supplied, therefore untrusted: the form
  // could send anything, so the amount is re-validated here rather than accepted on faith.
  const parsed = validateAmountCents(body.amountCents);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }
  const giftCents = parsed.cents;

  // What we actually charge. Computed server-side from the validated gift, never taken
  // from the client, so a tampered request cannot invent its own total. The rate depends on
  // the method, which is why the method is settled before this point rather than at Stripe.
  const chargeCents = coverFees ? grossUpForFees(giftCents, payMethod) : giftCents;

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin;

  const productName = frequency === "monthly" ? "Monthly Donation" : "Donation";

  try {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: frequency === "monthly" ? "subscription" : "payment",

      // Restricted to the single method the donor already chose, so the surcharge they were
      // quoted is the one that actually applies. Omitting this lets Stripe offer every
      // enabled method, which would reintroduce the mismatch.
      payment_method_types:
        payMethod === "bank" ? ["us_bank_account"] : ["card"],

      // Instant verification ONLY, never microdeposits.
      //
      // Stripe's default here is 'automatic', which offers instant verification but lets
      // the donor fall back to typing account numbers by hand. That fallback is a trap: it
      // puts the payment into requires_action, mails the donor a code 1-2 business days
      // later, and does nothing further until they come back and enter it. A donor who
      // never returns has made no donation at all, and the payment sits stuck forever with
      // nobody aware. Observed live in testing: a $1,000 gift stalled and only completed
      // because it was verified through the API by hand.
      //
      // The cost of 'instant' is that donors whose banks Financial Connections does not
      // support cannot pay by bank. They can still use a card, which is one click away and
      // always works. Losing some ACH coverage beats silently losing whole donations.
      ...(payMethod === "bank"
        ? {
            payment_method_options: {
              us_bank_account: {
                verification_method: "instant" as const,
              },
            },
          }
        : {}),

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: chargeCents,
            product_data: {
              name: productName,
              description:
                "Supports mentorship camps, gear for new hunters and anglers, and conservation education across North Carolina.",
            },
            ...(frequency === "monthly"
              ? { recurring: { interval: "month" as const } }
              : {}),
          },
        },
      ],

      // Always collect an email. It is the join key to `contacts`, and without it we cannot
      // send the tax receipt, which is the donor's substantiation for the deduction.
      customer_creation: frequency === "once" ? "always" : undefined,

      // Required for the IRS acknowledgment. Stripe's own receipt is suppressed (see the
      // note in the webhook) because it lacks the required "no goods or services" language.
      billing_address_collection: "required",

      success_url: `${origin}/donate/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate?canceled=1`,

      // Read back in the webhook. Stripe echoes metadata onto the objects it creates, and
      // it is the only reliable way to recover the donor's *intended* gift once fees are
      // folded into the charge. Without this, a $100 gift with fees covered looks like a
      // $102.86 gift and the acknowledgment reports the wrong number.
      metadata: {
        // Explicit, and required by the webhook. See the dispatch note there: a payment
        // with no recognised `kind` is refused rather than assumed to be a gift, so this
        // line is what makes a donation a donation.
        kind: "donation",
        gift_cents: String(giftCents),
        fee_covered_cents: String(chargeCents - giftCents),
        frequency,
        // Read back by the webhook to record how the gift was paid, which is what tells you
        // later whether the fee top-up was computed at the right rate.
        pay_method: payMethod,
        source: "website",
      },

      // Subscriptions copy metadata from the session onto the subscription, but NOT onto
      // the invoices the webhook actually reads. Setting it here puts it on the
      // subscription so renewals can still resolve the gift breakdown.
      ...(frequency === "monthly"
        ? {
            subscription_data: {
              metadata: {
                kind: "donation",
                gift_cents: String(giftCents),
                fee_covered_cents: String(chargeCents - giftCents),
                source: "website",
              },
            },
          }
        : {}),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not start checkout. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Log the real reason, return a generic one. Stripe errors can name the account, the
    // key mode, and internal ids, none of which belong in a browser response.
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
