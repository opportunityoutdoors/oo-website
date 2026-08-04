import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderSurveyInvite } from "@/emails";

// Daily driver for post-event surveys.
//
// Two jobs:
//   send     - 1 day after an event ends, to registrations marked 'attended'
//   reminder - 5 days after that first send, if still not completed
//
// Only 'attended' registrations are targeted, which means somebody has to mark attendance
// in the admin event pipeline after each event or no post surveys go out at all. The
// event Stats tab warns when a past event has zero attended registrations.
//
// Minor participants have no email of their own (camp waitlist creates them with a null
// email), so their survey goes to the guardian with the minor's name in the copy.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEND_AFTER_DAYS = 1;
const REMIND_AFTER_DAYS = 5;

// Six months. R3 evaluation guidance puts the behavioural follow-up at six to twelve
// months after the event; six is the earlier bound and keeps the event recent enough that
// people remember it, while being long enough for a season to have come and gone.
const FOLLOWUP_AFTER_DAYS = 180;

// Events that ended before this date are never surveyed.
//
// Without it, the first production run would mail every historically 'attended'
// registration a survey for a camp that finished months ago. Turkey Camp alone had 13
// people marked attended back in April. They have no pre-survey to compare against, so
// the responses would be unpairable, and the email would be baffling to receive.
//
// Override with SURVEY_CUTOFF_DATE (YYYY-MM-DD) if you ever want to reach further back.
const SURVEY_CUTOFF_DATE = process.env.SURVEY_CUTOFF_DATE || "2026-08-03";

// Resend allows 5 requests/second. 250ms between sends leaves comfortable headroom.
const SEND_SPACING_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Contact = { first_name: string | null; last_name: string | null; email: string | null };

type Registration = {
  id: string;
  contact_id: string;
  event_id: string;
  guardian_registration_id: string | null;
  contacts: Contact | null;
  events: { title: string; date_start: string | null; date_end: string | null } | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";
}

/**
 * Where the invite should actually be delivered. For a minor this is the guardian's
 * address, along with the minor's name so the guardian knows who they are answering for.
 */
async function resolveRecipient(
  supabase: ReturnType<typeof createServiceClient>,
  reg: Registration
): Promise<{ email: string; firstName: string | null; participantName: string | null } | null> {
  const contact = one(reg.contacts);

  if (contact?.email) {
    return {
      email: contact.email,
      firstName: contact.first_name,
      participantName: null,
    };
  }

  if (!reg.guardian_registration_id) return null;

  const { data: guardian } = await supabase
    .from("registrations")
    .select("contacts(first_name, email)")
    .eq("id", reg.guardian_registration_id)
    .single();

  const guardianContact = one(
    (guardian as { contacts: Contact | Contact[] | null } | null)?.contacts ?? null
  );
  if (!guardianContact?.email) return null;

  const participantName = [contact?.first_name, contact?.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    email: guardianContact.email,
    firstName: guardianContact.first_name,
    participantName: participantName || "your participant",
  };
}

