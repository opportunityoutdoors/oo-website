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

- [x] Waitlist form on the event page, gated by `waitlistOpens` / `waitlistCloses`
- [x] Submission upserts the contact and creates a `waitlist` registration
- [x] Add the participant as an attendee on the selected meeting's Calendar event
- [x] Waitlist confirmation email with meeting date, Meet link, and a change link
- [x] Tokenized meeting-change page that moves the Calendar attendee
- [x] Waitlist-close reminder email, sent by the daily `waitlist-reminder` cron
- [ ] Re-send the confirmation email after a meeting change (Calendar notifies, we do not)

## Phase 3 — Meetings and approval

- [x] Meeting attendance recorded by moving a person to `meeting_rsvp`
- [x] Rolling approval generates a token and sends the registration invite email
- [x] Denial email
- [ ] Show mentor/mentee counts and remaining mentee slots in the admin, at the 3:1 ratio

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
- [ ] Attach the print guide PDF to the welcome packet email

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
- [ ] Phase 3: monthly newsletter template and an admin draft generator from Sanity events and blog
- [ ] Settle the event-email send cadence
- [ ] Direct Mail teardown: cancel the e57 subscription, drop `DIRECT_MAIL_*` and dead `GOOGLE_SHEETS_*` vars from Vercel

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
