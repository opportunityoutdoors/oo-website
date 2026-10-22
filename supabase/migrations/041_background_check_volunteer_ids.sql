-- VolunteerBadge identifiers we can actually match their results on.
--
-- We stored only the application id from POST /applications. None of their result events
-- carry it: check.complete and check.adjudicated name a check id and a volunteer id. Only
-- application.submitted links application to volunteer, and volunteer.created links
-- volunteer to email. So we keep the volunteer id from either, and the check id once a
-- result names it, and both the webhook and the poll match on those.

alter table contacts
  add column background_check_volunteer_id text,
  add column background_check_check_id text;

create index contacts_background_check_volunteer_id_idx
  on contacts (background_check_volunteer_id) where background_check_volunteer_id is not null;
create index contacts_background_check_check_id_idx
  on contacts (background_check_check_id) where background_check_check_id is not null;
