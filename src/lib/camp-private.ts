import type { SupabaseClient } from "@supabase/supabase-js";
import { perkCodeInfo, syncPerkCodes, type SanityPerkCodes } from "@/lib/perk-codes";

// A camp's private details: locations, the welcome packet note, and mentee perk codes. They
// sit on the Sanity event document, which the free plan leaves publicly readable (docs/SPEC.md,
// Phase 5). A separate private document was tried on 2026-11-10 and reverted the same day.

/** GROQ fields for a camp's private details, inside a query on `_type == "event"`. */
export const CAMP_PRIVATE_FIELDS = `campLocations, welcomePacketNote, perkCodes`;

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
        perk_code_info: perkCodeInfo(fresh.perkCodes),
      })
      .eq("id", eventId);
    await syncPerkCodes(supabase, eventId, fresh.perkCodes ?? null);
  } catch (err) {
    console.error("Could not refresh camp private details from Sanity:", err);
  }
}
