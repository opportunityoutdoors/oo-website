import {
  clean,
  politeFetch,
  type NormalizedEvent,
  type PartnerSource,
} from "../types";

// Ducks Unlimited, North Carolina.
//
// Their event platform publishes no API, no iCal, and no structured data, so this parses
// the HTML cards. robots.txt permits /browseByState.
//
// FILTERED TO GREENWING EVENTS ON PURPOSE. The NC page carries about 20 events, but most
// are fundraising banquets and happy hours that would just clutter the newsletter.
// Greenwing Activity Days are DU's youth programme: kids learning waterfowl skills, which
// is squarely on-mission for Opportunity Outdoors. Widen RELEVANT if that changes.

const NC_URL =
  "https://ducksunlimited.myeventscenter.com/browseByState/NC/1?upcoming=1";
const BASE = "https://ducksunlimited.myeventscenter.com";

const RELEVANT = /greenwing|youth|kids|family day|activity day/i;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Cards render dates as "Sat, Sep 19 at 5:30 PM (EDT)" with NO YEAR. Since the page only
 * lists upcoming events, resolve to the next occurrence of that month/day: this year if it
 * has not passed, otherwise next year.
 */
function parseCardDate(text: string): string | null {
  const m = text.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*([A-Za-z]{3})\s+(\d{1,2})(?:\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i
  );
  if (!m) return null;

  const month = MONTHS[m[1].toLowerCase().slice(0, 3)];
  if (month === undefined) return null;

  const day = Number(m[2]);
  let hour = m[3] ? Number(m[3]) : 9;
  const minute = m[4] ? Number(m[4]) : 0;
  if (m[5]?.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (m[5]?.toUpperCase() === "AM" && hour === 12) hour = 0;

  const now = new Date();
  let year = now.getUTCFullYear();
  // Eastern is UTC-4 in daylight time; close enough for a date-level record.
  let iso = new Date(Date.UTC(year, month, day, hour + 4, minute));
  if (iso.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
    year += 1;
    iso = new Date(Date.UTC(year, month, day, hour + 4, minute));
  }
  return iso.toISOString();
}

export async function fetchDuEvents(): Promise<NormalizedEvent[]> {
  const html = await politeFetch(NC_URL);

  // Split on the card anchor so each chunk holds exactly one event.
  const chunks = html.split(/<a[^>]*class="event-card-contents"[^>]*href="/i).slice(1);

  const events: NormalizedEvent[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const href = chunk.slice(0, chunk.indexOf('"'));
    if (!href.startsWith("/event/")) continue;

    // Trailing numeric id in the slug is DU's stable event id.
    const id = href.match(/-(\d+)$/)?.[1];
    if (!id || seen.has(id)) continue;

    const title = clean(
      chunk.match(/<h4[^>]*class="event-title"[^>]*>([\s\S]*?)<\/h4>/i)?.[1]
    );
    if (!title || !RELEVANT.test(title)) continue;

    seen.add(id);

    // The card body after the title holds the date line, then the place block.
    const body = chunk.slice(chunk.indexOf("</h4>"));
    const startsAt = parseCardDate(clean(body.slice(0, 400)));

    // Place block renders as: venue name, then <div>street,</div><div>City, NC 27326</div>.
    // Cut it at the ticket button, otherwise the slice runs on into the next card's markup.
    const afterPlace = body.split(/place<\/span>/i)[1] || "";
    const placeBlock = afterPlace.split(/class="purchase"/i)[0].slice(0, 500);
    const placeText = clean(placeBlock);

    const cityMatch = placeText.match(/([A-Za-z][A-Za-z .'-]{1,38}),\s*NC\s*\d{5}/);

    events.push({
      sourceUid: id,
      title,
      url: `${BASE}${href}`,
      startsAt,
      city: cityMatch ? cityMatch[1].trim() : null,
      location: placeText.slice(0, 160) || null,
      state: "NC",
    });
  }

  return events;
}

export const duSource: PartnerSource = {
  key: "du",
  label: "Ducks Unlimited NC (Greenwing)",
  homepage: NC_URL,
  fetchEvents: fetchDuEvents,
};
