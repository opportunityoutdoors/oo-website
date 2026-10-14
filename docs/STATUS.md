# Status

**Last worked on:** 2026-10-14. Code changed and deployed 2026-10-14.
**Status:** Active

## Done recently

- 2026-10-14, deployed: meeting times in Eastern, minor stops on waitlist and registration,
  email confirmation before approval, case-insensitive contacts with an admin merge page,
  Meet links created by Calendar. Migrations 035 to 037 applied. Email confirmation starts
  with signups from 2026-10-14, so the current Deer Camp enrollees are not asked.
- 2026 Deer Camp waitlist email sent 2026-10-06 as a Resend broadcast to 570 subscribed
  contacts. The waitlist closes 2026-10-11.
- Camp admin board rework shipped whole: position columns, drag and drop, requirement badges,
  categorised exits, a transition timeline, and the table given back its own filtering.
- Registration rebuilt as four steps, with unit tests around the money and screening logic.
- Refund copy fixed; mentors asked about a shirt rather than charged for one.
- Project tracking set up, and CLAUDE.md given the essentials it lacked.
- `verify-oo` skill added: launches the app, signs into the admin without a password, drives
  a feature, and proves it by the database. Five features mapped.

## In progress

Grayson Millikan, 2026 Deer Camp: waiting on John to find a guardian. The waitlist is closed,
so the guardian is added through the admin, then the false adult record is removed.

## Next up

- Re-send the confirmation email after a meeting change.
- Prove the Meet link is stored on the next Sanity publish of a camp.
- Direct Mail teardown: cancel e57, drop the dead env vars from Vercel.
- Monthly newsletter template and an admin draft generator (Resend phase 3). Needs a design.

## Blocked

- Background screening policy adoption, awaiting a board vote.
- NC sales tax: E-585 refund claim and NCDOR registration, same meeting. Some of the
  refundable tax is expiring against the three-year bar.
