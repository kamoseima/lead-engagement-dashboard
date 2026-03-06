/**
 * GET /api/v1/cron/process-campaigns
 *
 * Vercel cron job — runs every minute.
 * Finds all due scheduled campaigns and dispatches their messages.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCampaignMessage } from '@/services/campaigns/campaign.service';
import type { Campaign } from '@/types/database';

export async function GET(_request: NextRequest) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find all campaigns due to send
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('schedule_at', now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results: Array<{ id: string; name: string; sent: number; failed: number }> = [];

  for (const campaign of campaigns as Campaign[]) {
    const templateName = campaign.template_name;
    const contentSid = (campaign.config as Record<string, unknown>)?.content_sid as string | undefined;

    if (!templateName || !contentSid) {
      // No template configured — mark failed and skip
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id);
      continue;
    }

    // Mark as sending
    await supabase.from('campaigns').update({ status: 'sending' }).eq('id', campaign.id);

    const leads = campaign.leads;
    const sendResults = await Promise.allSettled(
      leads.map(lead =>
        sendCampaignMessage(
          campaign.org_id,
          campaign.id,
          lead,
          templateName,
          contentSid,
          (lead.variables as Record<string, string> | undefined) ?? {},
        )
      )
    );

    const sent = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').length;

    // Log any failures for debugging
    sendResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Campaign ${campaign.id} lead[${i}] failed:`, r.reason);
      }
    });

    if (campaign.schedule_type === 'recurring') {
      // Compute next run time
      const nextRun = computeNextRun(campaign);
      const hasEnded = campaign.recurrence_end_at && nextRun > campaign.recurrence_end_at;

      await supabase
        .from('campaigns')
        .update({
          status: hasEnded ? 'completed' : 'scheduled',
          schedule_at: hasEnded ? null : nextRun,
        })
        .eq('id', campaign.id);
    } else {
      // One-time campaign — mark completed
      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id);
    }

    results.push({ id: campaign.id, name: campaign.name, sent, failed });
  }

  return NextResponse.json({ processed: results.length, results });
}

function computeNextRun(campaign: Campaign): string {
  const base = campaign.schedule_at ? new Date(campaign.schedule_at) : new Date();
  const interval = campaign.frequency_interval || 1;

  switch (campaign.frequency) {
    case 'weekly':
      base.setDate(base.getDate() + 7 * interval);
      break;
    case 'monthly':
      base.setMonth(base.getMonth() + interval);
      break;
    case 'daily':
    default:
      base.setDate(base.getDate() + interval);
      break;
  }

  return base.toISOString();
}
