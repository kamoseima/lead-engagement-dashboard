-- Dashboard Users
-- Stores user profiles with roles. Linked to Supabase Auth via id.

create type user_role as enum ('admin', 'agent');

create table dashboard_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'agent',
  org_id uuid not null,
  invited_by uuid references dashboard_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dashboard_users_org on dashboard_users(org_id);
create index idx_dashboard_users_email on dashboard_users(email);

-- RLS
alter table dashboard_users enable row level security;

-- Users can read other users in their org
create policy "Users can view org members"
  on dashboard_users for select
  using (org_id = (select org_id from dashboard_users where id = auth.uid()));

-- Admins can insert (invite) users in their org
create policy "Admins can invite users"
  on dashboard_users for insert
  with check (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

-- Admins can update users in their org
create policy "Admins can update org members"
  on dashboard_users for update
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

-- Users can update their own profile
create policy "Users can update own profile"
  on dashboard_users for update
  using (id = auth.uid());

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger dashboard_users_updated_at
  before update on dashboard_users
  for each row execute function update_updated_at();
