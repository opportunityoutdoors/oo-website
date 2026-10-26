# Status

**Last worked on:** 2026-10-26. Production redeployed 2026-10-26 for the Node.js security patch.
**Status:** Active

## Done recently

- 2026-10-26: production redeployed for Stripe's Node.js alert. The live key was not rolled.
- 2026-10-22, pushed: one confirmation email after payment, carrying the background check link.
- 2026-10-22, pushed: VolunteerBadge results reach the site, and we send the check invite.
- 2026-10-22, pushed: turning a camper away or marking them dropped out takes them off the
  camp calendar event.
- 2026-10-22, pushed: one shared, all-day calendar event per camp, Fri to Sun for Deer Camp.
  Migration 040 applied. The 4 earlier registrants are on it; John deletes their old events.
- 2026-10-22, pushed: board members join and leave the camp event with their Board status.
- 2026-10-22, pushed: a double-click no longer moves, emails, or re-tokens anyone twice.
- 2026-10-22, pushed: Turn Away as "Denied at review" sends the denial email.
- 2026-10-21, pushed: day 3 and final background check reminders from us, a staff alert
  when a link expires, and search help that matches VolunteerBadge's real email.
  Migration 039 applied.

## In progress

Nothing in flight. Deer Camp (Nov 20 to 22): VolunteerBadge results now reach the site on their
own, we send the check invite, and reminders are on again. Every Deer Camp check so far is clear.
Watch the next live result land without a hand edit; if one does not, search Vercel logs for
"NO CONTACT MATCHED" or "webhook refused".

## Next up

- For the next camp: Meet links on the admin sync path, and a re-send after a meeting change.

## Blocked

- NC sales tax: E-585 refund claim and NCDOR registration, same meeting. Some of the
  refundable tax is expiring against the three-year bar.
