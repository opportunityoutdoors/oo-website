-- A camp registrant must prove their email reaches them before they can be approved.
--
-- The 2026 Deer Camp waitlist had a signup at "hotamil.com". It passes every format check,
-- so the form took it, and that person received no confirmation, no Calendar invite, and
-- would have received no invitation, waiver, or welcome packet. Only a click on a link sent
-- to the address proves it works.
--
-- Kept on the contact, not the registration: it is a fact about the address, and a person
-- who confirmed it for one camp does not need to again for the next.

alter table contacts
  add column email_confirmed_at timestamptz,
  add column email_confirm_token text;

create unique index contacts_email_confirm_token_key
  on contacts (email_confirm_token)
  where email_confirm_token is not null;
