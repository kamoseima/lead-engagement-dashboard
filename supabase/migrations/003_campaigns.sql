-- Campaigns
-- Stores campaign definitions with leads and send configuration.

create type campaign_status as enum ('draft', 'scheduled', 'sending', 'completed', 'paused', 'failed');

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  description text,
  flow_id uuid references flows(id) on delete set null,
  template_name text,
  status campaign_status not null default 'draft',
  leads jsonb not null default '[]'::jsonb,
  schedule_at timestamptz,
  config jsonb default '{}'::jsonb,
  created_by uuid not null references dashboard_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_campaigns_org on campaigns(org_id);
create index idx_campaigns_status on campaigns(status);
create index idx_campaigns_created_by on campaigns(created_by);

-- RLS
alter table campaigns enable row level security;

-- All org members can view campaigns
create policy "Org members can view campaigns"
  on campaigns for select
  using (org_id = (select org_id from dashboard_users where id = auth.uid()));

-- Admins and agents can create campaigns
create policy "Org members can create campaigns"
  on campaigns for insert
  with check (org_id = (select org_id from dashboard_users where id = auth.uid()));

-- Admins can update any campaign; agents can update their own
create policy "Admins can update campaigns"
  on campaigns for update
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (
      (select role from dashboard_users where id = auth.uid()) = 'admin'
      or created_by = auth.uid()
    )
  );

-- Only admins can delete campaigns
create policy "Admins can delete campaigns"
  on campaigns for delete
  using (
    org_id = (select org_id from dashboard_users where id = auth.uid())
    and (select role from dashboard_users where id = auth.uid()) = 'admin'
  );

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();
