# Spec: reworking the camp admin flow

Status: agreed in outline. Four design questions answered 2026-08-09. Task 36.

## 1. What is actually wrong

The reported symptom is "once you've progressed through a stage, you can't go back." That is
true, and it has two immediate causes and one underlying one.

**Immediate cause A.** A stage is only clickable while someone is stuck at it:

```ts
const clickable = s.stuck.length > 0;
```

Once everyone passes a stage it goes dead. You cannot open it at all.

**Immediate cause B.** Clicking a stage shows the people stuck *before* it, never the people
*at or past* it. So "show me the twelve people I approved" is unanswerable. The old
`WAITLIST / APPROVED / DENIED / REGISTERED` tabs answered exactly that, and I removed the
capability without replacing it.

**The underlying cause.** The funnel imposes a strict linear order on things that are not
sequential. Look at what actually happens:

- Waiver and payment are not two stages. They are one form submission. A person cannot be
  "past waiver but not at payment", because the registration form collects both and saves
  them together.
- The background check is ordered automatically on payment. It is not a stage anyone walks
  into; it is a requirement that resolves on its own timeline.
- Matching is an admin action that can happen any time after someone registers. It has no
  natural position in a queue of participant milestones.

So the nine "stages" conflate two different kinds of thing:

| Kind | Examples | Behaves like |
|---|---|---|
| **Position** | waitlist, invited, registered, not attending | Where a person *is*. Exactly one at a time. Changes by decision. |
| **Requirement** | waiver, payment, background check, mentor | What a person has *satisfied*. Many at once, any order, mostly self-resolving. |

Modelling requirements as positions is what produced a queue you can only walk one way.
A person is always somewhere; they are not always "at payment".

## 2. What the research says

Sources at the end. Three findings that bear directly on this.

**Kanban fits this scale, and only this scale.** A board is the right pattern when the
important question is "what stage is this in", when volume is around twenty, when tracking a
single position, and when non-technical people need to read it. All four describe OO exactly:
one camp at a time, eight to twenty people, months apart, read by board members. The same
sources are blunt that boards collapse at 50 to 300 records. OO will not get there.

**Offer both a board and a table.** Boards answer "where is everyone". Tables answer "sort by
this, filter by that, act on these six". Most applicant systems ship both because they are
genuinely different questions, and picking one starves the other. That is what happened here:
I replaced the tabs with a funnel and lost the table's job.

**Backward transitions should exist, and be deliberate rather than free.** The consistent
advice is that a workflow ought to have an explicit way back, often restricted, rather than
being one-way by omission. Reversibility should be matched to impact and frequency, not
applied uniformly.

## 3. Proposed model

### Columns are positions

Seven columns:

```
Waitlist      Invited       Registered    Ready        Attended      Turned away   Dropped out
awaiting      awaiting      requirements  cleared and  they came     our           their choice
YOUR decision THEIR move    outstanding   matched                    decision      or silence
```

**Attended is not decoration.** `status = 'attended'` is already what the post-survey cron
filters on: it sends a day after the event ends, only to people marked attended, and the
Stats tab warns when a past event has none. That mechanism exists and works.

What does not work is marking it. Attendance can currently only be set as a BULK action:
select checkboxes, click a button. There is no per-person control at all. Dragging a card
into Attended fixes that without new machinery, and it is the single most valuable thing the
board buys, because nothing downstream fires until somebody does it.

Every person is in exactly one column, always. No column can be empty of meaning, none can
go dead, and every one is openable whether or not anything is wrong. That alone fixes the
reported symptom.

**Why "turned away" and "dropped out" are not one column.** They share an outcome and
nothing else. One is a decision OO made and has to be able to defend, sometimes with a
refund and an FCRA notice attached. The other is attrition: people who went quiet, could not
make the dates, or never paid. Collapsing them would put "we declined this person after a
background check" next to "replied saying they have a wedding that weekend", which is both
misleading in the moment and useless later when you want to know why a camp did not fill.

The second is also the number worth measuring. Attrition tells you whether the waitlist is
too long, the fee too high, or the gap between invite and camp too wide. Turn-aways tell you
nothing about that.

### Every exit carries a reason

Moving someone out of the pipeline always requires picking one. Never automatic: a person
who has not paid is *unpaid in Registered* until a human decides they are not coming.

