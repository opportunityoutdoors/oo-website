import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/stripe/giving";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderDonationReceipt } from "@/emails";

// Stripe webhook. This is the ONLY place a donation row is written: the checkout route
// creates an intent to pay, and only Stripe can tell us the money actually moved.
//
// Two things make this handler different from every other route in the app:
//
//  1. The signature is computed over the RAW request bytes. Parsing the body first (or
//     re-serialising it) changes whitespace and key order and the signature will not
//     verify. Hence req.text(), never req.json().
//
//  2. Delivery is at-least-once. Stripe retries on timeout, on non-2xx, and sometimes on
//     success it never heard about. Every path below must be safe to run twice, which is
//     what the unique index on stripe_payment_intent_id buys us.

// Prevent any caching layer from sitting in front of a webhook.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set; refusing webhook");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await req.text();

  // getStripe() is called OUTSIDE the verification try/catch on purpose. It throws when
  // STRIPE_SECRET_KEY is unset, and folding that into the catch below reported a missing
  // env var as "Invalid signature" — a message that sends you hunting for a secret
  // mismatch that does not exist. Config problems and auth failures now say different
  // things and return different statuses.
  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Stripe client unavailable; cannot verify webhook:", err);
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    // This is the authentication boundary for the whole route. Anyone can POST here, so
    // until constructEvent returns, the payload is attacker-controlled and must not be
    // trusted to say a payment happened.
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      // ACH settles days after checkout, so the money arriving is its own event. Without
      // these two an ACH donation would sit pending forever: checkout.session.completed
      // fires with payment_status 'unpaid' and returns early, and nothing else follows up.
      case "checkout.session.async_payment_succeeded":
        await handleAsyncPaymentResolved(event.data.object, "succeeded");
        break;

      case "checkout.session.async_payment_failed":
        await handleAsyncPaymentResolved(event.data.object, "failed");
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        // Not fatal and not recorded as a donation. Logged because a lapsed sustaining
        // donor is worth a human following up on, and silence here means nobody notices.
        console.warn(
          `Stripe invoice payment failed: ${event.data.object.id} (customer ${event.data.object.customer})`
        );
        break;

      case "customer.subscription.deleted":
        console.warn(
          `Stripe subscription cancelled: ${event.data.object.id} (customer ${event.data.object.customer})`
        );
        break;

      default:
        // Unhandled types get a 200. Returning an error would make Stripe retry an event
        // we are never going to act on, and eventually disable the endpoint.
        break;
    }
  } catch (err) {
    // A 500 tells Stripe to retry, which is what we want for a transient database failure.
    // The unique index makes that retry safe.
    console.error(`Stripe webhook handler failed for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * One-time gifts (Checkout mode=payment) and camp registration payments, which are
 * indistinguishable at this event except by metadata.
 *
 * Subscriptions are deliberately ignored here. Stripe fires this event AND invoice.paid
 * for the first charge of a subscription; recording both would double-count the gift and
 * send two tax receipts. Recurring gifts are handled entirely by handleInvoicePaid.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") return;

  // DISPATCH IS AN ALLOWLIST, AND THE DEFAULT IS REFUSAL.
  //
  // Every Checkout flow in this app lands on this one event and is distinguishable only by
  // metadata.kind. The obvious shape is "if camp, treat as camp, otherwise donation", and
  // that is what this used to do. It is the wrong default: any future flow that forgets to
  // set metadata gets booked as a tax-deductible gift and mails the payer an IRS
  // acknowledgment stating no goods or services were provided. For a store order that
  // statement is simply false.
  //
  // A second webhook endpoint does not solve this. Stripe filters deliveries by event type,
  // not by metadata, so every endpoint receives every checkout.session.completed and each
  // would still have to discriminate here. Splitting the URL adds a second signing secret
  // and a second copy of this logic without adding safety.
  //
  // So: recognised kinds are handled, everything else is logged loudly and dropped. A
  // payment that is not recorded is a bug someone will notice and can backfill. A payment
  // wrongly recorded as a charitable gift is a false tax document already in an inbox.
  const kind = session.metadata?.kind;

  if (kind === "camp_registration") {
    // Camp checkout is card-only, so payment_status is settled by now. Guarded anyway so
    // that enabling ACH for camps later fails loudly rather than booking unpaid places.
    if (session.payment_status !== "paid") {
      console.warn(
        `Camp session ${session.id} completed unpaid (${session.payment_status}); not marking paid`
      );
      return;
    }
    await handleCampPayment(session);
    return;
  }

  // The refusal. Anything not explicitly marked a donation stops here.
  //
  // Sessions created before this check existed carry no `kind`, so they are tolerated when
  // they look unmistakably like a website gift: our own donation metadata is present. That
  // exemption should be deleted once no such sessions can still be in flight (Stripe retries
  // for at most 3 days).
  const looksLikeLegacyDonation =
    kind === undefined && session.metadata?.gift_cents !== undefined;

  if (kind !== "donation" && !looksLikeLegacyDonation) {
    console.error(
      `REFUSING checkout session ${session.id}: metadata.kind is ${JSON.stringify(kind)}, ` +
        `which is not a recognised payment type. Nothing recorded. If this is a new payment ` +
        `flow, set metadata.kind when creating the session and add a branch here. It is NOT ` +
        `booked as a donation, because that would mail the payer a tax receipt asserting no ` +
        `goods or services were provided.`
    );
    return;
  }

  // 'paid' means settled, which is true immediately for cards. ACH arrives as 'unpaid'
  // because the debit takes about four business days, and it can still fail afterwards.
  //
  // The previous version returned early on anything other than 'paid', which would have
  // made every ACH gift vanish silently: money leaves the donor, nothing is ever recorded.
  // Instead an unsettled gift is written as 'pending' and resolved later by
  // checkout.session.async_payment_succeeded / _failed.
  if (session.payment_status !== "paid" && session.payment_status !== "unpaid") {
    console.warn(
      `Checkout session ${session.id} in unexpected payment_status ${session.payment_status}; ignoring`
    );
    return;
  }
  const settled = session.payment_status === "paid";

  const paymentIntentId = idOf(session.payment_intent);
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!email) {
    console.error(`Checkout session ${session.id} completed with no email; cannot record`);
    return;
  }

  const giftCents = Number(session.metadata?.gift_cents ?? session.amount_total ?? 0);
  const feeCents = Number(session.metadata?.fee_covered_cents ?? 0);

  await recordDonation({
    email,
    name: session.customer_details?.name ?? null,
    // The charged total, not the metadata gift. This is what the donor actually paid and
    // therefore what is deductible, fee top-up included.
    amountCents: session.amount_total ?? giftCents,
    feeCoveredCents: feeCents,
    recurring: false,
    paymentIntentId,
    checkoutSessionId: session.id,
    subscriptionId: null,
    customerId: idOf(session.customer),
    campaign: session.metadata?.source ?? "website",
    paymentMethodType: session.metadata?.pay_method === "bank" ? "us_bank_account" : "card",
    // A pending gift is not income and gets no receipt. Sending a tax acknowledgment for
    // money that has not arrived, and might bounce, is the one thing worse than sending it
    // late.
    status: settled ? "succeeded" : "pending",
    sendReceipt: settled,
  });
}

/**
 * Resolves an ACH gift once the bank debit settles or fails, four-ish days after checkout.
 *
 * Updates the existing pending row rather than inserting: the row was created by
 * handleCheckoutCompleted and carries the unique payment intent, so a second insert would
 * collide with the idempotency index anyway.
 */
async function handleAsyncPaymentResolved(
  session: Stripe.Checkout.Session,
  outcome: "succeeded" | "failed"
) {
  const supabase = createServiceClient();
  const paymentIntentId = idOf(session.payment_intent);

  if (!paymentIntentId) {
    console.error(`Async payment event for session ${session.id} has no payment intent`);
    return;
  }

  // Guarded on the current status so a replayed delivery cannot resurrect a refunded gift
  // or re-send a receipt for one already settled.
  const { data: updated, error } = await supabase
    .from("donations")
    .update({
      status: outcome,
      ...(outcome === "succeeded" ? { date: new Date().toISOString() } : {}),
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("status", "pending")
    .select("id, amount, fee_covered_amount, contact_id, recurring");

  if (error) throw new Error(`Failed to resolve async payment: ${error.message}`);

  if (!updated?.length) {
    console.log(
      `Async ${outcome} for ${paymentIntentId} matched no pending donation; already resolved`
    );
    return;
  }

  const row = updated[0];
  console.log(`ACH gift ${paymentIntentId} resolved: ${outcome} ($${row.amount})`);

  if (outcome !== "succeeded") return;

  // Receipt waits for settlement, which is the whole reason ACH needs this second step.
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!email) {
    console.error(`Cannot send receipt for ${paymentIntentId}: no email on session`);
    return;
  }

  after(async () => {
    try {
      await sendReceipt({
        email: email.trim().toLowerCase(),
        amountCents: Math.round(Number(row.amount) * 100),
        feeCoveredCents: Math.round(Number(row.fee_covered_amount) * 100),
        recurring: row.recurring,
        paymentIntentId,
        donationId: row.id,
      });
    } catch (err) {
      console.error(`Failed to send ACH receipt for ${row.id}:`, err);
    }
  });
}

/**
 * Records a refund against the original gift.
 *
 * Fires on partial refunds too, so the amount is read from the charge rather than assumed
 * to be the whole thing. `status` only becomes 'refunded' on a full refund; a partial keeps
 * 'succeeded' with a non-zero refunded_amount, because the gift is still largely income.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const supabase = createServiceClient();
  const paymentIntentId = idOf(charge.payment_intent);

  if (!paymentIntentId) {
    console.error(`Refund on charge ${charge.id} has no payment intent; cannot match`);
    return;
  }

  const refundedCents = charge.amount_refunded ?? 0;
  const fullyRefunded = refundedCents >= (charge.amount ?? 0);

  const { data: updated, error } = await supabase
    .from("donations")
    .update({
      refunded_amount: refundedCents / 100,
      refunded_at: new Date().toISOString(),
      ...(fullyRefunded ? { status: "refunded" } : {}),
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .select("id, amount");

  if (error) throw new Error(`Failed to record refund: ${error.message}`);

  if (!updated?.length) {
    // Expected for camp registration refunds, which live in `registrations`, not here.
    console.log(`Refund for ${paymentIntentId} matched no donation row`);
    return;
  }

  console.log(
    `Refund recorded for ${paymentIntentId}: $${(refundedCents / 100).toFixed(2)}` +
      `${fullyRefunded ? " (full)" : " (partial)"}`
  );
}

/**
 * Recurring gifts. Fires for the first charge and every renewal alike, which is exactly
 * why checkout.session.completed skips subscriptions: this one event type covers the whole
 * lifecycle and gives us one donation row per billing period.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdOf(invoice);

  // One-off invoices (an admin billing someone manually in the dashboard) are not website
  // donations and are left alone rather than silently booked as recurring gifts.
  if (!subscriptionId) return;
  if (invoice.amount_paid <= 0) return;

  const paymentIntentId = invoicePaymentIntentId(invoice);
  const email = invoice.customer_email;
  if (!email) {
    console.error(`Invoice ${invoice.id} paid with no customer email; cannot record`);
    return;
  }

  // Metadata lives on the subscription, not the invoice, so the fee split has to be read
  // back from there. Fetched through our own pinned SDK version rather than trusting the
  // shape of the webhook payload, which renders at whatever version the endpoint is set to.
  let feeCents = 0;
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    feeCents = Number(sub.metadata?.fee_covered_cents ?? 0);
  } catch (err) {
    // Not fatal. A missing fee split makes the receipt slightly less informative; failing
    // the whole webhook over it would lose the donation record entirely.
    console.error(`Could not read metadata for subscription ${subscriptionId}:`, err);
  }

  await recordDonation({
    email,
    name: invoice.customer_name ?? null,
    amountCents: invoice.amount_paid,
    feeCoveredCents: feeCents,
    recurring: true,
    paymentIntentId,
    checkoutSessionId: null,
    subscriptionId,
    customerId: idOf(invoice.customer),
    campaign: "website",
  });
}

/**
 * Marks a camp registration paid, and the linked minor with it.
 *
 * No receipt email is sent here. The registration confirmation, with the signed waiver
 * attached, already went out when the form was submitted, and Stripe emails its own payment
 * receipt for camp fees. A second "thank you for your payment" mail would be noise, and the
 * donation receipt template must not be reused because its "no goods or services were
 * provided" language is false for a camp fee.
 */
async function handleCampPayment(session: Stripe.Checkout.Session) {
  const registrationId = session.metadata?.registration_id;
  if (!registrationId) {
    console.error(`Camp payment session ${session.id} has no registration_id metadata`);
    return;
  }

  const supabase = createServiceClient();
  const paymentIntentId = idOf(session.payment_intent);
  const paidAt = new Date().toISOString();

  // Guarded on payment_status so a replayed delivery cannot re-stamp paid_at with a later
  // time. The unique index on stripe_payment_id backs this up at the storage layer.
  const { data: updated, error } = await supabase
    .from("registrations")
    .update({
      payment_status: "paid",
      paid_at: paidAt,
      stripe_payment_id: paymentIntentId,
      payment_amount: (session.amount_total ?? 0) / 100,
    })
    .eq("id", registrationId)
    .neq("payment_status", "paid")
    .select("id");

  if (error) {
    if (error.code === "23505") {
      console.log(`Camp payment ${paymentIntentId} already recorded; skipping replay`);
      return;
    }
    throw new Error(`Failed to mark registration paid: ${error.message}`);
  }

  if (!updated?.length) {
    console.log(`Registration ${registrationId} was already paid; skipping replay`);
    return;
  }

  // One payment covers the guardian and their minor. The minor gets no stripe_payment_id:
  // the unique index would reject the second row, and the money is genuinely attached to
  // the guardian's registration. payment_amount stays null there for the same reason, so
  // summing payment_amount across registrations does not double-count the family.
  const minorId = session.metadata?.minor_registration_id;
  if (minorId) {
    const { error: minorError } = await supabase
      .from("registrations")
      .update({ payment_status: "paid", paid_at: paidAt })
      .eq("id", minorId);
    if (minorError) {
      // Not fatal: the guardian's payment is recorded, which is the money question. A
      // stranded minor row is visible in the admin as unpaid and fixable by hand.
      console.error(`Failed to mark linked minor ${minorId} paid:`, minorError);
    }
  }

  console.log(
    `Camp payment recorded: registration ${registrationId}, ${session.amount_total} cents`
  );

  // Background checks are ordered here, after the money has settled, because that is the
  // point at which someone is committed. Ordering earlier means paying to screen people who
  // never turn up.
  //
  // Runs in after() so a slow or failing screening provider cannot delay the 2xx Stripe is
  // waiting for. The payment is already durably recorded by this point, and an unordered
  // check is visible in the admin and retryable, whereas a webhook timeout would have Stripe
  // retrying a payment we have in fact recorded.
  //
  // The guardian and their minor are handled separately and deliberately: the guardian is an
  // adult who needs screening, the minor never does. orderBackgroundCheckIfNeeded re-checks
  // eligibility for each, so passing both is safe and the minor simply returns 'minor'.
  after(async () => {
    const { orderBackgroundCheckIfNeeded } = await import(
      "@/lib/background-check/order"
    );

    const { data: reg } = await supabase
      .from("registrations")
      .select("contact_id")
      .eq("id", registrationId)
      .single();

    if (!reg?.contact_id) return;

    const outcome = await orderBackgroundCheckIfNeeded(reg.contact_id);
    if (!outcome.ordered) {
      console.log(
        `No background check ordered for registration ${registrationId}: ${outcome.reason}`
      );
    }
  });
}

type DonationInput = {
  email: string;
  name: string | null;
  amountCents: number;
  feeCoveredCents: number;
  recurring: boolean;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  subscriptionId: string | null;
  customerId: string | null;
  campaign: string;
  /** 'card' or 'us_bank_account'. Determines which fee rate applied. */
  paymentMethodType?: string | null;
  /** 'pending' for an ACH debit still in flight, 'succeeded' once money is in hand. */
  status?: "pending" | "succeeded";
  /** False while a gift is pending: no tax receipt for money that has not arrived. */
  sendReceipt?: boolean;
};

async function recordDonation(input: DonationInput) {
  const supabase = createServiceClient();
  const email = input.email.trim().toLowerCase();

  // Every donor becomes a contact. Donations.contact_id is NOT NULL, and it is also what
  // puts donors into the same CRM as everyone else rather than a separate silo.
  const contactId = await upsertContact(supabase, email, input.name);

  const { data: inserted, error } = await supabase
    .from("donations")
    .insert({
      contact_id: contactId,
      amount: input.amountCents / 100,
      fee_covered_amount: input.feeCoveredCents / 100,
      currency: "usd",
      recurring: input.recurring,
      status: input.status ?? "succeeded",
      payment_method_type: input.paymentMethodType ?? null,
      method: input.recurring ? "stripe_subscription" : "stripe_checkout",
      campaign: input.campaign,
      stripe_payment_intent_id: input.paymentIntentId,
      stripe_checkout_session_id: input.checkoutSessionId,
      stripe_subscription_id: input.subscriptionId,
      stripe_customer_id: input.customerId,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 is unique_violation, meaning this exact payment is already recorded. That is a
    // replayed delivery doing precisely what the index exists to prevent, so it is a
    // success, not a failure: return quietly and do NOT re-send the receipt.
    if (error.code === "23505") {
      console.log(
        `Donation for payment intent ${input.paymentIntentId} already recorded; skipping replay`
      );
      return;
    }
    throw new Error(`Failed to record donation: ${error.message}`);
  }

  // A pending ACH gift gets no receipt yet. The money has not arrived and may still fail,
  // and a tax acknowledgment for a payment that later bounces is worse than a late one.
  // handleAsyncPaymentResolved sends it once the debit settles.
  if (input.sendReceipt === false) {
    console.log(
      `Donation ${inserted.id} recorded as pending (ACH); receipt deferred until settlement`
    );
    return;
  }

  // Receipt goes out after the response. Stripe wants a fast 2xx, and rendering plus
  // sending an email is the slow part. The donation is already durably recorded by this
  // point, so a failure here costs a receipt, not the gift record, and receipt_sent_at
  // stays null so it is visible and re-sendable.
  after(async () => {
    try {
      await sendReceipt({ ...input, email, donationId: inserted.id });
    } catch (err) {
      console.error(`Failed to send donation receipt for ${inserted.id}:`, err);
    }
  });
}

async function upsertContact(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  name: string | null
): Promise<string> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, tags")
    .eq("email", email)
    .maybeSingle();

  const [first, ...rest] = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const last = rest.join(" ") || null;

  if (existing) {
    // Only fill blanks on the name. An existing contact's name came from a form they filled
    // in themselves; the cardholder name on a payment method is often a spouse, an initial,
    // or an employer, and should not overwrite good data.
    const patch: Record<string, unknown> = {};
    if (!existing.first_name && first) patch.first_name = first;
    if (!existing.last_name && last) patch.last_name = last;

    // The tag is different: it is additive fact, not a competing value. Most donors already
    // exist as contacts from a form or the 2023 import, so tagging only brand-new rows
    // would leave the majority of real donors untagged and make "email our donors"
    // impossible to segment. Appended rather than assigned so existing tags survive.
    const tags: string[] = Array.isArray(existing.tags) ? existing.tags : [];
    if (!tags.includes("donor")) patch.tags = [...tags, "donor"];

    // `source` is deliberately left alone. It records where the contact first came from,
    // and overwriting it with "donation" would destroy attribution for someone who
    // originally arrived through a camp waitlist or the contact form.

    if (Object.keys(patch).length > 0) {
      await supabase.from("contacts").update(patch).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("contacts")
    .insert({
      email,
      first_name: first ?? null,
      last_name: last,
      source: "donation",
      tags: ["donor"],
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create contact for donor: ${error?.message}`);
  }
  return created.id;
}

