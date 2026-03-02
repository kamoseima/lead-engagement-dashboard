-- Test Runs
-- Records of test executions.

create type test_run_status as enum ('running', 'waiting_reply', 'completed', 'failed', 'timeout');

create table test_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references test_scenarios(id) on delete set null,
  org_id uuid not null,
  lead_name text,
  lead_phone text not null,
  status test_run_status not null default 'running',
  messages jsonb not null default '[]'::jsonb,
  template_name text,
  variables jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references dashboard_users(id)
);

create index idx_test_runs_org on test_runs(org_id);
create index idx_test_runs_scenario on test_runs(scenario_id);
create index idx_test_runs_status on test_runs(status);

-- RLS
alter table test_runs enable row level security;

create policy "Org members can view test runs"
  on test_runs for select
  using (org_id = (select org_id from dashboard_users where id = auth.uid()));

create policy "Admins can create test runs"
  on test_runs for insert
  with check (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

create policy "Admins can update test runs"
  on test_runs for update
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );
