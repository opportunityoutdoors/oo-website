import type { SupabaseClient } from "@supabase/supabase-js";
import { bhaSource } from "./sources/bha";
import { duSource } from "./sources/du";
import { ncwfSource } from "./sources/ncwf";
import type { PartnerSource } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type DB = SupabaseClient<any, any, any>;

// Automated sources. NCWRC is deliberately absent: its events live only in a licensing
// portal whose robots.txt is `Disallow: /` and which runs bot protection, so there is no
// legitimate machine-readable source. NCWRC events go in through manual entry instead.
export const SOURCES: PartnerSource[] = [ncwfSource, bhaSource, duSource];

export type SyncResult = {
  source: string;
  label: string;
  found: number;
  created: number;
  updated: number;
  ok: boolean;
  error?: string;
};

/**
 * Pull one source and upsert its events.
 *
 * Never overwrites `status`. Once a human approves or rejects an event, a later sync
 * refreshes the details but leaves that decision alone, so a re-run cannot resurrect
 * something already rejected or un-approve something already in a newsletter.
 */
export async function syncSource(
  supabase: DB,
  source: PartnerSource
): Promise<SyncResult> {
  const base = { source: source.key, label: source.label };

  let events;
  try {
    events = await source.fetchEvents();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("partner_event_syncs").insert({
      source: source.key,
      found: 0,
      ok: false,
      error: message.slice(0, 500),
    });
    return { ...base, found: 0, created: 0, updated: 0, ok: false, error: message };
  }

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  const seenUids: string[] = [];

  for (const e of events) {
    seenUids.push(e.sourceUid);

    const { data: existing } = await supabase
      .from("partner_events")
      .select("id, manually_edited")
      .eq("source", source.key)
      .eq("source_uid", e.sourceUid)
      .maybeSingle();

    const content = {
      title: e.title,
      url: e.url ?? null,
      starts_at: e.startsAt ?? null,
      ends_at: e.endsAt ?? null,
      location: e.location ?? null,
      city: e.city ?? null,
      state: e.state ?? "NC",
      cost: e.cost ?? null,
      description: e.description ?? null,
    };

    if (existing) {
      // A hand-edited row keeps its wording. Only the liveness markers are refreshed, so
      // the weekly sync cannot undo somebody's cleanup of a messy source title.
      const patch = existing.manually_edited
        ? { last_seen_at: now, missing_since: null }
        : { ...content, last_seen_at: now, missing_since: null };

      await supabase.from("partner_events").update(patch).eq("id", existing.id);
      updated++;
    } else {
      const { error } = await supabase.from("partner_events").insert({
        source: source.key,
        source_uid: e.sourceUid,
        ...content,
        last_seen_at: now,
      });
      if (!error) created++;
    }
  }

  // Flag anything this source stopped listing. Never delete: an approved event may
  // already be referenced by a sent newsletter, and a cancellation is a human call.
  if (seenUids.length > 0) {
    await supabase
      .from("partner_events")
      .update({ missing_since: now })
      .eq("source", source.key)
      .is("missing_since", null)
      .not("source_uid", "in", `(${seenUids.map((u) => `"${u}"`).join(",")})`);
  }

  await supabase.from("partner_event_syncs").insert({
    source: source.key,
    found: events.length,
    created,
    updated,
    ok: true,
  });

  return { ...base, found: events.length, created, updated, ok: true };
}

/**
 * A source returning zero is indistinguishable from "nothing scheduled" at a glance, and
 * that is exactly how a silently broken scraper looks. Compare against the last run that
 * found anything so the admin queue can flag it.
 */
export async function findStaleSources(supabase: DB): Promise<string[]> {
  const stale: string[] = [];

  for (const source of SOURCES) {
    const { data: runs } = await supabase
      .from("partner_event_syncs")
      .select("found, ok, ran_at")
      .eq("source", source.key)
      .order("ran_at", { ascending: false })
      .limit(5);

    if (!runs || runs.length < 2) continue;

    const latest = runs[0];
    const everFound = runs.some((r) => r.found > 0);
    if (everFound && (latest.found === 0 || !latest.ok)) {
      stale.push(source.key);
    }
  }

  return stale;
}
