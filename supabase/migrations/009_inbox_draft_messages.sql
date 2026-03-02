-- Inbox Draft Messages
-- Auto-saved draft messages per conversation per agent.

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
