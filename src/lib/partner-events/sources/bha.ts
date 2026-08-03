import {
  clean,
  politeFetch,
  type NormalizedEvent,
  type PartnerSource,
} from "../types";

// Backcountry Hunters & Anglers, North Carolina chapter.
//
// Their DNN event module emits schema.org/Event MICRODATA, not raw markup we have to
// guess at: startDate, endDate, and url arrive as <meta itemprop> tags. That is a far
// more stable contract than CSS classes, so a cosmetic redesign will not break this.
//
// categoryid/41 is the North Carolina chapter, so the source is pre-filtered by URL and
// we never have to infer the state from a title. robots.txt permits /events.
//
// Low volume (about 3 events) but the highest relevance per event of any reachable
// source: public land projects and chapter fishing days.

const NC_CHAPTER_URL =
  "https://www.backcountryhunters.org/events/pageid/eventlistview/categoryid/41";

const EVENT_BLOCK = /itemtype=["']https?:\/\/schema\.org\/Event["']([\s\S]*?)(?=itemtype=["']https?:\/\/schema\.org\/Event["']|$)/gi;

function meta(block: string, prop: string): string | null {
  const m = block.match(
    new RegExp(`<meta[^>]*itemprop=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i")
  );
  return m ? m[1] : null;
}

/** BHA event URLs look like /events/eventid/5157/e/slug. The numeric id is the stable key. */
function eventIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/eventid\/(\d+)/i);
  return m ? m[1] : null;
}

/**
 * Titles carry their location as a trailing "City, NC", but the separator varies:
 * "Fort Bragg Conservation Project, Fort Bragg, NC" uses a comma while
 * "TN & NC BHA Chapters - ... - Jonathon Creek, NC" uses a dash. Take the last
 * "Something, NC" in the string either way.
 */
function locationFromTitle(title: string): string | null {
  // The character class deliberately excludes "-" so a match cannot run backwards across
  // the dash in "... Fishing Day - Jonathon Creek, NC" and swallow half the title.
  const matches = [...title.matchAll(/([A-Za-z][A-Za-z .']{2,30}),\s*NC\b/g)];
  if (matches.length === 0) return null;
  return `${matches[matches.length - 1][1].trim()}, NC`;
}

export async function fetchBhaEvents(): Promise<NormalizedEvent[]> {
  const html = await politeFetch(NC_CHAPTER_URL);
  const events: NormalizedEvent[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(EVENT_BLOCK)) {
    const block = match[1];

    const url = meta(block, "url");
    const id = eventIdFromUrl(url);
    if (!id || seen.has(id)) continue;

    const titleMatch = block.match(
      /<span[^>]*class=['"]eventTitle['"][^>]*>([\s\S]*?)<\/span>/i
    );
    const title = clean(titleMatch?.[1]);
    if (!title) continue;

    seen.add(id);

    const start = meta(block, "startDate");
    const end = meta(block, "endDate");
    const location = locationFromTitle(title);

    events.push({
      sourceUid: id,
      title,
      url,
      // The module emits local Eastern time without a zone; treat it as Eastern.
      startsAt: start ? new Date(`${start}-04:00`).toISOString() : null,
      endsAt: end ? new Date(`${end}-04:00`).toISOString() : null,
      location,
      city: location ? location.replace(/,\s*NC$/i, "").trim() : null,
      state: "NC",
      description: clean(meta(block, "description")) || null,
    });
  }

  return events;
}

export const bhaSource: PartnerSource = {
  key: "bha",
  label: "Backcountry Hunters & Anglers (NC)",
  homepage: NC_CHAPTER_URL,
  fetchEvents: fetchBhaEvents,
};
