-- Local events from partner organizations, for the public events page.
--
-- Every row lands as 'pending' and is invisible until a human approves it in
-- /admin/partner-events. That is not ceremony: the reachable sources are dominated by
-- fundraising banquets and habitat workdays, and only a minority of what they publish is
-- relevant to an Opportunity Outdoors reader. The queue is where that judgment happens.
--
-- source = 'manual' covers anything with no machine-readable feed, notably NCWRC, whose
-- events live only in a licensing portal whose robots.txt disallows all automated access.

create type partner_event_status as enum ('pending','approved','rejected','hidden');

create table partner_events (
  id uuid primary key default gen_random_uuid(),

  -- Adapter key ('bha', 'du', 'ncwf') or 'manual'.
  source text not null,
  -- Stable id from the source, used to recognise the same event on the next sync. For
  -- manual rows this is a generated uuid. The unique pair is what makes syncing
  -- idempotent: re-running the cron updates rather than duplicating.
  source_uid text not null,

  title text not null,
  url text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  city text,
  state text default 'NC',
  cost text,
  description text,

  status partner_event_status not null default 'pending',
  -- Set when a human acts on it, so the queue can show who approved what.
  reviewed_by uuid references admin_users(id) on delete set null,
  reviewed_at timestamptz,

  -- first_seen/last_seen let us spot events that vanished from a source without deleting
  -- an approved row out from under a newsletter that already references it.
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),

  created_at timestamptz default now(),
  unique (source, source_uid)
);

create index partner_events_status_idx on partner_events (status, starts_at);
create index partner_events_upcoming_idx on partner_events (starts_at) where status = 'approved';

-- Per-source health. A scraper that breaks does not throw, it quietly returns zero rows,
-- which looks identical to "nothing scheduled". Recording each run makes that visible.
create table partner_event_syncs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  ran_at timestamptz default now(),
  found int not null default 0,
  created int not null default 0,
  updated int not null default 0,
  ok boolean not null default true,
  error text
);

create index partner_event_syncs_source_idx on partner_event_syncs (source, ran_at desc);

-- Deny-all RLS. Server routes use the service-role client, which bypasses RLS.
alter table partner_events enable row level security;
alter table partner_event_syncs enable row level security;
