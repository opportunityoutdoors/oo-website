import {
  clean,
  cityFromTitle,
  politeFetch,
  type NormalizedEvent,
  type PartnerSource,
} from "../types";

// NC Wildlife Federation.
//
// They run The Events Calendar, which exposes a JSON REST API, but their robots.txt has
// `Disallow: /*?` and the API needs query parameters. The RSS feed at /events/feed/ has no
// query string, sits on an allowed path, and carries the same events, so we use that.
// Their robots.txt also sets Crawl-delay: 5, which one request per week comfortably meets.
//
// Expect mostly habitat workdays and nature walks; roughly one in five is hunting or
// fishing related. Everything lands as 'pending' and gets filtered by a human.
//
// LIMIT: the feed returns WordPress's default 10 items where the API reports 42 upcoming.
// Paging the feed needs a query string, which their robots.txt disallows, so 10 is the
// ceiling. Since events come back soonest-first, that is a rolling window of the next 10,
// which comfortably covers a monthly newsletter. Nothing further out is missed
// permanently; it simply arrives in a later sync as its date approaches.

const FEED_URL = "https://ncwf.org/events/feed/";

function tag(block: string, name: string): string | null {
  const m = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i")
  );
  if (!m) return null;
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

export async function fetchNcwfEvents(): Promise<NormalizedEvent[]> {
  const xml = await politeFetch(FEED_URL);
  const items = xml.split(/<item>/i).slice(1);

  const events: NormalizedEvent[] = [];

  for (const raw of items) {
    const block = raw.split(/<\/item>/i)[0];

    const title = clean(tag(block, "title"));
    const link = clean(tag(block, "link"));
    if (!title || !link) continue;

    // The Events Calendar sets pubDate to the EVENT start for tribe_events posts, not the
    // publish time. Verified against their JSON API: all five overlapping events agreed on
    // the date, and the times matched once converted from Eastern to UTC. ev:startdate is
    // preferred when present, but this feed does not emit it.
    const start = tag(block, "ev:startdate") || tag(block, "pubDate");
    const end = tag(block, "ev:enddate");

    const startsAt = start ? new Date(clean(start)).toISOString() : null;
    const endsAt = end ? new Date(clean(end)).toISOString() : null;

    events.push({
      // The permalink is stable and unique per event.
      sourceUid: link,
      title,
      url: link,
      startsAt,
      endsAt: endsAt && endsAt !== startsAt ? endsAt : null,
      city: cityFromTitle(title),
      state: "NC",
      description: clean(tag(block, "description")).slice(0, 500) || null,
    });
  }

  return events;
}

export const ncwfSource: PartnerSource = {
  key: "ncwf",
  label: "NC Wildlife Federation",
  homepage: "https://ncwf.org/events/",
  fetchEvents: fetchNcwfEvents,
};
