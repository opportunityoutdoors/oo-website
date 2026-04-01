-- Add waitlist-closed status to match Sanity event statuses
ALTER TYPE event_status ADD VALUE 'waitlist-closed' AFTER 'waitlist-open';
