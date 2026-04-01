-- Opportunity Outdoors: Initial Schema
-- Single source of truth for contacts, registrations, applications, and workflow state

-- Enum types
CREATE TYPE registration_status AS ENUM (
  'waitlist', 'meeting_rsvp', 'approved', 'denied', 'registered', 'attended'
);

CREATE TYPE event_type AS ENUM (
  'hunt-camp', 'fish-camp', 'community', 'workshop'
);

CREATE TYPE event_status AS ENUM (
  'draft', 'waitlist-open', 'registration-open', 'sold-out', 'completed', 'archived'
);

-- ══════════════════════════════════════════════
-- Contacts: one row per person, email is unique
-- ══════════════════════════════════════════════
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone text,
  city_state text,
  tshirt_size text,
  experience_level text,
  interests text[] DEFAULT '{}',
  gear_status text,
  source text,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- Mentee Applications
-- ══════════════════════════════════════════════
CREATE TABLE mentee_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  date_of_birth date,
  sex text,
  outdoor_interests text[] DEFAULT '{}',
  experience_level text,
  gear_status text,
  how_heard text,
  affiliations text,
  about_yourself text,
  parent_name text,
  parent_phone text,
  parent_email text,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- Mentor Applications
-- ══════════════════════════════════════════════
CREATE TABLE mentor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  date_of_birth date,
  sex text,
  outdoor_skills text[] DEFAULT '{}',
  years_experience text,
  mentored_before text,
  how_heard text,
  certifications text[] DEFAULT '{}',
  affiliations text,
  why_mentor text,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- Events: operational mirror of Sanity events
-- ══════════════════════════════════════════════
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanity_id text UNIQUE,
  title text NOT NULL,
  event_type event_type NOT NULL,
  status event_status DEFAULT 'draft',
  date_start timestamptz,
  date_end timestamptz,
  location text,
  cost text,
  spots_total int,
  spots_remaining int,
  meeting_date timestamptz,
  meeting_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- Registrations: one row per person per event
-- ══════════════════════════════════════════════
CREATE TABLE registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status registration_status DEFAULT 'waitlist',
  role text,
  payment_status text DEFAULT 'none',
  waiver_signed boolean DEFAULT false,
  token text UNIQUE,
  meeting_date_selected timestamptz,
  emergency_contact_name text,
  emergency_contact_phone text,
  transportation text,
  dietary_medical text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, event_id)
);

-- ══════════════════════════════════════════════
-- Sponsorship Inquiries
-- ══════════════════════════════════════════════
CREATE TABLE sponsorship_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_name text,
  budget_range text,
  opportunity_interest text[] DEFAULT '{}',
  about_company text,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- Donations (future use)
-- ══════════════════════════════════════════════
CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  amount numeric(10,2),
  date timestamptz DEFAULT now(),
  method text,
  campaign text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_registrations_contact ON registrations(contact_id);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_token ON registrations(token);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_mentee_applications_contact ON mentee_applications(contact_id);
CREATE INDEX idx_mentor_applications_contact ON mentor_applications(contact_id);
CREATE INDEX idx_events_sanity_id ON events(sanity_id);

-- ══════════════════════════════════════════════
-- Updated_at trigger
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentee_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- Authenticated admin users get full access.
CREATE POLICY "Admin full access" ON contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON mentee_applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON mentor_applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON registrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON sponsorship_inquiries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON donations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
