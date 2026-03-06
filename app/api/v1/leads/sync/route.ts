/**
 * Lead Sync API
 *
 * POST /api/v1/leads/sync — Backfill leads from existing campaign_sends (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/roles';
import { syncLeadsFromCampaignSends } from '@/services/leads/lead.service';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

export async function POST(_request: NextRequest) {
  const adminResult = await requireRole('admin');
  if (!adminResult.success) {
    return NextResponse.json(toApiResponse(adminResult), { status: mapErrorToHttpStatus(adminResult.error.code) });
  }

  const result = await syncLeadsFromCampaignSends(adminResult.data.org_id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result));
}
