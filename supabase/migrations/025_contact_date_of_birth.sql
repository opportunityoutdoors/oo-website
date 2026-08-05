-- Date of birth on contacts, so adult/minor can be determined where it is actually needed.
--
-- WHY IT WAS MISSING. date_of_birth is already collected on mentor_applications and
-- mentee_applications, but the registration and payment flows run off `contacts`, which had
-- no age data at all. Of 600 contacts, only 8 had a DOB reachable through an application;
-- the rest arrived via the 2023 import or the event waitlist, neither of which asked.
--
-- WHY IT MATTERS NOW. Background checks apply to everyone except minors, are charged into
-- the registration fee, and therefore have to be priced BEFORE the total is shown. That
-- makes "is this person an adult" a question the checkout path must answer for anybody, not
-- just the handful who filled in a mentor application.
--
-- The only signal available until now was structural: a registration carrying
-- guardian_registration_id is a minor. That is a reasonable proxy and stays useful as a
-- cross-check, but it is not age. A 17-year-old registering themselves reads as an adult
-- under it, which is exactly the case where getting it wrong costs money and, worse, runs a
-- consumer report on a child.

alter table contacts
  add column date_of_birth date;

comment on column contacts.date_of_birth is
  'Used to decide adult vs minor for background check eligibility and pricing. Null means unknown: treat as UNDETERMINED and ask, never assume adult.';

-- Backfill from the application tables. Only ~8 rows today, but doing it here means the
-- column is never silently emptier than the data we already hold.
update contacts c
set date_of_birth = m.date_of_birth
from mentor_applications m
where m.contact_id = c.id
  and m.date_of_birth is not null
  and c.date_of_birth is null;

update contacts c
set date_of_birth = e.date_of_birth
from mentee_applications e
where e.contact_id = c.id
  and e.date_of_birth is not null
  and c.date_of_birth is null;

-- Deliberately NOT NOT-NULL. 592 existing contacts have no DOB and inventing one would be
-- worse than admitting it is unknown. New waitlist signups collect it; everyone else is
-- prompted the first time it is needed.
create index contacts_dob_missing_idx on contacts (id) where date_of_birth is null;
