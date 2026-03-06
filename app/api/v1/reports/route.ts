/**
 * Reports API
 *
 * GET /api/v1/reports — Get aggregated report data
 * Query params: period (7d|30d|90d), from, to
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getFullReport } from '@/services/reports/report.service';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

function resolveDateRange(params: URLSearchParams): { from: string; to: string } {
  const period = params.get('period');
  const now = new Date();
  const to = params.get('to') || now.toISOString();

  if (params.get('from')) {
    return { from: new Date(params.get('from')!).toISOString(), to };
  }

  let days = 30;
  if (period === '7d') days = 7;
  else if (period === '90d') days = 90;

  const from = new Date(now.getTime() - days * 86400000).toISOString();
  return { from, to };
}

export async function GET(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { from, to } = resolveDateRange(request.nextUrl.searchParams);
  const result = await getFullReport(userResult.data.org_id, from, to);

  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result));
}
