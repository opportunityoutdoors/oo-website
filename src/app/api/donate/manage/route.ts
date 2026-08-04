import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";

// Self-serve subscription management for monthly donors, via Stripe's hosted Customer
// Portal. Update the card, change the amount, view past receipts, cancel.
//
// Hosted rather than built here for the same reason checkout is: card details never touch
// this origin, and Stripe keeps the flow current with card network rules we would otherwise
// have to track ourselves.
//
// AUTHENTICATION is the interesting part. Donors have no account and no password, so there
// is nothing to log into. Instead the donor enters their email and we mail them a portal
// link. That means:
//
//   - The link goes to the address on file, so only the mailbox owner can use it.
//   - The response is IDENTICAL whether or not the email matched. Saying "no donor found"
//     would turn this endpoint into an oracle for testing whether a given person donates,
//     which is nobody's business.
//
// Stripe portal links are single use and expire, so forwarding one is not a lasting grant.

export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    email = (await req.json())?.email;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  // Deliberately uniform: this is what the caller sees in every case.
  const generic = NextResponse.json({
    sent: true,
    message:
      "If that email has a recurring donation with us, a management link is on its way.",
  });

  try {
    const supabase = createServiceClient();

    // Most recent recurring gift wins. A donor who set up monthly twice has two Stripe
    // customers; the latest is the one they are most likely asking about, and the portal
    // itself lists every subscription under that customer.
    const { data: donation } = await supabase
      .from("donations")
      .select("stripe_customer_id, contacts!inner(email)")
      .eq("recurring", true)
      .not("stripe_customer_id", "is", null)
      .eq("contacts.email", normalized)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!donation?.stripe_customer_id) return generic;

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

    const session = await getStripe().billingPortal.sessions.create({
      customer: donation.stripe_customer_id,
      return_url: `${origin}/donate`,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not set; portal link not sent");
      return generic;
    }

    const { Resend } = await import("resend");
    const { renderManageDonation } = await import("@/emails");

    const html = await renderManageDonation({ portalUrl: session.url });

    await new Resend(apiKey).emails.send({
      from: NOTIFICATIONS_FROM,
      to: normalized,
      replyTo: REPLY_TO,
      subject: "Manage your monthly donation",
      html,
    });

    return generic;
  } catch (err) {
    // Still generic to the caller. An error here must not become a signal either.
    console.error("Donation portal link failed:", err);
    return generic;
  }
}
