import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addAttendee,
  createCalendarEvent,
  deleteCalendarEvent,
  removeAttendee,
  updateCalendarEvent,
} from "@/lib/google-calendar";

// The camp's one calendar event, shared by everyone registered.
//
// Registration used to create a separate event per registrant, each built from midnight-UTC
// times, so Deer Camp (Fri Nov 20 to Sun Nov 22) reached campers as Thursday to Saturday and
// a date change could never reach them. Now each camp has one all-day event, stored on
// events.camp_calendar_event_id, and a registrant is added to it as a guest. The guest list is
// hidden, because it is every camper's email address. No location: that waits for the
// welcome packet, which is gated on screening.

type CampEvent = {
  id: string;
  title: string;
  date_start: string | null;
  date_end: string | null;
  camp_calendar_event_id: string | null;
};

const DESCRIPTION = (title: string) =>
  `You're registered for ${title}! Location details will be shared in your welcome packet.`;

/** The camp's calendar event id, creating the event on first use. Null without a start date. */
export async function ensureCampCalendarEvent(
  supabase: SupabaseClient,
  event: CampEvent
): Promise<string | null> {
  if (event.camp_calendar_event_id) return event.camp_calendar_event_id;
  if (!event.date_start) return null;

  const { eventId } = await createCalendarEvent({
    summary: event.title,
    description: DESCRIPTION(event.title),
    start: event.date_start,
    end: event.date_end ?? event.date_start,
    allDay: true,
    privateGuests: true,
  });

  // Claimed only while still empty. Two first registrations at the same moment both create
  // an event; the one that loses deletes its own and uses the winner's, so a camp never ends
  // up with two.
  const { data: claimed } = await supabase
    .from("events")
    .update({ camp_calendar_event_id: eventId })
    .eq("id", event.id)
    .is("camp_calendar_event_id", null)
    .select("camp_calendar_event_id");
  if (claimed?.length) return eventId;

  await deleteCalendarEvent(eventId).catch((err) =>
    console.error(`Could not delete duplicate camp calendar event ${eventId}:`, err)
  );
  const { data: winner } = await supabase
    .from("events")
    .select("camp_calendar_event_id")
    .eq("id", event.id)
    .single();
  return winner?.camp_calendar_event_id ?? null;
}

/** Adds a registrant to their camp's shared calendar event. */
export async function addToCampCalendar(
  supabase: SupabaseClient,
  eventId: string,
  email: string
): Promise<void> {
  const { data: event } = await supabase
    .from("events")
    .select("id, title, date_start, date_end, camp_calendar_event_id")
    .eq("id", eventId)
    .single();
  if (!event) return;

  const calendarEventId = await ensureCampCalendarEvent(supabase, event as CampEvent);
  if (calendarEventId) await addAttendee(calendarEventId, email);
}

/**
 * Takes someone off their camp's calendar event, such as a board member set to "Not going".
 * Google sends them a cancellation. Nothing to do when the camp has no event yet.
 */
export async function removeFromCampCalendar(
  supabase: SupabaseClient,
  eventId: string,
  email: string
): Promise<void> {
  const { data: event } = await supabase
    .from("events")
    .select("camp_calendar_event_id")
    .eq("id", eventId)
    .single();
  if (event?.camp_calendar_event_id) await removeAttendee(event.camp_calendar_event_id, email);
}

/**
 * Keeps the camp's calendar event on the camp's dates and title after a Sanity edit, so every
 * registrant's calendar moves with it. Sent without notification emails, because this runs on
 * every publish of the camp, including ones that change nothing. A real date change still
 * needs announcing.
 */
export async function syncCampCalendarEvent(event: CampEvent): Promise<void> {
  if (!event.camp_calendar_event_id || !event.date_start) return;
  await updateCalendarEvent(event.camp_calendar_event_id, {
    summary: event.title,
    start: event.date_start,
    end: event.date_end ?? event.date_start,
    allDay: true,
  });
}
