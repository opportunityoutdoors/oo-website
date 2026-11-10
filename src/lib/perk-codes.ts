import type { SupabaseClient } from "@supabase/supabase-js";

// Unique perk codes, one per mentee (migration 043).
//
// OnX gives each camp a batch of single-use promo codes. An admin pastes the batch on the
// camp page (PerkCodesPanel). The welcome packet claims one code from each pool for every
// adult mentee it goes to, and the same code comes back if the packet is sent again.

/** Codes go to mentees. Mentors and Staff get the mentor perks in Sanity instead. */
export function getsPerkCode(reg: { role: string | null; guardian_registration_id?: string | null }) {
  // Linked minors are left out: none were at Deer Camp 2026, and their packet goes to the
  // guardian. Decide whether they get their own code when a camp has one.
  return reg.role === "Mentee" && !reg.guardian_registration_id;
}

/**
 * The codes in a pasted batch, in the order pasted, without repeats.
 * One per line is the expected shape. Commas, semicolons, and spaces also separate.
 */
export function parseCodes(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const code = raw.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

export type PerkPool = { label: string; total: number; assigned: number };

export async function perkPools(supabase: SupabaseClient, eventId: string): Promise<PerkPool[]> {
  const { data, error } = await supabase
    .from("perk_codes")
    .select("label, registration_id")
    .eq("event_id", eventId);
  if (error) throw new Error(`Could not read perk codes: ${error.message}`);
  const pools = new Map<string, PerkPool>();
  for (const row of data ?? []) {
    const pool = pools.get(row.label) ?? { label: row.label, total: 0, assigned: 0 };
    pool.total++;
    if (row.registration_id) pool.assigned++;
    pools.set(row.label, pool);
  }
  return [...pools.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * How many more codes each pool needs so every one of `registrationIds` holds one.
 * Empty when every pool has enough.
 */
export async function perkShortfall(
  supabase: SupabaseClient,
  eventId: string,
  pools: PerkPool[],
  registrationIds: string[]
): Promise<Array<{ label: string; need: number; free: number }>> {
  if (!pools.length || !registrationIds.length) return [];
  const { data, error } = await supabase
    .from("perk_codes")
    .select("label, registration_id")
    .eq("event_id", eventId)
    .in("registration_id", registrationIds);
  if (error) throw new Error(`Could not read perk codes: ${error.message}`);

  const short: Array<{ label: string; need: number; free: number }> = [];
  for (const pool of pools) {
    const holding = new Set((data ?? []).filter((d) => d.label === pool.label).map((d) => d.registration_id));
    const need = registrationIds.filter((id) => !holding.has(id)).length;
    const free = pool.total - pool.assigned;
    if (need > free) short.push({ label: pool.label, need, free });
  }
  return short;
}

/**
 * One code from each pool for this registration, claiming free ones as needed.
 * `missing` names the pools that ran out.
 */
export async function claimPerkCodes(
  supabase: SupabaseClient,
  eventId: string,
  registrationId: string,
  pools: PerkPool[]
): Promise<{ codes: Array<{ label: string; code: string }>; missing: string[] }> {
  const codes: Array<{ label: string; code: string }> = [];
  const missing: string[] = [];
  for (const pool of pools) {
    const { data, error } = await supabase.rpc("claim_perk_code", {
      p_event: eventId,
      p_label: pool.label,
      p_registration: registrationId,
    });
    if (error || !data) {
      if (error) console.error(`Claiming a ${pool.label} code for ${registrationId} failed:`, error);
      missing.push(pool.label);
    } else {
      codes.push({ label: pool.label, code: data as string });
    }
  }
  return { codes, missing };
}
