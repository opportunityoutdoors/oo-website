import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import {
  grossUpForFees,
  validateAmountCents,
  type Frequency,
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

  // The gift itself, before any fee top-up. Client-supplied, therefore untrusted: the form
  // could send anything, so the amount is re-validated here rather than accepted on faith.
  const parsed = validateAmountCents(body.amountCents);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }
  const giftCents = parsed.cents;

  // What we actually charge. Computed server-side from the validated gift, never taken
  // from the client, so a tampered request cannot invent its own total.
  const chargeCents = coverFees ? grossUpForFees(giftCents) : giftCents;

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin;

  const productName = frequency === "monthly" ? "Monthly Donation" : "Donation";

  try {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: frequency === "monthly" ? "subscription" : "payment",

      // Stripe renders the wallet options the donor's device supports. ACH is deliberately
      // absent: at 0.8% it is far cheaper for us, but it settles in days rather than
      // seconds and cannot back a subscription cleanly. Worth revisiting for major gifts.
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
        gift_cents: String(giftCents),
        fee_covered_cents: String(chargeCents - giftCents),
        frequency,
        source: "website",
      },

      // Subscriptions copy metadata from the session onto the subscription, but NOT onto
      // the invoices the webhook actually reads. Setting it here puts it on the
      // subscription so renewals can still resolve the gift breakdown.
      ...(frequency === "monthly"
        ? {
            subscription_data: {
              metadata: {
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
