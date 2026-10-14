import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { confirmationRequired } from "./camp-pipeline";

// Email confirmation for camp registrants. A person is not approved for camp until they click
// a link sent to their address, because a typo like "hotamil.com" passes every format check
// and then silently receives nothing. See migration 035.

const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";

/**
 * The confirm link for this contact, creating its token on first use. Null when the address
 * is already confirmed, so callers can leave the button out.
 */
export async function confirmationUrl(
  supabase: SupabaseClient,
  contactId: string
): Promise<string | null> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("email_confirmed_at, email_confirm_token")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact || contact.email_confirmed_at) return null;

  let token = contact.email_confirm_token as string | null;
  if (!token) {
    token = randomBytes(24).toString("hex");
    const { error } = await supabase
      .from("contacts")
      .update({ email_confirm_token: token })
      .eq("id", contactId)
      .is("email_confirm_token", null);
    if (error) throw new Error(`Could not store confirm token: ${error.message}`);
    // A concurrent caller may have won; read back whichever token stuck.
    const { data: again } = await supabase
      .from("contacts")
      .select("email_confirm_token")
      .eq("id", contactId)
      .single();
    token = again?.email_confirm_token ?? token;
  }
  return `${siteBase()}/api/confirm-email?token=${token}`;
}

type Row = {
  id: string;
  created_at: string | null;
  guardian_registration_id: string | null;
  contacts: { first_name: string | null; last_name: string | null; email_confirmed_at: string | null } | null;
};

/**
 * Names of the people among these registrations whose email is not confirmed, for an
 * approval refusal. A minor has no email of their own, so their guardian's is the one that
 * must be confirmed.
 */
export async function unconfirmedNames(
  supabase: SupabaseClient,
  registrationIds: string[]
): Promise<string[]> {
  if (!registrationIds.length) return [];
  const select = "id, created_at, guardian_registration_id, contacts(first_name, last_name, email_confirmed_at)";
  const { data: regs } = await supabase.from("registrations").select(select).in("id", registrationIds);
  const rows = (regs ?? []) as unknown as Row[];

  const guardianIds = rows.map((r) => r.guardian_registration_id).filter((x): x is string => Boolean(x));
  const { data: guardians } = guardianIds.length
    ? await supabase.from("registrations").select(select).in("id", guardianIds)
    : { data: [] };
  const byId = new Map(((guardians ?? []) as unknown as Row[]).map((g) => [g.id, g]));

  const names = new Set<string>();
  for (const r of rows) {
    const responsible = r.guardian_registration_id ? byId.get(r.guardian_registration_id) : r;
    if (!confirmationRequired(responsible?.created_at)) continue;
    const c = responsible?.contacts;
    if (!c?.email_confirmed_at) {
      names.add([c?.first_name, c?.last_name].filter(Boolean).join(" ") || "Unknown");
    }
  }
  return [...names];
}

export function unconfirmedRefusal(names: string[]): string {
  return (
    `Email not confirmed: ${names.join(", ")}. ` +
    "They must click the confirm link in their waitlist email before they can be approved."
  );
}
