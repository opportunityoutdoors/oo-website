# Status

**Last worked on:** 2026-10-29. Code changed and pushed to main 2026-10-29.
**Status:** Active

## Done recently

- 2026-10-29, pushed: automatic registration reminders with "I Can't Make It". First Deer
  Camp send Oct 30, final Nov 4. All day logic in Eastern. Migration 042 applied.
- 2026-10-26, pushed: Ready means signed, paid, and cleared. Board members get a welcome
  packet, Staff with no match section. Background check emails link through our own domain.
- 2026-10-26, pushed: the register page shows Deer Camp as Nov 20 to 22, not Nov 19. All
  timestamps show in Eastern time.
- 2026-10-26: production redeployed for Stripe's Node.js alert. The live key was not rolled.
- 2026-10-22, pushed: one confirmation email after payment, carrying the background check link.
- 2026-10-22, pushed: VolunteerBadge results reach the site, and we send the check invite.
- 2026-10-22, pushed: turning a camper away or marking them dropped out takes them off the
  camp calendar event.
- 2026-10-22, pushed: one shared, all-day calendar event per camp, Fri to Sun for Deer Camp.
  Migration 040 applied. The 4 earlier registrants are on it; John deletes their old events.
- 2026-10-22, pushed: a double-click no longer moves, emails, or re-tokens anyone twice.

## In progress

Resume point 2026-10-29. Stopped after shipping 112c186: registration reminders with
"I Can't Make It", the two-week close default, and Eastern-only day logic. Nothing open in
code. Next concrete step: on Oct 30 after 10:30 AM Eastern, check Resend for 7 Deer Camp
reminders and Vercel logs for "Registration reminders: 7 first". Final send is Nov 4. Not yet
seen live: the cron, a real "I Can't Make It" press, a board-member packet. Ruled out: a
Sanity close date for Deer Camp, since the default gives Nov 6.

## Next up

- For the next camp: Meet links on the admin sync path, and a re-send after a meeting change.

## Blocked

- NC sales tax: E-585 refund claim and NCDOR registration, same meeting. Some of the
  refundable tax is expiring against the three-year bar.
