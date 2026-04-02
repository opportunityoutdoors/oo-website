import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { adminAllEventsQuery } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/server";

interface MeetingSlot {
  date: string;
  label: string;
  capacity?: number;
  meetingLink: string;
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
  spotsRemaining: number | null;
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

  // Auto-sync all Sanity events to Supabase
  for (const se of sanityEvents) {
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
        spots_remaining: se.spotsRemaining || null,
        meeting_slots: se.meetingSlots || [],
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
