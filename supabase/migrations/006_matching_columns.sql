-- Mentor/mentee matching and guardian linkage
ALTER TABLE registrations
  ADD COLUMN mentor_id uuid REFERENCES registrations(id) ON DELETE SET NULL,
  ADD COLUMN guardian_registration_id uuid REFERENCES registrations(id) ON DELETE SET NULL,
  ADD COLUMN is_board_member boolean DEFAULT false;

CREATE INDEX idx_registrations_mentor ON registrations(mentor_id);
CREATE INDEX idx_registrations_guardian ON registrations(guardian_registration_id);
