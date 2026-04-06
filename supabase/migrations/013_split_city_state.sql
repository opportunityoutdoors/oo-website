-- Split city_state into separate city and state columns
ALTER TABLE contacts ADD COLUMN city text;
ALTER TABLE contacts ADD COLUMN state text DEFAULT 'NC';
ALTER TABLE contacts DROP COLUMN city_state;
