import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendNurtureStep } from "@/lib/nurture/send";
import { finalStepKey, stepsFor, type NurtureTrack } from "@/lib/nurture/sequences";

// Daily driver for the mentee and mentor nurture sequences.
//
// Day 0 is sent inline at signup (see enrollAndSendFirstStep), so this route only ever
// handles day 3 onward. It sends at most ONE step per enrollment per run: if the cron is
// paused for a week, an enrollment with three overdue steps catches up one day at a time
// rather than firing three emails into somebody's inbox at once.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Enrollments created before this date are never sent to.
//
// Enrollment only happens when someone submits the mentee or mentor form, so people who
// applied before the sequence existed have no enrollment row and are already unreachable.
// This guard exists for the case that would break that: a backfill that enrolls historical
// applicants. Those people applied months ago, in some cases already spoke to a board
// member, and a "thanks for applying, here's what happens next" email would land with no
// context at all.
//
// Override with NURTURE_CUTOFF_DATE (YYYY-MM-DD) if you deliberately want to reach back.
const NURTURE_CUTOFF_DATE = process.env.NURTURE_CUTOFF_DATE || "2026-08-03";

// Resend allows 5 requests/second. 250ms between sends leaves comfortable headroom.
const SEND_SPACING_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type EnrollmentRow = {
  id: string;
  track: NurtureTrack;
  enrolled_at: string;
  opt_out_token: string;
  contacts: { email: string | null; first_name: string | null } | null;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: enrollments, error } = await supabase
    .from("nurture_enrollments")
    .select("id, track, enrolled_at, opt_out_token, contacts(email, first_name)")
    .eq("status", "active");

  if (error) {
    console.error("Nurture cron: failed to load enrollments:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!enrollments?.length) {
    return NextResponse.json({ message: "No active enrollments", sent: 0 });
  }

  const now = Date.now();
  let sent = 0;
  let completed = 0;
  let skippedTooOld = 0;

  for (const raw of enrollments as unknown as EnrollmentRow[]) {
    const contact = Array.isArray(raw.contacts) ? raw.contacts[0] : raw.contacts;
    if (!contact?.email) continue;

    // Applied before the sequence existed. See NURTURE_CUTOFF_DATE above.
    if (raw.enrolled_at < NURTURE_CUTOFF_DATE) {
      skippedTooOld++;
      continue;
    }

    const daysSinceEnrolled = Math.floor(
      (now - new Date(raw.enrolled_at).getTime()) / MS_PER_DAY
    );

    // Which steps has this person already received?
    const { data: sends } = await supabase
      .from("nurture_sends")
      .select("step_key")
      .eq("enrollment_id", raw.id);

    const alreadySent = new Set((sends || []).map((s) => s.step_key));

    const steps = stepsFor(raw.track);
    const due = steps.filter(
      (s) => s.dayOffset <= daysSinceEnrolled && !alreadySent.has(s.key)
    );

    if (due.length === 0) {
      // Nothing outstanding. If the final step is already out, close the enrollment so it
      // stops being scanned every day.
      if (alreadySent.has(finalStepKey(raw.track))) {
        await supabase
          .from("nurture_enrollments")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", raw.id);
        completed++;
      }
      continue;
    }

    // Earliest overdue step only.
    const step = due[0];

    const didSend = await sendNurtureStep({
      supabase,
      enrollmentId: raw.id,
      optOutToken: raw.opt_out_token,
      step,
      email: contact.email,
      firstName: contact.first_name,
    });

    if (!didSend) continue;

    sent++;

    if (step.key === finalStepKey(raw.track)) {
      await supabase
        .from("nurture_enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", raw.id);
      completed++;
    }

    await sleep(SEND_SPACING_MS);
  }

  // Skips are reported rather than silent, so a run that mails nobody is explainable.
  return NextResponse.json({
    message: "Nurture processed",
    scanned: enrollments.length,
    sent,
    completed,
    skippedTooOld,
    cutoff: NURTURE_CUTOFF_DATE,
  });
}
