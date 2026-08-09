-- One chronological log of everything that happens to a registration.
--
-- registration_moves only recorded drags on the camp board. Every other transition happened
-- silently: the Approve and Register buttons, every bulk action, payment arriving, a check
-- being ordered or coming back, matching, marking somebody attended. So a profile showed the
-- one or two things somebody had dragged and none of the rest, which is a worse lie than
-- showing nothing.
--
-- Generalised rather than replaced, because the move rows already recorded are real history
-- and throwing them away to build a history table would be its own joke.

alter table registration_moves rename to registration_events;
alter index registration_moves_registration_idx rename to registration_events_registration_idx;

alter table registration_events
  -- What happened. Free text against a check constraint rather than an enum: these are
  -- operational categories that will grow, and adding an enum value is a migration.
  add column kind text not null default 'status_change',

  -- Who did it. moved_by already exists and stays null for anything the system did on its
  -- own; source says which, so the UI can print "automatic" rather than an empty space and
  -- leave a reader wondering whether the name failed to load.
  add column source text not null default 'admin',

  -- Anything worth saying that is not a status: an amount, a provider result, a mentor name.
  add column detail text;

alter table registration_events
  rename column moved_at to occurred_at;

-- to_status only means something for a status change. A payment has no destination status.
alter table registration_events alter column to_status drop not null;

alter table registration_events
  add constraint registration_events_kind_known check (
    kind in (
      'created',          -- joined the waitlist
      'status_change',    -- moved between positions, by drag or button
      'meeting_selected', -- chose a zoom slot
      'registered',       -- completed the registration form
      'waiver_signed',
      'paid',
      'refunded',
      'check_ordered',
      'check_result',     -- the provider came back
      'panel_decision',   -- a review was recorded; the reasoning lives in background_check_reviews
      'matched',
      'packet_sent',
      'attended'
    )
  ),
  add constraint registration_events_source_known check (
    source in ('admin', 'system', 'participant')
  );

comment on table registration_events is
  'Append-only chronological log of everything that happens to a registration. Rows before 2026-08-09 were reconstructed from timestamps that already existed; anything after is written as it happens.';
comment on column registration_events.source is
  'admin = a person in the dashboard. participant = the registrant themselves. system = a webhook or cron, with no human actor, in which case moved_by is null.';

create index registration_events_kind_idx on registration_events (registration_id, kind);

-- ── Backfill ────────────────────────────────────────────────────────────────
--
-- Most of the history already existed as timestamps on rows nobody was reading in this
-- order. Reconstructing it means a profile shows a real sequence for people who registered
-- long before any of this was built, rather than starting everyone's story today.
--
-- Deliberately conservative: only facts with a timestamp attached are inserted. Where the
-- database records that something happened but not when, it is left out rather than guessed
-- at, because an invented date in an audit log is worse than a gap.

insert into registration_events (registration_id, kind, source, occurred_at, to_status, detail)
select id, 'created', 'participant', created_at, 'waitlist', null
from registrations
where created_at is not null;

insert into registration_events (registration_id, kind, source, occurred_at, detail)
select id, 'waiver_signed', 'participant', waiver_signed_at, waiver_signature_name
from registrations
where waiver_signed_at is not null;

insert into registration_events (registration_id, kind, source, occurred_at, detail)
select id, 'paid', 'system', paid_at, '$' || to_char(coalesce(payment_amount, 0), 'FM999999990.00')
from registrations
where paid_at is not null;

insert into registration_events (registration_id, kind, source, occurred_at, detail)
select id, 'refunded', 'system', refunded_at, '$' || to_char(coalesce(refunded_amount, 0), 'FM999999990.00')
from registrations
where refunded_at is not null;

insert into registration_events (registration_id, kind, source, occurred_at, detail)
select id, 'packet_sent', 'admin', welcome_packet_sent_at, null
from registrations
where welcome_packet_sent_at is not null;

-- Screening lives on the contact, so these land on each of that person's registrations. A
-- check is about the person; showing it under every camp they were part of is correct, and
-- is the same reason the profile puts screening above the event list.
insert into registration_events (registration_id, kind, source, occurred_at, detail)
select r.id, 'check_ordered', 'system', c.background_check_invited_at, null
from registrations r
join contacts c on c.id = r.contact_id
where c.background_check_invited_at is not null;

insert into registration_events (registration_id, kind, source, occurred_at, detail)
select r.id, 'check_result', 'system', c.background_check_completed_at, c.background_check_status::text
from registrations r
join contacts c on c.id = r.contact_id
where c.background_check_completed_at is not null;

-- decided_by carried across, or the timeline reads "unknown" for the one kind of entry
-- whose whole point is who decided it.
insert into registration_events (registration_id, kind, source, occurred_at, detail, moved_by)
select r.id, 'panel_decision', 'admin', b.decided_at, b.decision, b.decided_by
from registrations r
join background_check_reviews b on b.contact_id = r.contact_id;
