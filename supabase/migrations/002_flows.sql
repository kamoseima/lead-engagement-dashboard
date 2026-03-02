-- Flows
-- Stores user-created message flows with V2 recursive step format.

create table flows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  fallback jsonb,
  created_by uuid not null references dashboard_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_flows_org on flows(org_id);
create index idx_flows_created_by on flows(created_by);

-- RLS
alter table flows enable row level security;

-- All org members can read flows
create policy "Org members can view flows"
  on flows for select
  using (org_id = (select org_id from dashboard_users where id = auth.uid()));

-- Admins can create flows
create policy "Admins can create flows"
  on flows for insert
  with check (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

-- Admins can update flows
create policy "Admins can update flows"
  on flows for update
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

-- Admins can delete flows
create policy "Admins can delete flows"
  on flows for delete
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

create trigger flows_updated_at
  before update on flows
  for each row execute function update_updated_at();
