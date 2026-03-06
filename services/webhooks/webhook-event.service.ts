/**
 * Webhook Event Service
 *
 * Provides paginated, filtered access to webhook event logs.
 */

import { createClient } from '@/lib/supabase/server';
import { type StepResult, success, failure } from '@/lib/shared/result';
import type { WebhookEvent } from '@/types/database';

export interface WebhookEventFilters {
  event_type?: string;
  channel?: string;
  processing_result?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedWebhookEvents {
  events: WebhookEvent[];
  total: number;
  page: number;
  page_size: number;
}

export async function listWebhookEvents(
  orgId: string,
  filters: WebhookEventFilters = {}
): Promise<StepResult<PaginatedWebhookEvents>> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.page_size ?? 50, 100);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('webhook_events')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.event_type) query = query.eq('event_type', filters.event_type);
  if (filters.channel) query = query.eq('channel', filters.channel);
  if (filters.processing_result) query = query.eq('processing_result', filters.processing_result);
  if (filters.from_date) query = query.gte('created_at', filters.from_date);
  if (filters.to_date) query = query.lte('created_at', filters.to_date);

  const { data, error, count } = await query;

  if (error) return failure('INTERNAL_ERROR', error.message);

  return success({
    events: (data ?? []) as WebhookEvent[],
    total: count ?? 0,
    page,
    page_size: pageSize,
  });
}
