import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET: Validate token and return current meeting selection + available slots
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("id, meeting_date_selected, status, contacts(first_name, email), events(id, title, slug, meeting_slots, date_start)")
    .eq("meeting_change_token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  // Only allow changes while on the waitlist or meeting_rsvp
  if (registration.status !== "waitlist" && registration.status !== "meeting_rsvp") {
    return NextResponse.json({ error: "Meeting changes are no longer available" }, { status: 403 });
  }

  return NextResponse.json(registration);
}

// POST: Update meeting selection
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { token, new_meeting } = body;

  if (!token || !new_meeting) {
    return NextResponse.json({ error: "Missing token or meeting selection" }, { status: 400 });
  }

  const { data: registration } = await supabase
    .from("registrations")
    .select("id, status, guardian_registration_id")
    .eq("meeting_change_token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (registration.status !== "waitlist" && registration.status !== "meeting_rsvp") {
    return NextResponse.json({ error: "Meeting changes are no longer available" }, { status: 403 });
  }

  // Update parent's meeting selection
  await supabase
    .from("registrations")
    .update({ meeting_date_selected: new_meeting })
    .eq("id", registration.id);

  // Also update linked minor's meeting selection
  await supabase
    .from("registrations")
    .update({ meeting_date_selected: new_meeting })
    .eq("guardian_registration_id", registration.id);

  // TODO: When Google Calendar is wired up, remove from old event + add to new event

  return NextResponse.json({ success: true });
}
