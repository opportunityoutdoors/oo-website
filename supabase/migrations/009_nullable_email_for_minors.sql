-- Allow null emails for minor contacts
ALTER TABLE contacts ALTER COLUMN email DROP NOT NULL;

-- Change unique constraint to partial index (allows multiple nulls)
ALTER TABLE contacts DROP CONSTRAINT contacts_email_key;
CREATE UNIQUE INDEX contacts_email_unique ON contacts(email) WHERE email IS NOT NULL;
