/**
 * Campaign Service
 *
 * CRUD for campaigns + send orchestration.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { platformApi } from '@/lib/platform-api';
import { type StepResult, success, failure } from '@/lib/shared/result';
import type { Campaign, CampaignLead, CampaignSend, ScheduleType, SendMode, Frequency } from '@/types/database';

export interface CreateCampaignInput {
  name: string;
  description?: string;
  flow_id?: string;
  template_name?: string;
  content_sid?: string;
  leads: CampaignLead[];
  schedule_at?: string;
  schedule_type?: ScheduleType;
  send_mode?: SendMode;
  frequency?: Frequency;
  frequency_interval?: number;
  sends_per_day?: number;
  send_times?: string[];
  recurrence_end_at?: string;
  config?: Record<string, unknown>;
}

export async function listCampaigns(orgId: string): Promise<StepResult<Campaign[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success((data ?? []) as Campaign[]);
}

export async function getCampaign(campaignId: string): Promise<StepResult<Campaign>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error) return failure('NOT_FOUND', 'Campaign not found');
  return success(data as Campaign);
}

export async function createCampaign(
  orgId: string,
  userId: string,
  input: CreateCampaignInput
): Promise<StepResult<Campaign>> {
  if (!input.name) {
    return failure('VALIDATION_ERROR', 'Campaign name is required');
  }
  if (!input.leads || input.leads.length === 0) {
    return failure('VALIDATION_ERROR', 'At least one lead is required');
  }

  const supabase = await createClient();

  const scheduleType = input.schedule_type || 'immediate';
  const status = scheduleType === 'immediate' ? 'sending' : 'scheduled';

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: orgId,
      name: input.name,
      description: input.description || null,
      flow_id: input.flow_id || null,
      template_name: input.template_name || null,
      status,
      leads: input.leads,
      schedule_at: input.schedule_at || null,
      schedule_type: scheduleType,
      send_mode: input.send_mode || 'all_at_once',
      frequency: input.frequency || null,
      frequency_interval: input.frequency_interval || 1,
      sends_per_day: input.sends_per_day || 1,
      send_times: input.send_times || [],
      recurrence_end_at: input.recurrence_end_at || null,
      config: { ...input.config, ...(input.content_sid ? { content_sid: input.content_sid } : {}) },
      created_by: userId,
    })
    .select()
    .single();

  if (error) return failure('INTERNAL_ERROR', error.message);

  // For immediate campaigns with a template, fire sends right away
  if (scheduleType === 'immediate' && input.template_name && input.content_sid) {
    const variables: Record<string, string> = {};
    await Promise.allSettled(
      input.leads.map(lead =>
        sendCampaignMessage(
          orgId,
          data.id,
          lead,
          input.template_name!,
          input.content_sid!,
          { ...variables, ...(lead.variables as Record<string, string> | undefined) },
        )
      )
    );
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', data.id);
    const { data: updated } = await supabase.from('campaigns').select('*').eq('id', data.id).single();
    return success((updated ?? data) as Campaign);
  }

  return success(data as Campaign);
}

export async function getCampaignSends(campaignId: string): Promise<StepResult<CampaignSend[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campaign_sends')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success((data ?? []) as CampaignSend[]);
}

export async function sendCampaignMessage(
  orgId: string,
  campaignId: string,
  lead: CampaignLead,
  templateName: string,
  contentSid: string,
  variables: Record<string, string>
): Promise<StepResult<CampaignSend>> {
  // Use admin client so this works from both authenticated requests and cron jobs (no user session)
  const supabase = createAdminClient();
  const idempotencyKey = `${campaignId}_${lead.phone}_${Date.now()}`;

  // Create send record
  const { data: sendRecord, error: insertError } = await supabase
    .from('campaign_sends')
    .insert({
      campaign_id: campaignId,
      org_id: orgId,
      lead_name: lead.name,
      lead_phone: lead.phone,
      template_name: templateName,
      variables,
      status: 'queued',
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (insertError) return failure('INTERNAL_ERROR', insertError.message);

  // Send via platform API
  const sendResult = await platformApi<{ provider_message_id: string }>(
    '/api/v1/messages/send/whatsapp',
    {
      method: 'POST',
      body: {
        to: lead.phone,
        content_sid: contentSid,
        content_variables: variables,
        event_type: `campaign_${campaignId}`,
        idempotency_key: idempotencyKey,
      },
      orgId,
    }
  );

  // Update send record with result
  if (sendResult.success) {
    await supabase
      .from('campaign_sends')
      .update({
        status: 'sent',
        provider_message_id: sendResult.data.provider_message_id,
        sent_at: new Date().toISOString(),
      })
      .eq('id', sendRecord.id);
  } else {
    await supabase
      .from('campaign_sends')
      .update({
        status: 'failed',
        error: sendResult.error.message,
      })
      .eq('id', sendRecord.id);
  }

  // Fetch updated record
  const { data: updated } = await supabase
    .from('campaign_sends')
    .select('*')
    .eq('id', sendRecord.id)
    .single();

  return success(updated as CampaignSend);
}
