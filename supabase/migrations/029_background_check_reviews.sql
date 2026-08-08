-- An audit trail for background check adjudication.
--
-- Until now nothing in the app could move a contact out of 'flagged'. Only the provider
-- webhook, the poller, and order.ts wrote background_check_status, and evaluateEligibility
-- treats 'flagged' as needs_check. So a flagged person who registered again was charged for
-- and sent another check, indefinitely, while the panel that reviewed them had nowhere to
-- record what it decided.
--
-- Migration 026 anticipated this: it added background_check_reviewed_at and
-- background_check_reviewed_by, and its comment promised "free text for the reasoning".
-- That column was never created. The two columns it did add answer "was this adjudicated"
-- but not "what was decided, by whom, and why", which is the part someone will eventually
-- have to explain.
--
-- A separate table rather than more columns on contacts, for three reasons. A person can be
-- reviewed more than once across years and each review is its own fact. The screening policy
-- requires a written record of EVERY review regardless of outcome, including the ones that
-- clear someone, so overwriting a single column would destroy exactly the record the policy
-- asks for. And an append-only log is far easier to defend than a mutable field.
--
-- DELIBERATELY NOT STORED: the report, the offense, the disposition, any of it. The reason
-- field records the DECISION, not the RECORD. Same principle as 026. A breach here should
-- expose "the panel reviewed this person and cleared them", never anyone's criminal history.

create table background_check_reviews (
  id uuid primary key default gen_random_uuid(),

  contact_id uuid not null references contacts(id) on delete cascade,

  -- Nullable and set null on delete: an admin leaving the org must not erase the record of
  -- a decision they made. The name is preserved separately in panel_present for that reason.
  decided_by uuid references admin_users(id) on delete set null,
  decided_at timestamptz not null default now(),

  decision text not null check (decision in (
    -- Panel reviewed the finding and agreed the person may participate. Sets status to
    -- 'clear' with a fresh 12 month expiry, exactly as a clean provider result would.
    'cleared',

    -- Panel could NOT agree to clear. This does not decline anyone and does not refund.
    -- It records the decision to begin the FCRA adverse action sequence, which must run
    -- through the provider: pre-adverse notice, five business day dispute window, final
    -- notice. The provider's adverse_action.completed webhook is what sets 'declined' and
    -- issues the refund. Declining here directly would skip the notice period the FCRA
    -- requires and the applicant's right to dispute.
    'adverse_action',

    -- Disqualified on grounds that are NOT a consumer report: refusal to consent, willful
    -- non-compliance, failure to disclose a pending charge. No report drove this decision,
    -- so no FCRA adverse action notice is owed and the refund can be issued immediately.
    -- This is the one decision that both declines and refunds in a single step.
    'disqualified',

    -- Accepted a check completed elsewhere within the last 12 months, per policy 2.2.
    'outside_check'
  )),

  -- Who was in the room. The screening policy requires the names of everyone present at a
  -- review, and the panel is three officers who must agree unanimously to clear. Stored as
  -- text rather than a join because it is a historical attestation: it must still read
  -- correctly in five years after those people have left the board.
  panel_present text not null,

  -- Discussion and reasoning. Required, including for a clear: "we reviewed and it was
  -- fine" is a record, "" is not.
  reason text not null check (length(trim(reason)) > 0),

  -- Where the person was before and after. Kept on the row so the log reads on its own
  -- without reconstructing state from the contact's current value, which later reviews
  -- will have changed.
  status_before background_check_status,
  status_after background_check_status,

  -- Only for 'outside_check': who ran it and when it completed. The expiry is derived from
  -- the completion date, not from today, so accepting a check that is already ten months
  -- old grants two months of cover rather than a fresh year.
  outside_provider text,
  outside_completed_at timestamptz,

  constraint outside_check_needs_provenance check (
    decision <> 'outside_check'
    or (outside_provider is not null and outside_completed_at is not null)
  )
);

comment on table background_check_reviews is
  'Append-only log of background check adjudications. Records the DECISION, never the report contents. Required by the screening policy for every review regardless of outcome.';
comment on column background_check_reviews.reason is
  'The panel''s reasoning. Must never contain offense details, dispositions, or anything from the consumer report.';
comment on column background_check_reviews.decision is
  'adverse_action does NOT decline or refund: it records the decision to start the provider''s FCRA sequence, which ends in the adverse_action.completed webhook.';

-- "Show me this person's review history" is the query, and it is always by contact.
create index background_check_reviews_contact_idx
  on background_check_reviews (contact_id, decided_at desc);

alter table background_check_reviews enable row level security;

-- No policies created = no rows visible or writable to non-service roles. Explicit.
-- This table is more sensitive than most: it names people who were reviewed and why.
