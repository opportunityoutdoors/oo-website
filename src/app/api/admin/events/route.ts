import { NextResponse } from "next/server";
import { client, writeClient } from "@/lib/sanity";
import { adminAllEventsQuery } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/lib/google-calendar";

interface MeetingSlot {
  _key?: string;
  date: string;
  label: string;
  capacity?: number;
  meetingLink?: string;
  calendarEventId?: string;
}

interface CampLocation {
  label: string;
  latitude: number;
  longitude: number;
  onxLink?: string;
}

interface SanityEvent {
  _id: string;
  title: string;
  slug: { current: string };
  eventType: string;
  status: string;
  date: string;
  endDate: string | null;
  location: string;
  cost: string | null;
  spotsTotal: number | null;
  meetingSlots: MeetingSlot[] | null;
  campLocations: CampLocation[] | null;
  mentorPerks: Array<{ title: string; link?: string }> | null;
  menteePerks: Array<{ title: string; link?: string }> | null;
}

export async function GET() {
  const supabase = createServiceClient();

  // Fetch all events from Sanity
  let sanityEvents: SanityEvent[] = [];
  try {
    sanityEvents = await client.fetch(adminAllEventsQuery);
  } catch {
    console.warn("Failed to fetch events from Sanity");
  }

  // Auto-sync all Sanity events to Supabase + create calendar events
  for (const se of sanityEvents) {
    const slots = se.meetingSlots || [];
    let slotsUpdated = false;

    // Create Google Calendar events for slots without calendarEventId
    if (process.env.GOOGLE_CALENDAR_ID) {
      for (const slot of slots) {
        if (!slot.calendarEventId && slot.date) {
          try {
            const endTime = new Date(new Date(slot.date).getTime() + 60 * 60 * 1000).toISOString();
            const { eventId } = await createCalendarEvent({
              summary: `${se.title} — ${slot.label || "Pre-Camp Meeting"}`,
              description: `Pre-camp virtual meeting for ${se.title}. Attendance is required for all participants.`,
              start: slot.date,
              end: endTime,
              meetLink: slot.meetingLink || undefined,
            });
            slot.calendarEventId = eventId;
            slotsUpdated = true;
          } catch (calErr) {
            console.error("Calendar event creation error:", calErr);
          }
        }
      }

      // Patch Sanity with calendar IDs and Meet links
      if (slotsUpdated) {
        try {
          await writeClient.patch(se._id).set({ meetingSlots: slots }).commit();
        } catch (sanityErr) {
          console.error("Failed to patch Sanity with calendar data:", sanityErr);
        }
      }
    }

    await supabase.from("events").upsert(
      {
        sanity_id: se._id,
        title: se.title,
        slug: se.slug?.current || null,
        event_type: se.eventType,
        status: se.status || "draft",
        date_start: se.date || null,
        date_end: se.endDate || null,
        location: se.location || null,
        cost: se.cost || null,
        spots_total: se.spotsTotal || null,
        meeting_slots: slots,
        camp_locations: se.campLocations || [],
        mentor_perks: se.mentorPerks || [],
        mentee_perks: se.menteePerks || [],
      },
      { onConflict: "sanity_id" }
    );
  }

  // Now fetch merged data from Supabase (which has everything synced)
  const { data: supabaseEvents } = await supabase
    .from("events")
    .select("*")
    .order("date_start", { ascending: false });

  // Get registration counts
  const { data: regCounts } = await supabase
    .from("registrations")
    .select("event_id, status");

  const countsByEvent: Record<string, Record<string, number>> = {};
  regCounts?.forEach((r) => {
    if (!countsByEvent[r.event_id]) countsByEvent[r.event_id] = {};
    countsByEvent[r.event_id][r.status] = (countsByEvent[r.event_id][r.status] || 0) + 1;
  });

  // Build response from Supabase (source of truth for IDs)
  const sanityMap = new Map(sanityEvents.map((se) => [se._id, se]));

  const events = (supabaseEvents || []).map((dbEvent) => {
    const se = sanityMap.get(dbEvent.sanity_id);
    const counts = countsByEvent[dbEvent.id] || {};

    return {
      id: dbEvent.id,
      sanity_id: dbEvent.sanity_id,
      title: dbEvent.title,
      slug: se?.slug?.current || null,
      event_type: dbEvent.event_type,
      status: dbEvent.status,
      date: dbEvent.date_start,
      end_date: dbEvent.date_end,
      location: dbEvent.location,
      cost: dbEvent.cost,
      spots_total: dbEvent.spots_total,
      meeting_slots: dbEvent.meeting_slots || [],
      counts: {
        waitlist: counts.waitlist || 0,
        meeting_rsvp: counts.meeting_rsvp || 0,
        approved: counts.approved || 0,
        denied: counts.denied || 0,
        registered: counts.registered || 0,
        attended: counts.attended || 0,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
      },
    };
  });

  return NextResponse.json(events);
}
