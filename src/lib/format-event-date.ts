/**
 * Dates and times, always in Eastern.
 *
 * Decided 2026-10-29: nothing is displayed or calculated in UTC. The camps and the people are
 * in North Carolina, and the servers run in UTC, so every "today" and every printed time is
 * pinned to Eastern here rather than left to the machine.
 *
 * Two kinds of value come through:
 *
 *   - Date-only values: event days, waitlist and registration open and close dates, birth
 *     dates. Sanity stores "2026-11-20" and Supabase persists it as "2026-11-20T00:00:00+00".
 *     These are calendar days with no time and no zone. dayOf() reads the day as written.
 *     Converting one to Eastern as if it were a moment is what printed November 19.
 *   - Real moments: sign-ups, payments, signatures, meeting times. These are shown in Eastern.
 *
 * Comparisons against today use easternToday(), so a day ends at midnight Eastern.
 */

/**
 * The time zone for every real moment we show: a sign-up, a signature, a payment, a meeting.
 * The servers run in UTC, so an unpinned format there put a 9 PM donation on the next day's
 * receipt.
 */
export const EASTERN = "America/New_York" as const;

const DAY_MS = 24 * 60 * 60 * 1000;

// A date-only value as stored: "2026-11-20", or the same day at midnight with a zero offset.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ]00:00(?::00(?:\.0+)?)?(?:Z|[+-]00(?::?00)?)?$)/;

/** A calendar day's parts in Eastern for a real moment. */
function easternParts(when: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(when);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayString = (p: { year: number; month: number; day: number }) =>
  `${p.year}-${pad(p.month)}-${pad(p.day)}`;

/**
 * The calendar day of a value, "2026-11-20". A date-only value is the day as written. A real
 * moment is the day it falls on in Eastern.
 */
export function dayOf(value: string): string {
  const m = DATE_ONLY.exec(value.trim());
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return dayString(easternParts(new Date(value)));
}

/** Today in Eastern, "2026-10-29". */
export function easternToday(now: Date = new Date()): string {
  return dayString(easternParts(now));
}

/** Calendar arithmetic on a "YYYY-MM-DD" day. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from today in Eastern until a value's day. Negative once the day has passed. */
export function daysUntil(value: string, now: Date = new Date()): number {
  const [y, m, d] = dayOf(value).split("-").map(Number);
  const [ty, tm, td] = easternToday(now).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / DAY_MS);
}

/** True from the start of the value's day in Eastern. */
export function hasStarted(value: string, now: Date = new Date()): boolean {
  return easternToday(now) >= dayOf(value);
}

/** True once the value's day has ended in Eastern. */
export function isOver(value: string, now: Date = new Date()): boolean {
  return easternToday(now) > dayOf(value);
}

/** Whole years old today in Eastern, from a birth date. Null if it is not a date. */
export function ageOnToday(dateOfBirth: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = easternParts(now);
  let age = t.year - y;
  if (t.month < mo || (t.month === mo && t.day < d)) age -= 1;
  return age;
}

/**
 * Formats a value's calendar day in Eastern. The day is placed at noon so that printing it in
 * Eastern can never move it to a neighbouring day.
 */
function fmt(value: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = dayOf(value).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { ...opts, timeZone: EASTERN });
}

/** A single date-only day: an event date, "waitlist opens", "registration closes". */
export function formatEventDay(value: string, opts: Intl.DateTimeFormatOptions): string {
  return fmt(value, opts);
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
  return easternParts(now).year;
}

/** A value's calendar day as numbers, month zero-based. */
function utc(value: string) {
  const [year, month, day] = dayOf(value).split("-").map(Number);
  return { year, month: month - 1, day };
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
 * Returns { month: "APR", day: 17 }, the day as stored.
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
 * Meeting slots are real moments, printed in Eastern. Unpinned, the server sending the email
 * printed its own zone, and an 8 PM Tuesday meeting went out as "Wednesday at 12:00 AM".
 */
export function formatMeetingTime(iso: string): string {
  const when = new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: EASTERN,
  });
  return `${when} ET`;
}

/**
 * An event's days as an all-day calendar range: { start: "2026-11-20", end: "2026-11-23" }.
 *
 * For a Google Calendar event, which wants date-only values with an exclusive end. Both
 * inputs are date-only fields, so the days are taken as written. Sent as
 * exact times instead, Deer Camp (Fri Nov 20 to Sun Nov 22) reached campers as 7 PM Thursday
 * to 7 PM Saturday. With no last day, the event is the first day alone.
 */
export function allDayRange(
  firstDay: string,
  lastDay: string | null
): { start: string; end: string } {
  return { start: dayOf(firstDay), end: addDays(dayOf(lastDay ?? firstDay), 1) };
}
