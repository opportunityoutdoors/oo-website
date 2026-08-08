# Testing

Three layers, in the order you should reach for them.

## 1. Unit tests

```bash
npm test
```

Covers the pure logic, which is where every bug this project has actually shipped has
lived:

| File | What it pins |
|---|---|
| `src/lib/background-check/eligibility.test.ts` | Who needs a check, who may take part |
| `src/lib/camp-pipeline.test.ts` | The camp funnel and its counts |
| `src/lib/stripe/money.test.ts` | Every calculation that decides how much money moves |
| `src/lib/background-check/volunteerbadge.test.ts` | Translating the vendor's status vocabulary |

Tests sit beside the code they cover, so moving a file cannot silently orphan its tests.

**What is deliberately not here:** browser and end-to-end tests. They would cover the parts
a human checks anyway (did the email arrive, did Stripe redirect) at a maintenance cost an
organisation running three camps a year should not carry. That may change; it is a judgment
about this project's size, not a claim that E2E is worthless.

**When adding logic, ask whether it is pure.** If it takes no database and no network, it
belongs under test. Real examples of bugs these tests exist to prevent:

- A funnel that reported "19 outstanding" for 18 people, by summing per-stage counts and
  double counting anyone blocked early.
- A refund that computed to negative and would have been sent to Stripe.
- A fee derived from the display string `"$37.50"` by stripping non-digits, producing 3750
  and a charge of $3,750.
- A vendor status nobody had seen before mapping to `clear`, which would have put an
  unscreened person in a camp.

## 2. The fixture camp

```bash
npm run fixture -- status     # what exists right now
npm run fixture -- create     # build it
npm run fixture -- reset      # destroy then create
npm run fixture -- destroy    # remove every trace
```

Creates **ZZ TEST Fixture Camp** with eight people, one per branch that the pipeline and the
welcome packet gate care about:

| Person | State |
|---|---|
| Ada Ready | Passes every stage. Should receive a packet. |
| Bo Mentor | Cleared mentor. Needs no mentor of their own. |
| Cy Flagged | Awaiting a panel decision. Must not receive a packet. |
| Di Declined | Declined, left in the event on purpose so the gate catches them. |
| Eli Unscreened | Paid, never screened. Should offer "order check". |
| Fay Nodob | No date of birth, so age is unknown and they cannot be cleared. |
| Gus Unpaid | Blocks at payment. |
| Hana Waitlist | Blocks at the very first stage. |

This exists because manual testing previously meant hand-editing a live contact's row with
SQL and hand-restoring it from a value pasted into a chat message. That was done eight times
in one afternoon. One mistyped restore and a real person's screening status is quietly wrong.

Two safety properties worth knowing:

- `destroy` only deletes rows whose email matches `+fixture@opportunityoutdoors.org`, or the
  event with the fixture's exact title. It cannot reach a real registrant.
- The script refuses to run if `STRIPE_SECRET_KEY` is a live key. A fixture that can move
  real money is not a fixture.

Fixture registrations carry no `stripe_payment_id`, so the refund path correctly reports that
it cannot refund automatically rather than reaching for a real payment intent.

## 3. Before pushing

The things only a person can judge. Run through whichever apply to what changed.

**Always**

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` is clean

**If registration changed**

- [ ] Walk all four steps on the fixture camp with a real browser
- [ ] Each step refuses to advance with a message naming what is missing
- [ ] The waiver checkbox stays disabled until the waiver is scrolled to the bottom
- [ ] The total on the last step matches what the event actually charges
- [ ] Submitting reaches Stripe Checkout, and cancelling returns somewhere sensible

**If email changed**

- [ ] The message actually arrived, confirmed in an inbox, not from a `sent: 1` counter
- [ ] It landed in the inbox rather than spam
- [ ] Reply-to goes somewhere a person reads

**If payment changed**

- [ ] Confirm the charge in the Stripe dashboard, not just in our own logs
- [ ] Refund it afterwards if it was a test

**If screening changed**

- [ ] A flagged and a declined person are both refused a welcome packet, by name
- [ ] A cleared person still receives one

**If it touches the database**

- [ ] The migration is applied, and `npm run fixture -- reset` still works afterwards

## A note on what "it worked" means

This project has repeatedly produced components that behaved exactly as designed while the
person on the other end got nothing: an apex domain redirect that silently dropped every
webhook, a missing column read as "no results", a cron schedule that failed four deploys in a
row, a Google Group that had not finished provisioning.

The common shape is a green signal that was measuring the wrong thing. A `200` from a page
that renders its content client-side proves the shell loaded, not the page. `sent: 1` from
our own counter proves we called the API, not that mail arrived. Prefer the check that
observes the outcome rather than the attempt.
