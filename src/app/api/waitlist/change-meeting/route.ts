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
    .select("id, status, meeting_date_selected, guardian_registration_id, event_id, contacts(email)")
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

  // Move attendee between Google Calendar events
  const contactEmail = Array.isArray(registration.contacts)
    ? registration.contacts[0]?.email
    : (registration.contacts as { email: string } | null)?.email;

  if (contactEmail && registration.event_id) {
    const { data: eventData } = await supabase
      .from("events")
      .select("meeting_slots")
      .eq("id", registration.event_id)
      .single();

    const slots = (eventData?.meeting_slots || []) as Array<{ label: string; calendarEventId?: string }>;
    const oldSlot = slots.find((s) => s.label === registration.meeting_date_selected);
    const newSlot = slots.find((s) => s.label === new_meeting);

    if (oldSlot?.calendarEventId || newSlot?.calendarEventId) {
      const { addAttendee, removeAttendee } = await import("@/lib/google-calendar");
      if (oldSlot?.calendarEventId) {
        removeAttendee(oldSlot.calendarEventId, contactEmail).catch((err) =>
          console.error("Calendar remove attendee error:", err)
        );
      }
      if (newSlot?.calendarEventId) {
        addAttendee(newSlot.calendarEventId, contactEmail).catch((err) =>
          console.error("Calendar add attendee error:", err)
        );
      }
    }
  }

  return NextResponse.json({ success: true });
}
