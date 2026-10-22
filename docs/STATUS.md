# Status

**Last worked on:** 2026-10-22. Code changed and pushed to main 2026-10-22.
**Status:** Active

## Done recently

- 2026-10-22, pushed: one shared, all-day calendar event per camp, Fri to Sun for Deer Camp.
  Migration 040 applied. The 4 earlier registrants are on it; John deletes their old events.
- 2026-10-22, pushed: board members join and leave the camp event with their Board status.
- 2026-10-22, pushed: a double-click no longer moves, emails, or re-tokens anyone twice.
- 2026-10-22, pushed: Turn Away as "Denied at review" sends the denial email.
- 2026-10-21, pushed: day 3 and final background check reminders from us, a staff alert
  when a link expires, and search help that matches VolunteerBadge's real email.
  Migration 039 applied.
- 2026-10-21, pushed: the form, confirmation email, and after-payment page all say a separate
  VolunteerBadge email is coming for the background check.

## In progress

Resume point, 2026-10-22. Deer Camp (Nov 20 to 22) approvals are done: 17 mentees approved,
Grayson Millikan, Markus Howell and Ali Hamed turned away. 4 mentees and Konnor registered.
VolunteerBadge results do not reach the site. Ruled out: the webhook URL (correct, www) and
our endpoint (live, secret set). Found: it refuses their deliveries for a missing signature
header, now logged by name, and the poll asks for checks by application id, which 404s.
Reminders are paused. Next step: read the header names from the next refused delivery in
Vercel logs (search "webhook refused"), or from VolunteerBadge support, then fix header, id
matching and poll, and unpause. Until then, mark each result clear by hand. John deletes the
4 old Thu to Sat calendar events; the shared all-day event has 7 guests.

## Next up

- Take campers off the camp calendar event when they are turned away or drop out.
- For the next camp: Meet links on the admin sync path, and a re-send after a meeting change.

## Blocked

- NC sales tax: E-585 refund claim and NCDOR registration, same meeting. Some of the
  refundable tax is expiring against the three-year bar.
