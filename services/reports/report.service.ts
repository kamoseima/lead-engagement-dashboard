/**
 * Report Service
 *
 * Aggregates data from campaign_sends, campaigns, and leads tables.
 */

import { createClient } from '@/lib/supabase/server';
import { type StepResult, success, failure } from '@/lib/shared/result';
import type {
  OverviewMetrics,
  CampaignPerformanceRow,
  SegmentDistribution,
  DailyActivity,
  ReportData,
} from '@/types/reports';

export async function getFullReport(
  orgId: string,
  from: string,
  to: string
): Promise<StepResult<ReportData>> {
  const [overview, performance, timeline, segments] = await Promise.all([
    getOverviewMetrics(orgId, from, to),
    getCampaignPerformance(orgId, from, to),
    getActivityTimeline(orgId, from, to),
    getSegmentDistribution(orgId),
  ]);

  if (!overview.success) return overview;
  if (!performance.success) return performance;
  if (!timeline.success) return timeline;

  return success({
    overview: overview.data,
    campaignPerformance: performance.data,
    timeline: timeline.data,
    segments: segments.success ? segments.data : undefined,
  });
}

export async function getOverviewMetrics(
  orgId: string,
  from: string,
  to: string
): Promise<StepResult<OverviewMetrics>> {
  const supabase = await createClient();

  const { data: sends, error } = await supabase
    .from('campaign_sends')
    .select('status')
    .eq('org_id', orgId)
    .gte('created_at', from)
    .lte('created_at', to);

  if (error) return failure('INTERNAL_ERROR', error.message);

  const all = sends || [];
  const sent = all.filter(s => ['sent', 'delivered', 'replied'].includes(s.status)).length;
  const delivered = all.filter(s => ['delivered', 'replied'].includes(s.status)).length;
  const replied = all.filter(s => s.status === 'replied').length;

  // Count unique phones as leads
  const { count: totalLeads } = await supabase
    .from('campaign_sends')
    .select('lead_phone', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Active = replied in date range
  const { count: activeLeads } = await supabase
    .from('campaign_sends')
    .select('lead_phone', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'replied')
    .gte('replied_at', from)
    .lte('replied_at', to);

  return success({
    totalLeads: totalLeads ?? 0,
    activeLeads: activeLeads ?? 0,
    messagesSent: sent,
    replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
  });
}

export async function getCampaignPerformance(
  orgId: string,
  from: string,
  to: string
): Promise<StepResult<CampaignPerformanceRow[]>> {
  const supabase = await createClient();

  // Get campaigns
  const { data: campaigns, error: campError } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('org_id', orgId);

  if (campError) return failure('INTERNAL_ERROR', campError.message);

  // Get all sends in range
  const { data: sends, error: sendError } = await supabase
    .from('campaign_sends')
    .select('campaign_id, status')
    .eq('org_id', orgId)
    .gte('created_at', from)
    .lte('created_at', to);

  if (sendError) return failure('INTERNAL_ERROR', sendError.message);

  // Aggregate
  const counts = new Map<string, { total: number; delivered: number; replied: number; failed: number }>();
  for (const send of sends || []) {
    const c = counts.get(send.campaign_id) || { total: 0, delivered: 0, replied: 0, failed: 0 };
    c.total++;
    if (['delivered', 'replied'].includes(send.status)) c.delivered++;
    if (send.status === 'replied') c.replied++;
    if (send.status === 'failed') c.failed++;
    counts.set(send.campaign_id, c);
  }

  const rows: CampaignPerformanceRow[] = (campaigns || [])
    .map(camp => {
      const c = counts.get(camp.id) || { total: 0, delivered: 0, replied: 0, failed: 0 };
      return {
        campaignId: camp.id,
        campaignName: camp.name,
        totalSends: c.total,
        delivered: c.delivered,
        replied: c.replied,
        failed: c.failed,
        replyRate: c.total > 0 ? Math.round((c.replied / c.total) * 100) : 0,
      };
    })
    .filter(r => r.totalSends > 0)
    .sort((a, b) => b.totalSends - a.totalSends);

  return success(rows);
}

export async function getSegmentDistribution(
  orgId: string
): Promise<StepResult<SegmentDistribution>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .select('segment')
    .eq('org_id', orgId);

  if (error) return failure('INTERNAL_ERROR', error.message);

  const dist: SegmentDistribution = { hot: 0, warm: 0, cold: 0, unresponsive: 0 };
  for (const row of data || []) {
    if (row.segment in dist) dist[row.segment as keyof SegmentDistribution]++;
  }
  return success(dist);
}

export async function getActivityTimeline(
  orgId: string,
  from: string,
  to: string
): Promise<StepResult<DailyActivity[]>> {
  const supabase = await createClient();

  const { data: sends, error } = await supabase
    .from('campaign_sends')
    .select('status, created_at')
    .eq('org_id', orgId)
    .gte('created_at', from)
    .lte('created_at', to);

  if (error) return failure('INTERNAL_ERROR', error.message);

  const days = new Map<string, { sent: number; replied: number }>();
  for (const send of sends || []) {
    const date = send.created_at.substring(0, 10); // YYYY-MM-DD
    const d = days.get(date) || { sent: 0, replied: 0 };
    if (['sent', 'delivered', 'replied'].includes(send.status)) d.sent++;
    if (send.status === 'replied') d.replied++;
    days.set(date, d);
  }

  const timeline = Array.from(days.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return success(timeline);
}
