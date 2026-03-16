/**
 * POST /api/v1/campaigns/:id/resend — Resend/reschedule a campaign
 *
 * Body (optional):
 *   { schedule_at?: string }  — ISO date to reschedule, omit for immediate resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { resendCampaign } from '@/services/campaigns/campaign.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const scheduleAt = (body as { schedule_at?: string }).schedule_at;

    const result = await resendCampaign(
      userResult.data.org_id,
      userResult.data.id,
      id,
      scheduleAt,
    );

    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to resend campaign')),
      { status: 500 }
    );
  }
}
