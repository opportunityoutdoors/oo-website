import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";
import {
  computeExpectations,
  computeInterestShift,
  computePostExtras,
  computeScaleStats,
  type ResponseRow,
} from "@/lib/surveys/analytics";

// Survey stats for a single event: the six deltas, interest shift, and post-only extras.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, event_type, date_start, date_end")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, status, role")
    .eq("event_id", id);

  const regs = registrations || [];

  const byStatus: Record<string, number> = {};
  for (const r of regs) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  const attended = byStatus.attended || 0;
  const registered = (byStatus.registered || 0) + attended;

  // Mentors are volunteers, not participants. Their scores start and end near the top, so
  // including them would understate the change the program produced.
  const mentorRegistrationIds = new Set(
    regs.filter((r) => r.role === "Mentor").map((r) => r.id)
  );

  const { data: responses } = await supabase
    .from("survey_responses")
    .select(
      "registration_id, contact_id, event_id, kind, comfort_solo, comfort_finding_spots, comfort_public_land, comfort_taking_others, knowledge_focus, conservation_involvement, interests, answers"
    )
    .eq("event_id", id);

  const rows = (responses || []) as unknown as ResponseRow[];
  const participantRows = rows.filter(
    (r) => !mentorRegistrationIds.has(r.registration_id)
  );

  const preCount = rows.filter((r) => r.kind === "pre").length;
  const postCount = rows.filter((r) => r.kind === "post").length;

  const { data: invites } = await supabase
    .from("survey_invites")
    .select("id, sent_at, completed_at")
    .in(
      "registration_id",
      regs.map((r) => r.id)
    );

  const postSent = (invites || []).filter((i) => i.sent_at).length;

  const now = new Date().toISOString();
  const ended = event.date_end || event.date_start;
  const isPast = Boolean(ended && ended < now);

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      eventType: event.event_type,
    },
    registrations: {
      byStatus,
      total: regs.length,
      registered,
      attended,
      // Of the people who committed, how many actually showed. Null before anyone is
      // registered, since 0/0 is not 0%.
      attendanceRate: registered > 0 ? Math.round((attended / registered) * 100) : null,
      mentors: mentorRegistrationIds.size,
    },
    surveys: {
      preCount,
      postCount,
      postSent,
      postCompletionRate:
        postSent > 0 ? Math.round((postCount / postSent) * 100) : null,
      // Post surveys only go to registrations marked 'attended'. If nobody has been
      // marked after a past event, no surveys were ever sent and the delta will stay
      // empty forever until somebody fixes the attendance.
      needsAttendanceMarking: isPast && attended === 0 && registered > 0,
    },
    // Deltas exclude mentors; raw means include everyone who answered.
    scales: computeScaleStats(rows, mentorRegistrationIds),
    participantScales: computeScaleStats(participantRows),
    interests: computeInterestShift(participantRows),
    postExtras: computePostExtras(rows),
    expectations: computeExpectations(rows),
  });
}
