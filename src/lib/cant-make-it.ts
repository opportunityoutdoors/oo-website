import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { logRegistrationEvent } from "@/lib/registration-log";

// "I Can't Make It", from the registration reminder (lib/registration-reminder.ts).
//
// Asked for by John 2026-10-29: hearing "no" beats hearing nothing. Only someone invited and
// not yet registered can use it. A registered person has paid, so they write to us instead,
// where the refund rules can be explained by a person.
//
// It does what the board's Dropped out column does with "Told us they cannot make it", and
// takes their linked minors with them. Staff get an email so the spot can be offered on.

export const CANT_MAKE_IT = "cannot_make_it";

export type Lookup = {
  id: string;
  status: string;
  exitReason: string | null;
  firstName: string | null;
  eventTitle: string;
  eventSlug: string | null;
  token: string;
};

type One<T> = T | T[] | null;
const one = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function lookupByToken(token: string | null | undefined): Promise<Lookup | null> {
  if (!token) return null;
  const { data } = await createServiceClient()
    .from("registrations")
    .select("id, status, exit_reason, token, contacts(first_name), events(title, slug)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  const contact = one(data.contacts as One<{ first_name: string | null }>);
  const event = one(data.events as One<{ title: string; slug: string | null }>);
  return {
    id: data.id,
    status: data.status,
    exitReason: data.exit_reason,
    firstName: contact?.first_name ?? null,
    eventTitle: event?.title ?? "camp",
    eventSlug: event?.slug ?? null,
    token: data.token,
  };
}

/** Marks an invited person, and their linked minors, as unable to attend. */
export async function markCantMakeIt(
  token: string,
  note: string | null
): Promise<"done" | "already" | "not_invited" | "not_found"> {
  const reg = await lookupByToken(token);
  if (!reg) return "not_found";
  if (reg.status === "withdrawn" && reg.exitReason === CANT_MAKE_IT) return "already";
  if (reg.status !== "approved") return "not_invited";

  const supabase = createServiceClient();
  const { data: minors } = await supabase
    .from("registrations")
    .select("id")
    .eq("guardian_registration_id", reg.id)
    .eq("status", "approved");

  const leaving = [reg.id, ...(minors ?? []).map((m) => m.id)];
  const at = new Date().toISOString();
  let first = true;
  for (const id of leaving) {
    // Guarded on 'approved', so a repeated press or an admin move at the same moment applies once.
    const { data: updated } = await supabase
      .from("registrations")
      .update({ status: "withdrawn", exit_reason: CANT_MAKE_IT, exited_at: at, exited_by: null })
      .eq("id", id)
      .eq("status", "approved")
      .select("id");
    if (!updated?.length) {
      if (id === reg.id) return "already";
      continue;
    }
    await logRegistrationEvent({
      registrationId: id,
      kind: "status_change",
      source: "participant",
      fromStatus: "approved",
      toStatus: "withdrawn",
      exitReason: CANT_MAKE_IT,
      detail: first ? "Pressed I Can't Make It" : "With their guardian",
      note: first ? note : null,
    });
    first = false;
  }

  await alertStaff(reg, note);
  return "done";
}

async function alertStaff(reg: Lookup, note: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const { data } = await createServiceClient()
      .from("registrations")
      .select("contacts(first_name, last_name, email)")
      .eq("id", reg.id)
      .single();
    const c = one(data?.contacts as One<{ first_name: string | null; last_name: string | null; email: string | null }>);
    const name = [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Someone";
    const { Resend } = await import("resend");
    const { error } = await new Resend(apiKey).emails.send({
      from: NOTIFICATIONS_FROM,
      to: REPLY_TO,
      replyTo: c?.email || REPLY_TO,
      subject: `${name} can't make it to ${reg.eventTitle}`,
      text:
        `${name} pressed "I Can't Make It" for ${reg.eventTitle}. The camp board now shows them ` +
        `in Dropped out, "Told us they cannot make it", so their spot can go to someone else.\n\n` +
        (note ? `What they wrote:\n${note}\n\n` : "They left no note.\n\n") +
        `Reply to this email to write to them.`,
    });
    if (error) console.error(`Can't-make-it alert for ${reg.id} failed:`, error);
  } catch (err) {
    console.error(`Can't-make-it alert for ${reg.id} failed:`, err);
  }
}
