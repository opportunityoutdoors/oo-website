import { randomUUID } from "crypto";
import { allDayRange } from "@/lib/format-event-date";
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: string; // ISO datetime; with allDay, the first day
  end: string; // ISO datetime; with allDay, the last day (inclusive)
  attendees?: string[]; // email addresses
  /**
   * A whole-day event, such as a camp. start and end are the date-only fields stored as
   * midnight UTC, and must not be sent as times: Google would show them in Eastern, the
   * evening before.
   */
  allDay?: boolean;
  /**
   * Guests cannot see who else is invited, or invite anyone. For an event shared by many
   * people who do not know each other, such as a camp, where the guest list is everyone's
   * email address.
   */
  privateGuests?: boolean;
}

/** Google's start/end pair: date-only for an all-day event, an Eastern datetime otherwise. */
function eventTimes(start: string, end: string | undefined, allDay?: boolean) {
  if (allDay) {
    const range = allDayRange(start, end ?? null);
    return { start: { date: range.start }, end: { date: range.end } };
  }
  return {
    start: { dateTime: start, timeZone: "America/New_York" },
    end: {
      dateTime: end || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: "America/New_York",
    },
  };
}

interface CalendarEventResponse {
  id: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error("Google Calendar credentials not configured");
  }

  // Create JWT for service account auth
  const { SignJWT, importPKCS8 } = await import("jose");

  const key = await importPKCS8(
    privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
    "RS256"
  );

  const impersonateUser = process.env.GOOGLE_CALENDAR_IMPERSONATE_USER;

  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: email,
    scope: SCOPES.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  if (impersonateUser) {
    claims.sub = impersonateUser;
  }

  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(key);

  // Exchange JWT for access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

function getCalendarId(): string {
  const id = process.env.GOOGLE_CALENDAR_ID;
  if (!id) throw new Error("GOOGLE_CALENDAR_ID not configured");
  return id;
}

/**
 * Create a Google Calendar event.
 * Pass `createMeet` to have Google attach a Meet conference; the link comes back as
 * `meetLink`. A `meetLink` passed in is one somebody set by hand in Sanity, which wins
 * and goes in the description instead.
 * Returns the calendar event ID.
 */
export async function createCalendarEvent(event: CalendarEvent & { meetLink?: string; createMeet?: boolean }): Promise<{ eventId: string; meetLink: string | null }> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();

  const description = [
    event.description || "",
    event.meetLink ? `\n\nJoin Meeting: ${event.meetLink}` : "",
  ].join("");

  const wantsMeet = Boolean(event.createMeet) && !event.meetLink;

  const body: Record<string, unknown> = {
    summary: event.summary,
    description,
    ...eventTimes(event.start, event.end, event.allDay),
    attendees: event.attendees?.map((email) => ({ email })) || [],
  };
  if (event.privateGuests) {
    body.guestsCanSeeOtherGuests = false;
    body.guestsCanInviteOthers = false;
  }
  if (wantsMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  // Google ignores conferenceData unless conferenceDataVersion=1 is on the request.
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all${wantsMeet ? "&conferenceDataVersion=1" : ""}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data: CalendarEventResponse = await res.json();
  if (!res.ok) {
    throw new Error(`Calendar API error: ${JSON.stringify(data)}`);
  }

  return { eventId: data.id, meetLink: event.meetLink || meetLinkOf(data) };
}

function meetLinkOf(data: CalendarEventResponse): string | null {
  return (
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
    null
  );
}

/**
 * Update an existing calendar event (e.g., date change).
 */
export async function updateCalendarEvent(
  calendarEventId: string,
  updates: Partial<CalendarEvent>
): Promise<{ meetLink: string | null }> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();

  const body: Record<string, unknown> = {};
  if (updates.summary) body.summary = updates.summary;
  if (updates.description) body.description = updates.description;
  if (updates.start && updates.allDay) {
    Object.assign(body, eventTimes(updates.start, updates.end, true));
  } else {
    if (updates.start) body.start = { dateTime: updates.start, timeZone: "America/New_York" };
    if (updates.end) body.end = { dateTime: updates.end, timeZone: "America/New_York" };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${calendarEventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(`Calendar API update error: ${JSON.stringify(data)}`);
  }

  // PATCH returns the whole event, so a Meet added by hand in Calendar is readable here.
  const data: CalendarEventResponse = await res.json();
  return { meetLink: meetLinkOf(data) };
}

/**
 * Add an attendee to a calendar event.
 */
export async function addAttendee(calendarEventId: string, email: string): Promise<void> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${calendarEventId}`;

  // Read, add, write back, guarded by the event's etag. A camp event is shared by every
  // registrant, so two people registering at once would otherwise each write a list without
  // the other in it, and one of them would silently lose their invite. Google answers 412
  // when the event changed under us; then read again and retry. It also limits how fast one
  // event can change, answering 403 rateLimitExceeded (or 429): three people registering in
  // the same second hit that in testing, and the third was dropped. Those wait and retry too.
  const ATTEMPTS = 6;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const event = await getRes.json();
    if (!getRes.ok) {
      throw new Error(`Calendar API read error: ${JSON.stringify(event)}`);
    }

    const attendees: { email: string }[] = event.attendees || [];
    if (attendees.some((a) => a.email.toLowerCase() === email.toLowerCase())) return;
    attendees.push({ email });

    const res = await fetch(`${url}?sendUpdates=all`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": event.etag,
      },
      body: JSON.stringify({ attendees }),
    });
    if (res.ok) return;

    const data = await res.json().catch(() => ({}));
    const rateLimited =
      res.status === 429 ||
      (res.status === 403 && JSON.stringify(data).includes("ateLimitExceeded"));
    if ((res.status === 412 || rateLimited) && attempt < ATTEMPTS) {
      // Backoff with jitter, about 0.5s, 1s, 2s, 4s, 8s: under 16 seconds in all.
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1) * (0.75 + Math.random() / 2)));
      continue;
    }
    throw new Error(`Calendar API add attendee error: ${JSON.stringify(data)}`);
  }
}

/**
 * Remove an attendee from a calendar event.
 */
export async function removeAttendee(calendarEventId: string, email: string): Promise<void> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();

  // Get current attendees
  const getRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${calendarEventId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const event = await getRes.json();
  const attendees = (event.attendees || []).filter(
    (a: { email: string }) => a.email !== email
  );

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${calendarEventId}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ attendees }),
    }
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(`Calendar API remove attendee error: ${JSON.stringify(data)}`);
  }
}

/**
 * Delete a calendar event. Attendees are not notified.
 */
export async function deleteCalendarEvent(calendarEventId: string): Promise<void> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${calendarEventId}?sendUpdates=none`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  // 410 means it is already gone, which is the outcome asked for.
  if (!res.ok && res.status !== 410) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Calendar API delete error: ${JSON.stringify(data)}`);
  }
}
