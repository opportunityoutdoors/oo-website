import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createCampCheckoutSession } from "@/lib/stripe/camp-checkout";

// Restarts checkout for a registration that completed but never paid.
//
// This exists because payment does not gate registration: a declined card, a closed tab,
// or a Stripe outage leaves someone fully registered with payment_status 'pending'. Without
// a way back, the only recovery is an admin emailing them a manual payment link.
//
// Authorization is the registration token, the same mechanism the registration form and the
// meeting-change flow already use. The token is long, unguessable, and single purpose. It
// is checked here rather than trusted from a prior request.

export async function POST(req: NextRequest) {
  let token: string | undefined;
  try {
    token = (await req.json())?.token;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, status, payment_status")
    .eq("token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  // Only registered or attended people owe anything. Anyone still on the waitlist has no
  // balance to settle, and letting them pay early would create a payment with no place at
  // the camp behind it.
  if (registration.status !== "registered" && registration.status !== "attended") {
    return NextResponse.json(
      { error: "This registration is not complete yet." },
      { status: 403 }
    );
  }

  if (registration.payment_status === "paid") {
    return NextResponse.json({ alreadyPaid: true });
  }

  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

    const result = await createCampCheckoutSession({
      registrationId: registration.id,
      origin,
    });

    if (result.kind === "already_paid") return NextResponse.json({ alreadyPaid: true });
    if (result.kind === "free") return NextResponse.json({ nothingOwed: true });

    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error("Camp payment resume failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
