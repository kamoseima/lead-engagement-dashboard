-- Inbox Agent Preferences
-- Dashboard-local preferences for inbox behavior per agent.

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
