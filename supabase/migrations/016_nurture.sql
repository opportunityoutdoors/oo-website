-- Nurture sequences for mentee and mentor applicants.
--
-- Today an applicant who submits the mentee or mentor form receives nothing at all:
-- sendNotificationEmail in src/app/api/submit-form/route.ts only fires for the contact
-- and sponsorship form types. These tables drive a timed series that opens with an
-- immediate acknowledgment and follows up over the next two weeks.
--
-- Timing is driven by our own daily cron (src/app/api/cron/nurture/route.ts) rather than
-- Resend Automations, so the copy lives in src/lib/nurture/sequences.ts under version
-- control instead of in the Resend dashboard.
--
-- DEPLOY ORDER: apply this migration BEFORE deploying the app code. The enrollment write
-- in submit-form is best-effort inside after(), so an older app against this schema is
-- harmless, but new app code against the old schema would fail every enrollment.

create type nurture_track as enum ('mentee','mentor');
create type nurture_status as enum ('active','completed','stopped');

-- One row per person per track. The UNIQUE constraint is what makes re-applying a no-op:
-- someone who submits the mentee form twice stays on their original schedule rather than
-- restarting the series and receiving day 0 again.
create table nurture_enrollments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  track nurture_track not null,
  status nurture_status default 'active',
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  stopped_at timestamptz,
  -- Long-lived opt-out link emailed in every step's footer. Raw (not hashed) to match
  -- the existing meeting_change_token pattern; it grants nothing beyond unsubscribing.
  opt_out_token text unique not null,
  unique (contact_id, track)
);

-- One row per step actually sent. The UNIQUE constraint is the idempotency guarantee:
-- a re-run of the cron, a retry, or a duplicate invocation cannot send the same step to
-- the same person twice, because the insert conflicts.
create table nurture_sends (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references nurture_enrollments(id) on delete cascade,
  step_key text not null,
  sent_at timestamptz default now(),
  resend_message_id text,
  unique (enrollment_id, step_key)
);

create index nurture_enrollments_status_idx on nurture_enrollments (status);
create index nurture_enrollments_contact_idx on nurture_enrollments (contact_id);
create index nurture_sends_enrollment_idx on nurture_sends (enrollment_id);

-- Deny-all RLS. Server routes use the service-role client, which bypasses RLS; the anon
-- and authenticated roles (public key) must have no direct access. Without this, anyone
-- holding the anon key could read the applicant list or forge enrollments.
alter table nurture_enrollments enable row level security;
alter table nurture_sends enable row level security;

-- No policies created = no rows visible or writable to non-service roles. Explicit.
