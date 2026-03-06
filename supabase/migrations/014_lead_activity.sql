-- Lead Activity
-- Tracks every engagement event for lead scoring.

create type activity_type as enum ('sent', 'delivered', 'replied', 'failed', 'bounced', 'clicked');
create type activity_source as enum ('campaign', 'test', 'manual');

create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  org_id uuid not null,
  activity_type activity_type not null,
  source activity_source not null default 'campaign',
  source_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_lead_activity_lead on lead_activity(lead_id);
create index idx_lead_activity_org on lead_activity(org_id);
create index idx_lead_activity_type on lead_activity(activity_type);
create index idx_lead_activity_created on lead_activity(lead_id, created_at desc);

alter table lead_activity enable row level security;

create policy "Org members can view lead activity"
  on lead_activity for select
  using (org_id = auth_user_org_id());

create policy "Org members can create lead activity"
  on lead_activity for insert
  with check (org_id = auth_user_org_id());

-- ============================================================================
-- SCORING FUNCTION
-- ============================================================================

create or replace function recalculate_lead_score(p_lead_id uuid)
returns void as $$
declare
  v_score integer := 0;
  v_segment lead_segment;
  v_activity record;
  v_points integer;
  v_age_days integer;
  v_decay_factor numeric;
begin
  for v_activity in
    select activity_type, created_at
    from lead_activity
    where lead_id = p_lead_id
    order by created_at desc
  loop
    case v_activity.activity_type
      when 'replied' then v_points := 20;
      when 'clicked' then v_points := 15;
      when 'delivered' then v_points := 5;
      when 'sent' then v_points := 1;
      when 'failed' then v_points := -10;
      when 'bounced' then v_points := -10;
    end case;

    v_age_days := extract(day from (now() - v_activity.created_at));
    v_decay_factor := greatest(0.1, 1.0 - (v_age_days / 300.0));
    v_score := v_score + round(v_points * v_decay_factor);
  end loop;

  if v_score >= 80 then v_segment := 'hot';
  elsif v_score >= 40 then v_segment := 'warm';
  elsif v_score >= 0 then v_segment := 'cold';
  else v_segment := 'unresponsive';
  end if;

  update leads
  set score = v_score,
      segment = v_segment,
      updated_at = now()
  where id = p_lead_id;
end;
$$ language plpgsql security definer;

-- Trigger: recalculate score on new activity
create or replace function trigger_recalculate_score()
returns trigger as $$
begin
  perform recalculate_lead_score(NEW.lead_id);
  update leads set last_activity_at = NEW.created_at where id = NEW.lead_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger lead_activity_score_trigger
  after insert on lead_activity
  for each row execute function trigger_recalculate_score();
