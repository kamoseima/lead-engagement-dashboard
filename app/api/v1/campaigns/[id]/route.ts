/**
 * GET /api/v1/campaigns/:id — Get campaign with sends
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getCampaign, getCampaignSends } from '@/services/campaigns/campaign.service';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { id } = await params;

  const [campaignResult, sendsResult] = await Promise.all([
    getCampaign(id),
    getCampaignSends(id),
  ]);

  if (!campaignResult.success) {
    return NextResponse.json(toApiResponse(campaignResult), { status: mapErrorToHttpStatus(campaignResult.error.code) });
  }

  return NextResponse.json(
    toApiResponse({
      success: true as const,
      data: {
        campaign: campaignResult.data,
        sends: sendsResult.success ? sendsResult.data : [],
      },
    })
  );
}
