import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderApproval } from "@/emails";

// Approving people for a camp, and the registration invite that goes with it. Shared by the
// bulk Approve in /api/admin/registrations and a drag into Invited on the camp board, so both
// give every person a token, carry linked minors along, and send the same email.
//
// Everything here is awaited and every failure comes back to the caller. Before 2026-10-20
// the bulk approve started the emails without waiting and ignored Resend's errors, so on
// Vercel an invite could stop mid-send and nobody would know who never got their link. The
// board drag sent nothing at all.

type One<T> = T | T[] | null;
const one = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type ApprovalRow = {
  role: string | null;
  token: string | null;
  contacts: One<{ email: string | null; first_name: string | null; last_name: string | null }>;
  events: One<{ title: string; slug: string | null; cost: string | null }>;
};

export type ApprovalResult = {
  /** Every registration now approved: the ones asked for, then their linked minors. */
  approvedIds: string[];
  /** Linked minors approved along with a guardian, with the status each one left. */
  minors: { id: string; fromStatus: string | null }[];
  emailed: number;
  /** Names of people whose invite did not send. Their approval and token still stand. */
  failed: string[];
};

// Resend takes at most 100 emails in one batch request.
const BATCH_LIMIT = 100;

const newToken = () => randomBytes(24).toString("hex");

export async function approveRegistrations(
  supabase: SupabaseClient,
  ids: string[]
): Promise<ApprovalResult> {
  const minors: ApprovalResult["minors"] = [];

  for (const id of ids) {
    await supabase.from("registrations").update({ status: "approved", token: newToken() }).eq("id", id);

    const { data: linked } = await supabase
      .from("registrations")
      .select("id, status")
      .eq("guardian_registration_id", id);

    for (const minor of linked ?? []) {
      await supabase
        .from("registrations")
        .update({ status: "approved", token: newToken() })
        .eq("id", minor.id);
      minors.push({ id: minor.id, fromStatus: minor.status ?? null });
    }
  }

  // The adults only. A minor's invite is the guardian's, and a minor may have no email.
  const { data } = await supabase
    .from("registrations")
    .select("role, token, contacts(email, first_name, last_name), events(title, slug, cost)")
    .in("id", ids);

  const { emailed, failed } = await sendApprovalEmails((data ?? []) as ApprovalRow[]);
  return { approvedIds: [...ids, ...minors.map((m) => m.id)], minors, emailed, failed };
}

export async function sendApprovalEmails(
  registrations: ApprovalRow[]
): Promise<{ emailed: number; failed: string[] }> {
  const failed: string[] = [];
  const people: { name: string; email: string; reg: ApprovalRow }[] = [];

  for (const reg of registrations) {
    const contact = one(reg.contacts);
    const name =
      [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || "Unnamed";
    if (!contact?.email || !reg.token) failed.push(`${name} (no email on file)`);
    else people.push({ name, email: contact.email, reg });
  }
  if (!people.length) return { emailed: 0, failed };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Approval emails not sent: RESEND_API_KEY is not set.");
    return { emailed: 0, failed: [...failed, ...people.map((p) => p.name)] };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  // Production's value ends in a slash, which made every link "//events/...". It worked only
  // because the host redirects it.
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org").replace(/\/+$/, "");

  const emails = await Promise.all(
    people.map(async ({ email, reg }) => {
      const contact = one(reg.contacts);
      const event = one(reg.events);
      const eventTitle = event?.title || "our upcoming event";
      return {
        from: NOTIFICATIONS_FROM,
        replyTo: REPLY_TO,
        to: email,
        subject: `You're In! Complete Your ${eventTitle} Registration`,
        html: await renderApproval({
          firstName: contact?.first_name || "there",
          eventTitle,
          cost: event?.cost ?? null,
          isMentor: reg.role === "Mentor",
          registerUrl: `${baseUrl}/events/${event?.slug || "event"}/register?token=${reg.token}`,
        }),
      };
    })
  );

  // One request per 100 people rather than one per person, which kept a bulk approve inside
  // Resend's per-second rate limit. Permissive, so one bad address fails alone and is named
  // instead of failing everybody in the batch.
  let emailed = 0;
  for (let i = 0; i < emails.length; i += BATCH_LIMIT) {
    const who = people.slice(i, i + BATCH_LIMIT);
    const { data, error } = await resend.batch.send(emails.slice(i, i + BATCH_LIMIT), {
      batchValidation: "permissive",
    });

    if (error || !data) {
      console.error("Approval batch failed:", error);
      failed.push(...who.map((p) => p.name));
      continue;
    }

    const rejected = new Set((data.errors ?? []).map((e) => e.index));
    for (const e of data.errors ?? []) {
      console.error(`Approval email to ${who[e.index]?.email} refused: ${e.message}`);
    }
    who.forEach((p, index) => (rejected.has(index) ? failed.push(p.name) : emailed++));
  }

  return { emailed, failed };
}
