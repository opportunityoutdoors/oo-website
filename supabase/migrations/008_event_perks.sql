-- Role-specific perks for welcome packet emails
ALTER TABLE events
  ADD COLUMN mentor_perks jsonb DEFAULT '[]',
  ADD COLUMN mentee_perks jsonb DEFAULT '[]';
