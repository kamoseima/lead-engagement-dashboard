/**
 * GET  /api/v1/inbox/canned-responses — List canned responses
 * POST /api/v1/inbox/canned-responses — Create canned response (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth/roles';
import { listCannedResponses, createCannedResponse } from '@/services/inbox/inbox.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;

  const result = await listCannedResponses(userResult.data.org_id, { search, category });
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function POST(request: NextRequest) {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = await request.json();
    const result = await createCannedResponse(userResult.data.org_id, body);
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to create canned response')),
      { status: 500 }
    );
  }
}
