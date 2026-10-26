import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { logRegistrationEvent } from "@/lib/registration-log";
import { inviteLinkExpiry, reminderDue } from "./invite-email";
import { checkLinkFor } from "./check-link";

// Reminds a paid registrant to finish their background check, before the link dies.
//
// VolunteerBadge's link expires 7 days after the invite, and their email comes from a name
// the registrant does not know, under a subject about volunteering. So we send our own, with
// the direct link: once from day 3, and once in the link's last 30 hours. An expired link is
// never sent; staff are alerted about that one instead (see display.ts).
//
// Runs from the daily background check cron, after the reconcile, so nobody is reminded
// about a check they finished that morning.

export async function sendBackgroundCheckReminders(): Promise<{
  first: number;
  final: number;
  failed: number;
}> {
  const supabase = createServiceClient();
  const result = { first: 0, final: 0, failed: 0 };

  const { data: rows } = await supabase
    .from("registrations")
    .select(
      "id, token, events(title, date_start), contacts(id, email, first_name, background_check_status, background_check_invited_at, background_check_url, background_check_url_expires_at, background_check_reminders_sent)"
    )
    .eq("payment_status", "paid");

  const seen = new Set<string>();
  for (const r of rows ?? []) {
    const c = one(r.contacts);
    const ev = one(r.events);
    if (!c?.id || !c.email || seen.has(c.id)) continue;
    if (c.background_check_status !== "invited") continue;
    // A camp that has already happened needs no check.
    if (ev?.date_start && new Date(ev.date_start) < new Date()) continue;

    const sent = c.background_check_reminders_sent ?? 0;
    const due = reminderDue({
      invitedAt: c.background_check_invited_at,
      urlExpiresAt: c.background_check_url_expires_at,
      sent,
    });
    if (!due) continue;
    seen.add(c.id);

    const expiry = inviteLinkExpiry(c.background_check_url_expires_at, c.background_check_invited_at);
    const ok = await send({
      email: c.email,
      firstName: c.first_name,
      eventTitle: ev?.title ?? "camp",
      checkUrl: c.background_check_url ? checkLinkFor(r.token, c.background_check_url) : null,
      linkExpires: expiry
        ? expiry.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "America/New_York",
          })
        : null,
      final: due === "final",
    });
    if (!ok) {
      result.failed++;
      continue;
    }

    // Guarded on the count we read, so two overlapping runs cannot both claim one reminder.
    await supabase
      .from("contacts")
      .update({
        background_check_reminders_sent: due === "final" ? 2 : 1,
        background_check_reminded_at: new Date().toISOString(),
      })
      .eq("id", c.id)
      .eq("background_check_reminders_sent", sent);

    await logRegistrationEvent({
      registrationId: r.id,
      kind: "check_reminder",
      source: "system",
      detail: due === "final" ? "Final reminder, link about to expire" : "Day 3 reminder",
    });
    result[due]++;
  }

  return result;
}

async function send(input: {
  email: string;
  firstName: string | null;
  eventTitle: string;
  checkUrl: string | null;
  linkExpires: string | null;
  final: boolean;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set; background check reminder not sent");
    return false;
  }

  const { Resend } = await import("resend");
  const { renderBackgroundCheckReminder } = await import("@/emails");
  const { error } = await new Resend(apiKey).emails.send({
    from: NOTIFICATIONS_FROM,
    to: input.email,
    replyTo: REPLY_TO,
    subject: input.final
      ? `Your background check link expires soon: ${input.eventTitle}`
      : `Reminder: finish your background check for ${input.eventTitle}`,
    html: await renderBackgroundCheckReminder({
      firstName: input.firstName ?? undefined,
      eventTitle: input.eventTitle,
      checkUrl: input.checkUrl,
      linkExpires: input.linkExpires,
      final: input.final,
    }),
  });

  if (error) {
    console.error(`Background check reminder to ${input.email} failed:`, error);
    return false;
  }
  return true;
}

function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}
