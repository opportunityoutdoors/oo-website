-- Harden admin membership: enforce last-admin invariant at the DB layer and lock down
-- both admin tables with RLS. Without RLS, anyone holding the anon key can POST directly
-- to admin_users via the REST API and escalate privileges; the service client used by
-- app routes bypasses RLS, so deny-all has zero cost to existing code paths.
--
-- DEPLOY ORDER: apply this migration BEFORE deploying the app code that depends on it.
-- The matching app change removes redundant app-layer last-admin count checks and relies
-- on the trigger below to raise P0001 (mapped to HTTP 409 by src/lib/admin/errors.ts).
-- Running this migration against an older app version is harmless; deploying the new app
-- code before the migration leaves a window with no last-admin guard at all.

-- Last-admin guard: a BEFORE trigger on admin_users that blocks any UPDATE/DELETE which
-- would leave zero rows with role='admin'. Uses SELECT ... FOR UPDATE to serialize
-- concurrent demote/remove operations — app-layer count checks are raceable.
create or replace function enforce_last_admin()
returns trigger
language plpgsql
as $$
declare
  remaining int;
begin
  -- Only care about transitions that reduce the admin count.
  if tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' then
    null; -- fall through
  elsif tg_op = 'DELETE' and old.role = 'admin' then
    null; -- fall through
  else
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Lock remaining admin rows to serialize concurrent transitions. FOR UPDATE is
  -- invalid alongside aggregates, so lock in a subquery and count the result.
  select count(*) into remaining from (
    select 1
    from admin_users
    where role = 'admin'
      and id <> old.id
    for update
  ) locked;

  if remaining = 0 then
    raise exception 'Cannot remove or demote the last admin'
      using errcode = 'P0001';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists enforce_last_admin_trg on admin_users;
create trigger enforce_last_admin_trg
  before update or delete on admin_users
  for each row
  execute function enforce_last_admin();

-- Deny-all RLS. The service-role client used by server routes bypasses RLS; the anon
-- and authenticated roles (public key) must have no direct access to these tables.
alter table admin_users enable row level security;
alter table admin_invites enable row level security;

-- No policies created = no rows visible/writable to non-service roles. Explicit.
