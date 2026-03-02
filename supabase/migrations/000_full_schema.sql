-- =============================================================================
-- Lead Engagement Dashboard — Full Schema
-- =============================================================================
-- Run this file once to create all tables, enums, indexes, RLS policies,
-- and triggers for the lead-engagement-dashboard.
-- =============================================================================


-- =============================================================================
-- 1. Enums
-- =============================================================================

create type user_role as enum ('admin', 'agent');
create type campaign_status as enum ('draft', 'scheduled', 'sending', 'completed', 'paused', 'failed');
create type send_status as enum ('pending', 'queued', 'sent', 'delivered', 'failed', 'replied');
create type test_run_status as enum ('running', 'waiting_reply', 'completed', 'failed', 'timeout');


-- =============================================================================
-- 2. Shared trigger function
-- =============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- =============================================================================
-- 2b. RLS helper functions (SECURITY DEFINER — bypass RLS to avoid recursion)
-- =============================================================================

create or replace function auth_user_org_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from dashboard_users where id = auth.uid()
$$;

create or replace function auth_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from dashboard_users where id = auth.uid()
$$;


-- =============================================================================
-- 3. Dashboard Users
-- =============================================================================

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

alter table dashboard_users enable row level security;

create policy "Users can view org members"
  on dashboard_users for select
  using (org_id = auth_user_org_id());

create policy "Admins can invite users"
  on dashboard_users for insert
  with check (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create policy "Admins can update org members"
  on dashboard_users for update
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create policy "Users can update own profile"
  on dashboard_users for update
  using (id = auth.uid());

create trigger dashboard_users_updated_at
  before update on dashboard_users
  for each row execute function update_updated_at();


-- =============================================================================
-- 4. Flows
-- =============================================================================

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

alter table flows enable row level security;

create policy "Org members can view flows"
  on flows for select
  using (org_id = auth_user_org_id());

create policy "Admins can create flows"
  on flows for insert
  with check (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create policy "Admins can update flows"
  on flows for update
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create policy "Admins can delete flows"
  on flows for delete
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create trigger flows_updated_at
  before update on flows
  for each row execute function update_updated_at();


-- =============================================================================
-- 5. Campaigns
-- =============================================================================

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

alter table campaigns enable row level security;

create policy "Org members can view campaigns"
  on campaigns for select
  using (org_id = auth_user_org_id());

create policy "Org members can create campaigns"
  on campaigns for insert
  with check (org_id = auth_user_org_id());

create policy "Admins can update campaigns"
  on campaigns for update
  using (
    org_id = auth_user_org_id()
    and (
      auth_user_role() = 'admin'
      or created_by = auth.uid()
    )
  );

create policy "Admins can delete campaigns"
  on campaigns for delete
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();


-- =============================================================================
-- 6. Campaign Sends
-- =============================================================================

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

alter table campaign_sends enable row level security;

create policy "Org members can view sends"
  on campaign_sends for select
  using (org_id = auth_user_org_id());

create policy "Org members can create sends"
  on campaign_sends for insert
  with check (org_id = auth_user_org_id());

create policy "Org members can update sends"
  on campaign_sends for update
  using (org_id = auth_user_org_id());


-- =============================================================================
-- 7. Test Scenarios
-- =============================================================================

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

alter table test_scenarios enable row level security;

create policy "Org members can view scenarios"
  on test_scenarios for select
  using (
    is_builtin = true
    or org_id = auth_user_org_id()
  );

create policy "Admins can create scenarios"
  on test_scenarios for insert
  with check (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create policy "Admins can update scenarios"
  on test_scenarios for update
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
    and is_builtin = false
  );

create policy "Admins can delete scenarios"
  on test_scenarios for delete
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
    and is_builtin = false
  );

create trigger test_scenarios_updated_at
  before update on test_scenarios
  for each row execute function update_updated_at();


-- =============================================================================
-- 8. Test Runs
-- =============================================================================

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

alter table test_runs enable row level security;

create policy "Org members can view test runs"
  on test_runs for select
  using (org_id = auth_user_org_id());

create policy "Admins can create test runs"
  on test_runs for insert
  with check (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );

create policy "Admins can update test runs"
  on test_runs for update
  using (
    org_id = auth_user_org_id()
    and auth_user_role() = 'admin'
  );


-- =============================================================================
-- 9. Inbox Agent Preferences
-- =============================================================================

create table inbox_agent_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references dashboard_users(id) on delete cascade,
  org_id uuid not null,
  default_status_filter text not null default 'open',
  default_sort text not null default 'last_message_at',
  notification_sound boolean not null default true,
  desktop_notifications boolean not null default true,
  auto_assign_on_reply boolean not null default true,
  signature text,
  default_channel text not null default 'whatsapp',
  send_on_enter boolean not null default true,
  sidebar_collapsed boolean not null default false,
  compact_view boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index idx_inbox_prefs_user on inbox_agent_preferences(user_id);

alter table inbox_agent_preferences enable row level security;

create policy "Users manage own inbox preferences"
  on inbox_agent_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger inbox_agent_preferences_updated_at
  before update on inbox_agent_preferences
  for each row execute function update_updated_at();


-- =============================================================================
-- 10. Inbox Pinned Conversations
-- =============================================================================

create table inbox_pinned_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references dashboard_users(id) on delete cascade,
  org_id uuid not null,
  conversation_sid text not null,
  pinned_at timestamptz not null default now(),
  unique(user_id, conversation_sid)
);

create index idx_pinned_conv_user on inbox_pinned_conversations(user_id);

alter table inbox_pinned_conversations enable row level security;

create policy "Users manage own pinned conversations"
  on inbox_pinned_conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================================
-- 11. Inbox Draft Messages
-- =============================================================================

create table inbox_draft_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references dashboard_users(id) on delete cascade,
  org_id uuid not null,
  conversation_sid text not null,
  content text not null default '',
  channel text,
  is_note boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(user_id, conversation_sid, is_note)
);

create index idx_draft_msgs_user on inbox_draft_messages(user_id);

alter table inbox_draft_messages enable row level security;

create policy "Users manage own drafts"
  on inbox_draft_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
