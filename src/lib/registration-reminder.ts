import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { logRegistrationEvent } from "@/lib/registration-log";
import { addDays, dayOf, daysUntil, formatEventDay } from "@/lib/format-event-date";

// Reminding people approved for a camp who have not registered.
//
// Nothing did this until 2026-10-29, when 7 Deer Camp invitees were a week from the close with
// no nudge since their invite. Two reminders, 7 days and 2 days before registration closes,
// each with the person's own link. Run daily by /api/cron/registration-reminders.

/**
 * With no close date set, registration closes this many days before camp. Two weeks is what
 * shirts and the rest of the prep need (decided 2026-10-29).
 */
export const DEFAULT_CLOSE_DAYS_BEFORE_CAMP = 14;
export const FIRST_DAYS_BEFORE = 7;
export const FINAL_DAYS_BEFORE = 2;
/** An invite this fresh is its own reminder. */
export const MIN_DAYS_SINCE_APPROVAL = 2;

const DAY = 24 * 60 * 60 * 1000;

/** The last day to register: the close date if set, else two weeks before camp starts. */
export function registrationClosesDay(closes: string | null, campStarts: string | null): string | null {
  if (closes) return dayOf(closes);
  if (campStarts) return addDays(dayOf(campStarts), -DEFAULT_CLOSE_DAYS_BEFORE_CAMP);
  return null;
}

/**
 * Which reminder is due, if any.
 *
 * `closes` is the last day to register, a calendar day. Days are counted in Eastern, where the
 * people are. A person who missed the first reminder gets only the final one.
 */
export function registrationReminderDue(input: {
  closes: string;
  approvedAt: string | null;
  sent: number;
  now?: Date;
}): "first" | "final" | null {
  const now = input.now ?? new Date();
  const daysLeft = daysUntil(input.closes, now);
  if (daysLeft < 0) return null;
  if (input.approvedAt && now.getTime() - Date.parse(input.approvedAt) < MIN_DAYS_SINCE_APPROVAL * DAY) {
    return null;
  }
  if (daysLeft <= FINAL_DAYS_BEFORE && input.sent < 2) return "final";
  if (daysLeft <= FIRST_DAYS_BEFORE && input.sent < 1) return "first";
  return null;
}

type One<T> = T | T[] | null;
const one = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type Row = {
  id: string;
  role: string | null;
  token: string | null;
  registration_reminders_sent: number | null;
  contacts: One<{ email: string | null; first_name: string | null }>;
  events: One<{
    title: string;
    slug: string | null;
    cost: string | null;
    status: string | null;
    date_start: string | null;
    registration_closes: string | null;
  }>;
};

/** `eventId` limits a run to one camp, which is how the fixture camp is tested safely. */
export async function sendRegistrationReminders({
  now = new Date(),
  eventId,
}: { now?: Date; eventId?: string } = {}): Promise<{
  first: number;
  final: number;
  failed: string[];
}> {
  const result = { first: 0, final: 0, failed: [] as string[] };
  const supabase = createServiceClient();

  // Minors register through their guardian's form, so only the guardian is reminded.
  let query = supabase
    .from("registrations")
    .select(
      "id, role, token, registration_reminders_sent, contacts(email, first_name), " +
        "events(title, slug, cost, status, date_start, registration_closes)"
    )
    .eq("status", "approved")
    .is("guardian_registration_id", null);
  if (eventId) query = query.eq("event_id", eventId);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return result;

  // When each was approved: the latest move into 'approved' on their timeline.
  const { data: moves } = await supabase
    .from("registration_events")
    .select("registration_id, occurred_at")
    .eq("to_status", "approved")
    .in("registration_id", rows.map((r) => r.id));
  const approvedAt = new Map<string, string>();
  for (const m of moves ?? []) {
    const seen = approvedAt.get(m.registration_id);
    if (!seen || m.occurred_at > seen) approvedAt.set(m.registration_id, m.occurred_at);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set; registration reminders not sent");
    return result;
  }
  const { Resend } = await import("resend");
  const { renderRegistrationReminder } = await import("@/emails");
  const resend = new Resend(apiKey);
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org").replace(/\/+$/, "");

  for (const r of rows) {
    const contact = one(r.contacts);
    const event = one(r.events);
    if (!contact?.email || !r.token || !event) continue;
    if (event.status === "archived" || event.status === "completed") continue;

    const closes = registrationClosesDay(event.registration_closes, event.date_start);
    if (!closes) continue;

    const sent = r.registration_reminders_sent ?? 0;
    const due = registrationReminderDue({ closes, approvedAt: approvedAt.get(r.id) ?? null, sent, now });
    if (!due) continue;

    const closesStr = formatEventDay(closes, { weekday: "long", month: "long", day: "numeric" });
    const { error } = await resend.emails.send({
      from: NOTIFICATIONS_FROM,
      replyTo: REPLY_TO,
      to: contact.email,
      subject:
        due === "final"
          ? `Last reminder: ${event.title} registration closes ${closesStr}`
          : `Reminder: finish your ${event.title} registration by ${closesStr}`,
      html: await renderRegistrationReminder({
        firstName: contact.first_name ?? undefined,
        eventTitle: event.title,
        closes: closesStr,
        cost: event.cost,
        isMentor: r.role === "Mentor",
        registerUrl: `${baseUrl}/events/${event.slug || "event"}/register?token=${r.token}`,
        cantMakeItUrl: `${baseUrl}/events/${event.slug || "event"}/cant-make-it?token=${r.token}`,
        final: due === "final",
      }),
    });
    if (error) {
      console.error(`Registration reminder to ${contact.email} failed:`, error);
      result.failed.push(contact.email);
      continue;
    }

    // Guarded on the count we read, so two overlapping runs cannot both claim one reminder.
    await supabase
      .from("registrations")
      .update({
        registration_reminders_sent: due === "final" ? 2 : 1,
        registration_reminded_at: now.toISOString(),
      })
      .eq("id", r.id)
      .eq("registration_reminders_sent", sent);

    await logRegistrationEvent({
      registrationId: r.id,
      kind: "registration_reminder",
      source: "system",
      detail: due === "final" ? `Final reminder, closes ${closesStr}` : `Reminder, closes ${closesStr}`,
    });
    result[due]++;
  }

  return result;
}
