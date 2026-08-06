import { getStripe } from "./client";
import { computeCampCharge, type FeeLine } from "./camp-fees";
import { evaluateEligibility } from "@/lib/background-check/eligibility";
import { createServiceClient } from "@/lib/supabase/server";

// Creates a Stripe Checkout Session for a camp registration.
//
// Shared by two callers that must charge identically: the end of the registration form,
// and the resume link for anyone who abandoned checkout. Duplicating the pricing between
// them is how the two drift and someone gets charged the wrong amount on their second
// attempt.
//
// Everything is loaded from the database by registration id. Nothing about the price comes
// from the request, so a hand-crafted call cannot set its own amount.

export type CampCheckoutResult =
  | { kind: "free" }
  | { kind: "already_paid" }
  | { kind: "checkout"; url: string; totalCents: number; lines: FeeLine[] };

export async function createCampCheckoutSession(opts: {
  registrationId: string;
  origin: string;
}): Promise<CampCheckoutResult> {
  const supabase = createServiceClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select(
      "id, role, token, payment_status, event_id, contacts(email, first_name, last_name, tshirt_size, date_of_birth, background_check_status, background_check_expires_at), events(id, title, slug, registration_fee)"
    )
    .eq("id", opts.registrationId)
    .single();

  if (!reg) throw new Error(`Registration ${opts.registrationId} not found`);
  if (reg.payment_status === "paid") return { kind: "already_paid" };

  const contact = one(reg.contacts);
  const event = one(reg.events);
  if (!event) throw new Error(`Registration ${opts.registrationId} has no event`);

  // A guardian registering a minor pays for both in one transaction. Looked up rather than
  // passed in, so the resume link charges the same total as the original attempt even if
  // the minor was added in between.
  const { data: minor } = await supabase
    .from("registrations")
    .select("id, contacts(first_name)")
    .eq("guardian_registration_id", reg.id)
    .maybeSingle();

  const minorName = minor ? (one(minor.contacts)?.first_name ?? "Your minor") : null;

  // Derived from the database here, never from the request. The form shows the same number
  // by running the same function, but a tampered client must not be able to zero out a
  // background check it does not want to pay for.
  const eligibility = evaluateEligibility({
    dateOfBirth: contact?.date_of_birth ?? null,
    status: contact?.background_check_status ?? "none",
    expiresAt: contact?.background_check_expires_at ?? null,
  });

  const charge = computeCampCharge({
    role: reg.role,
    registrationFee: event.registration_fee,
    // For mentors the shirt is opt-in, and having picked a size IS the opt-in. The form
    // offers "No thanks" as the empty value for exactly this reason.
    wantsTshirt: Boolean(contact?.tshirt_size),
    minorName,
    backgroundCheckCents: eligibility.feeCents,
  });

  if (charge.totalCents === 0) return { kind: "free" };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    // One Stripe line per fee line, so the receipt and the dashboard show "Registration
    // fee" and "Ava's registration" separately rather than one opaque total. Reconciling a
    // family's payment against two registrations is otherwise guesswork.
    line_items: charge.lines.map((line) => ({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: line.cents,
        product_data: {
          name: line.label,
          description: event.title,
        },
      },
    })),

    // Pre-filled so the payer is not asked to retype what they just gave us, and so the
    // Stripe customer matches the contact record.
    customer_email: contact?.email ?? undefined,

    success_url: `${opts.origin}/events/${event.slug}/register/paid?session_id={CHECKOUT_SESSION_ID}`,

    // The cancel path carries the registration token so the "Finish Paying" button on the
    // return page can start a fresh session. Stripe Checkout sessions expire, so the
    // abandoned URL cannot simply be reopened. Same capability token the registration form
    // already travels with, and it is the only thing that authorizes the retry.
    cancel_url: `${opts.origin}/events/${event.slug}/register/paid?canceled=1&token=${encodeURIComponent(reg.token ?? "")}`,

    // `kind` is what stops the webhook booking this as a donation. Both flows land on
    // checkout.session.completed in mode=payment and are otherwise indistinguishable.
    metadata: {
      kind: "camp_registration",
      registration_id: reg.id,
      event_id: event.id,
      minor_registration_id: minor?.id ?? "",
    },
  });

  if (!session.url) throw new Error("Stripe returned a session with no URL");

  return {
    kind: "checkout",
    url: session.url,
    totalCents: charge.totalCents,
    lines: charge.lines,
  };
}

/**
 * Supabase types an embedded single relation as `T | T[]` depending on how it infers the
 * join. Every call site here expects one row.
 */
function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}
