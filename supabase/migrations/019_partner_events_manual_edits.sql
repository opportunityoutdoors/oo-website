-- Editing a partner event marks it as ours.
--
-- Source titles are not publishable as-is. BHA publishes
-- "TN & NC BHA Chapters - Great Smokey Mtn Nat'l Park Fishing Day - Jonathon Creek, NC",
-- which needs rewriting before it goes near the events page. Without this flag the next
-- weekly sync would overwrite that edit and the fix would have to be redone every week.
--
-- When true, syncs still refresh last_seen_at (so we know the event still exists) but
-- leave every content field alone.
alter table partner_events
  add column manually_edited boolean not null default false;

-- Set when a sync stops finding a previously seen event. Approved events are never
-- deleted automatically, because a newsletter may already reference them; they are
-- flagged so a human can check whether it was cancelled.
alter table partner_events
  add column missing_since timestamptz;
