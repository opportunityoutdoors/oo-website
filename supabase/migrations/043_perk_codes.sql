-- Unique perk codes, one per mentee.
--
-- OnX gives the camp a batch of single-use promo codes, a different one for each mentee
-- (2026-11-10). An admin pastes the batch on the camp page. Each adult mentee gets one code
-- from the pool when their welcome packet is sent, and keeps it if the packet is sent again.
-- The label names the pool ("OnX"), so a camp can carry more than one sponsor's codes.

create table perk_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  code text not null,
  registration_id uuid references registrations(id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, label, code),
  -- One code from each pool per person, even if two sends overlap.
  unique (event_id, label, registration_id)
);

create index perk_codes_free on perk_codes (event_id, label) where registration_id is null;

-- Codes are worth money. Deny-all RLS, so only the service client can read them.
alter table perk_codes enable row level security;

-- The code this registration holds from this pool, claiming a free one if it holds none.
-- Null when the pool is empty. SKIP LOCKED lets two sends claim different codes at once.
create function claim_perk_code(p_event uuid, p_label text, p_registration uuid)
returns text
language plpgsql
as $$
declare
  c text;
begin
  select code into c from perk_codes
   where event_id = p_event and label = p_label and registration_id = p_registration;
  if found then
    return c;
  end if;

  update perk_codes
     set registration_id = p_registration, assigned_at = now()
   where id = (
     select id from perk_codes
      where event_id = p_event and label = p_label and registration_id is null
      order by created_at, code
      limit 1
      for update skip locked
   )
  returning code into c;
  return c;
end;
$$;

revoke all on function claim_perk_code(uuid, text, uuid) from public, anon, authenticated;
