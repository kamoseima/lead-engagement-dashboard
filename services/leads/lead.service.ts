/**
 * Lead Service
 *
 * CRUD, scoring, pipeline management, and activity tracking for leads.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { type StepResult, success, failure } from '@/lib/shared/result';
import type {
  Lead,
  LeadActivity,
  LeadPipelineStage,
  ActivityType,
  ActivitySource,
} from '@/types/database';

// ============================================================================
// LIST / GET
// ============================================================================

export interface LeadFilters {
  segment?: string;
  pipeline_stage?: string;
  min_score?: number;
  max_score?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedLeads {
  leads: Lead[];
  total: number;
  page: number;
  page_size: number;
}

export async function listLeads(
  orgId: string,
  filters: LeadFilters = {}
): Promise<StepResult<PaginatedLeads>> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.page_size ?? 50, 100);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  if (filters.segment) query = query.eq('segment', filters.segment);
  if (filters.pipeline_stage) query = query.eq('pipeline_stage', filters.pipeline_stage);
  if (filters.min_score != null) query = query.gte('score', filters.min_score);
  if (filters.max_score != null) query = query.lte('score', filters.max_score);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) return failure('INTERNAL_ERROR', error.message);

  return success({
    leads: (data ?? []) as Lead[],
    total: count ?? 0,
    page,
    page_size: pageSize,
  });
}

export async function getLead(leadId: string): Promise<StepResult<Lead>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (error || !data) return failure('NOT_FOUND', 'Lead not found');
  return success(data as Lead);
}

// ============================================================================
// CREATE / UPDATE
// ============================================================================

export interface CreateLeadInput {
  name?: string;
  phone: string;
  email?: string;
  tags?: string[];
}

export async function createLead(
  orgId: string,
  input: CreateLeadInput
): Promise<StepResult<Lead>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      name: input.name || null,
      phone: input.phone,
      email: input.email || null,
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return failure('CONFLICT', 'Lead with this phone already exists');
    return failure('INTERNAL_ERROR', error.message);
  }
  return success(data as Lead);
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  tags?: string[];
  pipeline_stage?: LeadPipelineStage;
  metadata?: Record<string, unknown>;
}

export async function updateLead(
  leadId: string,
  input: UpdateLeadInput
): Promise<StepResult<Lead>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leads')
    .update(input)
    .eq('id', leadId)
    .select()
    .single();

  if (error || !data) return failure('NOT_FOUND', 'Lead not found');
  return success(data as Lead);
}

export async function deleteLead(leadId: string): Promise<StepResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success(undefined);
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function bulkUpdateStage(
  leadIds: string[],
  stage: LeadPipelineStage
): Promise<StepResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leads')
    .update({ pipeline_stage: stage })
    .in('id', leadIds)
    .select('id');

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success(data?.length ?? 0);
}

export async function bulkAddTag(
  leadIds: string[],
  tag: string
): Promise<StepResult<number>> {
  // Supabase doesn't support array_append in update, so we fetch + update each
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, tags')
    .in('id', leadIds);

  if (error) return failure('INTERNAL_ERROR', error.message);

  let updated = 0;
  for (const lead of leads || []) {
    const tags = lead.tags as string[];
    if (!tags.includes(tag)) {
      await supabase
        .from('leads')
        .update({ tags: [...tags, tag] })
        .eq('id', lead.id);
      updated++;
    }
  }
  return success(updated);
}

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

export async function getLeadActivity(
  leadId: string
): Promise<StepResult<LeadActivity[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lead_activity')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success((data ?? []) as LeadActivity[]);
}

/**
 * Record activity for a lead, upserting the lead if it doesn't exist.
 * Uses admin client (called from webhooks/cron, not user-facing).
 */
export async function recordActivity(
  orgId: string,
  phone: string,
  activityType: ActivityType,
  source: ActivitySource,
  sourceId?: string,
  leadName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();

  // Upsert lead by (org_id, phone)
  const { data: lead, error: upsertError } = await supabase
    .from('leads')
    .upsert(
      {
        org_id: orgId,
        phone,
        name: leadName || null,
      },
      { onConflict: 'org_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (upsertError || !lead) {
    console.error('[lead-service] Failed to upsert lead:', upsertError?.message);
    return;
  }

  // Insert activity (trigger will recalculate score)
  const { error: activityError } = await supabase
    .from('lead_activity')
    .insert({
      lead_id: lead.id,
      org_id: orgId,
      activity_type: activityType,
      source,
      source_id: sourceId || null,
      metadata: metadata || {},
    });

  if (activityError) {
    console.error('[lead-service] Failed to insert activity:', activityError.message);
  }

  // Auto-advance pipeline stage
  if (activityType === 'sent') {
    await supabase
      .from('leads')
      .update({ pipeline_stage: 'contacted' })
      .eq('id', lead.id)
      .eq('pipeline_stage', 'new');
  } else if (activityType === 'replied' || activityType === 'clicked') {
    await supabase
      .from('leads')
      .update({ pipeline_stage: 'engaged' })
      .eq('id', lead.id)
      .in('pipeline_stage', ['new', 'contacted']);
  }
}

// ============================================================================
// SCORE BREAKDOWN
// ============================================================================

export interface ScoreBreakdown {
  total: number;
  byType: { type: ActivityType; count: number; points: number }[];
}

const POINTS: Record<ActivityType, number> = {
  replied: 20, clicked: 15, delivered: 5, sent: 1, failed: -10, bounced: -10,
};

export async function getScoreBreakdown(
  leadId: string
): Promise<StepResult<ScoreBreakdown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lead_activity')
    .select('activity_type')
    .eq('lead_id', leadId);

  if (error) return failure('INTERNAL_ERROR', error.message);

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.activity_type] = (counts[row.activity_type] || 0) + 1;
  }

  const byType = Object.entries(counts).map(([type, count]) => ({
    type: type as ActivityType,
    count,
    points: count * (POINTS[type as ActivityType] || 0),
  }));

  const total = byType.reduce((sum, b) => sum + b.points, 0);
  return success({ total, byType });
}

// ============================================================================
// SYNC / BACKFILL
// ============================================================================

export async function syncLeadsFromCampaignSends(
  orgId: string
): Promise<StepResult<{ created: number; activities: number }>> {
  const supabase = createAdminClient();

  const { data: sends, error } = await supabase
    .from('campaign_sends')
    .select('lead_name, lead_phone, status, campaign_id, sent_at, delivered_at, replied_at')
    .eq('org_id', orgId);

  if (error) return failure('INTERNAL_ERROR', error.message);

  const statusToActivity: Record<string, ActivityType> = {
    sent: 'sent',
    delivered: 'delivered',
    replied: 'replied',
    failed: 'failed',
  };

  let created = 0;
  let activities = 0;

  for (const send of sends || []) {
    // Upsert lead
    const { data: lead } = await supabase
      .from('leads')
      .upsert(
        {
          org_id: orgId,
          phone: send.lead_phone,
          name: send.lead_name || null,
        },
        { onConflict: 'org_id,phone', ignoreDuplicates: false }
      )
      .select('id')
      .single();

    if (!lead) continue;
    created++;

    // Create activity from send status
    const actType = statusToActivity[send.status];
    if (actType) {
      await supabase.from('lead_activity').insert({
        lead_id: lead.id,
        org_id: orgId,
        activity_type: actType,
        source: 'campaign',
        source_id: send.campaign_id,
      });
      activities++;
    }
  }

  return success({ created, activities });
}
