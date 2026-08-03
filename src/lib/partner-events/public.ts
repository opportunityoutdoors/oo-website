import { createServiceClient } from "@/lib/supabase/server";

// Approved partner events for the public events page.
//
// This is the only read path the public site uses. Nothing that has not been approved in
// the admin queue can reach it, and the query enforces that rather than relying on the
// caller to remember.

export type PublicPartnerEvent = {
  id: string;
  title: string;
  organizer: string | null;
  url: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  city: string | null;
  cost: string | null;
  description: string | null;
};

export async function getApprovedPartnerEvents(): Promise<PublicPartnerEvent[]> {
  try {
    const supabase = createServiceClient();

    // Compare against the start of today rather than "now" so an event happening this
    // afternoon does not disappear from the page at lunchtime.
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("partner_events")
      .select(
        "id, title, organizer, url, starts_at, ends_at, location, city, cost, description"
      )
      .eq("status", "approved")
      .gte("starts_at", startOfToday.toISOString())
      .order("starts_at", { ascending: true })
      .limit(24);

    if (error) throw error;

    return (data || []).map((e) => ({
      id: e.id,
      title: e.title,
      organizer: e.organizer,
      url: e.url,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      location: e.location,
      city: e.city,
      cost: e.cost,
      description: e.description,
    }));
  } catch (err) {
    // A partner-events outage must not take down the whole events page; the section
    // simply does not render.
    console.error("Could not load partner events:", err);
    return [];
  }
}
