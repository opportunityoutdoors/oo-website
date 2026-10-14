# Opportunity Outdoors — Spec

The roadmap. Phases are areas of work, not a strict order; several run in parallel.

Sources this was assembled from, which stay as the detailed reference:
- [OO-PreCamp-Workflow-Spec.md](OO-PreCamp-Workflow-Spec.md) — the camp workflow, v1.1, 2026-04-03
- [../SPEC-admin-flow.md](../SPEC-admin-flow.md) — the camp board rework, 2026-08-09
- [NC-Sales-Tax-Findings.md](NC-Sales-Tax-Findings.md) — sales tax research
- [OO-Background-Screening-Policy.md](OO-Background-Screening-Policy.md) — screening policy draft (gitignored)

## Phase 1 — Event setup

- [x] Sanity `event` schema: dates, fees, spots, meeting slots, camp locations, custom fields
- [x] Sanity → Supabase sync on publish via the `/api/revalidate` webhook
- [x] Google Calendar service account with domain-wide delegation
- [x] Create a Calendar event with a Meet link per meeting slot, storing `calendarEventId` back to Sanity
- [x] Update the Calendar event when a slot date changes in Sanity
- [x] Admin can delete an event, clearing the Supabase mirror row

## Phase 2 — Waitlist

- [ ] Meeting emails carry no Meet link. Found 2026-10-13. Google side proven 2026-10-14: a
      ZZ TEST Calendar event created with `createMeet` returned a `meet.google.com` link,
      and a re-read returned the same link. The step where `revalidate/route.ts` stores the
      link on the slot is unproven until the next Sanity publish of a camp. Publishing 2026
      Deer Camp also stores the Meet that was added to its events by hand.
- [ ] Re-send the confirmation email after a meeting change (Calendar notifies, we do not).
      Measured 2026-10-13: still open. `waitlist/change-meeting/route.ts:32-98` moves the
      Calendar attendee and sends nothing. The sender is private to `submit-form/route.ts`
      and must move to a shared file first. 23 people are on the 2026 Deer Camp waitlist.
- [x] Waitlist form on the event page, gated by `waitlistOpens` / `waitlistCloses`
- [x] Submission upserts the contact and creates a `waitlist` registration
- [x] Add the participant as an attendee on the selected meeting's Calendar event
- [x] Waitlist confirmation email with meeting date, Meet link, and a change link
- [x] Tokenized meeting-change page that moves the Calendar attendee
- [x] Waitlist-close reminder email, sent by the daily `waitlist-reminder` cron
- [x] Meeting emails print the meeting in Eastern time. Fixed 2026-10-14 with
      `formatMeetingTime()` in `src/lib/format-event-date.ts`. The delivered Deer Camp email
      of 2026-10-09 said "Friday, October 16, 2026 at 12:00 AM". The fixture email now says
      "Tuesday, October 13, 2026 at 8:00 PM ET".
- [x] Minors cannot sign up as the adult. Done 2026-10-14 in `src/lib/minor-guard.ts`. The
      waitlist refuses an adult under 18, a minor of 18 or more, and a minor with the adult's
      name. It also refuses an email or name and phone on file for someone under 18. The
      registration form refuses an under-18 token holder and no longer overwrites a birth
      date on file. Proven against the fixture camp: 5 refusals, 1 valid signup.
- [x] Contact lookup ignores letter case. Done 2026-10-14 in `src/lib/contacts/find.ts`. The 4
      case-only pairs were merged (623 to 619 contacts), and migration 037 makes a case
      variant fail loudly. Admins see name-and-phone pairs at `/admin/contacts/duplicates`,
      with a merge that runs as one transaction (migration 036). 2 pairs are left there.
- [x] Email confirmed before approval. Done 2026-10-14. The waitlist email carries a confirm
      link, the board badges unconfirmed people, and both approval paths refuse them. A
      "Send confirm links" button on the event page re-sends the link. Applies only to signups
      from 2026-10-14 on (`EMAIL_CONFIRMATION_STARTS`), so 0 of the 23 Deer Camp registrations
      are blocked. Proven against the fixture camp, end to end.

## Phase 3 — Meetings and approval

- [x] Meeting attendance recorded by moving a person to `meeting_rsvp`
- [x] Rolling approval generates a token and sends the registration invite email
- [x] Denial email
- [x] Show mentor/mentee counts and remaining mentee slots in the admin, at the 3:1 ratio.
      Measured 2026-10-13: already built in commit 7448c2b, at
      `admin/events/[id]/EventPipeline.tsx:323-347`. Slots count registered mentors only.

