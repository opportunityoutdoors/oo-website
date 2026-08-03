// Shared shape for every partner-event source.
//
// Each adapter's only job is to turn whatever the source publishes into NormalizedEvent[].
// Everything downstream (dedupe, the review queue, the newsletter) works off this shape
// and knows nothing about RSS, HTML, or JSON.

export type NormalizedEvent = {
  /** Stable per-source identifier. Paired with `source` to make syncing idempotent. */
  sourceUid: string;
  title: string;
  url?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  cost?: string | null;
  description?: string | null;
};

export type PartnerSource = {
  /** Stored in partner_events.source. Never change once rows exist. */
  key: string;
  /** Shown in the admin queue. */
  label: string;
  /** Where a human can go to check the adapter's work. */
  homepage: string;
  fetchEvents: () => Promise<NormalizedEvent[]>;
};

export const USER_AGENT =
  "OpportunityOutdoorsBot/1.0 (+https://www.opportunityoutdoors.org; nonprofit event aggregation; contact info@opportunityoutdoors.org)";

/** Fetch with a real identifying UA and a timeout, so a hung source cannot stall the cron. */
export async function politeFetch(
  url: string,
  timeoutMs = 15000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Collapse whitespace and decode the handful of entities these sources actually emit. */
export function clean(s: string | null | undefined): string {
  if (!s) return "";
  return (
    s
      .replace(/<[^>]+>/g, " ")
      // Slicing a fixed number of characters out of HTML can leave a half-written tag at
      // the end, like "... NC 28304 <div". Drop it rather than surface it in a title.
      .replace(/<[^>]*$/, "")
      // Named entities first, then ANY numeric entity. These feeds emit numeric forms
      // liberally (&#038; for &, &#8217; for an apostrophe), so handling them one by one
      // means a title eventually shows up with a raw &#nnn; in it.
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&rsquo;|&lsquo;/g, "'")
      .replace(/&ndash;/g, "-")
      .replace(/&mdash;/g, ", ")
      .replace(/&#(\d+);/g, (_, code) => {
        const n = Number(code);
        // Curly quotes and dashes have plain equivalents worth substituting; anything
        // else decodes normally.
        if (n === 8216 || n === 8217) return "'";
        if (n === 8220 || n === 8221) return '"';
        if (n === 8211) return "-";
        if (n === 8212) return ", ";
        return String.fromCharCode(n);
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Several sources put the town in the title, like "Bass Lake Workday (Holly Springs)".
 * Pull it out so the queue and newsletter can show a location even when the source
 * exposes no venue fields.
 */
export function cityFromTitle(title: string): string | null {
  const paren = title.match(/\(([^)]+)\)\s*$/);
  if (paren) {
    const inner = paren[1].trim();
    // Skip parentheticals that are clearly not places.
    if (!/^(online|virtual|canceled|cancelled|sold out|full)$/i.test(inner)) {
      return inner;
    }
  }
  const comma = title.match(/,\s*([A-Za-z .'-]{3,30}),?\s*NC\b/);
  if (comma) return comma[1].trim();
  return null;
}
