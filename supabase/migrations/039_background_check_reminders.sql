-- Reminders for an unfinished background check.
--
-- VolunteerBadge's invite link expires 7 days after it is sent. We remind on day 3 and on
-- day 6, from our own address with the direct link, because their email arrives from a name
-- registrants do not know. The count makes each reminder send once. Both columns reset when
-- a new invite is ordered.

alter table contacts
  add column background_check_reminders_sent smallint not null default 0,
  add column background_check_reminded_at timestamptz;

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
      'check_reminder',   -- a day 3 or day 6 reminder to finish the check
      'check_result',
      'panel_decision',
      'matched',
      'packet_sent',
      'attended'
    )
  );
