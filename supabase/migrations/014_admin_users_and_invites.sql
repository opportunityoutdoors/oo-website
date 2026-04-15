-- Admin membership + invite system.
-- Two roles: 'admin' (can invite + change roles) and 'editor' (full app access except user management).
-- admin_users links an auth.users row to a role. Middleware/layout should reject any signed-in
-- user who doesn't have a matching admin_users row.

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists admin_users_email_idx on admin_users (lower(email));

create table if not exists admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('admin', 'editor')),
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists admin_invites_email_idx on admin_invites (lower(email));
create index if not exists admin_invites_token_hash_idx on admin_invites (token_hash);

-- Seed bootstrap admin. Idempotent: only inserts if the auth user exists and no admin_users row yet.
insert into admin_users (user_id, email, role)
select u.id, u.email, 'admin'
from auth.users u
where lower(u.email) = 'john.trice@opportunityoutdoors.org'
  and not exists (select 1 from admin_users a where a.user_id = u.id)
on conflict (user_id) do nothing;
