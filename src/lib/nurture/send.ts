import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MARKETING_FROM } from "@/lib/email/from";
import { renderNurtureEmail } from "@/emails";
import {
  stepsFor,
  finalStepKey,
  type NurtureStep,
  type NurtureTrack,
} from "./sequences";

// Shared send path for both entry points: the inline day-0 send in submit-form and the
// daily cron that handles the follow-up. Keeping one function means the idempotency rule
// and the unsubscribe URL are defined once.

/* eslint-disable @typescript-eslint/no-explicit-any */
type DB = SupabaseClient<any, any, any>;

export function newOptOutToken(): string {
  return randomBytes(24).toString("hex");
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";
}

/**
 * Send one step and record it.
 *
 * Claims the step in nurture_sends BEFORE sending. The UNIQUE(enrollment_id, step_key)
 * constraint means a concurrent or repeated run loses the race and returns false without
 * sending, so nobody gets the same step twice. If the send then fails, the claim is
 * released so a later run retries it.
 *
 * Returns true when an email actually went out.
 */
export async function sendNurtureStep(params: {
  supabase: DB;
  enrollmentId: string;
  optOutToken: string;
  step: NurtureStep;
  email: string;
  firstName?: string | null;
}): Promise<boolean> {
  const { supabase, enrollmentId, optOutToken, step, email, firstName } = params;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Nurture: RESEND_API_KEY not set, skipping send");
    return false;
  }

  const { body } = step;

  // Claim the step first. A duplicate key here is the normal, expected outcome of a
  // re-run and is not an error worth logging loudly.
  const { data: claim, error: claimError } = await supabase
    .from("nurture_sends")
    .insert({ enrollment_id: enrollmentId, step_key: step.key })
    .select("id")
    .maybeSingle();

  if (claimError || !claim) return false;

  try {
    const html = await renderNurtureEmail({
      firstName: firstName || undefined,
      preview: body.subject,
      heading: body.heading,
      paragraphs: body.paragraphs,
      cta: body.cta
        ? { label: body.cta.label, url: `${baseUrl()}${body.cta.path}` }
        : undefined,
      unsubscribeUrl: `${baseUrl()}/nurture/unsubscribe?token=${optOutToken}`,
    });

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: MARKETING_FROM,
      to: email,
      subject: body.subject,
      html,
    });

    if (error) throw error;

    if (data?.id) {
      await supabase
        .from("nurture_sends")
        .update({ resend_message_id: data.id })
        .eq("id", claim.id);
    }

    return true;
  } catch (err) {
    console.error(`Nurture: failed to send ${step.key} to ${email}:`, err);
    // Release the claim so the next run can retry this step.
    await supabase.from("nurture_sends").delete().eq("id", claim.id);
    return false;
  }
}

/**
 * Enroll an applicant and send their day-0 email immediately.
 *
 * Re-applying is a no-op: the UNIQUE(contact_id, track) constraint means an existing
 * enrollment is left on its original schedule rather than restarted. Best effort
 * throughout, since this runs inside after() and must never fail the form submission.
 */
export async function enrollAndSendFirstStep(params: {
  supabase: DB;
  contactId: string;
  track: NurtureTrack;
  email: string;
  firstName?: string | null;
}): Promise<void> {
  const { supabase, contactId, track, email, firstName } = params;

  const { data: enrollment, error } = await supabase
    .from("nurture_enrollments")
    .upsert(
      {
        contact_id: contactId,
        track,
        status: "active",
        opt_out_token: newOptOutToken(),
      },
      { onConflict: "contact_id,track", ignoreDuplicates: true }
    )
    .select("id, opt_out_token")
    .maybeSingle();

  if (error) {
    console.error("Nurture: enrollment failed:", error);
    return;
  }

  // No row returned means an enrollment already existed and was ignored. Leave it alone;
  // re-applying should not replay the sequence.
  if (!enrollment) return;

  const first = stepsFor(track)[0];

  const sent = await sendNurtureStep({
    supabase,
    enrollmentId: enrollment.id,
    optOutToken: enrollment.opt_out_token,
    step: first,
    email,
    firstName,
  });

  // A one-step track would otherwise sit "active" forever.
  if (sent && first.key === finalStepKey(track)) {
    await supabase
      .from("nurture_enrollments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", enrollment.id);
  }
}
