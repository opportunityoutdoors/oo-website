-- Background check, Stripe payment, and meeting change token
ALTER TABLE registrations
  ADD COLUMN background_check_status text DEFAULT 'not_started',
  ADD COLUMN background_check_id text,
  ADD COLUMN stripe_payment_id text,
  ADD COLUMN payment_amount numeric(10,2),
  ADD COLUMN meeting_change_token text UNIQUE;
