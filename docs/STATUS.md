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
- 2026-10-22, pushed: Turn Away as "Denied at review" sends the denial email.

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
