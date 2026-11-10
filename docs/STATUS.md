# Status

**Last worked on:** 2026-11-10. Code changed and pushed to main 2026-11-10.
**Status:** Active

## Done recently

- 2026-11-10, pushed: a Welcome Packet Note field in Sanity, and mentors must give a phone.
  John's own contact has no phone, so mentees will not see one for him at Deer Camp.
- 2026-11-10, pushed: a unique OnX code for each mentee in the welcome packet. Paste the
  batch on the camp page before sending. Deer Camp needs 8. Registration reminders ran:
  7 first on Oct 30, 5 final on Nov 4.
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

## In progress

- Sanity leak: locations now sit in private documents, and anonymous reads and exports show
  none. The history API still serves old event revisions with coordinates. John decides.
- Deer Camp packets: note and OnX codes go in Camp Private Details, then I check, then send.

## Next up

- For the next camp: Meet links on the admin sync path, and a re-send after a meeting change.

## Blocked

- NC sales tax: E-585 refund claim and NCDOR registration, same meeting. Some of the
  refundable tax is expiring against the three-year bar.
