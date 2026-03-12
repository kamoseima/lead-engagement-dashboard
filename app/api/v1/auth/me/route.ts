/**
 * GET /api/v1/auth/me — Return the current authenticated user's profile
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

export async function GET() {
  const result = await getCurrentUser();
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}
