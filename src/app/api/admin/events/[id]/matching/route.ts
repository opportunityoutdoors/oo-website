import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET: Fetch matching state for an event
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, role, status, mentor_id, guardian_registration_id, is_board_member, welcome_packet_sent, contacts(id, email, first_name, last_name, interests)")
    .eq("event_id", id)
    .in("status", ["approved", "registered", "attended"])
    .order("created_at", { ascending: true });

  return NextResponse.json(registrations || []);
}

// POST: Manual match or auto-match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();
  const { action } = body;

  if (action === "manual") {
    // Manual match: { action: "manual", mentee_id: string, mentor_id: string | null }
    const { mentee_id, mentor_id } = body;

    const { error } = await supabase
      .from("registrations")
      .update({ mentor_id: mentor_id || null })
      .eq("id", mentee_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If mentee has a guardian link, match the guardian to the same mentor
    const { data: mentee } = await supabase
      .from("registrations")
      .select("guardian_registration_id")
      .eq("id", mentee_id)
      .single();

    if (mentee?.guardian_registration_id) {
      await supabase
        .from("registrations")
        .update({ mentor_id: mentor_id || null })
        .eq("id", mentee.guardian_registration_id);
    }

    // Also check if this mentee IS a guardian — match their child too
    const { data: children } = await supabase
      .from("registrations")
      .select("id")
      .eq("guardian_registration_id", mentee_id)
      .eq("event_id", id);

    if (children?.length) {
      for (const child of children) {
        await supabase
          .from("registrations")
          .update({ mentor_id: mentor_id || null })
          .eq("id", child.id);
      }
    }

    return NextResponse.json({ success: true });
  }

  if (action === "auto") {
    return autoMatch(id, supabase);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInterests(reg: any): string[] {
  const contacts = reg.contacts;
  if (!contacts) return [];
  if (Array.isArray(contacts)) return contacts[0]?.interests || [];
  return contacts.interests || [];
}

async function autoMatch(eventId: string, supabase: ReturnType<typeof createServiceClient>) {
  // Fetch all approved/registered participants for this event
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, role, mentor_id, guardian_registration_id, is_board_member, contacts(interests)")
    .eq("event_id", eventId)
    .in("status", ["approved", "registered", "attended"]);

  if (!registrations?.length) {
    return NextResponse.json({ matched: 0 });
  }

  const mentors = registrations.filter((r) => r.role === "Mentor");
  const mentees = registrations.filter((r) => r.role === "Mentee");

  // Find already-matched mentee IDs (manual matches + guardian pairs)
  const alreadyMatched = new Set(
    mentees.filter((m) => m.mentor_id).map((m) => m.id)
  );

  // Count current assignments per mentor
  const mentorLoad: Record<string, number> = {};
  for (const mentor of mentors) {
    mentorLoad[mentor.id] = mentees.filter((m) => m.mentor_id === mentor.id).length;
  }

  // Check which mentors are "parent-only" (mentoring their own child)
  const parentOnlyMentors = new Set<string>();
  for (const mentor of mentors) {
    const isGuardianOfMentee = mentees.some(
      (m) => m.guardian_registration_id === mentor.id
    );
    if (isGuardianOfMentee) {
      parentOnlyMentors.add(mentor.id);
    }
  }

  // Group guardian-linked mentees (parent + child both mentees)
  const guardianPairs: Array<{ ids: string[]; interests: string[] }> = [];
  const processedGuardians = new Set<string>();

  for (const mentee of mentees) {
    if (alreadyMatched.has(mentee.id)) continue;

    if (mentee.guardian_registration_id) {
      const guardianId = mentee.guardian_registration_id;
      if (processedGuardians.has(guardianId)) continue;
      processedGuardians.add(guardianId);

      // Find all mentees linked to this guardian
      const linked = mentees.filter(
        (m) => m.guardian_registration_id === guardianId || m.id === guardianId
      );
      const linkedIds = linked.map((m) => m.id);

      // Only include if none are already matched
      if (linkedIds.some((lid) => alreadyMatched.has(lid))) continue;

      const allInterests = linked.flatMap(
        (m) => getInterests(m)
      );
      guardianPairs.push({ ids: linkedIds, interests: allInterests });
    }
  }

  // Get solo unmatched mentees (not in a guardian pair)
  const pairedIds = new Set(guardianPairs.flatMap((p) => p.ids));
  const soloMentees = mentees.filter(
    (m) => !alreadyMatched.has(m.id) && !pairedIds.has(m.id)
  );

  // Available mentors (not parent-only, not at max capacity)
  const maxPerMentor = 3;
  const availableMentors = mentors.filter(
    (m) => !parentOnlyMentors.has(m.id) && (mentorLoad[m.id] || 0) < maxPerMentor
  );

  // Calculate ideal distribution
  const totalUnmatched = soloMentees.length + guardianPairs.reduce((sum, p) => sum + p.ids.length, 0);
  const idealPerMentor = availableMentors.length > 0
    ? Math.ceil(totalUnmatched / availableMentors.length)
    : maxPerMentor;
  const targetPerMentor = Math.min(idealPerMentor, maxPerMentor);

  // Score function: shared interests between mentee(s) and mentor
  function scoreMatch(menteeInterests: string[], mentorReg: typeof mentors[0]): number {
    const mentorInterests = getInterests(mentorReg);
    return menteeInterests.filter((i) => mentorInterests.includes(i)).length;
  }

  // Sort available mentors by current load (least loaded first for even distribution)
  const sortedMentors = () =>
    [...availableMentors].sort((a, b) => (mentorLoad[a.id] || 0) - (mentorLoad[b.id] || 0));

  let matchCount = 0;
  const updates: Array<{ id: string; mentor_id: string }> = [];

  // First: match guardian pairs (they take 2+ slots)
  for (const pair of guardianPairs) {
    const ranked = sortedMentors()
      .filter((m) => (mentorLoad[m.id] || 0) + pair.ids.length <= maxPerMentor)
      .map((m) => ({ mentor: m, score: scoreMatch(pair.interests, m) }))
      .sort((a, b) => b.score - a.score);

    if (ranked.length > 0) {
      const bestMentor = ranked[0].mentor;
      for (const menteeId of pair.ids) {
        updates.push({ id: menteeId, mentor_id: bestMentor.id });
      }
      mentorLoad[bestMentor.id] = (mentorLoad[bestMentor.id] || 0) + pair.ids.length;
      matchCount += pair.ids.length;
    }
  }

  // Then: match solo mentees
  for (const mentee of soloMentees) {
    const menteeInterests = getInterests(mentee);

    const ranked = sortedMentors()
      .filter((m) => (mentorLoad[m.id] || 0) < targetPerMentor)
      .map((m) => ({ mentor: m, score: scoreMatch(menteeInterests, m) }))
      .sort((a, b) => b.score - a.score);

    // Fallback: allow up to maxPerMentor if no mentor is under target
    const candidates = ranked.length > 0
      ? ranked
      : sortedMentors()
          .filter((m) => (mentorLoad[m.id] || 0) < maxPerMentor)
          .map((m) => ({ mentor: m, score: scoreMatch(menteeInterests, m) }))
          .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const bestMentor = candidates[0].mentor;
      updates.push({ id: mentee.id, mentor_id: bestMentor.id });
      mentorLoad[bestMentor.id] = (mentorLoad[bestMentor.id] || 0) + 1;
      matchCount++;
    }
  }

  // Apply all updates
  for (const update of updates) {
    await supabase
      .from("registrations")
      .update({ mentor_id: update.mentor_id })
      .eq("id", update.id);
  }

  return NextResponse.json({ matched: matchCount });
}
