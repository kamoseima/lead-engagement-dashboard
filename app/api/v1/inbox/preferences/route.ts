/**
 * GET /api/v1/inbox/preferences — Get agent inbox preferences
 * PUT /api/v1/inbox/preferences — Update agent inbox preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getPreferences, upsertPreferences } from '@/services/inbox/preferences.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET() {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const result = await getPreferences(userResult.data.id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function PUT(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = await request.json();
    const result = await upsertPreferences(userResult.data.id, userResult.data.org_id, body);
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result));
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to save preferences')),
      { status: 500 }
    );
  }
}
