-- Store full waiver audit trail on registration records
ALTER TABLE registrations
  ADD COLUMN waiver_text text,
  ADD COLUMN waiver_signature_name text,
  ADD COLUMN waiver_signed_at timestamptz,
  ADD COLUMN waiver_ip text;
