/**
 * Export API
 *
 * GET /api/v1/export — Download CSV export
 * Query params: type (sends|leads|events), campaignId, from, to, period
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { exportCampaignSends, exportLeads, exportWebhookEvents } from '@/services/reports/export.service';
import { mapErrorToHttpStatus } from '@/lib/shared/result';

export async function GET(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(
      { success: false, error: userResult.error },
      { status: mapErrorToHttpStatus(userResult.error.code) }
    );
  }

  const params = request.nextUrl.searchParams;
  const type = params.get('type');
  const campaignId = params.get('campaignId') ?? undefined;
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;

  // Resolve period shorthand
  let fromDate = from;
  if (!fromDate) {
    const period = params.get('period');
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    fromDate = new Date(Date.now() - days * 86400000).toISOString();
  }

  const orgId = userResult.data.org_id;
  const now = new Date().toISOString().substring(0, 10);

  let result;
  let filename: string;

  switch (type) {
    case 'sends':
      result = await exportCampaignSends(orgId, campaignId, fromDate, to);
      filename = `campaign_sends_${now}.csv`;
      break;
    case 'leads':
      result = await exportLeads(orgId);
      filename = `leads_${now}.csv`;
      break;
    case 'events':
      result = await exportWebhookEvents(orgId, fromDate, to);
      filename = `webhook_events_${now}.csv`;
      break;
    default:
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'type must be sends, leads, or events' } },
        { status: 400 }
      );
  }

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: mapErrorToHttpStatus(result.error.code) }
    );
  }

  return new Response(result.data, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