## Phase 4 — Registration, payment, screening

- [x] Tokenized four-step registration form
- [x] Waiver with full audit trail (text, typed signature, timestamp, IP) and PDF confirmation
- [x] Minor and guardian handling, including nullable email for minors
- [x] Stripe Checkout for mentee fees, confirmed by the Stripe webhook
- [x] VolunteerBadge background checks: order, webhook, and a nightly poll that does not trust it
- [x] Screening adjudication: review modal, three-officer panel, irreversible decline
- [x] Automatic refund on an adverse action, less processing and check fees
- [x] Registration fee copy states who gets a refund and who does not
- [x] Camp details withheld from anyone not cleared to attend

## Phase 5 — Matching and welcome

- [x] Auto-match on interest overlap, max 3 mentees per mentor, guardian pairs kept together
- [x] Manual match and unmatch in the admin
- [x] Role-specific welcome packet email with camp locations and perks, gated on screening
- [x] Mentors are asked about a shirt rather than charged for one
- [ ] Attach the print guide PDF to the welcome packet email. Measured 2026-10-13: still open
      and blocked on the file. No print guide PDF is in the repo and the Sanity `event`
      schema has no field for one. The send at `welcome-packet/route.ts:320` has no
      attachments.

## Phase 6 — Camp admin board

- [x] `position()` in `camp-pipeline.ts`: one person, one column, always
- [x] Seven-column board with drag and drop, requirement badges on cards
- [x] Attendance settable per person by dragging into Attended
- [x] Categorised exit: turned away and dropped out, each with a required reason
- [x] Table view with its own sorting, filtering, and bulk actions
- [x] Every transition written to a timeline, with the historical ones reconstructed
- [x] Per-person history on the contact profile
- [x] Requirement badges hidden on past camps, which predate the requirements
- [x] Summary header stops being the navigation

## Phase 7 — Email platform on Resend

- [x] Phase 0: shared React Email layout, all transactional email migrated onto it
- [x] Phase 1: Direct Mail removed, contacts imported, live signup sync enabled
- [x] Phase 2: event campaigns as Broadcasts
- [x] Phase 4: pre and post camp surveys on their own cron
- [x] Phase 5: mentee nurture sequence
- [ ] Direct Mail teardown: cancel the e57 subscription, drop `DIRECT_MAIL_*` and dead `GOOGLE_SHEETS_*` vars from Vercel.
      Measured 2026-10-13: `src/` has 0 references to either prefix. `scripts/setup-sheets.mjs`
      has 3 and is dead, so delete it. The Vercel variables are not measured, because
      `scripts/vercel.sh` has no command that lists them. Moved first because it is the
      only item here that needs no design.
- [ ] Phase 3: monthly newsletter template and an admin draft generator from Sanity events and blog.
      Measured 2026-10-13: nothing built. 0 of 15 templates in `src/emails/templates/` is a
      newsletter, and no design document exists for it.
- [ ] Settle the event-email send cadence. Measured 2026-10-13: a decision, with no code.

## Phase 8 — Fundraising and store

- [x] Stripe donations, one-off and recurring, with receipts and a manage page
- [x] Donor "cover the fees" top-up
- [ ] Merchandise store
- [ ] Register with NCDOR before the store opens
- [ ] Claim the E-585 sales tax refund on tax already paid (three-year bar, some is expiring)

## Phase 9 — Governance and compliance

- [x] Admin auth, role-based invites, last-admin guard, RLS on admin tables
- [x] Screening decisions recorded in writing, as the policy requires
- [ ] Board adopts the background screening policy (draft v0.4, needs a vote)
- [ ] Decide the NC sales tax items above at the same meeting

## Verification

- [x] `verify-oo` skill at `.claude/skills/verify-oo/`: launches the app, signs into the
      admin without a password, drives a feature, and captures evidence to `.verify/`
- [x] Feature map at `.claude/skills/verify-oo/features/`, covering the camp board,
      registration, screening, the welcome packet, and the waitlist
- [ ] Map donations, the nurture sequence, surveys, and partner events. Measured 2026-10-13:
      still open, 5 features mapped. `features/README.md` lists 7 unmapped surfaces, which
      adds admin invites, the Studio, and the marketing pages to these 4.
