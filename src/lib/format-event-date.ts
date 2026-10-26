/**
 * Timezone-safe event date formatting.
 *
 * Sanity stores event dates as date-only values (e.g. "2026-04-17").
 * Supabase persists them as midnight UTC in timestamptz columns.
 * Every formatter MUST pin to timeZone: "UTC" so browsers in Eastern
 * (or any non-UTC) timezone don't shift the date back a day.
 */

const UTC = "UTC" as const;

/**
 * The time zone for every real moment we show: a sign-up, a signature, a payment, a meeting.
 * The camps and the people are in North Carolina. The servers run in UTC, so an unpinned
 * format there put a 9 PM donation on the next day's receipt.
 */
export const EASTERN = "America/New_York" as const;

/** "April 17, 2026", "Apr 17, 2026", etc. */
function fmt(
  iso: string,
  opts: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: UTC });
}

/** A single date-only day (an event date, "waitlist opens"), read in UTC like the rest. */
export function formatEventDay(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return fmt(iso, opts);
}

/**
 * A real moment (created_at, signed_at, now) as an Eastern date. Default "10/26/2026".
 * Pass time options too for a date and time. Never use this for a date-only field.
 */
export function formatEastern(
  value: string | number | Date,
  opts: Intl.DateTimeFormatOptions = {}
): string {
  const shape: Intl.DateTimeFormatOptions =
    Object.keys(opts).length > 0 ? opts : { year: "numeric", month: "numeric", day: "numeric" };
  return new Date(value).toLocaleString("en-US", { ...shape, timeZone: EASTERN });
}

/** The current year in Eastern time, for footers and report defaults. */
export function easternYear(now: Date = new Date()): number {
  return Number(now.toLocaleString("en-US", { year: "numeric", timeZone: EASTERN }));
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

  // Compare calendar days, not raw strings. Sanity stores date-only values so string
  // equality happened to work, but partner events carry real timestamps: a single-day
  // event running 09:00 to 17:00 has a different end string and used to render as the
  // nonsense range "August 22-22, 2026".
  const sameDay = (a: string, b: string) => {
    const x = utc(a);
    const y = utc(b);
    return x.year === y.year && x.month === y.month && x.day === y.day;
  };

  // Kept as the string (or null) rather than a boolean so TypeScript still narrows it to
  // a defined value inside the branches below.
  const rangeEnd: string | null =
    dateEnd && !sameDay(dateStart, dateEnd) ? dateEnd : null;

  if (style === "compact") {
    const opts: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", year: "2-digit" };
    return rangeEnd
      ? `${fmt(dateStart, opts)}-${fmt(rangeEnd, opts)}`
      : fmt(dateStart, opts);
  }

  if (style === "short") {
    const startOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const endOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return rangeEnd
      ? `${fmt(dateStart, startOpts)} – ${fmt(rangeEnd, endOpts)}`
      : fmt(dateStart, startOpts);
  }

  // style === "long"
  const full: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  if (!rangeEnd) return fmt(dateStart, full);

  const s = utc(dateStart);
  const e = utc(rangeEnd);

  if (s.month === e.month && s.year === e.year) {
    // Same month: "April 17–19, 2026"
    const monthStr = fmt(dateStart, { month: "long" });
    return `${monthStr} ${s.day}–${e.day}, ${s.year}`;
  }

  // Different months: "April 17, 2026 – May 1, 2026"
  return `${fmt(dateStart, full)} – ${fmt(rangeEnd, full)}`;
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

/**
 * A pre-camp meeting time, e.g. "Tuesday, October 13, 2026 at 8:00 PM ET".
 *
 * Meeting slots are real datetimes, not date-only values, so the UTC rule above is wrong for
 * them. Pinned to Eastern because the camps and the people are in North Carolina, and because
 * the server sending the email runs in UTC: unpinned, an 8 PM Tuesday meeting went out as
 * "Wednesday at 12:00 AM".
 */
export function formatMeetingTime(iso: string): string {
  const when = new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return `${when} ET`;
}

/**
 * An event's days as an all-day calendar range: { start: "2026-11-20", end: "2026-11-23" }.
 *
 * For a Google Calendar event, which wants date-only values with an exclusive end. Both
 * inputs are the date-only fields stored as midnight UTC, so the day is read in UTC. Sent as
 * exact times instead, Deer Camp (Fri Nov 20 to Sun Nov 22) reached campers as 7 PM Thursday
 * to 7 PM Saturday. With no last day, the event is the first day alone.
 */
export function allDayRange(
  firstDay: string,
  lastDay: string | null
): { start: string; end: string } {
  const day = (iso: string) => new Date(iso).toISOString().slice(0, 10);
  const last = new Date(lastDay ?? firstDay);
  const dayAfter = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate() + 1));
  return { start: day(firstDay), end: day(dayAfter.toISOString()) };
}
