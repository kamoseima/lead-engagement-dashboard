/**
 * GET  /api/v1/tests — List test scenarios and recent runs
 * POST /api/v1/tests — Launch a test
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/roles';
import { listTestScenarios, listTestRuns, launchTest } from '@/services/testing/test.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET() {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const [scenarios, runs] = await Promise.all([
    listTestScenarios(userResult.data.org_id),
    listTestRuns(userResult.data.org_id),
  ]);

  if (!scenarios.success) {
    return NextResponse.json(toApiResponse(scenarios), { status: mapErrorToHttpStatus(scenarios.error.code) });
  }

  return NextResponse.json(
    toApiResponse({
      success: true as const,
      data: {
        scenarios: scenarios.data,
        runs: runs.success ? runs.data : [],
      },
    })
  );
}

export async function POST(request: NextRequest) {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = await request.json();
    const result = await launchTest(userResult.data.org_id, userResult.data.id, body);

    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(toApiResponse(failure('INTERNAL_ERROR', 'Failed to launch test')), { status: 500 });
  }
}
