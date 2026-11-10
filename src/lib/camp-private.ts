import type { SupabaseClient } from "@supabase/supabase-js";
import { syncPerkCodes, type SanityPerkCodes } from "@/lib/perk-codes";

// A camp's private details live in their own Sanity document, "private.<event id>", which
// anonymous reads cannot see (src/sanity/schemas/campPrivate.ts, decided 2026-11-10).

/**
 * GROQ fields that pull the private details into an event projection. Use inside a query on
 * `_type == "event"`. The event's own old fields are the fallback, so nothing goes missing
 * while the data moves.
 */
export const CAMP_PRIVATE_FIELDS = `
  "campLocations": coalesce(*[_id == "private." + ^._id][0].campLocations, campLocations),
  "welcomePacketNote": coalesce(*[_id == "private." + ^._id][0].welcomePacketNote, welcomePacketNote),
  "perkCodes": coalesce(*[_id == "private." + ^._id][0].perkCodes, perkCodes)`;

export type CampPrivate = {
  campLocations: unknown[] | null;
  welcomePacketNote: string | null;
  perkCodes: SanityPerkCodes;
};

/**
 * Reads the camp's private details from Sanity now and writes them to the Supabase event, so
 * an edit published a minute ago counts even if the webhook has not run. If Sanity cannot be
 * read, what Supabase already holds stays as it is.
 */
export async function refreshCampPrivate(supabase: SupabaseClient, eventId: string): Promise<void> {
  try {
    const { data: row } = await supabase.from("events").select("sanity_id").eq("id", eventId).single();
    if (!row?.sanity_id) return;
    const { client } = await import("@/lib/sanity");
    const fresh = await client.fetch<CampPrivate | null>(
      `*[_type == "event" && _id == $id][0]{ ${CAMP_PRIVATE_FIELDS} }`,
      { id: row.sanity_id },
      { useCdn: false }
    );
    if (!fresh) return;
    await supabase
      .from("events")
      .update({
        camp_locations: fresh.campLocations || [],
        welcome_packet_note: fresh.welcomePacketNote?.trim() || null,
      })
      .eq("id", eventId);
    await syncPerkCodes(supabase, eventId, fresh.perkCodes ?? null);
  } catch (err) {
    console.error("Could not refresh camp private details from Sanity:", err);
  }
}
