/**
 * Timezone-safe event date formatting.
 *
 * Sanity stores event dates as date-only values (e.g. "2026-04-17").
 * Supabase persists them as midnight UTC in timestamptz columns.
 * Every formatter MUST pin to timeZone: "UTC" so browsers in Eastern
 * (or any non-UTC) timezone don't shift the date back a day.
 */

const UTC = "UTC" as const;

/** "April 17, 2026", "Apr 17, 2026", etc. */
function fmt(
  iso: string,
  opts: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: UTC });
}

/** UTC-safe getDate / getMonth / getFullYear */
function utc(iso: string) {
  const d = new Date(iso);
  return {
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    year: d.getUTCFullYear(),
  };
}

/**
 * Format an event date range for display.
 *
 * @param dateStart  ISO string for the start date (required for non-null return)
 * @param dateEnd    ISO string for the end date (optional)
 * @param style
 *   - "long"  → "April 17–19, 2026"  (same month) or "April 17, 2026 – May 1, 2026" (cross-month)
 *   - "short" → "Apr 17, 2026 – Apr 19"  (admin lists)
 *   - "compact" → "4/17/26-4/19/26"   (emails)
 */
export function formatEventDateRange(
  dateStart: string | null | undefined,
  dateEnd: string | null | undefined,
  style: "long" | "short" | "compact" = "long"
): string | null {
  if (!dateStart) return null;

  const hasRange = dateEnd && dateEnd !== dateStart;

  if (style === "compact") {
    const opts: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", year: "2-digit" };
    return hasRange
      ? `${fmt(dateStart, opts)}-${fmt(dateEnd, opts)}`
      : fmt(dateStart, opts);
  }

  if (style === "short") {
    const startOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const endOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return hasRange
      ? `${fmt(dateStart, startOpts)} – ${fmt(dateEnd, endOpts)}`
      : fmt(dateStart, startOpts);
  }

  // style === "long"
  const full: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  if (!hasRange) return fmt(dateStart, full);

  const s = utc(dateStart);
  const e = utc(dateEnd);

  if (s.month === e.month && s.year === e.year) {
    // Same month: "April 17–19, 2026"
    const monthStr = fmt(dateStart, { month: "long" });
    return `${monthStr} ${s.day}–${e.day}, ${s.year}`;
  }

  // Different months: "April 17, 2026 – May 1, 2026"
  return `${fmt(dateStart, full)} – ${fmt(dateEnd, full)}`;
}

/**
 * Extract month abbreviation and day number for event-card badges.
 * Returns { month: "APR", day: 17 } — always UTC-safe.
 */
export function eventDateBadge(iso: string): { month: string; day: number } {
  return {
    month: fmt(iso, { month: "short" }).toUpperCase(),
    day: utc(iso).day,
  };
}
