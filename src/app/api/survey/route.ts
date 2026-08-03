import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  toResponseRow,
  validateSurveyAnswers,
  type SurveyAnswers,
} from "@/lib/surveys/questions";

// Post-event survey. The token is the entire authorization check, matching the existing
// meeting-change pattern: service client, no session, and every handler re-validates
// independently rather than trusting a prior GET.

type InviteRow = {
  id: string;
  kind: "pre" | "post";
  completed_at: string | null;
  registration_id: string;
  registrations: {
    id: string;
    contact_id: string;
    event_id: string;
    contacts: { first_name: string | null; last_name: string | null } | null;
    events: { title: string; event_type: string } | null;
  } | null;
};

async function loadInvite(token: string) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("survey_invites")
    .select(
      "id, kind, completed_at, registration_id, registrations(id, contact_id, event_id, contacts(first_name, last_name), events(title, event_type))"
    )
    .eq("token", token)
    .single();

  if (!data) return null;

  const row = data as unknown as InviteRow;
  const registration = Array.isArray(row.registrations)
    ? row.registrations[0]
    : row.registrations;

  return { invite: row, registration };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const found = await loadInvite(token);
  if (!found?.registration) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const { invite, registration } = found;
  const contact = Array.isArray(registration.contacts)
    ? registration.contacts[0]
    : registration.contacts;
  const event = Array.isArray(registration.events)
    ? registration.events[0]
    : registration.events;

  return NextResponse.json({
    kind: invite.kind,
    completed: Boolean(invite.completed_at),
    eventTitle: event?.title || "the event",
    // Drives the same hunting/fishing/outdoors wording the person saw at registration, so
    // the pre and post pair always asks the identical question.
    eventKind: event?.event_type || "community",
    firstName: contact?.first_name || null,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Re-validate independently. The GET above is only for rendering; it is never treated
  // as having authorized this write.
  const found = await loadInvite(token);
  if (!found?.registration) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const { invite, registration } = found;

  if (invite.completed_at) {
    return NextResponse.json({ error: "already_completed" }, { status: 409 });
  }

  const postEvent = Array.isArray(registration.events)
    ? registration.events[0]
    : registration.events;

  const problem = validateSurveyAnswers(
    invite.kind,
    body?.answers,
    postEvent?.event_type || "community"
  );
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("survey_responses").insert({
    invite_id: invite.id,
    registration_id: registration.id,
    contact_id: registration.contact_id,
    event_id: registration.event_id,
    ...toResponseRow(invite.kind, body.answers as SurveyAnswers),
  });

  if (error) {
    // The (registration_id, kind) unique constraint means a double submit lands here
    // rather than creating a second row that would skew the averages.
    console.error("Survey response insert error:", error);
    return NextResponse.json(
      { error: "Could not save your answers" },
      { status: 500 }
    );
  }

  // Marking the invite complete is what closes the link and stops the reminder.
  await supabase
    .from("survey_invites")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
