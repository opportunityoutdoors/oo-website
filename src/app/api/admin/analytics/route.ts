import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";
import {
  computeInterestShift,
  computeScaleStats,
  type ResponseRow,
} from "@/lib/surveys/analytics";

// Year-to-date rollup for the admin dashboard. These are the numbers that go in a board
// packet or a grant application, so they need to be readable on screen without an export.

export async function GET(request: NextRequest) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  const from = `${year}-01-01T00:00:00.000Z`;
  const to = `${year + 1}-01-01T00:00:00.000Z`;

  const supabase = createServiceClient();

  // Events that actually happened this year, not everything on the books.
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_type, date_start, date_end, status")
    .gte("date_start", from)
    .lt("date_start", to)
    .not("status", "in", '("draft","archived")')
    .order("date_start", { ascending: true });

  const eventIds = (events || []).map((e) => e.id);

  if (eventIds.length === 0) {
    return NextResponse.json({
      year,
      events: { held: 0, upcoming: 0, list: [] },
      participants: { total: 0, unique: 0, newContacts: 0, returning: 0 },
      scales: [],
      interests: [],
    });
  }

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, contact_id, event_id, status, role")
    .in("event_id", eventIds);

  const regs = registrations || [];
  const attended = regs.filter((r) => r.status === "attended");

  // Unique humans, not registrations: somebody at three events is one participant.
  const uniqueContacts = new Set(attended.map((r) => r.contact_id));

  // Returning = attended more than one event this year. A rough proxy for retention that
  // does not need history beyond the selected year.
  const perContact = new Map<string, number>();
  for (const r of attended) {
    perContact.set(r.contact_id, (perContact.get(r.contact_id) || 0) + 1);
  }
  const returning = [...perContact.values()].filter((n) => n > 1).length;

  const mentorRegistrationIds = new Set(
    regs.filter((r) => r.role === "Mentor").map((r) => r.id)
  );

  const { data: responses } = await supabase
    .from("survey_responses")
    .select(
      "registration_id, contact_id, event_id, kind, comfort_solo, comfort_finding_spots, comfort_public_land, comfort_taking_others, knowledge_focus, conservation_involvement, interests, answers"
    )
    .in("event_id", eventIds);

  const rows = (responses || []) as unknown as ResponseRow[];
  const participantRows = rows.filter(
    (r) => !mentorRegistrationIds.has(r.registration_id)
  );

  const now = new Date().toISOString();
  const held = (events || []).filter((e) => {
    const ended = e.date_end || e.date_start;
    return ended && ended < now;
  });

  const attendedByEvent = new Map<string, number>();
  for (const r of attended) {
    attendedByEvent.set(r.event_id, (attendedByEvent.get(r.event_id) || 0) + 1);
  }

  return NextResponse.json({
    year,
    events: {
      held: held.length,
      upcoming: (events || []).length - held.length,
      list: (events || []).map((e) => ({
        id: e.id,
        title: e.title,
        eventType: e.event_type,
        dateStart: e.date_start,
        attended: attendedByEvent.get(e.id) || 0,
      })),
    },
    participants: {
      // Attendances, so somebody at three events counts three times. This is the "people
      // served" figure grants usually ask for.
      total: attended.length,
      unique: uniqueContacts.size,
      returning,
      mentors: regs.filter((r) => r.role === "Mentor" && r.status === "attended")
        .length,
    },
    scales: computeScaleStats(participantRows),
    interests: computeInterestShift(participantRows).slice(0, 10),
  });
}
