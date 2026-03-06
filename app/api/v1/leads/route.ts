/**
 * Leads API
 *
 * GET  /api/v1/leads — List leads with filters and pagination
 * POST /api/v1/leads — Create a lead manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { listLeads, createLead } from '@/services/leads/lead.service';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

export async function GET(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const url = new URL(request.url);
  const filters = {
    segment: url.searchParams.get('segment') ?? undefined,
    pipeline_stage: url.searchParams.get('stage') ?? undefined,
    min_score: url.searchParams.get('min_score') ? parseInt(url.searchParams.get('min_score')!) : undefined,
    max_score: url.searchParams.get('max_score') ? parseInt(url.searchParams.get('max_score')!) : undefined,
    search: url.searchParams.get('search') ?? undefined,
    page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined,
    page_size: url.searchParams.get('page_size') ? parseInt(url.searchParams.get('page_size')!) : undefined,
  };

  const result = await listLeads(userResult.data.org_id, filters);
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

  const body = await request.json();
  if (!body.phone) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Phone is required' } }, { status: 400 });
  }

  const result = await createLead(userResult.data.org_id, body);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result), { status: 201 });
}
