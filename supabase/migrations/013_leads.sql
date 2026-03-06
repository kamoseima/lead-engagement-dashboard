-- Leads
-- Canonical lead records aggregated from campaigns and test runs.

create type lead_segment as enum ('hot', 'warm', 'cold', 'unresponsive');
create type lead_pipeline_stage as enum ('new', 'contacted', 'engaged', 'qualified', 'converted', 'lost');

create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text,
  phone text not null,
  email text,
  score integer not null default 0,
  segment lead_segment not null default 'cold',
  pipeline_stage lead_pipeline_stage not null default 'new',
  tags text[] not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_activity_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_leads_org_phone on leads(org_id, phone);
create index idx_leads_org on leads(org_id);
create index idx_leads_segment on leads(org_id, segment);
create index idx_leads_score on leads(org_id, score desc);
create index idx_leads_pipeline_stage on leads(org_id, pipeline_stage);

alter table leads enable row level security;

create policy "Org members can view leads"
  on leads for select
  using (org_id = auth_user_org_id());

create policy "Org members can create leads"
  on leads for insert
  with check (org_id = auth_user_org_id());

create policy "Org members can update leads"
  on leads for update
  using (org_id = auth_user_org_id());

create policy "Admins can delete leads"
  on leads for delete
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();
