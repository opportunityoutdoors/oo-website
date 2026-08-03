-- Who is actually running the event.
--
-- For scraped rows the source key implies it (bha, du, ncwf), but manual entries need it
-- explicitly: "NCWRC" or "Trout Unlimited" cannot be inferred from source = 'manual'.
-- The public events page attributes every partner event, so this is what it displays.
alter table partner_events
  add column organizer text;

-- Backfill the scraped rows so display logic has one field to read rather than a
-- source-key-to-name lookup scattered across the app.
update partner_events set organizer = 'NC Wildlife Federation'        where source = 'ncwf';
update partner_events set organizer = 'Backcountry Hunters & Anglers' where source = 'bha';
update partner_events set organizer = 'Ducks Unlimited'               where source = 'du';
