const SCOPES = ["https://www.googleapis.com/auth/calendar"];

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  attendees?: string[]; // email addresses
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

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: email,
    scope: SCOPES.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })
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
 * Meet link is managed manually in Sanity — included in the event description.
 * Returns the calendar event ID.
 */
export async function createCalendarEvent(event: CalendarEvent & { meetLink?: string }): Promise<{ eventId: string; meetLink: string | null }> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();

  const description = [
    event.description || "",
    event.meetLink ? `\n\nJoin Meeting: ${event.meetLink}` : "",
  ].join("");

  const body = {
    summary: event.summary,
    description,
    start: { dateTime: event.start, timeZone: "America/New_York" },
    end: { dateTime: event.end || new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString(), timeZone: "America/New_York" },
    attendees: event.attendees?.map((email) => ({ email })) || [],
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
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

  return { eventId: data.id, meetLink: event.meetLink || null };
}

/**
 * Update an existing calendar event (e.g., date change).
 */
export async function updateCalendarEvent(
  calendarEventId: string,
  updates: Partial<CalendarEvent>
): Promise<void> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();

  const body: Record<string, unknown> = {};
  if (updates.summary) body.summary = updates.summary;
  if (updates.description) body.description = updates.description;
  if (updates.start) body.start = { dateTime: updates.start, timeZone: "America/New_York" };
  if (updates.end) body.end = { dateTime: updates.end, timeZone: "America/New_York" };

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
}

/**
 * Add an attendee to a calendar event.
 */
export async function addAttendee(calendarEventId: string, email: string): Promise<void> {
  const token = await getAccessToken();
  const calendarId = getCalendarId();

  // First get current attendees
  const getRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${calendarEventId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const event = await getRes.json();
  const attendees = event.attendees || [];

  // Check if already an attendee
  if (attendees.some((a: { email: string }) => a.email === email)) return;

  attendees.push({ email });

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
