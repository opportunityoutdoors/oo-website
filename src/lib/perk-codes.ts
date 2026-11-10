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

/** The Sanity field (Mentee Perk Codes) as the GROQ queries return it. */
export type SanityPerkCodes = Array<{ label?: string | null; codes?: string | null }> | null | undefined;

/**
 * Makes the event's code pools match what Sanity says (decided 2026-11-10: codes are entered
 * in Sanity like the rest of the camp). New codes are added. A code removed in Sanity is
 * removed here only while nobody holds it, because a held code is in someone's packet.
 *
 * Pass `undefined` when Sanity was not read. Nothing changes then, so a failed fetch can never
 * empty a pool.
 */
export async function syncPerkCodes(
  supabase: SupabaseClient,
  eventId: string,
  fromSanity: SanityPerkCodes
): Promise<{ added: number; removed: number }> {
  if (fromSanity === undefined) return { added: 0, removed: 0 };

  const wanted = new Map<string, Set<string>>();
  for (const pool of fromSanity ?? []) {
    const label = (pool.label ?? "").trim();
    if (!label) continue;
    const set = wanted.get(label) ?? new Set<string>();
    for (const code of parseCodes(pool.codes ?? "")) set.add(code);
    wanted.set(label, set);
  }

  let added = 0;
  const rows = [...wanted].flatMap(([label, codes]) =>
    [...codes].map((code) => ({ event_id: eventId, label, code }))
  );
  if (rows.length) {
    const { data, error } = await supabase
      .from("perk_codes")
      .upsert(rows, { onConflict: "event_id,label,code", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`Could not save perk codes: ${error.message}`);
    added = data?.length ?? 0;
  }

  const { data: free, error: freeError } = await supabase
    .from("perk_codes")
    .select("id, label, code")
    .eq("event_id", eventId)
    .is("registration_id", null);
  if (freeError) throw new Error(`Could not read perk codes: ${freeError.message}`);
  const stale = (free ?? []).filter((r) => !wanted.get(r.label)?.has(r.code)).map((r) => r.id);
  if (stale.length) {
    const { error } = await supabase
      .from("perk_codes")
      .delete()
      .in("id", stale)
      .is("registration_id", null);
    if (error) throw new Error(`Could not remove perk codes: ${error.message}`);
  }
  return { added, removed: stale.length };
}

/**
 * Reads the event's codes from Sanity now and syncs them, so codes published a minute ago
 * count. If Sanity cannot be read, the codes already held here stay as they are.
 */
export async function refreshPerkCodes(
  supabase: SupabaseClient,
  eventId: string,
  sanityId: string | null | undefined
): Promise<void> {
  if (!sanityId) return;
  try {
    const { client } = await import("@/lib/sanity");
    const fresh = await client.fetch<{ perkCodes: SanityPerkCodes } | null>(
      `*[_type == "event" && _id == $id][0]{ perkCodes }`,
      { id: sanityId },
      { useCdn: false }
    );
    if (fresh) await syncPerkCodes(supabase, eventId, fresh.perkCodes ?? null);
  } catch (err) {
    console.error("Could not refresh perk codes from Sanity:", err);
  }
}
