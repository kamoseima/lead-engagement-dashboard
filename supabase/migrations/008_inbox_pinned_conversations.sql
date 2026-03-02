-- Inbox Pinned Conversations
-- Per-agent pinned conversations for quick access.

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