**Turned away** — OO decided.

| Reason | Consequence |
|---|---|
| Denied at review | None beyond the record |
| Screening declined | Already automated: adverse action, refund less fees |
| Removed for conduct | Refund is a judgment call |

**Dropped out** — they did not come through.

| Reason | Notes |
|---|---|
| Never registered | Invite lapsed. The commonest one, and the one to watch. |
| Never paid | Registered, waiver signed, no money. |
| Stopped responding | Chased and heard nothing. |
| Told us they cannot make it | The polite one. Worth distinguishing: these are people to re-invite. |
| Withdrew after paying | **No refund by default.** See below. |

**On withdrawals and money.** The rule is no refund unless they ask, because OO has usually
already committed the expense on the strength of their place. That is a reasonable policy for
a small nonprofit buying food and permits in advance.

It is also the opposite of what the payment screen currently promises. See section 8.

### Requirements are badges on the card

A card in **Registered** shows what that person still owes:

```
┌────────────────────────────────┐
│ Ada Ready              Mentee  │
│ ✓ waiver  ✓ paid  … check  ✓ mentor │
└────────────────────────────────┘
```

Requirements resolve in any order and mostly without anyone doing anything, which is exactly
how they behave in reality. A person moves to **Ready** when all of theirs are met.

This keeps the part of the current design that works. `computePipeline()` already computes
requirement satisfaction correctly, it is unit tested, and both the panel and the table read
from it. That logic survives; only the presentation changes.

### The summary stays, but stops being the navigation

The stage list was doing two jobs: telling you the state of the camp, and being the way you
navigate. It was adequate at the first and bad at the second. Keep a compact header:

```
8 registered · 3 ready to attend · 2 waiting on a background check · 1 unmatched
```

That is a readout. The board is the navigation.

### A table view, toggled

Same data, sortable and filterable, with checkboxes and bulk actions. This is where you go to
approve nine people at once or export a roster. Board for "where is everyone", table for
"do this to these".

## 4. Reversibility rules

Applying the impact/frequency framework rather than making everything uniformly undoable.

| Action | Reversible? | Why |
|---|---|---|
| Waitlist → Invited | Yes, freely | Low impact, frequent, trivially recoverable. Moving back just un-invites. |
| Invited → Waitlist | Yes | Same. The invite email is already sent, which is a fact about the past, not a state. |
| Deny | Yes | A decision about fit, not a legal act. People change their minds. |
| Registered → Invited | Admin only, with a warning | Destroys nothing but confuses the participant, whose registration still exists. |
| Screening decline | **No** | Already enforced. Reversing it undoes an FCRA adverse action and a refund. `recordReview()` refuses. |
| Send welcome packet | **No undo, but re-sendable** | The email is out. Reversibility is meaningless; re-sending is the real need. |
| Refund | **Not from this screen** | Money. Stripe dashboard, deliberately. |

Every position change writes an audit row: who, when, from, to. Not for its own sake — the
screening policy already requires a written record of decisions, and this is the same need
one layer out.

## 5. What changes in code

**Keep**

- `src/lib/camp-pipeline.ts` requirement logic and its tests. Sound, and the reason counts
  and lists cannot disagree.
- The review modal, the screening gate, `mayParticipate()` wiring.
- The welcome packet gate and its named-withheld behaviour.

**Add**

- `position(reg)` in `camp-pipeline.ts`: one function returning which of the five columns a
  person is in. Unit tested alongside the existing helpers.
- A board component. Cards, columns, requirement badges.
- A move action with an audit row. New table, same shape as `background_check_reviews`.
- A view toggle, board or table, remembered per user.

**Change**

- `ReadinessPanel` shrinks to a one-line summary and stops being clickable navigation.
- The registrant table returns to being sortable and filterable in its own right, with bulk
  actions, rather than a slave to the stage filter.

**Remove**

- `stageFilter` and the clickable-stage mechanism. It is the thing being replaced.

## 6. Decisions taken

**Drag and drop only.** No menu fallback. This is an internal tool used by about four named
people on desktop, with six to twenty cards on screen. The usual argument for a keyboard and
pointer-free path is about reaching users you cannot survey; here the entire user list is
known and in the room. Revisit only if that changes.

