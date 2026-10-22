-- One shared Google Calendar event per camp.
--
-- Registration used to create a separate calendar event for every registrant. Each camp now
-- has one all-day event, created on the first registration, and each registrant is added to
-- it as a guest. Null until then.

alter table events add column camp_calendar_event_id text;
