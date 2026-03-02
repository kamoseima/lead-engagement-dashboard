/**
 * POST /api/v1/tests/scenarios — Create a test scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/roles';
import { createTestScenario } from '@/services/testing/test.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function POST(request: NextRequest) {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = await request.json();
    const result = await createTestScenario(userResult.data.org_id, userResult.data.id, body);

    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(toApiResponse(failure('INTERNAL_ERROR', 'Failed to create scenario')), { status: 500 });
  }
}
