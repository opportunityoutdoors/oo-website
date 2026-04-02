-- Private camp locations (synced from Sanity, not shown publicly)
ALTER TABLE events ADD COLUMN camp_locations jsonb DEFAULT '[]';

-- Track welcome packet sends per registration
ALTER TABLE registrations ADD COLUMN welcome_packet_sent boolean DEFAULT false;
ALTER TABLE registrations ADD COLUMN welcome_packet_sent_at timestamptz;
