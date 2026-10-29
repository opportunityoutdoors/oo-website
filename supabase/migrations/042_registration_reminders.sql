-- Reminders to finish registering.
--
-- Someone approved for a camp who has not registered gets a reminder 7 days and 2 days
-- before registration closes, with their own link. The close date lives in Sanity, so it is
-- mirrored here like the registration fee. Empty means registration runs to the start date.
-- The count makes each reminder send once.

alter table events
  add column registration_closes timestamptz;

alter table registrations
  add column registration_reminders_sent smallint not null default 0,
  add column registration_reminded_at timestamptz;

-- The timeline records each reminder, so the admin can see who was nudged and when.
alter table registration_events drop constraint registration_events_kind_known;
alter table registration_events
  add constraint registration_events_kind_known check (
    kind in (
      'created',
      'status_change',
      'meeting_selected',
      'registered',
      'waiver_signed',
      'paid',
      'refunded',
      'check_ordered',
      'check_reminder',
      'check_result',
      'panel_decision',
      'matched',
      'packet_sent',
      'attended',
      'registration_reminder'   -- a 7 day or 2 day reminder to finish registering
    )
  );
