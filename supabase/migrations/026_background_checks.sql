-- Background check state, on CONTACTS rather than registrations.
--
-- Migration 011 put background_check_status and background_check_id on `registrations`,
-- which models a check as per-event. That is wrong for how this will actually work: checks
-- are per person and valid for a year, so a mentor attending three camps is screened once,
-- not three times. Storing it per registration would re-charge and re-screen them each
-- time, and give three places for the answer to disagree with itself.
--
-- The 011 columns are left in place but should be treated as dead. Nothing writes them and
-- nothing should start.
--
-- DELIBERATELY NOT STORED: the report itself, the SSN, or any offense detail. The provider
-- holds all of that. We keep a status, a provider reference, and dates. That keeps the most
-- sensitive category of data off this database entirely, and means a breach here exposes
-- "this person was screened" rather than anyone's criminal history.

create type background_check_status as enum (
  -- Never invited. The starting state for everyone.
  'none',
  -- Invite sent, applicant has not completed their side yet.
  'invited',
  -- Submitted to the provider, results not back. Minutes for a database pass, up to 72
  -- hours when county-level research is needed.
  'pending',
  -- Came back with nothing reportable. The only status that permits participation.
  'clear',
  -- Something surfaced. NOT a decision: a human reviews and adjudicates. FCRA expects an
  -- individualized assessment of what the record is, how old, and whether it is relevant.
  'flagged',
  -- A human reviewed a flag and declined the person. Terminal, and triggers the adverse
  -- action sequence rather than a silent rejection.
  'declined',
  -- Was clear, passed its expiry. Distinct from 'none' so the admin can tell a lapsed
  -- volunteer from a new one.
  'expired',
  -- Provider could not complete it (bad identity match, applicant abandoned). Needs a human.
  'error'
);

alter table contacts
  add column background_check_status background_check_status not null default 'none',

  -- Which provider produced it. Named so a future migration to another vendor can tell old
  -- records from new ones rather than silently mixing them.
  add column background_check_provider text,

  -- The provider's own id for the check. Their webhooks reference this, so it is the join
  -- key back to a contact. Stored rather than passing our id to them, because the API has
  -- no custom-reference field.
  add column background_check_id text,

  add column background_check_completed_at timestamptz,

  -- Completed + 1 year. Stored rather than computed so the validity window is a fact about
  -- the record instead of a rule scattered across queries, and so the term can change later
  -- without retroactively expiring or extending everyone.
  add column background_check_expires_at timestamptz,

  -- Set when a human adjudicates a flag. Free text for the reasoning, NOT the report
  -- contents. Someone will eventually need to explain a decision.
  add column background_check_reviewed_at timestamptz,
  add column background_check_reviewed_by uuid references admin_users(id) on delete set null;

comment on column contacts.background_check_status is
  'Per person, not per event. Only ''clear'' with a future expires_at permits participation.';
comment on column contacts.background_check_id is
  'Provider''s check id. Join key for their webhooks. Never store report contents here.';

create unique index contacts_background_check_id_key
  on contacts (background_check_id)
  where background_check_id is not null;

-- "Who needs a check" and "whose is about to lapse" are the two questions the admin and the
-- registration flow will ask constantly.
create index contacts_bg_status_idx on contacts (background_check_status);
create index contacts_bg_expiry_idx on contacts (background_check_expires_at)
  where background_check_status = 'clear';

comment on column registrations.background_check_status is
  'DEAD. Superseded by contacts.background_check_status in migration 026: checks are per person and annual, not per event. Do not read or write.';
