# Status

**Last worked on:** 2026-10-22. Code changed and pushed to main 2026-10-22.
**Status:** Active

## Done recently

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

Resume point, 2026-10-22 evening. VolunteerBadge results now reach the site (4d5dbe5) and we
send our own check invite (c24113a). Reminders stay paused until Sebastian Blanco,
Abdullah Saleh and Steve Cook, ordered before the fix and so unmatched, are marked clear by
hand from John's list; then set REMINDERS_PAUSED to false in the cron route. John to add
check.adjudicated to the VolunteerBadge webhook and rename the application template.

## Next up

- For the next camp: Meet links on the admin sync path, and a re-send after a meeting change.

## Blocked

- NC sales tax: E-585 refund claim and NCDOR registration, same meeting. Some of the
  refundable tax is expiring against the three-year bar.
