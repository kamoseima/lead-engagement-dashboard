/**
 * Lead Activity API
 *
 * GET /api/v1/leads/:id/activity — Get activity timeline for a lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getLeadActivity } from '@/services/leads/lead.service';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { id } = await params;
  const result = await getLeadActivity(id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result));
}
