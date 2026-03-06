-- Webhook Event Log
-- Records every incoming webhook for audit/debugging visibility.

create type webhook_processing_result as enum ('success', 'error', 'ignored', 'pending');

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_type text not null,
  channel text,
  payload jsonb not null default '{}'::jsonb,
  source_ip text,
  signature_valid boolean not null default false,
  processing_result webhook_processing_result not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

create index idx_webhook_events_org on webhook_events(org_id);
create index idx_webhook_events_event_type on webhook_events(event_type);
create index idx_webhook_events_channel on webhook_events(channel);
create index idx_webhook_events_created_at on webhook_events(created_at desc);
create index idx_webhook_events_processing_result on webhook_events(processing_result);

-- RLS: org members can read their own org's events
alter table webhook_events enable row level security;

create policy "Org members can view webhook events"
  on webhook_events for select
  using (org_id = auth_user_org_id());
