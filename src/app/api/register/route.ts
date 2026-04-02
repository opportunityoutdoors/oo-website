import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Validate a registration token and return event + contact info
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*, contacts(id, email, first_name, last_name, phone, city_state, tshirt_size), events(id, title, slug, event_type, date_start, date_end, location, cost)")
    .eq("token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (registration.status === "registered" || registration.status === "attended") {
    return NextResponse.json({ error: "already_registered", registration }, { status: 400 });
  }

  if (registration.status !== "approved") {
    return NextResponse.json({ error: "Registration not approved" }, { status: 403 });
  }

  return NextResponse.json(registration);
}

// Complete registration
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { token, tshirt_size, emergency_contact_name, emergency_contact_phone, transportation, dietary_medical, waiver_signed } = body;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (!waiver_signed) {
    return NextResponse.json({ error: "Waiver must be signed" }, { status: 400 });
  }

  // Verify token and status
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, contact_id, status")
    .eq("token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (registration.status !== "approved") {
    return NextResponse.json({ error: "Not eligible for registration" }, { status: 403 });
  }

  // Update registration
  const { error: regError } = await supabase
    .from("registrations")
    .update({
      status: "registered",
      waiver_signed: true,
      payment_status: "pending", // Stripe TBD
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      transportation: transportation || null,
      dietary_medical: dietary_medical || null,
    })
    .eq("id", registration.id);

  if (regError) {
    return NextResponse.json({ error: regError.message }, { status: 500 });
  }

  // Update contact profile with t-shirt size
  if (tshirt_size) {
    await supabase
      .from("contacts")
      .update({ tshirt_size })
      .eq("id", registration.contact_id);
  }

  return NextResponse.json({ success: true });
}