/**
 * Narrowed to only what the receipt needs, rather than the full DonationInput. The ACH
 * settlement path reconstructs its arguments from the database row, not from a checkout
 * session, and has no name, campaign, or customer id to hand over.
 */
type ReceiptInput = {
  email: string;
  amountCents: number;
  feeCoveredCents: number;
  recurring: boolean;
  paymentIntentId: string | null;
  donationId: string;
};

async function sendReceipt(input: ReceiptInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set; donation receipt not sent");
    return;
  }

  const supabase = createServiceClient();
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { data: contact } = await supabase
    .from("contacts")
    .select("first_name")
    .eq("email", input.email)
    .maybeSingle();

  const html = await renderDonationReceipt({
    firstName: contact?.first_name ?? undefined,
    amount: formatCents(input.amountCents),
    date: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    recurring: input.recurring,
    feeCovered:
      input.feeCoveredCents > 0 ? formatCents(input.feeCoveredCents) : null,
    receiptNumber: input.paymentIntentId,
  });

  await resend.emails.send({
    from: NOTIFICATIONS_FROM,
    to: input.email,
    // Replies to the From address are discarded: send.opportunityoutdoors.org has no MX
    // records. Point them at the monitored inbox instead.
    replyTo: REPLY_TO,
    subject: input.recurring
      ? `Your monthly donation receipt: ${formatCents(input.amountCents)}`
      : `Your donation receipt: ${formatCents(input.amountCents)}`,
    html,
  });

  await supabase
    .from("donations")
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq("id", input.donationId);
}

