/**
 * GET  /api/v1/campaigns — List campaigns
 * POST /api/v1/campaigns — Create a new campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { listCampaigns, createCampaign, type CreateCampaignInput } from '@/services/campaigns/campaign.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET() {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const result = await listCampaigns(userResult.data.org_id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function POST(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = (await request.json()) as CreateCampaignInput;
    const result = await createCampaign(userResult.data.org_id, userResult.data.id, body);

    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(toApiResponse(failure('INTERNAL_ERROR', 'Failed to create campaign')), { status: 500 });
  }
}
