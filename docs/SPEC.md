# Opportunity Outdoors — Spec

The roadmap. Phases are areas of work, not a strict order; several run in parallel.

Sources this was assembled from, which stay as the detailed reference:
- [OO-PreCamp-Workflow-Spec.md](OO-PreCamp-Workflow-Spec.md) — the camp workflow, v1.1, 2026-04-03
- [../SPEC-admin-flow.md](../SPEC-admin-flow.md) — the camp board rework, 2026-08-09
- [NC-Sales-Tax-Findings.md](NC-Sales-Tax-Findings.md) — sales tax research
- [OO-Background-Screening-Policy.md](OO-Background-Screening-Policy.md) — screening policy, adopted (gitignored)

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
      link on the slot is unproven until the next Sanity publish of a camp.
      Measured 2026-10-20: open for the next camp only. 2026 Deer Camp needs nothing: John
      added its Meet links to the invites by hand, and its meetings are over. A second path
      also writes slots: `GET /api/admin/events` (`admin/events/route.ts:68-80`) upserts
      every Sanity event and creates Calendar events with no `createMeet`. A slot that this
      path creates first never gets a Meet. Fix that path, then prove both paths on ZZ TEST.
- [ ] Re-send the confirmation email after a meeting change (Calendar notifies, we do not).
      Measured 2026-10-20: still open, same shape. `waitlist/change-meeting/route.ts`
      (99 lines) moves the Calendar attendee at lines 67-95 and sends nothing. The sender
      `sendWaitlistConfirmation` is still private at `submit-form/route.ts:787` and must
      move to a shared file first. Not needed for 2026 Deer Camp, because its meetings are
      over. Kept for the next camp.
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
- [x] Code of conduct in the camp waiver. Built 2026-10-20, pushed to main the same day. The six rules
      and the no-refund removal line are section 13 of `WAIVER_TEXT` in
      `register/RegisterForm.tsx`, and "Entire Agreement" is now section 14. Proven on the
      fixture camp: the waiver step shows section 13, and the submitted registration stored
      all 6322 characters in `registrations.waiver_text`. Earlier signers keep their text.
      Board members at a camp sign no waiver, by decision of 2026-10-16.
- [x] Step 3 "Continue" no longer submits the registration. Found and fixed 2026-10-20. The
      Continue and Complete Registration buttons shared one DOM node, so the click that moved
      to step 4 became a form submit and skipped Review and pay. Each button now has its own
      `key`. Proven on the fixture camp: Continue on step 3 stops at Review and pay with no
      `POST /api/register` and no database change, and Complete Registration then submits.

## Phase 5 — Matching and welcome

- [x] Auto-match on interest overlap, max 3 mentees per mentor, guardian pairs kept together
- [x] Manual match and unmatch in the admin
- [x] Role-specific welcome packet email with camp locations and perks, gated on screening
- [x] Mentors are asked about a shirt rather than charged for one

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
- [x] T-shirt count on the camp page. Done 2026-10-14: sizes for people registered and paid,
      with a progress bar of how many of everyone approved have got there. Older word sizes
      ("Large", "XXL") map to S to 3XL. Proven on the fixture camp.
- [x] Board members on a camp as Mentor or Staff. Done 2026-10-14, revised 2026-10-16: a
      Board panel on the camp page lists the 6 board members from Sanity, with a shirt size
      for each. Both roles are pre-registered with no email, owe nothing, land in Ready, get
      no welcome packet, and count for shirts. Proven on the fixture camp: no email sent.

## Phase 7 — Email platform on Resend

- [x] Phase 0: shared React Email layout, all transactional email migrated onto it
- [x] Phase 1: Direct Mail removed, contacts imported, live signup sync enabled
- [x] Phase 2: event campaigns as Broadcasts
- [x] Phase 4: pre and post camp surveys on their own cron
- [x] Phase 5: mentee nurture sequence
- [x] Direct Mail teardown. Closed 2026-10-20 by John Trice: Direct Mail is no longer in use.
      `src/` has 0 references to `DIRECT_MAIL_*` or `GOOGLE_SHEETS_*`. The dead
      `scripts/setup-sheets.mjs` is still in the repo. Phase 3, the newsletter, moved to
      BACKLOG.md until there is an email strategy.

## Phase 8 — Fundraising and store

- [x] Stripe donations, one-off and recurring, with receipts and a manage page
- [x] Donor "cover the fees" top-up
- [ ] Merchandise store
- [ ] Register with NCDOR before the store opens
- [ ] Claim the E-585 sales tax refund on tax already paid (three-year bar, some is expiring)

## Phase 9 — Governance and compliance

- [ ] Decide the NC sales tax items above at the same meeting
- [x] Admin auth, role-based invites, last-admin guard, RLS on admin tables
- [x] Screening decisions recorded in writing, as the policy requires
- [x] Board adopts the background screening policy. Approval of draft v0.4 reported by John
      Trice on 2026-10-20. The vendor retention period in section 11.2 is still open.

## Verification

- [x] `verify-oo` skill at `.claude/skills/verify-oo/`: launches the app, signs into the
      admin without a password, drives a feature, and captures evidence to `.verify/`
- [x] Feature map at `.claude/skills/verify-oo/features/`, covering the camp board,
      registration, screening, the welcome packet, and the waitlist
