-- Leaving the pipeline, and moving around inside it.
--
-- The status enum could say someone was denied but had no way to say they simply never came
-- through: never registered, never paid, stopped replying, told us they could not make it.
-- Those were being recorded as 'denied' or not at all, which conflates a decision OO made
-- and has to be able to defend with ordinary attrition.
--
-- The distinction is not pedantry. Turn-aways say nothing about how the camp is selling;
-- attrition says whether the waitlist is too long, the fee too high, or the gap between the
-- invite and the camp too wide. Collapsed together, neither number means anything.

-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block on older Postgres and
-- cannot be used in the same statement batch that then references the new value. Supabase
-- runs migrations in a transaction, so this is committed here and used from the app only.
alter type registration_status add value if not exists 'withdrawn';

alter table registrations
  -- Why they left. Constrained by the check below rather than a second enum, because these
  -- are operational categories that will be edited as OO learns what actually happens, and
  -- adding an enum value is a migration while adding a string is not.
  add column exit_reason text,
  add column exited_at timestamptz,
  add column exited_by uuid references admin_users(id) on delete set null;

alter table registrations
  add constraint registrations_exit_reason_known check (
    exit_reason is null or exit_reason in (
      -- OO decided. 'screening_declined' is recorded here for completeness but the
      -- authoritative record lives on contacts.background_check_status, because a screening
      -- decision is about a person rather than one registration.
      'denied_at_review',
      'screening_declined',
      'removed_for_conduct',

      -- They did not come through.
      'never_registered',
      'never_paid',
      'stopped_responding',
      'cannot_make_it',
      'withdrew_after_paying',
      -- Added in 032. Distinct from cannot_make_it: one told us, the other left a mentor
      -- waiting at a trailhead.
      'no_show'
    )
  );

comment on column registrations.exit_reason is
  'Why this person is not attending. Always set by a human: nobody is dropped automatically for not paying.';
comment on column registrations.exited_at is
  'When they left the pipeline. Null while they are still in it.';

-- "Who is not attending, and why" is the only query, and it is always scoped to an event.
create index registrations_exit_idx on registrations (event_id, exit_reason)
  where exit_reason is not null;

-- Every move between positions, including backwards.
--
-- Backwards moves are the whole point of the rework: the previous design could only be
-- walked one way. Recording them is what makes that safe rather than merely possible. It is
-- also the same obligation the screening policy already imposes one layer up, where a
-- decision about a person has to be written down.
create table registration_moves (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,

  from_status registration_status,
  to_status registration_status not null,
  -- Set only when the move is out of the pipeline.
  exit_reason text,

  -- Nullable and set null on delete: an admin leaving the organisation must not erase the
  -- record of moves they made.
  moved_by uuid references admin_users(id) on delete set null,
  moved_at timestamptz not null default now(),

  -- Optional free text. Not required, because most moves are unremarkable and demanding a
  -- justification for every drag would train people to type nothing useful.
  note text
);

comment on table registration_moves is
  'Append-only log of position changes on the camp board, including backwards moves. Records what changed, not why the person was suitable: screening reasoning belongs in background_check_reviews.';

create index registration_moves_registration_idx
  on registration_moves (registration_id, moved_at desc);

alter table registration_moves enable row level security;

-- No policies created = no rows visible or writable to non-service roles. Explicit.
