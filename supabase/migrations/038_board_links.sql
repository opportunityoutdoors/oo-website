-- Which contact each board member is, so a board member can be put on a camp as a mentor or
-- as staff from the event page.
--
-- Board members are Sanity documents (teamMember), the list the About page shows. Their email
-- is not stored there because the Sanity dataset is public. This table holds the link and is
-- readable only by the server.
--
-- On 2026-10-14 the six board members were linked to their @opportunityoutdoors.org contacts
-- by hand after this ran. A board member with no link can be linked from the camp page.

create table board_links (
  sanity_id  text primary key,
  contact_id uuid not null references contacts(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table board_links enable row level security;
-- No policies: deny everything to anon and authenticated. The service role bypasses RLS.
