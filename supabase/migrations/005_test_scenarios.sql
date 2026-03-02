-- Test Scenarios
-- Custom test scenarios linked to user flows.

create table test_scenarios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  description text,
  flow_id uuid references flows(id) on delete set null,
  template_name text,
  is_builtin boolean not null default false,
  config jsonb default '{}'::jsonb,
  created_by uuid references dashboard_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_test_scenarios_org on test_scenarios(org_id);

-- RLS
alter table test_scenarios enable row level security;

-- All org members can view scenarios (including builtins)
create policy "Org members can view scenarios"
  on test_scenarios for select
  using (
    is_builtin = true
    or org_id = (select org_id from dashboard_users where id = auth.uid())
  );

-- Admins can manage custom scenarios
create policy "Admins can create scenarios"
  on test_scenarios for insert
  with check (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

create policy "Admins can update scenarios"
  on test_scenarios for update
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
    and is_builtin = false
  );

create policy "Admins can delete scenarios"
  on test_scenarios for delete
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
    and is_builtin = false
  );

create trigger test_scenarios_updated_at
  before update on test_scenarios
  for each row execute function update_updated_at();
