# Background screening

## Sub-features

- Order a check for someone who has none, from their row in the table.
- VolunteerBadge webhook and a nightly poll that does not trust the webhook.
- A review modal for a flagged result, with three decisions: cleared by the panel, panel
  could not clear, and refused or concealed.
- Clearing a finding requires all three officers named as present, plus a reason.
- A decline is irreversible from the admin, because reversing it would undo an FCRA adverse
  action and a refund.
- Eligibility drives who may take part and what they are charged, in
  [src/lib/background-check/eligibility.ts](../../../../src/lib/background-check/eligibility.ts).

## How to get to it (user POV)

Event page, All tab, the person's row. A flagged person offers Review. Someone with no check
offers to order one.

Fixture people, by branch: Cy Flagged awaits a panel decision, Di Declined is already
declined, Eli Unscreened has paid and never been screened, Fay Nodob has no date of birth so
age is unknown and they cannot be cleared, Ada Ready and Bo Mentor are clear.

## Driving it with the Browser pane

Sign in, open the board URL, use the All tab. Find the row by name with `find` or
`read_page`, open Review, fill the reason and the officers present, then choose a decision.

Confirm with `snapshot.mjs`: `background_check_status` on the contact, and the
`registration_events` rows.

## Gotchas

- Ordering a check for a fixture person calls VolunteerBadge's sandbox for real. Only do it
  when screening is what changed.
- Do not drive a decline unless that is the thing under test. It is irreversible and it
  triggers the refund path.
- Fay Nodob cannot be cleared by design. A run that "fixes" her by adding a date of birth
  has destroyed the branch she exists to cover.
- The nightly poll is a cron route, not a UI action. Exercise it with an authorised request
  to `/api/cron/background-checks`, not by waiting.
