/**
 * Lead Detail API
 *
 * GET    /api/v1/leads/:id — Get a single lead
 * PATCH  /api/v1/leads/:id — Update a lead
 * DELETE /api/v1/leads/:id — Delete a lead (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth/roles';
import { getLead, updateLead, deleteLead } from '@/services/leads/lead.service';
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
  const result = await getLead(id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await updateLead(id, body);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result));
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const adminResult = await requireRole('admin');
  if (!adminResult.success) {
    return NextResponse.json(toApiResponse(adminResult), { status: mapErrorToHttpStatus(adminResult.error.code) });
  }

  const { id } = await params;
  const result = await deleteLead(id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result));
}
