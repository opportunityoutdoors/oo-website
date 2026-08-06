import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { describeCheck } from "./display";

// Staff alerts for background checks that need a human.
//
// Two states can stall indefinitely and neither announces itself:
//
//   flagged  records found and confirmed. Nothing happens until someone adjudicates.
//   stalled  paid, invited, never finished. They cannot attend and may not realise.
//
// The admin screen shows both, but only to someone who thinks to open it. Everything that
// went wrong with this feature went wrong quietly, so the alerting is the point rather than
// a nicety.

/** Where alerts go. Same monitored inbox as replies. */
const ALERT_TO = process.env.BACKGROUND_CHECK_ALERT_EMAIL || REPLY_TO;

/**
 * How stale an unfinished invite must be before it is worth an email, and how close the
 * event must be. Both matter: an unfinished check a month out is normal, the same check
 * three days out is a problem.
 */
const STALLED_MIN_DAYS = 2;
const EVENT_WITHIN_DAYS = 14;

/**
 * Finds anyone needing attention and emails staff about them.
 *
 * Called from the daily cron. Returns counts so the cron response says what it did rather
 * than reporting a bare success.
 */
export async function sendBackgroundCheckAlerts(): Promise<{
  flagged: number;
  stalled: number;
  sent: number;
}> {
  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from("registrations")
    .select(
      "id, payment_status, events(title, date_start), contacts(id, email, first_name, last_name, date_of_birth, background_check_status, background_check_expires_at, background_check_invited_at, background_check_alerted_at)"
    )
    .eq("payment_status", "paid");

  if (!rows?.length) return { flagged: 0, stalled: 0, sent: 0 };

  const flagged: AlertRow[] = [];
  const stalled: AlertRow[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const c = one(r.contacts);
    const ev = one(r.events);
    if (!c?.id || seen.has(c.id)) continue;

    // Only alert on events that have not already happened. A camp last spring with an
    // unfinished check is history, not a task.
    if (ev?.date_start && new Date(ev.date_start) < new Date()) continue;

    const d = describeCheck({
      dateOfBirth: c.date_of_birth,
      status: c.background_check_status,
      expiresAt: c.background_check_expires_at,
      invitedAt: c.background_check_invited_at,
      paid: true,
      eventDate: ev?.date_start ?? null,
    });

    if (!d.needsAttention) continue;

    // Do not re-alert about the same person every single day. One nag, then silence until
    // their state changes, because a daily email about a known problem trains people to
    // ignore the channel.
    if (c.background_check_alerted_at) continue;

    seen.add(c.id);
    const row: AlertRow = {
      contactId: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email,
      email: c.email,
      event: ev?.title ?? null,
      detail: d.detail,
    };

    if (c.background_check_status === "flagged") flagged.push(row);
    else stalled.push(row);
  }

  let sent = 0;
  if (flagged.length) sent += (await send("flagged", flagged)) ? 1 : 0;
  if (stalled.length) sent += (await send("stalled", stalled)) ? 1 : 0;

  // Stamp everyone included, so the next run stays quiet about them. Cleared by whatever
  // changes their status, so a genuinely new problem alerts again.
  const alerted = [...flagged, ...stalled].map((r) => r.contactId);
  if (alerted.length) {
    await supabase
      .from("contacts")
      .update({ background_check_alerted_at: new Date().toISOString() })
      .in("id", alerted);
  }

  return { flagged: flagged.length, stalled: stalled.length, sent };
}

type AlertRow = {
  contactId: string;
  name: string;
  email: string;
  event: string | null;
  detail: string;
};

async function send(kind: "flagged" | "stalled", people: AlertRow[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set; background check alert not sent");
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const { renderBackgroundCheckAlert } = await import("@/emails");
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "https://www.opportunityoutdoors.org";

    const html = await renderBackgroundCheckAlert({
      kind,
      people: people.map(({ name, email, event, detail }) => ({
        name,
        email,
        event,
        detail,
      })),
      adminUrl: `${origin}/admin/events`,
    });

    await new Resend(apiKey).emails.send({
      from: NOTIFICATIONS_FROM,
      to: ALERT_TO,
      replyTo: REPLY_TO,
      subject:
        kind === "flagged"
          ? `Action needed: ${people.length} background check${people.length === 1 ? "" : "s"} to review`
          : `${people.length} paid registrant${people.length === 1 ? "" : "s"} not screened yet`,
      html,
    });

    console.log(`Background check alert sent: ${kind}, ${people.length} person(s)`);
    return true;
  } catch (err) {
    console.error(`Failed to send ${kind} background check alert:`, err);
    return false;
  }
}

function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}
