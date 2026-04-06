-- Track whether waitlist close reminder has been sent per event
ALTER TABLE events ADD COLUMN waitlist_reminder_sent boolean DEFAULT false;
