import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";
import type { ResponseRow } from "@/lib/surveys/analytics";
import {
  computeImpact,
  computeOutcomes,
  computeOutputs,
  isCamp,
  type ContactRow,
  type EventRow,
  type RegistrationRow,
} from "@/lib/surveys/impact";

// Serves both the dashboard summary and the full impact page. One route because the
// payload is small at this scale and a single source keeps the two screens from drifting
// into reporting different numbers for the same thing.

const RESPONSE_COLUMNS =
  "registration_id, contact_id, event_id, kind, comfort_solo, comfort_finding_spots, comfort_public_land, comfort_taking_others, knowledge_focus, conservation_involvement, interests, answers";

export async function GET(request: NextRequest) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const supabase = createServiceClient();
  const yearParam = request.nextUrl.searchParams.get("year");
  const allTime = yearParam === "all";
  const year = allTime ? null : Number(yearParam) || new Date().getFullYear();

  let eventQuery = supabase
    .from("events")
    .select("id, title, event_type, date_start, date_end")
    .not("status", "in", '("draft","archived")')
    .order("date_start", { ascending: false });

  if (year !== null) {
    eventQuery = eventQuery
      .gte("date_start", `${year}-01-01T00:00:00.000Z`)
      .lt("date_start", `${year + 1}-01-01T00:00:00.000Z`);
  }

  const { data: eventsRaw } = await eventQuery;
  const events = (eventsRaw || []) as EventRow[];
  const eventIds = events.map((e) => e.id);

  // Attendance across all time, for the returning-participant figure. Retention that
  // resets every January is not retention.
  const { data: allRegsRaw } = await supabase
    .from("registrations")
    .select("id, contact_id, event_id, status, role, guardian_registration_id");
  const allRegs = (allRegsRaw || []) as RegistrationRow[];

  const regs = allRegs.filter((r) => eventIds.includes(r.event_id));

  const contactIds = [...new Set(regs.map((r) => r.contact_id))];
  const { data: contactsRaw } = contactIds.length
    ? await supabase.from("contacts").select("id, city").in("id", contactIds)
    : { data: [] };
  const contacts = new Map(
    ((contactsRaw || []) as ContactRow[]).map((c) => [c.id, c])
  );

  const { data: responsesRaw } = eventIds.length
    ? await supabase.from("survey_responses").select(RESPONSE_COLUMNS).in("event_id", eventIds)
    : { data: [] };
  const responses = (responsesRaw || []) as unknown as ResponseRow[];

  // Mentors are volunteers, not participants. Excluding them from every outcome keeps a
  // twenty-year hunter's flat delta from masking a beginner's real gain.
  const mentorRegIds = new Set(
    regs.filter((r) => r.role === "Mentor").map((r) => r.id)
  );

  const outputs = computeOutputs(events, regs, contacts);
  const outcomes = computeOutcomes(responses, mentorRegIds);
  const impact = computeImpact(responses, allRegs, mentorRegIds);

  // Per-event breakdown, most recent first.
  const now = Date.now();
  const byEvent = events.map((e) => {
    const eventRegs = regs.filter((r) => r.event_id === e.id);
    const attended = eventRegs.filter((r) => r.status === "attended");
    const participants = attended.filter((r) => r.role !== "Mentor");
    const eventResponses = responses.filter((r) => r.event_id === e.id);

    const eventOutcomes = computeOutcomes(eventResponses, mentorRegIds);
    const ended = e.date_end || e.date_start;

    return {
      id: e.id,
      title: e.title,
      eventType: e.event_type,
      isCamp: isCamp(e.event_type),
      dateStart: e.date_start,
      hasHappened: Boolean(ended && new Date(ended).getTime() < now),
      registered: eventRegs.filter((r) =>
        ["registered", "attended"].includes(r.status)
      ).length,
      attended: attended.length,
      participants: participants.length,
      mentors: attended.length - participants.length,
      preCount: eventOutcomes.preCount,
      postCount: eventOutcomes.postCount,
      followupCount: eventOutcomes.followupCount,
      confidenceDelta: eventOutcomes.mentorshipMultiplier?.delta ?? null,
      scales: eventOutcomes.scales,
    };
  });

  // Which years have anything, so the picker only offers real options.
  const { data: yearsRaw } = await supabase
    .from("events")
    .select("date_start")
    .not("date_start", "is", null)
    .not("status", "in", '("draft","archived")');

  const years = [
    ...new Set(
      (yearsRaw || [])
        .map((r) => (r.date_start ? new Date(r.date_start).getUTCFullYear() : null))
        .filter((y): y is number => y !== null)
    ),
  ].sort((a, b) => b - a);

  return NextResponse.json({
    scope: allTime ? "all" : year,
    years,
    outputs,
    outcomes,
    impact,
    byEvent,
  });
}
