-- Store the applicant's link to their background check form.
--
-- WHY. The provider emails an invite, and relying on that alone is a real failure mode:
-- someone pays for a camp, the email lands in spam, they never complete the check, and they
-- cannot attend an event they have already paid for. That is the worst outcome this feature
-- can produce, and it is entirely avoidable.
--
-- With the link stored, the confirmation page shown immediately after payment can carry a
-- button straight to it. The person is already on our site with the payment fresh, which is
-- the best moment they will ever be in to finish. The email drops to being a backup.
--
-- Embedding the form was the first choice and is not possible: their apply page sends
-- x-frame-options: SAMEORIGIN, so it cannot be iframed. Linking out is as close as the
-- provider allows.
--
-- Stored rather than reconstructed from background_check_id. The pattern is currently
-- https://www.volunteerbadge.com/apply/{id}, but building that string in our code would bake
-- one vendor's URL scheme into a deliberately vendor-neutral design, and would break
-- silently if they changed it.

alter table contacts
  add column background_check_url text,

  -- When the invite was created. Two uses: showing "sent 3 days ago" next to a resend
  -- control, and finding people who were invited and never finished.
  add column background_check_invited_at timestamptz,

  -- Invites lapse. VolunteerBadge returns expiresAt, currently 14 days out. Stored so an
  -- expired link can be recognised and re-issued rather than sending someone to a dead page.
  add column background_check_url_expires_at timestamptz;

comment on column contacts.background_check_url is
  'Applicant-facing link to the provider''s form. Surfaced in-app after payment so completion never depends on an email arriving.';

-- "Who was invited and has not finished" is the question that turns a stalled registration
-- into a phone call, and it wants an index once there is any volume.
create index contacts_bg_invited_idx on contacts (background_check_invited_at)
  where background_check_status = 'invited';
