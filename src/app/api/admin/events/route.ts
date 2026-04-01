import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { adminAllEventsQuery } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/server";

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
  meetingSlots: Array<{ date: string; label: string; capacity: number; meetingLink: string }> | null;
}

export async function GET() {
  const supabase = createServiceClient();

  // Fetch from both Sanity and Supabase
  let sanityEvents: SanityEvent[] = [];
  try {
    sanityEvents = await client.fetch(adminAllEventsQuery);
  } catch {
    console.warn("Failed to fetch events from Sanity");
  }

  const { data: supabaseEvents } = await supabase
    .from("events")
    .select("*");

  // Get registration counts per event from Supabase
  const { data: regCounts } = await supabase
    .from("registrations")
    .select("event_id, status");

  const countsByEvent: Record<string, Record<string, number>> = {};
  regCounts?.forEach((r) => {
    if (!countsByEvent[r.event_id]) countsByEvent[r.event_id] = {};
    countsByEvent[r.event_id][r.status] = (countsByEvent[r.event_id][r.status] || 0) + 1;
  });

  // Merge: for each Sanity event, check if it's synced to Supabase
  const supabaseBysSanityId = new Map(
    supabaseEvents?.map((e) => [e.sanity_id, e]) || []
  );

  const events = sanityEvents.map((se) => {
    const dbEvent = supabaseBysSanityId.get(se._id);
    const counts = dbEvent ? countsByEvent[dbEvent.id] || {} : {};

    return {
      sanity_id: se._id,
      supabase_id: dbEvent?.id || null,
      title: se.title,
      slug: se.slug?.current,
      event_type: se.eventType,
      status: se.status,
      date: se.date,
      end_date: se.endDate,
      location: se.location,
      cost: se.cost,
      spots_total: se.spotsTotal,
      spots_remaining: se.spotsRemaining,
      meeting_date: dbEvent?.meeting_date || null,
      meeting_link: dbEvent?.meeting_link || null,
      synced: !!dbEvent,
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

// Sync a Sanity event to Supabase
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { sanity_id, title, event_type, status, date, end_date, location, cost, spots_total } = body;

  if (!sanity_id || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .upsert(
      {
        sanity_id,
        title,
        event_type,
        status: status || "draft",
        date_start: date || null,
        date_end: end_date || null,
        location: location || null,
        cost: cost || null,
        spots_total: spots_total || null,
        spots_remaining: spots_total || null,
      },
      { onConflict: "sanity_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
