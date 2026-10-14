-- Duplicate people, and one atomic way to merge two of them.
--
-- On 2026-10-13, 623 contacts held 31 same-name groups. Four were the same address in a
-- different letter case, because the form looked contacts up with an exact match. Others are
-- the same person returning with a new email. A merge touches eight tables, so it is one
-- function in one transaction rather than eight requests from the app that can stop halfway.

-- Pairs that are probably one person: the same email ignoring case, or the same name and the
-- same last ten phone digits. Older contact first.
create or replace function likely_duplicate_contacts()
returns table (
  reason text,
  a_id uuid, a_name text, a_email text, a_created date, a_registrations bigint,
  b_id uuid, b_name text, b_email text, b_created date, b_registrations bigint
)
language sql stable
as $$
  with c as (
    select id, email, created_at,
           trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as name,
           lower(trim(first_name)) as fn, lower(trim(last_name)) as ln,
           right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) as phone10,
           (select count(*) from registrations r where r.contact_id = contacts.id) as regs
    from contacts
  ), pairs as (
    select distinct on (a.id, b.id)
      case when lower(a.email) = lower(b.email) then 'same email' else 'same name and phone' end as reason,
      a.*, b.id as bid, b.name as bname, b.email as bemail, b.created_at as bcreated, b.regs as bregs
    from c a
    join c b on (a.created_at, a.id) < (b.created_at, b.id)
     and (
       lower(a.email) = lower(b.email)
       or (a.fn = b.fn and a.ln = b.ln and a.fn <> '' and length(a.phone10) = 10 and a.phone10 = b.phone10)
     )
  )
  select reason, id, name, email, created_at::date, regs, bid, bname, bemail, bcreated::date, bregs
  from pairs
  order by created_at desc;
$$;

-- Moves everything that belongs to `drop_id` onto `keep_id`, then deletes `drop_id`.
-- The kept contact's email survives. Its empty fields are filled from the dropped one.
-- Refuses the cases a person must decide: both registered for the same event, or both
-- carrying a background check.
create or replace function merge_contacts(keep_id uuid, drop_id uuid)
returns void
language plpgsql
as $$
declare
  k contacts%rowtype;
  d contacts%rowtype;
begin
  if keep_id = drop_id then
    raise exception 'Cannot merge a contact into itself';
  end if;

  select * into k from contacts where id = keep_id for update;
  select * into d from contacts where id = drop_id for update;
  if k.id is null or d.id is null then
    raise exception 'Contact not found';
  end if;

  if exists (
    select 1 from registrations a join registrations b on a.event_id = b.event_id
    where a.contact_id = keep_id and b.contact_id = drop_id
  ) then
    raise exception 'Both contacts are registered for the same event. Remove one registration first.';
  end if;

  if k.background_check_id is not null and d.background_check_id is not null then
    raise exception 'Both contacts have a background check. Merge them by hand.';
  end if;

  -- A track both are enrolled in keeps the kept contact's enrollment.
  delete from nurture_enrollments n
  where n.contact_id = drop_id
    and exists (select 1 from nurture_enrollments m where m.contact_id = keep_id and m.track = n.track);

  update registrations            set contact_id = keep_id where contact_id = drop_id;
  update nurture_enrollments      set contact_id = keep_id where contact_id = drop_id;
  update donations                set contact_id = keep_id where contact_id = drop_id;
  update mentee_applications      set contact_id = keep_id where contact_id = drop_id;
  update mentor_applications      set contact_id = keep_id where contact_id = drop_id;
  update background_check_reviews set contact_id = keep_id where contact_id = drop_id;
  update survey_responses         set contact_id = keep_id where contact_id = drop_id;
  update sponsorship_inquiries    set contact_id = keep_id where contact_id = drop_id;

  -- Deleted before the kept row is updated, so its unique email and background check id are
  -- free to move across.
  delete from contacts where id = drop_id;

  update contacts set
    first_name        = coalesce(nullif(k.first_name, ''), d.first_name),
    last_name         = coalesce(nullif(k.last_name, ''), d.last_name),
    phone             = coalesce(nullif(k.phone, ''), d.phone),
    tshirt_size       = coalesce(k.tshirt_size, d.tshirt_size),
    experience_level  = coalesce(k.experience_level, d.experience_level),
    interests         = coalesce(k.interests, d.interests),
    gear_status       = coalesce(k.gear_status, d.gear_status),
    tags              = (select array_agg(distinct t) from unnest(coalesce(k.tags, '{}') || coalesce(d.tags, '{}')) t),
    notes             = nullif(concat_ws(E'\n', k.notes, d.notes), ''),
    city              = coalesce(nullif(k.city, ''), d.city),
    state             = coalesce(nullif(k.state, ''), d.state),
    date_of_birth     = coalesce(k.date_of_birth, d.date_of_birth),
    -- A confirmation proves an address, so it only carries across for the same address.
    email_confirmed_at = case
      when lower(k.email) = lower(d.email) then coalesce(k.email_confirmed_at, d.email_confirmed_at)
      else k.email_confirmed_at end,
    background_check_status         = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_status else k.background_check_status end,
    background_check_provider       = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_provider else k.background_check_provider end,
    background_check_id             = coalesce(k.background_check_id, d.background_check_id),
    background_check_completed_at   = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_completed_at else k.background_check_completed_at end,
    background_check_expires_at     = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_expires_at else k.background_check_expires_at end,
    background_check_reviewed_at    = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_reviewed_at else k.background_check_reviewed_at end,
    background_check_reviewed_by    = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_reviewed_by else k.background_check_reviewed_by end,
    background_check_url            = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_url else k.background_check_url end,
    background_check_invited_at     = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_invited_at else k.background_check_invited_at end,
    background_check_url_expires_at = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_url_expires_at else k.background_check_url_expires_at end,
    background_check_alerted_at     = case when k.background_check_id is null and d.background_check_id is not null then d.background_check_alerted_at else k.background_check_alerted_at end,
    updated_at = now()
  where id = keep_id;
end;
$$;

-- Server only. The anon key must never be able to merge or list people.
revoke all on function merge_contacts(uuid, uuid) from public, anon, authenticated;
revoke all on function likely_duplicate_contacts() from public, anon, authenticated;
grant execute on function merge_contacts(uuid, uuid) to service_role;
grant execute on function likely_duplicate_contacts() to service_role;
