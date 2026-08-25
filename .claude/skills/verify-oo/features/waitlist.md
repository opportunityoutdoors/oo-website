# Waitlist

## Sub-features

- Waitlist form on the public event page, gated by `waitlistOpens` and `waitlistCloses` in
  Sanity. Before it opens the page names the date; after it closes it says so.
- Submitting upserts the contact and creates a `waitlist` registration.
- The person picks a pre-camp meeting slot and is added as an attendee on that slot's Google
  Calendar event.
- A confirmation email carries the meeting date, the Meet link, and a change link.
- The tokenised change page moves the Calendar attendee.
- A daily cron sends the waitlist-close reminder.

## How to get to it (user POV)

`/events/<slug>` for an event whose waitlist is open. The form is the registration block on
the event page.

## Driving it with the Browser pane

**The fixture camp has no public page.** It lives only in Supabase, and `/events/<slug>`
reads Sanity, so `zz-test-fixture-camp` returns a 404. This is the one mapped feature the
fixture does not cover.

What you can verify without creating real rows:

- The three gate states, by reading an existing event page whose window is open, not yet
  open, or closed.
- The form's own validation, by driving fields and reading the messages back without
  submitting.
- The change page, by opening a fixture person's token at
  `/events/zz-test-fixture-camp/meeting-change?token=zz-fixture-waitlist`, which reads
  Supabase rather than Sanity.

Submitting the form on a real event creates a real waitlist registration, mails a real
person's inbox, and adds a Calendar attendee. Do not do it as a routine check. If a change
genuinely needs it, use a `FIXTURE_EMAIL` plus-address, and delete the registration and the
Calendar attendee afterwards.

## Gotchas

- A Sanity date-only field is midnight UTC. Format through
  [src/lib/format-event-date.ts](../../../../src/lib/format-event-date.ts) or the gate dates
  render a day early outside UTC.
- Sanity has a 300 second `revalidate` on the event page. A change made in Studio will not
  appear immediately; the `/api/revalidate` webhook is what makes it appear.
- The form has a honeypot field. Filling every input by iterating the DOM silently discards
  the submission.