async function sendInvite(params: {
  email: string;
  firstName: string | null;
  participantName: string | null;
  eventTitle: string;
  token: string;
  isReminder: boolean;
  isFollowup?: boolean;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const who = params.participantName ? ` for ${params.participantName}` : "";

  const subject = params.isFollowup
    ? params.isReminder
      ? `Still meaning to ask about ${params.eventTitle}`
      : `Six months on from ${params.eventTitle}${who}`
    : params.isReminder
      ? `One more ask: how was ${params.eventTitle}?`
      : `How was ${params.eventTitle}${who}?`;

  try {
    await resend.emails.send({
      from: NOTIFICATIONS_FROM,
      replyTo: REPLY_TO,
      to: params.email,
      subject,
      html: await renderSurveyInvite({
        firstName: params.firstName || undefined,
        eventTitle: params.eventTitle,
        surveyUrl: `${baseUrl()}/survey/${params.token}`,
        participantName: params.participantName,
        isReminder: params.isReminder,
        isFollowup: params.isFollowup,
      }),
    });
    return true;
  } catch (err) {
    console.error(`Survey invite failed for ${params.email}:`, err);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();
  const cutoff = new Date(now - SEND_AFTER_DAYS * MS_PER_DAY).toISOString();

  let sent = 0;
  let reminded = 0;
  let skippedTooOld = 0;
  let skippedNoBaseline = 0;

  // ── Job 1: first send ────────────────────────────────────────────────
  // Attended registrations whose event ended at least a day ago and that have no invite
  // yet. date_end is null for single-day events, so fall back to date_start.
  const { data: attended, error } = await supabase
    .from("registrations")
    .select(
      "id, contact_id, event_id, guardian_registration_id, contacts(first_name, last_name, email), events!inner(title, date_start, date_end)"
    )
    .eq("status", "attended");

  if (error) {
    console.error("Survey cron: failed to load registrations:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const candidates = (attended || []) as unknown as Registration[];

  // Which of these already have a pre response? Fetched once rather than per registration.
  const { data: preRows } = await supabase
    .from("survey_responses")
    .select("registration_id")
    .eq("kind", "pre")
    .in(
      "registration_id",
      candidates.map((r) => r.id)
    );

  const hasBaseline = new Set(
    (preRows || []).map((r) => r.registration_id as string)
  );

  for (const raw of candidates) {
    const event = one(raw.events);
    const ended = event?.date_end || event?.date_start;
    if (!ended || ended > cutoff) continue;

    // Anything that finished before the survey system existed is out of scope.
    if (ended < SURVEY_CUTOFF_DATE) {
      skippedTooOld++;
      continue;
    }

    // No pre response means no delta to compute, which is the whole point of the post
    // survey. Sending anyway would collect numbers with nothing to compare them to.
    if (!hasBaseline.has(raw.id)) {
      skippedNoBaseline++;
      continue;
    }

    // Already invited?
    const { data: existing } = await supabase
      .from("survey_invites")
      .select("id")
      .eq("registration_id", raw.id)
      .eq("kind", "post")
      .maybeSingle();

    if (existing) continue;

    const recipient = await resolveRecipient(supabase, raw);
    if (!recipient) continue;

    const token = randomBytes(24).toString("hex");

    // Create the invite BEFORE sending. If the send then fails, the row is deleted so a
    // later run retries; without this, a crash between send and insert would mail the
    // same person again tomorrow.
    const { data: invite, error: inviteError } = await supabase
      .from("survey_invites")
      .insert({ registration_id: raw.id, kind: "post", token })
      .select("id")
      .single();

    if (inviteError || !invite) continue;

    const ok = await sendInvite({
      ...recipient,
      eventTitle: event?.title || "the event",
      token,
      isReminder: false,
    });

    if (!ok) {
      await supabase.from("survey_invites").delete().eq("id", invite.id);
      continue;
    }

    await supabase
      .from("survey_invites")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", invite.id);

    sent++;
    await sleep(SEND_SPACING_MS);
  }

  // ── Job 2: reminder ──────────────────────────────────────────────────
  const remindCutoff = new Date(
    now - REMIND_AFTER_DAYS * MS_PER_DAY
  ).toISOString();

  const { data: pending } = await supabase
    .from("survey_invites")
    .select(
      "id, token, registration_id, registrations(id, contact_id, event_id, guardian_registration_id, contacts(first_name, last_name, email), events(title, date_start, date_end))"
    )
    .eq("kind", "post")
    .is("completed_at", null)
    .is("reminder_sent_at", null)
    .not("sent_at", "is", null)
    .lte("sent_at", remindCutoff);

  for (const row of (pending || []) as unknown as {
    id: string;
    token: string;
    registrations: Registration | null;
  }[]) {
    const reg = one(row.registrations);
    if (!reg) continue;

    const event = one(reg.events);
    const recipient = await resolveRecipient(supabase, reg);
    if (!recipient) continue;

    const ok = await sendInvite({
      ...recipient,
      eventTitle: event?.title || "the event",
      token: row.token,
      isReminder: true,
    });

    if (!ok) continue;

    // Stamped whether or not they answer, so nobody gets a third email.
    await supabase
      .from("survey_invites")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    reminded++;
    await sleep(SEND_SPACING_MS);
  }

  // ── Job 3: six-month follow-up ───────────────────────────────────────
  // The stage that carries the actual outcome. Goes to the same attended registrations,
  // 180 days after the event, whether or not they answered the post survey: somebody who
  // skipped the immediate survey can still tell us they are still going out.
  const followupCutoff = new Date(
    now - FOLLOWUP_AFTER_DAYS * MS_PER_DAY
  ).toISOString();

  let followupSent = 0;

  for (const raw of candidates) {
    const event = one(raw.events);
    const ended = event?.date_end || event?.date_start;
    if (!ended || ended > followupCutoff) continue;
    if (ended < SURVEY_CUTOFF_DATE) continue;
    if (!hasBaseline.has(raw.id)) continue;

    const { data: existing } = await supabase
      .from("survey_invites")
      .select("id")
      .eq("registration_id", raw.id)
      .eq("kind", "followup")
      .maybeSingle();

    if (existing) continue;

    const recipient = await resolveRecipient(supabase, raw);
    if (!recipient) continue;

    const token = randomBytes(24).toString("hex");

    const { data: invite, error: inviteError } = await supabase
      .from("survey_invites")
      .insert({ registration_id: raw.id, kind: "followup", token })
      .select("id")
      .single();

    if (inviteError || !invite) continue;

    const ok = await sendInvite({
      ...recipient,
      eventTitle: event?.title || "the event",
      token,
      isReminder: false,
      isFollowup: true,
    });

    if (!ok) {
      await supabase.from("survey_invites").delete().eq("id", invite.id);
      continue;
    }

    await supabase
      .from("survey_invites")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", invite.id);

    followupSent++;
    await sleep(SEND_SPACING_MS);
  }

  // Skips are reported rather than silent, so a run that mails nobody is explainable.
  return NextResponse.json({
    message: "Surveys processed",
    sent,
    reminded,
    followupSent,
    skippedTooOld,
    skippedNoBaseline,
    cutoff: SURVEY_CUTOFF_DATE,
  });
}
