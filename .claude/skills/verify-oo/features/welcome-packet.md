# Welcome packet

## Sub-features

- One button sends role-specific packets to everyone cleared to attend.
- The packet is the first thing that discloses the camp location, so the gate is the
  feature. Anyone flagged, declined, unpaid, unwaived or unscreened is withheld by name.
- Refuses to send at all when the camp locations are not set in Content Studio.
- Refuses when any mentee is unmatched, naming how many.
- Records `welcome_packet_sent_at` per registration.

## How to get to it (user POV)

Event page, the readiness panel above the tabs, the send button. It is deliberately above
the tabs: whether the camp is ready to run is the question the page exists to answer.

## Driving it with the Browser pane

Sign in, open the board URL, click the send button in the readiness panel, then read the
response. The route answers with `sent` and `withheld`.

The proof is not the counter. Check both halves:

- `snapshot.mjs` shows `welcome_packet_sent_at` set for Ada Ready and Bo Mentor, and null
  for Cy Flagged, Di Declined, Eli Unscreened, Fay Nodob and Gus Unpaid.
- The mail actually arrived in the `FIXTURE_EMAIL` inbox, at the plus-addressed variants
  `+zz.ready` and `+zz.mentor`, and nowhere else.

## Gotchas

- This sends real mail through Resend. Only run it when the packet or the gate is what
  changed.
- `sent: 2` proves we called Resend, not that anything arrived. This project has already
  shipped a component that reported success while the person got nothing.
- The withheld list is the assertion that matters. A packet that reaches a declined person
  discloses a camp location to someone barred from it.
- The fixture event carries one camp location, so the missing-locations refusal needs the
  location cleared first. Restore it with `npm run fixture -- reset`.