/** Stripe fields are `string | {id} | null` depending on expansion. Normalise to the id. */
function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/**
 * Where the subscription id lives on an invoice depends on the API version the webhook
 * endpoint renders at. Stripe moved it from `invoice.subscription` to
 * `invoice.parent.subscription_details.subscription` in the 2025-03-31.basil release.
 * Both are checked because the endpoint's version is configured in the dashboard, not
 * here, and a mismatch would silently drop every recurring gift.
 */
function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const modern = invoice.parent?.subscription_details?.subscription;
  if (modern) return idOf(modern);

  const legacy = (invoice as unknown as { subscription?: string | { id: string } })
    .subscription;
  return idOf(legacy);
}

/**
 * Same story for the payment intent: `invoice.payment_intent` was replaced by the
 * `invoice.payments` collection in basil. Falls back to the invoice id so the idempotency
 * key is never null, which would let the unique index wave duplicates through.
 */
function invoicePaymentIntentId(invoice: Stripe.Invoice): string {
  const payments = (
    invoice as unknown as {
      payments?: { data?: Array<{ payment?: { payment_intent?: string | { id: string } } }> };
    }
  ).payments;
  const fromCollection = payments?.data?.[0]?.payment?.payment_intent;
  if (fromCollection) return idOf(fromCollection)!;

  const legacy = (invoice as unknown as { payment_intent?: string | { id: string } })
    .payment_intent;
  const legacyId = idOf(legacy);
  if (legacyId) return legacyId;

  return `invoice_${invoice.id}`;
}
