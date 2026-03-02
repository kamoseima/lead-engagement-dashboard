-- Campaign Sends
-- Individual send records for each lead in a campaign.

create type send_status as enum ('pending', 'queued', 'sent', 'delivered', 'failed', 'replied');

create table campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  org_id uuid not null,
  lead_name text,
  lead_phone text not null,
  template_name text,
  variables jsonb,
  status send_status not null default 'pending',
  provider_message_id text,
  idempotency_key text,
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_campaign_sends_campaign on campaign_sends(campaign_id);
create index idx_campaign_sends_org on campaign_sends(org_id);
create index idx_campaign_sends_status on campaign_sends(status);
create unique index idx_campaign_sends_idempotency on campaign_sends(idempotency_key) where idempotency_key is not null;

-- RLS
alter table campaign_sends enable row level security;

-- All org members can view sends
create policy "Org members can view sends"
  on campaign_sends for select
  using (org_id = (select org_id from dashboard_users where id = auth.uid()));

-- Org members can create sends
create policy "Org members can create sends"
  on campaign_sends for insert
  with check (org_id = (select org_id from dashboard_users where id = auth.uid()));

-- System can update send status (via service role)
create policy "Org members can update sends"
  on campaign_sends for update
  using (org_id = (select org_id from dashboard_users where id = auth.uid()));
