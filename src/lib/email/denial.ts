import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderDenial } from "@/emails";

// The "we could not include everyone" email, for someone turned away as "Denied at review".
//
// Shared by Turn Away on the camp board and the older bulk status change. Awaited, sent as one
// Resend batch, and every failure named, for the same reason as the approval invite: before
// 2026-10-22 the bulk path started the sends without waiting, and Turn Away sent nothing.
//
// Only for "Denied at review". Someone declined after a background check gets the legally
// required notices through VolunteerBadge, and a "we ran out of room" email would contradict
// them. Someone removed for conduct is a conversation, not a template.

type One<T> = T | T[] | null;
const one = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export type DenialRow = {
  contacts: One<{ email: string | null; first_name: string | null; last_name: string | null }>;
  events: One<{ title: string }>;
};

/** Resend takes at most 100 emails in one batch request. */
const BATCH_LIMIT = 100;

export async function sendDenialEmails(
  rows: DenialRow[]
): Promise<{ emailed: number; failed: string[] }> {
  const failed: string[] = [];
  const people: { name: string; email: string; firstName: string; eventTitle: string }[] = [];

  for (const row of rows) {
    const contact = one(row.contacts);
    const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || "Unnamed";
    if (!contact?.email) {
      failed.push(`${name} (no email on file)`);
      continue;
    }
    people.push({
      name,
      email: contact.email,
      firstName: contact.first_name || "there",
      eventTitle: one(row.events)?.title || "our upcoming event",
    });
  }
  if (!people.length) return { emailed: 0, failed };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Denial emails not sent: RESEND_API_KEY is not set.");
    return { emailed: 0, failed: [...failed, ...people.map((p) => p.name)] };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const emails = await Promise.all(
    people.map(async (p) => ({
      from: NOTIFICATIONS_FROM,
      replyTo: REPLY_TO,
      to: p.email,
      subject: `Update on Your ${p.eventTitle} Registration`,
      html: await renderDenial({
        firstName: p.firstName,
        eventTitle: p.eventTitle,
        instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      }),
    }))
  );

  let emailed = 0;
  for (let i = 0; i < emails.length; i += BATCH_LIMIT) {
    const who = people.slice(i, i + BATCH_LIMIT);
    const { data, error } = await resend.batch.send(emails.slice(i, i + BATCH_LIMIT), {
      batchValidation: "permissive",
    });
    if (error || !data) {
      console.error("Denial batch failed:", error);
      failed.push(...who.map((p) => p.name));
      continue;
    }
    const rejected = new Set((data.errors ?? []).map((e) => e.index));
    for (const e of data.errors ?? []) {
      console.error(`Denial email to ${who[e.index]?.email} refused: ${e.message}`);
    }
    who.forEach((p, index) => (rejected.has(index) ? failed.push(p.name) : emailed++));
  }

  return { emailed, failed };
}
