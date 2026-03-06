/**
 * Export Service
 *
 * Generates CSV exports for leads, campaign sends, and webhook events.
 */

import { createClient } from '@/lib/supabase/server';
import { type StepResult, success, failure } from '@/lib/shared/result';

// ============================================================================
// CSV GENERATION
// ============================================================================

interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string;
}

function generateCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const header = columns.map(c => escape(c.header)).join(',');
  const body = rows
    .map(row => columns.map(c => escape(c.accessor(row))).join(','))
    .join('\n');

  return `${header}\n${body}`;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function exportCampaignSends(
  orgId: string,
  campaignId?: string,
  from?: string,
  to?: string
): Promise<StepResult<string>> {
  const supabase = await createClient();

  let query = supabase
    .from('campaign_sends')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10000);

  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return failure('INTERNAL_ERROR', error.message);

  type Send = NonNullable<typeof data>[number];
  const csv = generateCsv<Send>(data || [], [
    { header: 'Lead Name', accessor: r => r.lead_name || '' },
    { header: 'Lead Phone', accessor: r => r.lead_phone || '' },
    { header: 'Template', accessor: r => r.template_name || '' },
    { header: 'Status', accessor: r => r.status || '' },
    { header: 'Sent At', accessor: r => r.sent_at || '' },
    { header: 'Delivered At', accessor: r => r.delivered_at || '' },
    { header: 'Replied At', accessor: r => r.replied_at || '' },
    { header: 'Error', accessor: r => r.error || '' },
  ]);

  return success(csv);
}

export async function exportLeads(
  orgId: string
): Promise<StepResult<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .order('score', { ascending: false })
    .limit(10000);

  if (error) return failure('INTERNAL_ERROR', error.message);

  type Lead = NonNullable<typeof data>[number];
  const csv = generateCsv<Lead>(data || [], [
    { header: 'Name', accessor: r => r.name || '' },
    { header: 'Phone', accessor: r => r.phone || '' },
    { header: 'Email', accessor: r => r.email || '' },
    { header: 'Score', accessor: r => String(r.score) },
    { header: 'Segment', accessor: r => r.segment || '' },
    { header: 'Stage', accessor: r => r.pipeline_stage || '' },
    { header: 'Tags', accessor: r => (r.tags as string[]).join('; ') },
    { header: 'First Seen', accessor: r => r.first_seen_at || '' },
    { header: 'Last Activity', accessor: r => r.last_activity_at || '' },
  ]);

  return success(csv);
}

export async function exportWebhookEvents(
  orgId: string,
  from?: string,
  to?: string
): Promise<StepResult<string>> {
  const supabase = await createClient();

  let query = supabase
    .from('webhook_events')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10000);

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return failure('INTERNAL_ERROR', error.message);

  type Event = NonNullable<typeof data>[number];
  const csv = generateCsv<Event>(data || [], [
    { header: 'Timestamp', accessor: r => r.created_at || '' },
    { header: 'Event Type', accessor: r => r.event_type || '' },
    { header: 'Channel', accessor: r => r.channel || '' },
    { header: 'Status', accessor: r => r.processing_result || '' },
    { header: 'Signature Valid', accessor: r => String(r.signature_valid) },
    { header: 'Error', accessor: r => r.error || '' },
    { header: 'Payload', accessor: r => JSON.stringify(r.payload) },
  ]);

  return success(csv);
}
