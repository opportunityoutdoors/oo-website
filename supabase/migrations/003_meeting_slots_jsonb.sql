-- Replace single meeting_date/meeting_link with meeting_slots JSONB array
-- Each slot: { date, label, meetingLink }
ALTER TABLE events ADD COLUMN meeting_slots jsonb DEFAULT '[]';

UPDATE events SET meeting_slots = jsonb_build_array(
  jsonb_build_object('date', meeting_date, 'label', '', 'meetingLink', meeting_link)
) WHERE meeting_date IS NOT NULL;

ALTER TABLE events DROP COLUMN meeting_date;
ALTER TABLE events DROP COLUMN meeting_link;
