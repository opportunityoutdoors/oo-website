-- Pre and post event surveys.
--
-- The board wants measurable outcomes. The number that matters is the DELTA between a
-- person's pre and post answers, which is why responses are keyed to a registration
-- rather than collected in a third-party form. One row per participant per event per kind
-- makes the pairing a single join.
--
-- The six scales below mirror the Google Forms surveys Opportunity Outdoors ran before
-- the website existed, including their original "Not comfortable / Extremely comfortable"
-- wording, so new responses stay comparable to the historical data. Each measures a
-- distinct program outcome rather than one blurred "confidence" figure. comfort_taking_
-- others is the mentorship multiplier: whether we are producing people who bring others
-- out. For a mentorship nonprofit that is the most important column here.
--
-- The two kinds are collected very differently:
--
--   pre  = mandatory, part of the registration form itself. No email, no token, no invite
--          row. Every registration should have exactly one.
--   post = emailed after the event to registrations marked 'attended', gated by a token.
--
-- Deliberately NOT collected here, because the system already knows it from the
-- registration: name, email, which event, its date, its type, and the person's role.
-- Also not collected: years of experience, which is a profile attribute that cannot
-- change over one weekend and so would produce a meaningless delta.
--
-- DEPLOY ORDER: apply this migration BEFORE deploying the app code. The registration
-- routes write a pre response inline, so new app code against the old schema would fail
-- every registration.

create type survey_kind as enum ('pre','post');

-- Post surveys only. Pre responses are collected in the registration form and need no
-- invite, which is why survey_responses.invite_id is nullable.
create table survey_invites (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  kind survey_kind not null default 'post',
  -- The token is the entire authorization check on the survey page, matching the existing
  -- meeting_change_token pattern. It grants nothing beyond answering one's own survey.
  token text unique not null,
  sent_at timestamptz,
  reminder_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (registration_id, kind)
);

create table survey_responses (
  id uuid primary key default gen_random_uuid(),
  -- Null for pre responses, which have no invite.
  invite_id uuid unique references survey_invites(id) on delete cascade,
  registration_id uuid not null references registrations(id) on delete cascade,
  -- contact_id and event_id are denormalized deliberately. Analytics reads these tables
  -- constantly and this keeps every rollup a single query instead of a join chain back
  -- through registrations.
  contact_id uuid not null references contacts(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  kind survey_kind not null,

  -- The six measured dimensions, asked identically pre and post so each yields a delta.
  -- Question wording swaps hunting/fishing/outdoors by event type, but the scale and the
  -- meaning of each column stay fixed.
  comfort_solo smallint check (comfort_solo between 1 and 10),
  comfort_finding_spots smallint check (comfort_finding_spots between 1 and 10),
  comfort_public_land smallint check (comfort_public_land between 1 and 10),
  comfort_taking_others smallint check (comfort_taking_others between 1 and 10),
  knowledge_focus smallint check (knowledge_focus between 1 and 10),
  conservation_involvement smallint check (conservation_involvement between 1 and 10),

  interests text[] default '{}',

  -- Kind-specific free text and extras: expectations (pre); met_expectations, favorite
  -- part, recommend score, and follow-up interest (post). Kept as jsonb so adding a
  -- question later does not need a migration.
  answers jsonb default '{}',

  submitted_at timestamptz default now(),
  -- One pre and one post per participant per event. Prevents a double submit from
  -- skewing the averages.
  unique (registration_id, kind)
);

create index survey_invites_token_idx on survey_invites (token);
create index survey_responses_event_idx on survey_responses (event_id, kind);
create index survey_responses_contact_idx on survey_responses (contact_id);

-- Deny-all RLS. Server routes use the service-role client, which bypasses RLS; the anon
-- and authenticated roles (public key) must have no direct access. Without this, anyone
-- holding the anon key could read every participant's survey answers or forge responses.
alter table survey_invites enable row level security;
alter table survey_responses enable row level security;

-- No policies created = no rows visible or writable to non-service roles. Explicit.