**"Not attending" splits into two columns**, each with a required reason. See above.

**Past camps appear, in a different shape.** See below, because this one has a wrinkle.

**Any admin can move anyone, in either direction.** Position changes are lighter than
screening decisions. The screening decline stays as it is: three officers, unanimous, and
irreversible from this screen.

## 7. Past camps

Flagged during review, and worth taking seriously: **earlier camps predate steps that now
exist.** Turkey Camp ran with no background checks, no dates of birth, and six people whose
payment was never recorded. It went fine.

Render that camp on the same board and every one of those eighteen people piles into
Registered covered in red badges, describing a catastrophe that did not happen. The current
build already had this problem in milder form, which is why the pipeline panel greys out for
past events.

The fix is small, and deliberately so: past camps are for reference, carry no workflow, and
will eventually be archived out of sight. So for a camp whose end date has passed, **hide the
requirement badges**. That is the whole change. Cards still sit in whatever column they ended
in, and Attended already means what it should.

Requirements introduced after a camp ran must never be applied to it retrospectively. A camp
that predates background checks did not fail a background check. Hiding the badges says that
without needing a separate mode to maintain.

## 8. BLOCKING: the payment screen promises a refund we do not intend to give

RegisterForm.tsx, on the screen where someone hands over money:

> Processing fees and background check fees are non-refundable. If your registration is
> cancelled or **you are unable to attend, the registration fee is refunded** less those
> costs.

That is a direct contradiction of "no refund on withdrawal unless they ask". It is also the
worst possible place for one: it is the last thing a person reads before paying, which makes
it the thing they will quote back.

The distinction that is actually true, and that the code already implements, is **who ended
it**:

- **OO cannot accept you** (declined after a background check). Refunded, less the processing
  and check fees. Already automated, already correct.
- **You withdraw or cannot make it.** Not refunded, because the costs are committed. Ask and
  it will be considered.

Proposed replacement:

> Processing fees and background check fees are non-refundable. If we are unable to accept
> you, your registration fee is refunded less those costs. If you withdraw or cannot attend,
> the registration fee is not automatically refunded, because we commit to camp costs in
> advance. Get in touch and we will do what we can.

Two notes. This changes a promise, so it applies going forward only: anyone who registered
under the current wording was told they would be refunded. And the last sentence is not
padding. "Cost should not be the reason someone stays home" already appears elsewhere in this
flow, and a flat no here would sit badly against it.

Worth a board eye before it ships, since it is a money term rather than copy.

## 9. Schema changes

The current `registration_status` enum is `waitlist, meeting_rsvp, approved, denied,
registered, attended`. It has no way to say "dropped out", and no way to say why anyone left.

```sql
alter type registration_status add value 'withdrawn';

alter table registrations
  add column exit_reason text,
  add column exited_at timestamptz,
  add column exited_by uuid references admin_users(id) on delete set null;
```

`denied` covers turned away; `withdrawn` covers dropped out; `exit_reason` carries which of
the reasons above, constrained to the known set. Screening declines already live on the
contact, not the registration, and stay there.

Position moves also need an audit trail, same shape as `background_check_reviews`: who, when,
from, to, and any reason given. Not ceremony. The screening policy already requires a written
record of decisions about people, and a position change is a smaller instance of the same
thing.

## Sources

- [Kanban View in an ATS: Useful, But Not Always Enough — JobAffinity](https://www.jobaffinity.com/en/blog/vue-kanban-ats/)
- [Kanban Board vs List View: Which Wins for Your Workflow](https://www.mursa.me/blog/kanban-vs-list-view-tasks)
- [UX for reversible actions: a decision framework — LogRocket](https://blog.logrocket.com/ux-design/ux-reversible-actions-framework/)
- [Design philosophy for reverting to previous stages — ServiceNow community](https://www.servicenow.com/community/workflow-automation-forum/design-philosophy-for-a-custom-app-with-the-ability-to-revert-to/td-p/3529121)
- [Creating forward and back transitions in a workflow — Atlassian community](https://community.atlassian.com/forums/Jira-questions/creating-forward-and-back-transitions-in-a-Workflow/qaq-p/683091)
- [Understanding lists — Attio](https://attio.com/help/reference/attio-101/attios-data-model/understanding-lists)
